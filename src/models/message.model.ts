export interface MessageItem {
    id: number | string
    sender: string
    subject: string
    date: string
    content?: string
    isRead: boolean
    hasAttachments: boolean
}

export interface AnnouncementItem {
    id: number | string
    author: string
    title: string
    date: string
    content: string
}

export interface ReceiverItem {
    id: number
    name: string
    group: string
}

export interface MessagesActionResult {
    success: boolean
    messages: MessageItem[]
    announcements: AnnouncementItem[]
    receivers: ReceiverItem[]
    error?: string
}