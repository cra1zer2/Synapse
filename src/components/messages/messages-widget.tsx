'use client'

import { useState, useMemo, useEffect, useRef, ReactNode } from 'react'
import { ChevronRight, Eye, Inbox, Megaphone, Paperclip } from 'lucide-react'
import { MessageItem, MessageAttachment, AnnouncementItem, ReceiverItem } from '@/models/message.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { cleanSenderName } from '@/utils/text.util'
import { formatHumanPolishDate } from '@/utils/date.util'
import { IosCard, IosEmptyState, IosSearchBar } from '@/components/ios/ios-ui'
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
  onMarkMessageRead?: (
    msgId: number | string,
    folder: 'inbox' | 'sent',
    content?: string,
    attachments?: MessageAttachment[]
  ) => void
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

function deduplicateReceivers(list: ReceiverItem[], lang: AppLanguage): ReceiverItem[] {
  const map = new Map<number, ReceiverItem>()
  for (const item of list) {
    if (!item || !item.id) continue
    if (!map.has(item.id)) {
      map.set(item.id, item)
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, lang === 'en' ? 'en' : 'pl'))
}

function hasExplicitTime(dateStr: string): boolean {
  return /\d{1,2}:\d{2}/.test(dateStr || '')
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
  onMarkMessageRead,
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
  const [localReadIds, setLocalReadIds] = useState<Record<string, boolean>>({})
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

  const msgCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const annCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isEn = lang === 'en'
  const isComposeActive = isComposeOpen || localCompose

  useEffect(() => {
    return () => {
      if (msgCloseTimerRef.current) clearTimeout(msgCloseTimerRef.current)
      if (annCloseTimerRef.current) clearTimeout(annCloseTimerRef.current)
    }
  }, [])

  const uniqueReceivers = useMemo(() => deduplicateReceivers(receivers, lang), [receivers, lang])

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return messages.filter((m) => {
      const readState = m.isRead || Boolean(localReadIds[String(m.id)])
      if (folder !== 'sent' && onlyUnread && readState) return false
      if (!q) return true
      return (
        m.subject.toLowerCase().includes(q) ||
        m.sender.toLowerCase().includes(q) ||
        (m.content && m.content.toLowerCase().includes(q)) ||
        m.date.toLowerCase().includes(q)
      )
    })
  }, [messages, searchQuery, onlyUnread, folder, localReadIds])

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
    setLocalReadIds((prev) => ({ ...prev, [String(msg.id)]: true }))
    if (onMarkMessageRead) {
      onMarkMessageRead(msg.id, folder)
    }

    setActiveMessage(msg)
    setCachedMessage(msg)

    if (msg.content) {
      setReaderContent(msg.content)
      setReaderAttachments(msg.attachments || [])
      setIsLoadingContent(false)
      notifySubView(true)
      const res = await onOpenMessage(msg.id, folder)
      if (res.content) {
        setReaderContent(res.content)
      }
      if (res.attachments && res.attachments.length > 0) {
        setReaderAttachments(res.attachments)
      }
      if (onMarkMessageRead && (res.content || (res.attachments && res.attachments.length > 0))) {
        onMarkMessageRead(msg.id, folder, res.content || undefined, res.attachments || undefined)
      }
      return
    }

    setReaderContent('')
    setReaderAttachments([])
    setIsLoadingContent(true)
    notifySubView(true)

    const res = await onOpenMessage(msg.id, folder)
    if (onMarkMessageRead) {
      onMarkMessageRead(msg.id, folder, res.content || undefined, res.attachments || undefined)
    }
    setReaderContent(res.content)
    setReaderAttachments(res.attachments || [])
    setIsLoadingContent(false)
  }

  const handleCloseMessage = () => {
    setActiveMessage(null)
    notifySubView(false)
    if (msgCloseTimerRef.current) clearTimeout(msgCloseTimerRef.current)
    msgCloseTimerRef.current = setTimeout(() => {
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
    if (annCloseTimerRef.current) clearTimeout(annCloseTimerRef.current)
    annCloseTimerRef.current = setTimeout(() => {
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
    setComposeInitialTitle(msg.subject.toLowerCase().startsWith('re:') ? msg.subject : 'Re: ' + msg.subject)
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
            placeholder={
              mode === 'messages'
                ? folder === 'sent'
                  ? isEn
                    ? 'Search sent messages...'
                    : 'Szukaj w wysłanych...'
                  : t.searchMessagesPlaceholder
                : isEn
                  ? 'Search notices...'
                  : 'Szukaj w ogłoszeniach...'
            }
          />
        </div>
        {mode === 'messages' && folder !== 'sent' && (
          <button
            type="button"
            onClick={() => setOnlyUnread((prev) => !prev)}
            className={cn(
              'h-[42px] px-3.5 sm:px-4 rounded-full text-[13px] font-medium tracking-[-0.1px] shrink-0 transition-colors cursor-pointer select-none',
              onlyUnread
                ? 'bg-[var(--ios-blue)] text-white font-semibold'
                : 'bg-[var(--ios-element)] text-[var(--ios-secondary)] hover:text-[var(--ios-label)]'
            )}
          >
            {isEn ? 'Unread' : 'Nieprzeczytane'}
          </button>
        )}
      </div>

      {mode === 'messages' ? (
        <IosCard className="overflow-hidden divide-y divide-[var(--ios-separator)]">
          {isLoading && messages.length === 0 ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="w-full p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="w-24 h-[11px] rounded-full ios-skeleton" />
                  <div className="w-16 h-[11px] rounded-full ios-skeleton" />
                </div>
                <div className="w-48 h-[15px] rounded-full ios-skeleton" />
                <div className="w-full h-[12px] rounded-full ios-skeleton" />
              </div>
            ))
          ) : filteredMessages.length > 0 ? (
            filteredMessages.map((msg, idx) => {
              const isReadState = msg.isRead || Boolean(localReadIds[String(msg.id)])
              return (
                <div
                  key={msg.id + '-' + idx}
                  onClick={() => handleReadMessage(msg)}
                  className="w-full p-4 flex flex-col gap-1 transition-colors duration-150 cursor-pointer hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {folder !== 'sent' && !isReadState && (
                        <span className="w-2 h-2 rounded-full bg-[var(--ios-blue)] shrink-0" />
                      )}
                      {folder === 'sent' && isReadState && (
                        <Eye className="w-3.5 h-3.5 text-[var(--ios-blue)] shrink-0" strokeWidth={2.2} />
                      )}
                      <span className="text-[12px] font-semibold text-[var(--ios-blue)] tracking-tight truncate">
                        {cleanSenderName(msg.sender)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {msg.hasAttachments && (
                        <Paperclip className="w-[13px] h-[13px] text-[var(--ios-secondary)] shrink-0" strokeWidth={2.2} />
                      )}
                      <span className="text-[12px] font-normal text-[var(--ios-secondary)] tabular-nums">
                        {formatHumanPolishDate(msg.date, hasExplicitTime(msg.date), lang)}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-[var(--ios-tertiary)] shrink-0" strokeWidth={2.5} />
                    </div>
                  </div>

                  <h3
                    className={cn(
                      'text-[15px] text-[var(--ios-label)] tracking-[-0.2px] leading-snug',
                      !isReadState && folder !== 'sent' ? 'font-semibold' : 'font-medium'
                    )}
                  >
                    {msg.subject}
                  </h3>

                  {msg.content && (
                    <p className="text-[13px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] line-clamp-2 leading-relaxed">
                      {msg.content}
                    </p>
                  )}
                </div>
              )
            })
          ) : (
            <IosEmptyState
              compact
              iconTone="blue"
              icon={<Inbox className="w-[20px] h-[20px]" strokeWidth={1.9} />}
              title={
                folder === 'sent'
                  ? isEn
                    ? 'No sent messages'
                    : 'Brak wysłanych wiadomości'
                  : t.noMessages
              }
            />
          )}
        </IosCard>
      ) : (
        <IosCard className="overflow-hidden divide-y divide-[var(--ios-separator)]">
          {isLoading && announcements.length === 0 ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="w-full p-4 flex flex-col gap-2">
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
                className="w-full p-4 flex flex-col gap-1 transition-colors duration-150 cursor-pointer hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-[var(--ios-purple)] tracking-tight truncate">
                    {cleanSenderName(item.author)}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[12px] font-normal text-[var(--ios-secondary)] tabular-nums">
                      {formatHumanPolishDate(item.date, hasExplicitTime(item.date), lang)}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--ios-tertiary)] shrink-0" strokeWidth={2.5} />
                  </div>
                </div>

                <h3 className="text-[16px] font-semibold text-[var(--ios-label)] tracking-[-0.25px] leading-snug">
                  {item.title}
                </h3>

                <p className="text-[13px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] line-clamp-2 leading-relaxed mt-0.5">
                  {item.content}
                </p>
              </div>
            ))
          ) : (
            <IosEmptyState
              compact
              iconTone="neutral"
              icon={<Megaphone className="w-[20px] h-[20px]" strokeWidth={1.9} />}
              title={isEn ? 'No announcements' : 'Brak ogłoszeń'}
            />
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
        lang={lang}
        t={t}
      />

      <AnnouncementReaderScreen
        announcement={activeAnnouncement || cachedAnnouncement}
        isOpen={Boolean(activeAnnouncement)}
        onClose={handleCloseAnnouncement}
        renderContent={renderClickableText}
        lang={lang}
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
          return await onSendMessage(ids, title, body)
        }}
        lang={lang}
        t={t}
      />
    </div>
  )
}
