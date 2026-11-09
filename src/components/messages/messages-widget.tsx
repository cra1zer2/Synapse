'use client'

import { useState, useMemo, useEffect, ReactNode } from 'react'
import { MessageItem, MessageAttachment, AnnouncementItem, ReceiverItem } from '@/models/message.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { cleanSenderName } from '@/utils/text.util'
import { formatHumanPolishDate } from '@/utils/date.util'
import { IosCard, IosSearchBar } from '@/components/ios/ios-ui'
import { MessageReaderScreen } from './message-reader-screen'
import { AnnouncementReaderScreen } from './announcement-reader-screen'
import { ComposeMessageScreen } from './compose-message-screen'
import { cn } from '@/utils/cn.util'

interface MessagesWidgetProps {
  mode: 'messages' | 'announcements'
  folder?: 'inbox' | 'sent'
  messages: MessageItem[]
  announcements: AnnouncementItem[]
  receivers: ReceiverItem[]
  isComposeOpen?: boolean
  onCloseCompose?: () => void
  onLoadReceivers?: () => void
  onOpenMessage: (id: number | string, folder?: 'inbox' | 'sent') => Promise<{ content: string; attachments: MessageAttachment[] }>
  onDownloadAttachment?: (att: MessageAttachment) => Promise<boolean>
  onSendMessage: (receiverId: number | number[], title: string, body: string) => Promise<boolean>
  isLoading?: boolean
  lang?: AppLanguage
  t: AppDictionary
  onSubViewChange?: (isOpen: boolean) => void
  initialSelectedMessage?: MessageItem | null
  initialSelectedAnnouncement?: AnnouncementItem | null
}

function openExternalSafe(url: string, e: React.MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  if (typeof window !== 'undefined') {
    const win = window.open(url, '_blank', 'noopener,noreferrer')
    if (win) win.opener = null
  }
}

function renderClickableText(text: string): ReactNode {
  if (!text) return null
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
  const parts = text.split(urlRegex)

  return parts.map((part, i) => {
    if (!part) return null
    if (/^https?:\/\//i.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--ios-blue)] underline break-all active:opacity-60 inline-flex items-center gap-0.5"
          onClick={(e) => openExternalSafe(part, e)}
        >
          <span>{part}</span>
        </a>
      )
    }
    if (/^www\./i.test(part)) {
      const targetUrl = 'https://' + part
      return (
        <a
          key={i}
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--ios-blue)] underline break-all active:opacity-60 inline-flex items-center gap-0.5"
          onClick={(e) => openExternalSafe(targetUrl, e)}
        >
          <span>{part}</span>
        </a>
      )
    }
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(part)) {
      return (
        <a
          key={i}
          href={'mailto:' + part}
          className="text-[var(--ios-blue)] underline break-all active:opacity-60"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      )
    }
    return part
  })
}

function deduplicateReceivers(list: ReceiverItem[]): ReceiverItem[] {
  const map = new Map<number, ReceiverItem>()
  for (const item of list) {
    if (!item || !item.id) continue
    if (!map.has(item.id)) {
      map.set(item.id, item)
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'pl'))
}

export function MessagesWidget({
  mode,
  folder = 'inbox',
  messages,
  announcements,
  receivers,
  isComposeOpen = false,
  onCloseCompose,
  onLoadReceivers,
  onOpenMessage,
  onDownloadAttachment,
  onSendMessage,
  isLoading = false,
  lang = 'pl',
  t,
  onSubViewChange,
  initialSelectedMessage = null,
  initialSelectedAnnouncement = null
}: MessagesWidgetProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [activeMessage, setActiveMessage] = useState<MessageItem | null>(null)
  const [cachedMessage, setCachedMessage] = useState<MessageItem | null>(null)
  const [readerContent, setReaderContent] = useState('')
  const [readerAttachments, setReaderAttachments] = useState<MessageAttachment[]>([])
  const [isLoadingContent, setIsLoadingContent] = useState(false)

  const [activeAnnouncement, setActiveAnnouncement] = useState<AnnouncementItem | null>(null)
  const [cachedAnnouncement, setCachedAnnouncement] = useState<AnnouncementItem | null>(null)

  const [localCompose, setLocalCompose] = useState(false)
  const [composeInitialRecipients, setComposeInitialRecipients] = useState<ReceiverItem[]>([])
  const [composeInitialTitle, setComposeInitialTitle] = useState('')

  const isEn = lang === 'en'
  const isComposeActive = isComposeOpen || localCompose

  const uniqueReceivers = useMemo(() => deduplicateReceivers(receivers), [receivers])

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return messages.filter((m) => {
      if (folder !== 'sent' && onlyUnread && m.isRead) return false
      if (!q) return true
      return (
        m.subject.toLowerCase().includes(q) ||
        m.sender.toLowerCase().includes(q) ||
        (m.content && m.content.toLowerCase().includes(q)) ||
        m.date.toLowerCase().includes(q)
      )
    })
  }, [messages, searchQuery, onlyUnread, folder])

  const filteredAnnouncements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return announcements.filter(
      (a) =>
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.author.toLowerCase().includes(q) ||
        (a.content && a.content.toLowerCase().includes(q))
    )
  }, [announcements, searchQuery])

  const notifySubView = (isOpen: boolean) => {
    if (onSubViewChange) onSubViewChange(isOpen)
  }

  const handleReadMessage = async (msg: MessageItem) => {
    msg.isRead = true
    setActiveMessage(msg)
    setCachedMessage(msg)
    if (msg.content) {
      setReaderContent(msg.content)
      setReaderAttachments(msg.attachments || [])
      setIsLoadingContent(false)
      notifySubView(true)
      const res = await onOpenMessage(msg.id, folder)
      if (res.content) {
        msg.content = res.content
        setReaderContent(res.content)
      }
      if (res.attachments && res.attachments.length > 0) {
        msg.attachments = res.attachments
        setReaderAttachments(res.attachments)
      }
      return
    }
    setReaderContent('')
    setReaderAttachments([])
    setIsLoadingContent(true)
    notifySubView(true)

    const res = await onOpenMessage(msg.id, folder)
    if (res.content) {
      msg.content = res.content
    }
    if (res.attachments) {
      msg.attachments = res.attachments
    }
    setReaderContent(res.content)
    setReaderAttachments(res.attachments || [])
    setIsLoadingContent(false)
  }

  const handleCloseMessage = () => {
    setActiveMessage(null)
    notifySubView(false)
    setTimeout(() => {
      setCachedMessage(null)
      setReaderContent('')
      setReaderAttachments([])
    }, 350)
  }

  const handleReadAnnouncement = (item: AnnouncementItem) => {
    setActiveAnnouncement(item)
    setCachedAnnouncement(item)
    notifySubView(true)
  }

  useEffect(() => {
    if (initialSelectedMessage) {
      handleReadMessage(initialSelectedMessage)
    }
  }, [initialSelectedMessage])

  useEffect(() => {
    if (initialSelectedAnnouncement) {
      handleReadAnnouncement(initialSelectedAnnouncement)
    }
  }, [initialSelectedAnnouncement])

  const handleCloseAnnouncement = () => {
    setActiveAnnouncement(null)
    notifySubView(false)
    setTimeout(() => {
      setCachedAnnouncement(null)
    }, 350)
  }

  const handleInitiateReply = (msg: MessageItem) => {
    const rawSender = cleanSenderName(msg.sender).toLowerCase()
    const found = uniqueReceivers.find((r) => {
      const name = r.name.toLowerCase()
      return name.includes(rawSender) || rawSender.includes(name)
    })

    setComposeInitialRecipients(found ? [found] : [])
    setComposeInitialTitle(msg.subject.toLowerCase().startsWith('re:') ? msg.subject : `Re: ${msg.subject}`)
    setLocalCompose(true)
    notifySubView(true)
  }

  const handleCloseComposeModal = () => {
    setLocalCompose(false)
    if (onCloseCompose) onCloseCompose()
    notifySubView(Boolean(activeMessage || activeAnnouncement))
  }

  return (
    <div className="w-full flex flex-col gap-3.5 pb-16 select-none">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <IosSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={mode === 'messages' ? (folder === 'sent' ? (isEn ? 'Search sent messages...' : 'Szukaj w wysłanych...') : t.searchMessagesPlaceholder) : (isEn ? 'Search notices...' : 'Szukaj w ogłoszeniach...')}
          />
        </div>
        {mode === 'messages' && folder !== 'sent' && (
          <button
            type="button"
            onClick={() => setOnlyUnread((prev) => !prev)}
            className={cn(
              'h-[40px] px-3.5 rounded-full text-[13px] font-medium tracking-[-0.1px] shrink-0 transition-colors cursor-pointer select-none',
              onlyUnread
                ? 'bg-[var(--ios-blue)] text-white'
                : 'bg-[var(--ios-card-solid)] text-[var(--ios-secondary)] hover:text-[var(--ios-label)]'
            )}
          >
            {isEn ? 'Unread' : 'Nieprzeczytane'}
          </button>
        )}
      </div>

      {mode === 'messages' ? (
        <IosCard className="overflow-hidden">
          {isLoading && messages.length === 0 ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="relative w-full p-3.5 px-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="w-24 h-[11px] rounded-full ios-skeleton" />
                  <div className="w-16 h-[11px] rounded-full ios-skeleton" />
                </div>
                <div className="w-48 h-[15px] rounded-full ios-skeleton" />
                <div className="w-full h-[12px] rounded-full ios-skeleton" />
                {idx < 3 && (
                  <div className="absolute bottom-0 right-4 left-4 h-[1px] bg-[var(--ios-separator)] pointer-events-none" />
                )}
              </div>
            ))
          ) : filteredMessages.length > 0 ? (
            filteredMessages.map((msg, idx) => (
              <div
                key={msg.id + '-' + idx}
                onClick={() => handleReadMessage(msg)}
                className="relative w-full p-3.5 px-4 flex flex-col gap-1 transition-colors duration-100 cursor-pointer active:bg-[var(--ios-element)]/55 hover:bg-[var(--ios-element)]/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {folder !== 'sent' && !msg.isRead && (
                      <span className="w-2 h-2 rounded-full bg-[var(--ios-blue)] shrink-0" />
                    )}
                    {folder === 'sent' && msg.isRead && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-[var(--ios-blue)] shrink-0"
                      >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                    <span className="text-[11px] font-semibold text-[var(--ios-blue)] uppercase tracking-wider truncate">
                      {cleanSenderName(msg.sender)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {msg.hasAttachments && (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-[var(--ios-secondary)]"
                      >
                        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                    )}
                    <span className="text-[11px] font-normal text-[var(--ios-secondary)] tabular-nums">
                      {formatHumanPolishDate(msg.date, true)}
                    </span>
                  </div>
                </div>

                <h3 className="text-[15px] font-medium text-[var(--ios-label)] tracking-[-0.2px] leading-snug">
                  {msg.subject}
                </h3>

                {msg.content && (
                  <p className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] line-clamp-2 leading-relaxed">
                    {msg.content}
                  </p>
                )}

                {idx < filteredMessages.length - 1 && (
                  <div className="absolute bottom-0 right-4 left-4 h-[0.5px] bg-[var(--ios-separator)] pointer-events-none" />
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-[15px] font-normal text-[var(--ios-secondary)]">
              {folder === 'sent' ? (isEn ? 'No sent messages' : 'Brak wysłanych wiadomości') : t.noMessages}
            </div>
          )}
        </IosCard>
      ) : (
        <IosCard className="overflow-hidden">
          {isLoading && announcements.length === 0 ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="relative w-full p-3.5 px-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="w-24 h-[11px] rounded-full ios-skeleton" />
                  <div className="w-16 h-[11px] rounded-full ios-skeleton" />
                </div>
                <div className="w-48 h-[15px] rounded-full ios-skeleton" />
                <div className="w-full h-[12px] rounded-full ios-skeleton" />
                {idx < 3 && (
                  <div className="absolute bottom-0 right-4 left-4 h-[1px] bg-[var(--ios-separator)] pointer-events-none" />
                )}
              </div>
            ))
          ) : filteredAnnouncements.length > 0 ? (
            filteredAnnouncements.map((item, idx) => (
              <div
                key={item.id + '-' + idx}
                onClick={() => handleReadAnnouncement(item)}
                className="relative w-full p-3.5 px-4 flex flex-col gap-1 transition-colors duration-100 cursor-pointer active:bg-[var(--ios-element)]/55 hover:bg-[var(--ios-element)]/20"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--ios-purple)] uppercase tracking-wider">
                    {cleanSenderName(item.author)}
                  </span>
                  <span className="text-[11px] font-normal text-[var(--ios-secondary)] tabular-nums">
                    {formatHumanPolishDate(item.date, true)}
                  </span>
                </div>

                <h3 className="text-[15px] font-medium text-[var(--ios-label)] tracking-[-0.2px] leading-snug">
                  {item.title}
                </h3>

                <p className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] line-clamp-2 leading-relaxed">
                  {item.content}
                </p>

                {idx < filteredAnnouncements.length - 1 && (
                  <div className="absolute bottom-0 right-4 left-4 h-[0.5px] bg-[var(--ios-separator)] pointer-events-none" />
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-[15px] font-normal text-[var(--ios-secondary)]">
              {isEn ? 'No announcements' : 'Brak ogłoszeń'}
            </div>
          )}
        </IosCard>
      )}

      <MessageReaderScreen
        message={activeMessage || cachedMessage}
        isOpen={Boolean(activeMessage)}
        isReceded={isComposeActive}
        isLoadingContent={isLoadingContent}
        content={readerContent}
        attachments={readerAttachments}
        onDownloadAttachment={onDownloadAttachment}
        onClose={handleCloseMessage}
        onReply={handleInitiateReply}
        renderContent={renderClickableText}
        t={t}
      />

      <AnnouncementReaderScreen
        announcement={activeAnnouncement || cachedAnnouncement}
        isOpen={Boolean(activeAnnouncement)}
        onClose={handleCloseAnnouncement}
        renderContent={renderClickableText}
        t={t}
      />

      <ComposeMessageScreen
        isOpen={isComposeActive}
        receivers={uniqueReceivers}
        initialRecipients={composeInitialRecipients}
        initialTitle={composeInitialTitle}
        onClose={handleCloseComposeModal}
        onLoadReceivers={onLoadReceivers}
        onSend={async (ids, title, body) => {
          let allOk = true
          for (const id of ids) {
            const ok = await onSendMessage(id, title, body)
            if (!ok) allOk = false
          }
          return allOk
        }}
        t={t}
      />
    </div>
  )
}
