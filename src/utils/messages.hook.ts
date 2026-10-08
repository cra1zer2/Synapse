'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageItem, AnnouncementItem, ReceiverItem } from '@/models/message.model'
import { getMessagesAndAnnouncementsAction, readMessageAction, sendMessageAction } from '@/app/actions'

export type MainSection = 'schedule' | 'grades' | 'attendance' | 'messages'

interface UseMessagesInboxOptions {
    username: string
    password: string
    activeSection: MainSection
}

export function useMessagesInbox({ username, password, activeSection }: UseMessagesInboxOptions) {
    const [messages, setMessages] = useState<MessageItem[]>([])
    const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
    const [receivers, setReceivers] = useState<ReceiverItem[]>([])
    const [isLoadingMessages, setIsLoadingMessages] = useState(false)

    const isFetchingRef = useRef(false)
    const hasFetchedOnceRef = useRef(false)

    useEffect(() => {
        if (typeof window === 'undefined') return
        const cached = localStorage.getItem('synapse_messages_cache')
        if (cached) {
            try {
                const parsed = JSON.parse(cached)
                if (Array.isArray(parsed.messages)) setMessages(parsed.messages)
                if (Array.isArray(parsed.announcements)) setAnnouncements(parsed.announcements)
                if (Array.isArray(parsed.receivers)) setReceivers(parsed.receivers)
            } catch { }
        }
    }, [])

    const fetchBundle = useCallback(async (isSilent: boolean) => {
        if (!username || !password || isFetchingRef.current) return
        isFetchingRef.current = true
        if (!isSilent) setIsLoadingMessages(true)

        try {
            const mRes = await getMessagesAndAnnouncementsAction(username, password)
            if (mRes.success) {
                setMessages(mRes.messages)
                setAnnouncements(mRes.announcements)
                setReceivers(mRes.receivers)
                hasFetchedOnceRef.current = true

                if (typeof window !== 'undefined') {
                    localStorage.setItem('synapse_messages_cache', JSON.stringify({
                        messages: mRes.messages,
                        announcements: mRes.announcements,
                        receivers: mRes.receivers
                    }))
                }
            }
        } finally {
            isFetchingRef.current = false
            if (!isSilent) setIsLoadingMessages(false)
        }
    }, [username, password])

    useEffect(() => {
        if (!username || !password || hasFetchedOnceRef.current) return
        const timer = setTimeout(() => {
            fetchBundle(true)
        }, 800)
        return () => clearTimeout(timer)
    }, [username, password, fetchBundle])

    useEffect(() => {
        if (activeSection === 'messages' && !hasFetchedOnceRef.current) {
            fetchBundle(false)
        }
    }, [activeSection, fetchBundle])

    const handleOpenMessage = async (msgId: number | string): Promise<string> => {
        const res = await readMessageAction(username, password, Number(msgId))
        return res.content || ''
    }

    const handleSendMessage = async (receiverId: number, title: string, body: string): Promise<boolean> => {
        const res = await sendMessageAction(username, password, receiverId, title, body)
        return Boolean(res.success)
    }

    return {
        messages,
        announcements,
        receivers,
        isLoadingMessages,
        handleOpenMessage,
        handleSendMessage
    }
}