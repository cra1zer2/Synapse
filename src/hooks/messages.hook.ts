/**
 * Hook: Messages & Announcements Inbox Manager
 * Fetches, caches, reads, sends, and downloads attachments for Librus messages and announcements.
 * Uses `AppLanguage` directly so all dynamic content respects the extensible language registry.
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageItem, MessageAttachment, AnnouncementItem, ReceiverItem } from '@/models/message.model'
import {
    getMessagesAndAnnouncementsAction,
    getReceiversAction,
    readMessageAction,
    sendMessageAction,
    downloadAttachmentAction
} from '@/app/actions'
import { addRequestLog } from '@/utils/request-logger.util'
import { AppLanguage, pickText } from '@/config/dictionary.config'

export function useMessagesInbox({
    username,
    password,
    lang
}: {
    username: string
    password: string
    lang: AppLanguage
}) {
    const [messages, setMessages] = useState<MessageItem[]>([])
    const [sentMessages, setSentMessages] = useState<MessageItem[]>([])
    const [currentFolder, setCurrentFolder] = useState<'inbox' | 'sent'>('inbox')
    const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
    const [receivers, setReceivers] = useState<ReceiverItem[]>([])
    const [isLoadingMessages, setIsLoadingMessages] = useState(false)
    const [messagesError, setMessagesError] = useState<string | null>(null)

    const receiversRef = useRef<ReceiverItem[]>([])
    receiversRef.current = receivers

    const syncBundle = useCallback(
        async (
            trigger: 'Start' | 'Refresh',
            isCancelledCheck?: () => boolean
        ) => {
            if (!username || !password) return

            setIsLoadingMessages(true)
            setMessagesError(null)
            const clientStart = performance.now()
            const logLabel = pickText(lang, {
                pl: trigger === 'Start' ? 'Wiadomości i ogłoszenia (Start)' : 'Wiadomości i ogłoszenia (Odświeżenie)',
                en: trigger === 'Start' ? 'Messages & Announcements (Init)' : 'Messages & Announcements (Refresh)'
            })
            const loadErrorFallback = pickText(lang, {
                pl: 'Błąd ładowania wiadomości',
                en: 'Failed to load messages'
            })
            const connectionErrorFallback = pickText(lang, {
                pl: 'Błąd połączenia',
                en: 'Connection error'
            })

            try {
                const mRes = await getMessagesAndAnnouncementsAction(username, password, lang)
                const clientDurationMs = Math.round(performance.now() - clientStart)

                addRequestLog({
                    name: logLabel,
                    clientDurationMs,
                    serverDurationMs: mRes.serverTimings?.totalMs,
                    breakdown: mRes.serverTimings
                        ? {
                              [pickText(lang, { pl: 'Pobranie list', en: 'Lists' })]: mRes.serverTimings.inboxMs || 0,
                              [pickText(lang, { pl: 'Podglądy', en: 'Previews' })]: mRes.serverTimings.previewsMs || 0
                          }
                        : undefined,
                    status: mRes.success ? 'ok' : 'error',
                    error: mRes.error,
                    details: `${pickText(lang, { pl: 'Wiadomości', en: 'Messages' })}: ${mRes.messages?.length || 0}, ${pickText(lang, { pl: 'Ogłoszenia', en: 'Announcements' })}: ${mRes.announcements?.length || 0}`
                })

                if (isCancelledCheck?.()) return

                if (mRes.success) {
                    const nextReceivers =
                        mRes.receivers && mRes.receivers.length > 0 ? mRes.receivers : receiversRef.current
                    setMessages(mRes.messages || [])
                    setSentMessages(mRes.sentMessages || [])
                    setAnnouncements(mRes.announcements || [])
                    if (mRes.receivers && mRes.receivers.length > 0) {
                        setReceivers(mRes.receivers)
                    }
                    setMessagesError(null)
                    localStorage.setItem(
                        `synapse_msg_${username}`,
                        JSON.stringify({
                            lang,
                            messages: mRes.messages || [],
                            sentMessages: mRes.sentMessages || [],
                            announcements: mRes.announcements || [],
                            receivers: nextReceivers
                        })
                    )
                } else {
                    setMessagesError(mRes.error || loadErrorFallback)
                }
            } catch (err: unknown) {
                const errMsg = err instanceof Error ? err.message : connectionErrorFallback
                const clientDurationMs = Math.round(performance.now() - clientStart)
                addRequestLog({
                    name: logLabel,
                    clientDurationMs,
                    status: 'error',
                    error: errMsg
                })
                if (!isCancelledCheck?.()) {
                    setMessagesError(errMsg)
                }
            } finally {
                if (!isCancelledCheck?.()) {
                    setIsLoadingMessages(false)
                }
            }
        },
        [username, password, lang]
    )

    useEffect(() => {
        if (!username || !password) {
            setMessages([])
            setSentMessages([])
            setAnnouncements([])
            setReceivers([])
            setMessagesError(null)
            setIsLoadingMessages(false)
            return
        }

        const cacheKey = `synapse_msg_${username}`
        const cached = localStorage.getItem(cacheKey)
        let hasMatchingLangCache = false
        if (cached) {
            try {
                const parsed = JSON.parse(cached)
                if (Array.isArray(parsed.receivers)) {
                    setReceivers(parsed.receivers)
                    receiversRef.current = parsed.receivers
                }
                if (parsed.lang === lang) {
                    if (Array.isArray(parsed.messages)) setMessages(parsed.messages)
                    if (Array.isArray(parsed.sentMessages)) setSentMessages(parsed.sentMessages)
                    if (Array.isArray(parsed.announcements)) setAnnouncements(parsed.announcements)
                    hasMatchingLangCache = true
                } else {
                    setMessages([])
                    setSentMessages([])
                    setAnnouncements([])
                }
            } catch {}
        } else {
            setMessages([])
            setSentMessages([])
            setAnnouncements([])
            setReceivers([])
        }

        let isCancelled = false
        const delayMs = hasMatchingLangCache ? 350 : 0
        const timer = setTimeout(() => {
            syncBundle('Start', () => isCancelled)
        }, delayMs)

        return () => {
            isCancelled = true
            clearTimeout(timer)
        }
    }, [username, password, lang, syncBundle])

    const ensureReceivers = useCallback(async (): Promise<ReceiverItem[]> => {
        if (receiversRef.current.length > 0) return receiversRef.current
        try {
            const res = await getReceiversAction(username, password)
            if (res.success && res.receivers && res.receivers.length > 0) {
                setReceivers(res.receivers)
                return res.receivers
            }
        } catch {}
        return receiversRef.current
    }, [username, password])

    const markMessageLocal = useCallback(
        (
            msgId: number | string,
            folder: 'inbox' | 'sent',
            content?: string,
            attachments?: MessageAttachment[]
        ) => {
            const idNum = Number(msgId)
            const updater = (prev: MessageItem[]) =>
                prev.map((m) =>
                    Number(m.id) === idNum
                        ? {
                              ...m,
                              isRead: true,
                              ...(content !== undefined ? { content } : {}),
                              ...(attachments !== undefined ? { attachments } : {})
                          }
                        : m
                )

            if (folder === 'inbox') {
                setMessages(updater)
            } else {
                setSentMessages(updater)
            }
        },
        []
    )

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
        const res = await readMessageAction(username, password, idNum, folder === 'sent' ? 6 : 5, lang)
        const clientDurationMs = Math.round(performance.now() - clientStart)
        addRequestLog({
            name: `${pickText(lang, { pl: 'Odczyt wiadomości', en: 'Read message' })} #${idNum}`,
            clientDurationMs,
            status: res.success ? 'ok' : 'error',
            error: res.error,
            details: `Folder: ${folder}, ${pickText(lang, { pl: 'Załączników', en: 'Attachments' })}: ${res.attachments?.length || 0}`
        })
        const content = res.content || ''
        const attachments = res.attachments || []
        if (content || attachments.length > 0) {
            markMessageLocal(idNum, folder, content, attachments)
        }
        return { content, attachments }
    }

    const handleDownloadAttachment = async (att: MessageAttachment): Promise<boolean> => {
        if (!username || !password || !att.path) return false
        const clientStart = performance.now()
        const res = await downloadAttachmentAction(username, password, att.path, att.name)
        const clientDurationMs = Math.round(performance.now() - clientStart)
        addRequestLog({
            name: `${pickText(lang, { pl: 'Pobieranie załącznika', en: 'Download attachment' })}: ${att.name}`,
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
            setTimeout(() => URL.revokeObjectURL(url), 30000)
            return true
        } catch {
            return false
        }
    }

    const handleSendMessage = async (receiverId: number | number[], title: string, body: string): Promise<boolean> => {
        const res = await sendMessageAction(username, password, receiverId, title, body)
        return Boolean(res.success)
    }

    const reloadMessages = useCallback(() => syncBundle('Refresh'), [syncBundle])

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
        markMessageLocal,
        handleDownloadAttachment,
        handleSendMessage,
        reloadMessages
    }
}
