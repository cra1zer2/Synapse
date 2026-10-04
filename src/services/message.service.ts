import Librus from 'librus-api'
import { MessageItem, AnnouncementItem, ReceiverItem } from '@/models/message.model'
import { safeUnwrapResponse } from '@/utils/serializer.util'

export async function fetchInboxMessages(username: string, pass: string): Promise<{ success: boolean; data?: MessageItem[]; error?: string }> {
    try {
        const client = new Librus()
        await client.authorize(username, pass)

        const raw = await client.inbox.listInbox(5)
        const list = Array.isArray(raw) ? raw : []

        const messages: MessageItem[] = list.map((item: any, idx: number) => ({
            id: item.id || idx,
            sender: item.user || item.sender || 'Nauczyciel',
            subject: item.title || item.subject || 'Wiadomość',
            date: item.date || '',
            isRead: Boolean(item.read),
            hasAttachments: Boolean(item.files && item.files.length > 0)
        }))

        return { success: true, data: messages }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function fetchAnnouncements(username: string, pass: string): Promise<{ success: boolean; data?: AnnouncementItem[]; error?: string }> {
    try {
        const client = new Librus()
        await client.authorize(username, pass)

        const raw = await client.inbox.listAnnouncements()
        const list = Array.isArray(raw) ? raw : []

        const announcements: AnnouncementItem[] = list.map((item: any, idx: number) => ({
            id: item.id || idx,
            author: item.user || item.author || 'Dyrekcja',
            title: item.title || 'Ogłoszenie',
            date: item.date || '',
            content: item.content || ''
        }))

        return { success: true, data: announcements }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function fetchMessageContent(username: string, pass: string, messageId: number): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
        const client = new Librus()
        await client.authorize(username, pass)

        const raw = await client.inbox.getMessage(5, messageId)
        const unwrapped = safeUnwrapResponse(raw)
        const content = typeof unwrapped === 'string' ? unwrapped : unwrapped?.content || ''

        return { success: true, content }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function fetchReceiversList(username: string, pass: string): Promise<{ success: boolean; data?: ReceiverItem[]; error?: string }> {
    try {
        const client = new Librus()
        await client.authorize(username, pass)

        const raw = await client.inbox.listReceivers()
        const list = Array.isArray(raw) ? raw : []

        const receivers: ReceiverItem[] = list.map((item: any) => ({
            id: item.id,
            name: item.name || item.user || 'Pracownik',
            group: item.group || 'Nauczyciele'
        }))

        return { success: true, data: receivers }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function sendMessageToUser(
    username: string,
    pass: string,
    receiverId: number,
    title: string,
    body: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const client = new Librus()
        await client.authorize(username, pass)

        await client.inbox.sendMessage(receiverId, title, body)
        return { success: true }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}