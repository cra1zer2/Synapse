'use client'

import { useState, useEffect, useCallback } from 'react'
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
    const [hasLoadedMessages, setHasLoadedMessages] = useState(false)
    const [isLoadingMessages, setIsLoadingMessages] = useState(false)

    const loadMessagesIfActive = useCallback(async () => {
        if (!username || !password || hasLoadedMessages) return
        setIsLoadingMessages(true)
        const mRes = await getMessagesAndAnnouncementsAction(username, password)
        setIsLoadingMessages(false)
        if (mRes.success) {
            setMessages(mRes.messages)
            setAnnouncements(mRes.announcements)
            setReceivers(mRes.receivers)
            setHasLoadedMessages(true)
        }
    }, [username, password, hasLoadedMessages])

    useEffect(() => {
        if (activeSection === 'messages') {
            loadMessagesIfActive()
        }
    }, [activeSection, loadMessagesIfActive])

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