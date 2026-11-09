'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageItem, MessageAttachment, AnnouncementItem, ReceiverItem } from '@/models/message.model'
import { getMessagesAndAnnouncementsAction, getReceiversAction, readMessageAction, sendMessageAction, downloadAttachmentAction } from '@/app/actions'
import { addRequestLog } from '@/utils/request-logger.util'

export function useMessagesInbox({ username, password }: { username: string; password: string }) {
    const [messages, setMessages] = useState<MessageItem[]>([])
    const [sentMessages, setSentMessages] = useState<MessageItem[]>([])
    const [currentFolder, setCurrentFolder] = useState<'inbox' | 'sent'>('inbox')
    const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
    const [receivers, setReceivers] = useState<ReceiverItem[]>([])
    const [isLoadingMessages, setIsLoadingMessages] = useState(false)
    const [messagesError, setMessagesError] = useState<string | null>(null)

    useEffect(() => {
        if (!username || !password) return

        const cacheKey = `synapse_msg_${username}`
        const cached = localStorage.getItem(cacheKey)
        let cachedReceiversSnapshot: ReceiverItem[] = []
        if (cached) {
            try {
                const parsed = JSON.parse(cached)
                if (Array.isArray(parsed.messages)) setMessages(parsed.messages)
                if (Array.isArray(parsed.sentMessages)) setSentMessages(parsed.sentMessages)
                if (Array.isArray(parsed.announcements)) setAnnouncements(parsed.announcements)
                if (Array.isArray(parsed.receivers)) {
                    setReceivers(parsed.receivers)
                    cachedReceiversSnapshot = parsed.receivers
                }
            } catch {}
        } else {
            setMessages([])
            setSentMessages([])
            setAnnouncements([])
            setReceivers([])
        }

        let isCancelled = false

        const fetchBundle = async () => {
            setIsLoadingMessages(true)
            setMessagesError(null)
            const clientStart = performance.now()
            try {
                const mRes = await getMessagesAndAnnouncementsAction(username, password)
                const clientDurationMs = Math.round(performance.now() - clientStart)
                addRequestLog({
                    name: 'Wiadomości i ogłoszenia (Start)',
                    clientDurationMs,
                    serverDurationMs: mRes.serverTimings?.totalMs,
                    breakdown: mRes.serverTimings ? {
                        'Pobranie list': mRes.serverTimings.inboxMs || 0,
                        'Podglądy': mRes.serverTimings.previewsMs || 0
                    } : undefined,
                    status: mRes.success ? 'ok' : 'error',
                    error: mRes.error,
                    details: `Wiadomości: ${mRes.messages?.length || 0}, Ogłoszenia: ${mRes.announcements?.length || 0}`
                })

                if (!isCancelled) {
                    if (mRes.success) {
                        setMessages(mRes.messages || [])
                        setSentMessages(mRes.sentMessages || [])
                        setAnnouncements(mRes.announcements || [])
                        if (mRes.receivers && mRes.receivers.length > 0) {
                            setReceivers(mRes.receivers)
                        }
                        setMessagesError(null)
                        localStorage.setItem(cacheKey, JSON.stringify({
                            messages: mRes.messages || [],
                            sentMessages: mRes.sentMessages || [],
                            announcements: mRes.announcements || [],
                            receivers: mRes.receivers && mRes.receivers.length > 0 ? mRes.receivers : cachedReceiversSnapshot
                        }))
                    } else {
                        setMessagesError(mRes.error || 'Błąd ładowania wiadomości')
                    }
                }
            } catch (err: any) {
                const clientDurationMs = Math.round(performance.now() - clientStart)
                addRequestLog({
                    name: 'Wiadomości i ogłoszenia (Start)',
                    clientDurationMs,
                    status: 'error',
                    error: err?.message || 'Błąd połączenia'
                })
                if (!isCancelled) {
                    setMessagesError(err?.message || 'Błąd połączenia')
                }
            } finally {
                if (!isCancelled) {
                    setIsLoadingMessages(false)
                }
            }
        }

        // Stagger network fetch slightly if warm cache is available to give priority to main timetable sync
        const delayMs = cached ? 350 : 0
        const timer = setTimeout(() => {
            fetchBundle()
        }, delayMs)

        return () => {
            isCancelled = true
            clearTimeout(timer)
        }
    }, [username, password])

    const ensureReceivers = useCallback(async (): Promise<ReceiverItem[]> => {
        if (receivers.length > 0) return receivers
        try {
            const res = await getReceiversAction(username, password)
            if (res.success && res.receivers && res.receivers.length > 0) {
                setReceivers(res.receivers)
                return res.receivers
            }
        } catch {}
        return receivers
    }, [username, password, receivers])

    const handleOpenMessage = async (
        msgId: number | string,
        folder: 'inbox' | 'sent' = 'inbox'
    ): Promise<{ content: string; attachments: MessageAttachment[] }> => {
        const idNum = Number(msgId)

        if (folder === 'inbox') {
            setMessages((prev) => {
                const updated = prev.map((m) => (Number(m.id) === idNum ? { ...m, isRead: true } : m))
                if (typeof window !== 'undefined') {
                    const cacheKey = `synapse_msg_${username}`
                    const cached = localStorage.getItem(cacheKey)
                    if (cached) {
                        try {
                            const parsed = JSON.parse(cached)
                            parsed.messages = updated
                            localStorage.setItem(cacheKey, JSON.stringify(parsed))
                        } catch {}
                    }
                }
                return updated
            })
        }

        const clientStart = performance.now()
        const res = await readMessageAction(username, password, idNum, folder === 'sent' ? 6 : 5)
        const clientDurationMs = Math.round(performance.now() - clientStart)
        addRequestLog({
            name: `Odczyt wiadomości #${idNum}`,
            clientDurationMs,
            status: res.success ? 'ok' : 'error',
            error: res.error,
            details: `Folder: ${folder}, Załączników: ${res.attachments?.length || 0}`
        })
        return {
            content: res.content || '',
            attachments: res.attachments || []
        }
    }

    const handleDownloadAttachment = async (att: MessageAttachment): Promise<boolean> => {
        if (!username || !password || !att.path) return false
        const clientStart = performance.now()
        const res = await downloadAttachmentAction(username, password, att.path, att.name)
        const clientDurationMs = Math.round(performance.now() - clientStart)
        addRequestLog({
            name: `Pobieranie załącznika: ${att.name}`,
            clientDurationMs,
            status: res.success ? 'ok' : 'error',
            error: res.error
        })
        if (!res.success || !res.base64) return false

        try {
            const byteCharacters = atob(res.base64)
            const byteNumbers = new Array(byteCharacters.length)
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i)
            }
            const byteArray = new Uint8Array(byteNumbers)
            const blob = new Blob([byteArray], { type: res.mimeType || 'application/octet-stream' })
            const url = URL.createObjectURL(blob)

            const a = document.createElement('a')
            a.href = url
            a.download = res.fileName || att.name
            a.target = '_blank'
            a.rel = 'noopener noreferrer'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            setTimeout(() => URL.revokeObjectURL(url), 10000)
            return true
        } catch {
            return false
        }
    }

    const handleSendMessage = async (receiverId: number | number[], title: string, body: string): Promise<boolean> => {
        const res = await sendMessageAction(username, password, receiverId, title, body)
        return Boolean(res.success)
    }

    const reloadMessages = async () => {
        if (!username || !password) return
        setIsLoadingMessages(true)
        setMessagesError(null)
        const clientStart = performance.now()
        try {
            const mRes = await getMessagesAndAnnouncementsAction(username, password)
            const clientDurationMs = Math.round(performance.now() - clientStart)
            addRequestLog({
                name: 'Wiadomości i ogłoszenia (Odświeżenie)',
                clientDurationMs,
                serverDurationMs: mRes.serverTimings?.totalMs,
                breakdown: mRes.serverTimings ? {
                    'Pobranie list': mRes.serverTimings.inboxMs || 0,
                    'Podglądy': mRes.serverTimings.previewsMs || 0
                } : undefined,
                status: mRes.success ? 'ok' : 'error',
                error: mRes.error,
                details: `Wiadomości: ${mRes.messages?.length || 0}, Ogłoszenia: ${mRes.announcements?.length || 0}`
            })

            if (mRes.success) {
                setMessages(mRes.messages || [])
                setSentMessages(mRes.sentMessages || [])
                setAnnouncements(mRes.announcements || [])
                if (mRes.receivers && mRes.receivers.length > 0) {
                    setReceivers(mRes.receivers)
                }
                setMessagesError(null)
                const cacheKey = `synapse_msg_${username}`
                localStorage.setItem(cacheKey, JSON.stringify({
                    messages: mRes.messages || [],
                    sentMessages: mRes.sentMessages || [],
                    announcements: mRes.announcements || [],
                    receivers: mRes.receivers && mRes.receivers.length > 0 ? mRes.receivers : receivers
                }))
            } else {
                setMessagesError(mRes.error || 'Błąd ładowania wiadomości')
            }
        } catch (err: any) {
            const clientDurationMs = Math.round(performance.now() - clientStart)
            addRequestLog({
                name: 'Wiadomości i ogłoszenia (Odświeżenie)',
                clientDurationMs,
                status: 'error',
                error: err?.message || 'Błąd połączenia'
            })
            setMessagesError(err?.message || 'Błąd połączenia')
        } finally {
            setIsLoadingMessages(false)
        }
    }

    return {
        messages,
        sentMessages,
        currentFolder,
        setCurrentFolder,
        announcements,
        receivers,
        ensureReceivers,
        isLoadingMessages,
        messagesError,
        handleOpenMessage,
        handleDownloadAttachment,
        handleSendMessage,
        reloadMessages
    }
}
