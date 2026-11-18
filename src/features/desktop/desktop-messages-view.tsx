'use client'

import React, { useMemo, useState, useEffect, ReactNode } from 'react'
import {
  Check,
  Download,
  Eye,
  Inbox,
  MailOpen,
  Megaphone,
  Paperclip,
  Plus,
  Reply,
  Send,
  X
} from 'lucide-react'
import {
  AnnouncementItem,
  MessageAttachment,
  MessageItem,
  ReceiverItem
} from '@/models/message.model'
import { AppDictionary, AppLanguage, getLanguageMeta, pickText } from '@/config/dictionary.config'
import { cleanSenderName } from '@/utils/text.util'
import { resolveAvatarLetter } from '@/utils/account.util'
import { formatHumanDate } from '@/utils/date.util'
import { UiSpinner } from '@/components/ui/ui-spinner'
import { cn } from '@/utils/cn.util'
import {
  MacDialogWindow,
  MacGroupBox,
  MacPushButton,
  MacSearchField
} from './mac-primitives'

interface DesktopMessagesViewProps {
  mode: 'inbox' | 'sent' | 'notices'
  messages: MessageItem[]
  sentMessages: MessageItem[]
  announcements: AnnouncementItem[]
  receivers: ReceiverItem[]
  isLoadingMessages: boolean
  isComposeOpen: boolean
  onCloseCompose: () => void
  onOpenCompose: () => void
  ensureReceivers: () => Promise<ReceiverItem[]>
  onOpenMessage: (
    id: number | string,
    folder?: 'inbox' | 'sent'
  ) => Promise<{ content: string; attachments: MessageAttachment[] }>
  onMarkMessageRead: (
    msgId: number | string,
    folder: 'inbox' | 'sent',
    content?: string,
    attachments?: MessageAttachment[]
  ) => void
  onDownloadAttachment: (att: MessageAttachment) => Promise<boolean>
  onSendMessage: (receiverId: number | number[], title: string, body: string) => Promise<boolean>
  lang: AppLanguage
  t: AppDictionary
  initialMessage?: MessageItem | null
  initialAnnouncement?: AnnouncementItem | null
}

function renderClickableText(text: string): ReactNode {
  if (!text) return null
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
  const parts = text.split(urlRegex)

  return parts.map((part, i) => {
    if (!part) return null
    if (/^https?:\/\//i.test(part) || /^www\./i.test(part)) {
      const href = /^www\./i.test(part) ? `https://${part}` : part
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--mac-blue)] underline break-all hover:opacity-80"
        >
          {part}
        </a>
      )
    }
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(part)) {
      return (
        <a key={i} href={`mailto:${part}`} className="text-[var(--mac-blue)] underline break-all hover:opacity-80">
          {part}
        </a>
      )
    }
    return part
  })
}

function hasExplicitTime(dateStr: string): boolean {
  return /\d{1,2}:\d{2}/.test(dateStr || '')
}

export function DesktopMessagesView({
  mode,
  messages,
  sentMessages,
  announcements,
  receivers,
  isLoadingMessages,
  isComposeOpen,
  onCloseCompose,
  onOpenCompose,
  ensureReceivers,
  onOpenMessage,
  onMarkMessageRead,
  onDownloadAttachment,
  onSendMessage,
  lang,
  t,
  initialMessage,
  initialAnnouncement
}: DesktopMessagesViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [localReadIds, setLocalReadIds] = useState<Record<string, boolean>>({})

  const [selectedMsg, setSelectedMsg] = useState<MessageItem | null>(null)
  const [readerContent, setReaderContent] = useState('')
  const [readerAttachments, setReaderAttachments] = useState<MessageAttachment[]>([])
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null)

  const [selectedNotice, setSelectedNotice] = useState<AnnouncementItem | null>(null)

  // Compose state
  const [composeRecipients, setComposeRecipients] = useState<ReceiverItem[]>([])
  const [composeTitle, setComposeTitle] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [recipientQuery, setRecipientQuery] = useState('')
  const [showRecipientList, setShowRecipientList] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)

  const folder: 'inbox' | 'sent' = mode === 'sent' ? 'sent' : 'inbox'
  const activeMessagesList = mode === 'sent' ? sentMessages : messages

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return activeMessagesList.filter((m) => {
      const isRead = m.isRead || Boolean(localReadIds[String(m.id)])
      if (folder !== 'sent' && onlyUnread && isRead) return false
      if (!q) return true
      return (
        m.subject.toLowerCase().includes(q) ||
        m.sender.toLowerCase().includes(q) ||
        (m.content && m.content.toLowerCase().includes(q)) ||
        m.date.toLowerCase().includes(q)
      )
    })
  }, [activeMessagesList, searchQuery, onlyUnread, folder, localReadIds])

  const filteredNotices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return announcements.filter(
      (a) =>
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.author.toLowerCase().includes(q) ||
        (a.content && a.content.toLowerCase().includes(q))
    )
  }, [announcements, searchQuery])

  const selectMessageItem = async (msg: MessageItem) => {
    setLocalReadIds((prev) => ({ ...prev, [String(msg.id)]: true }))
    onMarkMessageRead(msg.id, folder)
    setSelectedMsg(msg)

    if (msg.content) {
      setReaderContent(msg.content)
      setReaderAttachments(msg.attachments || [])
      setIsLoadingContent(false)
      const res = await onOpenMessage(msg.id, folder)
      if (res.content) setReaderContent(res.content)
      if (res.attachments?.length) setReaderAttachments(res.attachments)
      if (res.content || res.attachments?.length) {
        onMarkMessageRead(msg.id, folder, res.content || undefined, res.attachments || undefined)
      }
      return
    }

    setReaderContent('')
    setReaderAttachments([])
    setIsLoadingContent(true)
    const res = await onOpenMessage(msg.id, folder)
    onMarkMessageRead(msg.id, folder, res.content || undefined, res.attachments || undefined)
    setReaderContent(res.content)
    setReaderAttachments(res.attachments || [])
    setIsLoadingContent(false)
  }

  useEffect(() => {
    if (initialMessage && mode !== 'notices') {
      selectMessageItem(initialMessage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage])

  useEffect(() => {
    if (initialAnnouncement && mode === 'notices') {
      setSelectedNotice(initialAnnouncement)
    }
  }, [initialAnnouncement, mode])

  // Select first item automatically when changing mode
  useEffect(() => {
    if (mode === 'notices') {
      if (!selectedNotice && filteredNotices.length > 0) setSelectedNotice(filteredNotices[0])
    } else {
      if (filteredMessages.length > 0 && (!selectedMsg || !filteredMessages.some((m) => m.id === selectedMsg.id))) {
        selectMessageItem(filteredMessages[0])
      } else if (filteredMessages.length === 0) {
        setSelectedMsg(null)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activeMessagesList.length, announcements.length])

  useEffect(() => {
    if (isComposeOpen && receivers.length === 0) {
      ensureReceivers()
    }
  }, [isComposeOpen, receivers.length, ensureReceivers])

  const uniqueReceivers = useMemo(() => {
    const map = new Map<number, ReceiverItem>()
    for (const r of receivers) {
      if (r && r.id && !map.has(r.id)) map.set(r.id, r)
    }
    const locale = getLanguageMeta(lang).intlLocale
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, locale))
  }, [receivers, lang])

  const filteredReceivers = useMemo(() => {
    const q = recipientQuery.trim().toLowerCase()
    return uniqueReceivers.filter(
      (r) => !q || r.name.toLowerCase().includes(q) || (r.group || '').toLowerCase().includes(q)
    )
  }, [uniqueReceivers, recipientQuery])

  const handleReply = (msg: MessageItem) => {
    const rawSender = cleanSenderName(msg.sender).toLowerCase()
    const found = uniqueReceivers.find((r) => {
      const n = r.name.toLowerCase()
      return n.includes(rawSender) || rawSender.includes(n)
    })
    setComposeRecipients(found ? [found] : [])
    setComposeTitle(msg.subject.toLowerCase().startsWith('re:') ? msg.subject : `Re: ${msg.subject}`)
    setComposeBody('')
    setSendSuccess(false)
    onOpenCompose()
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (composeRecipients.length === 0 || !composeTitle.trim() || !composeBody.trim() || isSending) return
    setIsSending(true)
    const ok = await onSendMessage(
      composeRecipients.map((r) => r.id),
      composeTitle,
      composeBody
    )
    setIsSending(false)
    if (ok) {
      setSendSuccess(true)
      setComposeBody('')
      setTimeout(() => {
        setSendSuccess(false)
        setComposeRecipients([])
        setComposeTitle('')
        onCloseCompose()
      }, 650)
    }
  }

  const handleDownload = async (att: MessageAttachment) => {
    if (downloadingPath) return
    setDownloadingPath(att.path)
    try {
      await onDownloadAttachment(att)
    } finally {
      setDownloadingPath(null)
    }
  }

  const isNoReply = Boolean(
    selectedMsg &&
      (/e-usprawiedliwienia|system|powiadomienie|no-reply|noreply|librus/i.test(selectedMsg.sender) ||
        /prosimy na nią nie odpowiadać|nie odpowiadaj|do not reply/i.test(readerContent))
  )

  return (
    <div className="h-full flex min-h-0 select-none">
      {/* Left List Pane (360px) */}
      <div className="w-[360px] shrink-0 border-r border-[var(--mac-row-divider)] flex flex-col min-h-0 bg-[var(--mac-window-bg)]">
        <div className="p-3 border-b border-[var(--mac-row-divider)] flex items-center gap-2 shrink-0">
          <MacSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={
              mode === 'notices'
                ? pickText(lang, { pl: 'Szukaj ogłoszeń...', en: 'Search notices...' })
                : t.searchMessagesPlaceholder
            }
            className="flex-1"
          />
          {mode === 'inbox' && (
            <button
              type="button"
              onClick={() => setOnlyUnread((p) => !p)}
              className={cn(
                'h-[30px] px-2.5 rounded-full text-[11.5px] font-medium shrink-0 cursor-pointer transition-colors',
                onlyUnread
                  ? 'bg-[var(--mac-blue)] text-white font-semibold'
                  : 'bg-[var(--mac-fill-3)] text-[var(--mac-label-2)] hover:text-[var(--mac-label-1)]'
              )}
            >
              {pickText(lang, { pl: 'Nieprzecz.', en: 'Unread' })}
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[var(--mac-row-divider)]">
          {mode === 'notices' ? (
            isLoadingMessages && announcements.length === 0 ? (
              <div className="py-16 flex justify-center">
                <UiSpinner size="small" className="text-[var(--mac-blue)]" />
              </div>
            ) : filteredNotices.length > 0 ? (
              filteredNotices.map((ann) => {
                const isSel = selectedNotice?.id === ann.id
                return (
                  <button
                    key={ann.id}
                    type="button"
                    onClick={() => setSelectedNotice(ann)}
                    className={cn(
                      'w-full px-4 py-3 text-left flex flex-col gap-1 cursor-pointer transition-colors',
                      isSel ? 'bg-[var(--ios-blue-subtle)]/55' : 'hover:bg-[var(--mac-fill-4)]'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-[var(--mac-purple)] truncate">
                        {cleanSenderName(ann.author)}
                      </span>
                      <span className="text-[11px] text-[var(--mac-label-2)] tabular-nums shrink-0">
                        {formatHumanDate(ann.date, hasExplicitTime(ann.date), lang)}
                      </span>
                    </div>
                    <div className="text-[13px] font-semibold text-[var(--mac-label-1)] truncate">
                      {ann.title}
                    </div>
                    <p className="text-[12px] text-[var(--mac-label-2)] line-clamp-2 leading-snug">
                      {ann.content}
                    </p>
                  </button>
                )
              })
            ) : (
              <div className="py-20 text-center text-[12px] text-[var(--mac-label-2)] flex flex-col items-center gap-2">
                <Megaphone className="w-6 h-6 text-[var(--mac-label-3)]" />
                <span>{pickText(lang, { pl: 'Brak ogłoszeń', en: 'No notices' })}</span>
              </div>
            )
          ) : isLoadingMessages && activeMessagesList.length === 0 ? (
            <div className="py-16 flex justify-center">
              <UiSpinner size="small" className="text-[var(--mac-blue)]" />
            </div>
          ) : filteredMessages.length > 0 ? (
            filteredMessages.map((msg) => {
              const isRead = msg.isRead || Boolean(localReadIds[String(msg.id)])
              const isSel = selectedMsg?.id === msg.id
              return (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => selectMessageItem(msg)}
                  className={cn(
                    'w-full px-4 py-3 text-left flex flex-col gap-1 cursor-pointer transition-colors',
                    isSel ? 'bg-[var(--ios-blue-subtle)]/55' : 'hover:bg-[var(--mac-fill-4)]'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {folder !== 'sent' && !isRead && (
                        <span className="w-2 h-2 rounded-full bg-[var(--mac-blue)] shrink-0" />
                      )}
                      {folder === 'sent' && isRead && (
                        <Eye className="w-3 h-3 text-[var(--mac-blue)] shrink-0" />
                      )}
                      <span className="text-[11.5px] font-semibold text-[var(--mac-blue)] truncate">
                        {cleanSenderName(msg.sender)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {msg.hasAttachments && (
                        <Paperclip className="w-3 h-3 text-[var(--mac-label-2)]" />
                      )}
                      <span className="text-[11px] text-[var(--mac-label-2)] tabular-nums">
                        {formatHumanDate(msg.date, hasExplicitTime(msg.date), lang)}
                      </span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'text-[13px] text-[var(--mac-label-1)] truncate',
                      !isRead && folder !== 'sent' ? 'font-bold' : 'font-medium'
                    )}
                  >
                    {msg.subject}
                  </div>
                  {msg.content && (
                    <p className="text-[12px] text-[var(--mac-label-2)] line-clamp-2 leading-snug">
                      {msg.content}
                    </p>
                  )}
                </button>
              )
            })
          ) : (
            <div className="py-20 text-center text-[12px] text-[var(--mac-label-2)] flex flex-col items-center gap-2">
              <Inbox className="w-6 h-6 text-[var(--mac-label-3)]" />
              <span>{t.noMessages}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Reading Pane */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-[var(--mac-canvas-bg)]/50 p-6">
        {mode === 'notices' ? (
          selectedNotice ? (
            <div className="max-w-3xl mx-auto flex flex-col gap-4">
              <MacGroupBox className="bg-[var(--mac-window-bg)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[var(--ios-purple-subtle)] text-[var(--mac-purple)] flex items-center justify-center font-bold text-[13px] shrink-0">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-[var(--mac-label-1)] truncate">
                        {cleanSenderName(selectedNotice.author)}
                      </div>
                      <div className="text-[11px] text-[var(--mac-label-2)] tabular-nums">
                        {formatHumanDate(selectedNotice.date, true, lang)}
                      </div>
                    </div>
                  </div>
                </div>
                <h2 className="text-[19px] font-bold text-[var(--mac-label-1)] mt-3 leading-snug">
                  {selectedNotice.title}
                </h2>
              </MacGroupBox>

              <div className="mac-group-box bg-[var(--mac-window-bg)] p-5 text-[14px] leading-[1.7] text-[var(--mac-label-1)] whitespace-pre-wrap select-text">
                {renderClickableText(selectedNotice.content || t.emptyMessageContent)}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-[var(--mac-label-2)] gap-2">
              <Megaphone className="w-8 h-8 text-[var(--mac-label-3)]" />
              <span className="text-[13px]">
                {pickText(lang, { pl: 'Wybierz ogłoszenie z listy', en: 'Select a notice to read' })}
              </span>
            </div>
          )
        ) : selectedMsg ? (
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            <div className="mac-group-box bg-[var(--mac-window-bg)] p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)] flex items-center justify-center font-bold text-[13px] shrink-0">
                    {resolveAvatarLetter(cleanSenderName(selectedMsg.sender), selectedMsg.sender)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold text-[var(--mac-label-1)] truncate">
                      {cleanSenderName(selectedMsg.sender)}
                    </div>
                    <div className="text-[11.5px] text-[var(--mac-label-2)] tabular-nums">
                      {formatHumanDate(selectedMsg.date, true, lang)}
                    </div>
                  </div>
                </div>

                {!isNoReply && (
                  <MacPushButton
                    variant="tinted"
                    size="lg"
                    onClick={() => handleReply(selectedMsg)}
                    icon={<Reply className="w-3.5 h-3.5" />}
                  >
                    {t.replyAction}
                  </MacPushButton>
                )}
              </div>

              <h2 className="text-[19px] font-bold text-[var(--mac-label-1)] leading-snug break-words pt-1 border-t border-[var(--mac-row-divider)]">
                {selectedMsg.subject}
              </h2>
            </div>

            {isLoadingContent ? (
              <div className="mac-group-box bg-[var(--mac-window-bg)] p-10 flex items-center justify-center">
                <UiSpinner size="large" className="text-[var(--mac-blue)]" />
              </div>
            ) : (
              <>
                {readerAttachments.length > 0 && (
                  <MacGroupBox
                    title={pickText(lang, {
                      pl: `Załączniki (${readerAttachments.length})`,
                      en: `Attachments (${readerAttachments.length})`
                    })}
                    noPadding
                  >
                    <div className="divide-y divide-[var(--mac-row-divider)] bg-[var(--mac-window-bg)]">
                      {readerAttachments.map((att, idx) => (
                        <button
                          key={`${att.path}-${idx}`}
                          type="button"
                          onClick={() => handleDownload(att)}
                          disabled={Boolean(downloadingPath)}
                          className="w-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[var(--mac-fill-4)] cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Paperclip className="w-4 h-4 text-[var(--mac-blue)] shrink-0" />
                            <span className="text-[13px] font-medium text-[var(--mac-label-1)] truncate">
                              {att.name}
                            </span>
                          </div>
                          <span className="text-[12px] font-semibold text-[var(--mac-blue)] flex items-center gap-1 shrink-0">
                            {downloadingPath === att.path ? (
                              <UiSpinner size="small" className="text-[var(--mac-blue)]" />
                            ) : (
                              <>
                                <span>{pickText(lang, { pl: 'Pobierz', en: 'Download' })}</span>
                                <Download className="w-3.5 h-3.5" />
                              </>
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  </MacGroupBox>
                )}

                <div className="mac-group-box bg-[var(--mac-window-bg)] p-5 text-[14px] leading-[1.7] text-[var(--mac-label-1)] whitespace-pre-wrap select-text">
                  {renderClickableText(readerContent || t.emptyMessageContent)}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-[var(--mac-label-2)] gap-2">
            <MailOpen className="w-8 h-8 text-[var(--mac-label-3)]" />
            <span className="text-[13px]">
              {pickText(lang, { pl: 'Wybierz wiadomość, aby ją przeczytać', en: 'Select a message to read' })}
            </span>
          </div>
        )}
      </div>

      {/* macOS 27 Centered Compose / Reply Window */}
      <MacDialogWindow
        isOpen={isComposeOpen}
        onClose={onCloseCompose}
        title={t.newMessageTitle}
        widthClass="max-w-[640px]"
        headerActions={
          !sendSuccess && (
            <MacPushButton
              variant="prominent"
              size="lg"
              loading={isSending}
              disabled={
                isSending ||
                composeRecipients.length === 0 ||
                !composeTitle.trim() ||
                !composeBody.trim()
              }
              onClick={() => handleSend({ preventDefault: () => {} } as React.FormEvent)}
              icon={<Send className="w-3.5 h-3.5" />}
            >
              {isSending ? t.sending : t.send}
            </MacPushButton>
          )
        }
      >
        {sendSuccess ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--ios-green-subtle)] text-[var(--mac-green)] flex items-center justify-center">
              <Check className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div className="text-[16px] font-bold text-[var(--mac-label-1)]">{t.messageSent}</div>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex flex-col gap-3.5">
            <MacGroupBox noPadding>
              <div className="divide-y divide-[var(--mac-row-divider)]">
                {/* To field */}
                <div className="px-3.5 py-2.5 flex items-start gap-2.5">
                  <span className="text-[12.5px] text-[var(--mac-label-2)] w-14 pt-1 shrink-0">
                    {pickText(lang, { pl: 'Do:', en: 'To:' })}
                  </span>
                  <div className="flex-1 flex flex-wrap items-center gap-1.5">
                    {composeRecipients.map((r) => (
                      <span
                        key={r.id}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)] text-[12px] font-medium"
                      >
                        <span>{r.name}</span>
                        <button
                          type="button"
                          onClick={() => setComposeRecipients((p) => p.filter((x) => x.id !== r.id))}
                          className="cursor-pointer hover:opacity-70"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowRecipientList((p) => !p)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--mac-fill-3)] hover:bg-[var(--mac-fill-2)] text-[var(--mac-blue)] text-[12px] font-medium cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{pickText(lang, { pl: 'Dodaj odbiorcę', en: 'Add recipient' })}</span>
                    </button>
                  </div>
                </div>

                {/* Inline Recipient Picker Drawer */}
                {showRecipientList && (
                  <div className="p-3 bg-[var(--mac-fill-5)] flex flex-col gap-2">
                    <MacSearchField
                      value={recipientQuery}
                      onChange={setRecipientQuery}
                      placeholder={pickText(lang, { pl: 'Szukaj nauczyciela lub grupy...', en: 'Search teacher or group...' })}
                    />
                    <div className="max-h-[160px] overflow-y-auto divide-y divide-[var(--mac-row-divider)] rounded-[8px] border border-[var(--mac-group-border)] bg-[var(--mac-window-bg)]">
                      {filteredReceivers.length > 0 ? (
                        filteredReceivers.map((r) => {
                          const selected = composeRecipients.some((x) => x.id === r.id)
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() =>
                                setComposeRecipients((p) =>
                                  selected ? p.filter((x) => x.id !== r.id) : [...p, r]
                                )
                              }
                              className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left text-[12px] hover:bg-[var(--mac-fill-4)] cursor-pointer"
                            >
                              <div className="min-w-0">
                                <div className="font-medium text-[var(--mac-label-1)] truncate">{r.name}</div>
                                {r.group && (
                                  <div className="text-[10.5px] text-[var(--mac-label-2)] truncate">{r.group}</div>
                                )}
                              </div>
                              {selected && <Check className="w-3.5 h-3.5 text-[var(--mac-blue)] shrink-0" />}
                            </button>
                          )
                        })
                      ) : (
                        <div className="p-4 text-center text-[11.5px] text-[var(--mac-label-2)]">
                          {receivers.length === 0 ? t.updatingStatus : t.notSpecified}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Subject */}
                <div className="px-3.5 py-2.5 flex items-center gap-2.5">
                  <span className="text-[12.5px] text-[var(--mac-label-2)] w-14 shrink-0">
                    {pickText(lang, { pl: 'Temat:', en: 'Subject:' })}
                  </span>
                  <input
                    type="text"
                    value={composeTitle}
                    onChange={(e) => setComposeTitle(e.target.value)}
                    placeholder={t.subjectPlaceholder}
                    className="w-full bg-transparent text-[13px] text-[var(--mac-label-1)] placeholder-[var(--mac-label-2)] outline-none"
                    required
                  />
                </div>
              </div>
            </MacGroupBox>

            <textarea
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              placeholder={t.messagePlaceholder}
              rows={10}
              required
              className="w-full p-3.5 rounded-[12px] bg-[var(--mac-group-bg)] border border-[var(--mac-group-border)] text-[13px] leading-relaxed text-[var(--mac-label-1)] placeholder-[var(--mac-label-2)] outline-none mac-input-focus resize-none"
            />
          </form>
        )}
      </MacDialogWindow>
    </div>
  )
}
