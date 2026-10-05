import Librus from 'librus-api'
import { MessageItem, AnnouncementItem, ReceiverItem, MessagesActionResult } from '@/models/message.model'
import { safeUnwrapResponse } from '@/utils/serializer.util'

export async function fetchMessagesBundle(username: string, pass: string): Promise<MessagesActionResult> {
    try {
        const client = new Librus()
        await client.authorize(username, pass)

        const [rawInbox, rawAnnouncements, rawReceivers] = await Promise.all([
            client.inbox.listInbox(5).catch(() => []),
            client.inbox.listAnnouncements().catch(() => []),
            client.inbox.listReceivers().catch(() => [])
        ])

        const inboxList = Array.isArray(rawInbox) ? rawInbox : []
        const announcementsList = Array.isArray(rawAnnouncements) ? rawAnnouncements : []
        const receiversList = Array.isArray(rawReceivers) ? rawReceivers : []

        const messages: MessageItem[] = inboxList.map((item: any, idx: number) => ({
            id: item.id || idx,
            sender: item.user || item.sender || 'Nauczyciel',
            subject: item.title || item.subject || 'Wiadomość',
            date: item.date || '',
            isRead: Boolean(item.read),
            hasAttachments: Boolean(item.files && item.files.length > 0)
        }))

        const announcements: AnnouncementItem[] = announcementsList.map((item: any, idx: number) => ({
            id: item.id || idx,
            author: item.user || item.author || 'Dyrekcja',
            title: item.title || 'Ogłoszenie',
            date: item.date || '',
            content: item.content || ''
        }))

        const receivers: ReceiverItem[] = receiversList.map((item: any) => ({
            id: item.id,
            name: item.name || item.user || 'Pracownik',
            group: item.group || 'Nauczyciele'
        }))

        return {
            success: true,
            messages,
            announcements,
            receivers
        }
    } catch (error) {
        return {
            success: false,
            messages: [],
            announcements: [],
            receivers: [],
            error: String(error)
        }
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