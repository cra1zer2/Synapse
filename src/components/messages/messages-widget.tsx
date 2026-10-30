'use client'

import { useState, useMemo, ReactNode } from 'react'
import { MessageItem, AnnouncementItem, ReceiverItem } from '@/models/message.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { cleanSenderName } from '@/utils/text.util'
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
  onOpenMessage: (id: number | string, folder?: 'inbox' | 'sent') => Promise<string>
  onSendMessage: (receiverId: number | number[], title: string, body: string) => Promise<boolean>
  isLoading?: boolean
  lang?: AppLanguage
  t: AppDictionary
  onSubViewChange?: (isOpen: boolean) => void
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
          className="text-[var(--ios-blue)] underline break-all active:opacity-60"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      )
    }
    if (/^www\./i.test(part)) {
      return (
        <a
          key={i}
          href={'https://' + part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--ios-blue)] underline break-all active:opacity-60"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
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
  onOpenMessage,
  onSendMessage,
  isLoading = false,
  lang = 'pl',
  t,
  onSubViewChange
}: MessagesWidgetProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeMessage, setActiveMessage] = useState<MessageItem | null>(null)
  const [cachedMessage, setCachedMessage] = useState<MessageItem | null>(null)
  const [readerContent, setReaderContent] = useState('')
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
    return messages.filter(
      (m) =>
        searchQuery === '' ||
        m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.sender.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [messages, searchQuery])

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(
      (a) =>
        searchQuery === '' ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.author.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [announcements, searchQuery])

  const notifySubView = (isOpen: boolean) => {
    if (onSubViewChange) onSubViewChange(isOpen)
  }

  const handleReadMessage = async (msg: MessageItem) => {
    msg.isRead = true
    setActiveMessage(msg)
    setCachedMessage(msg)
    setReaderContent('')
    setIsLoadingContent(true)
    notifySubView(true)

    const content = await onOpenMessage(msg.id, folder)
    setReaderContent(content)
    setIsLoadingContent(false)
  }

  const handleCloseMessage = () => {
    setActiveMessage(null)
    notifySubView(false)
    setTimeout(() => {
      setCachedMessage(null)
      setReaderContent('')
    }, 350)
  }

  const handleReadAnnouncement = (item: AnnouncementItem) => {
    setActiveAnnouncement(item)
    setCachedAnnouncement(item)
    notifySubView(true)
  }

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
      <IosSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={mode === 'messages' ? (folder === 'sent' ? (isEn ? 'Search sent messages...' : 'Szukaj w wysłanych...') : t.searchMessagesPlaceholder) : (isEn ? 'Search notices...' : 'Szukaj w ogłoszeniach...')}
      />

      {mode === 'messages' ? (
        <IosCard className="overflow-hidden divide-y divide-[var(--ios-separator)]">
          {isLoading && messages.length === 0 ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="w-full p-3.5 px-4 flex items-center gap-3">
                <div className="w-3.5 flex items-center justify-center shrink-0 self-center">
                  <div className="w-2 h-2 rounded-full ios-skeleton" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-36 h-[15px] rounded-full ios-skeleton" />
                    <div className="w-16 h-[12px] rounded-full ios-skeleton shrink-0" />
                  </div>
                  <div className="w-52 h-[13px] rounded-full ios-skeleton" />
                </div>
              </div>
            ))
          ) : filteredMessages.length > 0 ? (
            filteredMessages.map((msg, idx) => (
              <div
                key={msg.id + '-' + idx}
                onClick={() => handleReadMessage(msg)}
                className="w-full p-3.5 px-4 flex items-center gap-3 transition-colors duration-100 cursor-pointer active:bg-[var(--ios-element)]/55 hover:bg-[var(--ios-element)]/20"
              >
                <div className="w-3.5 flex items-center justify-center shrink-0 self-center">
                  {folder === 'sent' ? (
                    msg.isRead ? (
                      <span title={isEn ? 'Read by teacher' : 'Przeczytane przez nauczyciela'} className="flex items-center justify-center">
                        <svg
                          width="15"
                          height="15"
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
                      </span>
                    ) : null
                  ) : (
                    !msg.isRead && (
                      <span className="w-2 h-2 rounded-full bg-[var(--ios-blue)]" />
                    )
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('text-[15px] tracking-[-0.2px] truncate leading-tight', !msg.isRead && folder !== 'sent' ? 'font-semibold text-[var(--ios-label)]' : 'font-medium text-[var(--ios-label)]')}>
                      {cleanSenderName(msg.sender)}
                    </span>
                    <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] shrink-0 tabular-nums">
                      {msg.date.split(' ')[0]}
                    </span>
                  </div>

                  <h4 className={cn('text-[13px] tracking-[-0.1px] truncate mt-0.5 leading-snug', !msg.isRead && folder !== 'sent' ? 'font-normal text-[var(--ios-label)]/90' : 'font-normal text-[var(--ios-secondary)]')}>
                    {msg.subject}
                  </h4>
                </div>

                <svg width="14" height="14" className="text-[var(--ios-tertiary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-[15px] font-normal text-[var(--ios-secondary)]">
              {folder === 'sent' ? (isEn ? 'No sent messages' : 'Brak wysłanych wiadomości') : t.noMessages}
            </div>
          )}
        </IosCard>
      ) : (
        <IosCard className="overflow-hidden divide-y divide-[var(--ios-separator)]">
          {isLoading && announcements.length === 0 ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="w-full p-3.5 px-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="w-24 h-[11px] rounded-full ios-skeleton" />
                  <div className="w-16 h-[11px] rounded-full ios-skeleton" />
                </div>
                <div className="w-48 h-[15px] rounded-full ios-skeleton" />
                <div className="w-full h-[12px] rounded-full ios-skeleton" />
              </div>
            ))
          ) : filteredAnnouncements.length > 0 ? (
            filteredAnnouncements.map((item, idx) => (
              <div
                key={item.id + '-' + idx}
                onClick={() => handleReadAnnouncement(item)}
                className="w-full p-3.5 px-4 flex flex-col gap-1 transition-colors duration-100 cursor-pointer active:bg-[var(--ios-element)]/55 hover:bg-[var(--ios-element)]/20"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--ios-purple)] uppercase tracking-wider">
                    {cleanSenderName(item.author)}
                  </span>
                  <span className="text-[11px] font-normal text-[var(--ios-secondary)] tabular-nums">
                    {item.date}
                  </span>
                </div>

                <h3 className="text-[15px] font-medium text-[var(--ios-label)] tracking-[-0.2px] leading-snug">
                  {item.title}
                </h3>

                <p className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] line-clamp-2 leading-relaxed">
                  {item.content}
                </p>
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
