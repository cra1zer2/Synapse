/**
 * Models: Messages & Announcements
 * Defines inbox/sent messages, attachments, school notices, recipient directory entries, and sync bundles.
 * Used by message services, message inbox hooks, and the messages feature module.
 */

export interface MessageAttachment {
  name: string
  path: string
}

export interface MessageItem {
  id: number | string
  sender: string
  subject: string
  date: string
  content?: string
  isRead: boolean
  hasAttachments: boolean
  attachments?: MessageAttachment[]
  folder?: 'inbox' | 'sent'
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
  sentMessages?: MessageItem[]
  announcements: AnnouncementItem[]
  receivers: ReceiverItem[]
  error?: string
  serverTimings?: {
    totalMs: number
    inboxMs?: number
    previewsMs?: number
  }
}
