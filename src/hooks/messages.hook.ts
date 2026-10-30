'use client'

import { useState, useEffect } from 'react'
import { MessageItem, AnnouncementItem, ReceiverItem } from '@/models/message.model'
import { getMessagesAndAnnouncementsAction, readMessageAction, sendMessageAction } from '@/app/actions'

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
        if (cached) {
            try {
                const parsed = JSON.parse(cached)
                if (Array.isArray(parsed.messages)) setMessages(parsed.messages)
                if (Array.isArray(parsed.sentMessages)) setSentMessages(parsed.sentMessages)
                if (Array.isArray(parsed.announcements)) setAnnouncements(parsed.announcements)
                if (Array.isArray(parsed.receivers)) setReceivers(parsed.receivers)
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
            try {
                const mRes = await getMessagesAndAnnouncementsAction(username, password)
                if (!isCancelled) {
                    if (mRes.success) {
                        setMessages(mRes.messages || [])
                        setSentMessages(mRes.sentMessages || [])
                        setAnnouncements(mRes.announcements || [])
                        setReceivers(mRes.receivers || [])
                        setMessagesError(null)
                        localStorage.setItem(cacheKey, JSON.stringify({
                            messages: mRes.messages || [],
                            sentMessages: mRes.sentMessages || [],
                            announcements: mRes.announcements || [],
                            receivers: mRes.receivers || []
                        }))
                    } else {
                        setMessagesError(mRes.error || 'Błąd ładowania wiadomości')
                    }
                }
            } catch (err: any) {
                if (!isCancelled) {
                    setMessagesError(err?.message || 'Błąd połączenia')
                }
            } finally {
                if (!isCancelled) {
                    setIsLoadingMessages(false)
                }
            }
        }

        fetchBundle()

        return () => {
            isCancelled = true
        }
    }, [username, password])

    const handleOpenMessage = async (msgId: number | string, folder: 'inbox' | 'sent' = 'inbox'): Promise<string> => {
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

        const res = await readMessageAction(username, password, idNum, folder === 'sent' ? 6 : 5)
        return res.content || ''
    }

    const handleSendMessage = async (receiverId: number | number[], title: string, body: string): Promise<boolean> => {
        const res = await sendMessageAction(username, password, receiverId, title, body)
        return Boolean(res.success)
    }

    const reloadMessages = async () => {
        if (!username || !password) return
        setIsLoadingMessages(true)
        setMessagesError(null)
        try {
            const mRes = await getMessagesAndAnnouncementsAction(username, password)
            if (mRes.success) {
                setMessages(mRes.messages || [])
                setSentMessages(mRes.sentMessages || [])
                setAnnouncements(mRes.announcements || [])
                setReceivers(mRes.receivers || [])
                setMessagesError(null)
                const cacheKey = `synapse_msg_${username}`
                localStorage.setItem(cacheKey, JSON.stringify({
                    messages: mRes.messages || [],
                    sentMessages: mRes.sentMessages || [],
                    announcements: mRes.announcements || [],
                    receivers: mRes.receivers || []
                }))
            } else {
                setMessagesError(mRes.error || 'Błąd ładowania wiadomości')
            }
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
        isLoadingMessages,
        messagesError,
        handleOpenMessage,
        handleSendMessage,
        reloadMessages
    }
}
