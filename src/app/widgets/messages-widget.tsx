'use client'

import { useState, useRef } from 'react'
import { MessageItem, AnnouncementItem, ReceiverItem } from '@/models/message.model'
import { AppDictionary } from '@/config/dictionary.config'
import { cleanSenderName } from '@/utils/text.util'

interface MessagesWidgetProps {
    messages: MessageItem[]
    announcements: AnnouncementItem[]
    receivers: ReceiverItem[]
    onOpenMessage: (id: number | string) => Promise<string>
    onSendMessage: (receiverId: number, title: string, body: string) => Promise<boolean>
    isLoading?: boolean
    t: AppDictionary
}

function IosSpinner({ className = 'w-5 h-5 text-[var(--ios-secondary)]' }: { className?: string }) {
    return (
        <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
            <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="1" />
            <line x1="19.07" y1="4.93" x2="16.24" y2="7.76" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.875" />
            <line x1="22" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
            <line x1="19.07" y1="19.07" x2="16.24" y2="16.24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.625" />
            <line x1="12" y1="22" x2="12" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.375" />
            <line x1="2" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.25" />
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.125" />
        </svg>
    )
}

export function MessagesWidget({
    messages,
    announcements,
    receivers,
    onOpenMessage,
    onSendMessage,
    isLoading = false,
    t
}: MessagesWidgetProps) {
    const [activeTab, setActiveTab] = useState<'inbox' | 'announcements'>('inbox')
    const [searchQuery, setSearchQuery] = useState('')

    const [activeReader, setActiveReader] = useState<{
        title: string
        sender: string
        date: string
        content: string
        originalItem?: MessageItem | AnnouncementItem
    } | null>(null)
    const [isLoadingContent, setIsLoadingContent] = useState(false)

    const [showCompose, setShowCompose] = useState(false)
    const [selectedReceiverId, setSelectedReceiverId] = useState<number | null>(null)
    const [composeTitle, setComposeTitle] = useState('')
    const [composeBody, setComposeBody] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [sendSuccess, setSendSuccess] = useState(false)

    const [dragOffset, setDragOffset] = useState(0)
    const touchStartX = useRef(0)
    const isSwiping = useRef(false)

    const filteredMessages = messages.filter(
        (m) =>
            searchQuery === '' ||
            m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.sender.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredAnnouncements = announcements.filter(
        (a) =>
            searchQuery === '' ||
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.author.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleReadMessage = async (msg: MessageItem) => {
        setIsLoadingContent(true)
        setActiveReader({
            title: msg.subject,
            sender: msg.sender,
            date: msg.date,
            content: '',
            originalItem: msg
        })
        const fullContent = await onOpenMessage(msg.id)
        setActiveReader({
            title: msg.subject,
            sender: msg.sender,
            date: msg.date,
            content: fullContent,
            originalItem: msg
        })
        setIsLoadingContent(false)
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        const clientX = e.touches[0].clientX
        touchStartX.current = clientX
        if (clientX < 60) {
            isSwiping.current = true
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isSwiping.current) return
        const currentX = e.touches[0].clientX
        const delta = currentX - touchStartX.current
        if (delta > 0) {
            setDragOffset(delta)
        }
    }

    const handleTouchEnd = () => {
        if (!isSwiping.current) return
        isSwiping.current = false
        if (dragOffset > 85) {
            setActiveReader(null)
        }
        setDragOffset(0)
    }

    const handleInitiateReply = () => {
        if (!activeReader) return

        const cleanedAuthor = cleanSenderName(activeReader.sender).toLowerCase()
        const matched = receivers.find((r) => {
            const receiverClean = r.name.toLowerCase()
            return receiverClean.includes(cleanedAuthor) || cleanedAuthor.includes(receiverClean)
        })

        if (matched) {
            setSelectedReceiverId(matched.id)
        } else if (receivers.length > 0) {
            setSelectedReceiverId(receivers[0].id)
        }

        const replySubject = activeReader.title.toLowerCase().startsWith('re:')
            ? activeReader.title
            : `Re: ${activeReader.title}`

        setComposeTitle(replySubject)
        setComposeBody('')
        setActiveReader(null)
        setShowCompose(true)
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedReceiverId || !composeTitle || !composeBody) return

        setIsSending(true)
        const ok = await onSendMessage(selectedReceiverId, composeTitle, composeBody)
        setIsSending(false)

        if (ok) {
            setSendSuccess(true)
            setTimeout(() => {
                setSendSuccess(false)
                setShowCompose(false)
                setComposeTitle('')
                setComposeBody('')
                setSelectedReceiverId(null)
            }, 800)
        }
    }

    return (
        <section className="w-full flex flex-col gap-3 min-h-[500px]">
            <div className="flex items-center justify-between gap-2">
                <div className="bg-[var(--ios-element)]/60 p-0.5 rounded-xl flex flex-1 max-w-xs">
                    <button
                        onClick={() => setActiveTab('inbox')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'inbox'
                                ? 'bg-[var(--ios-card)] text-[var(--ios-label)] shadow-xs'
                                : 'text-[var(--ios-secondary)]'
                            }`}
                    >
                        {t.messagesInbox} ({messages.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('announcements')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'announcements'
                                ? 'bg-[var(--ios-card)] text-[var(--ios-label)] shadow-xs'
                                : 'text-[var(--ios-secondary)]'
                            }`}
                    >
                        {t.messagesAnnouncements} ({announcements.length})
                    </button>
                </div>

                <button
                    onClick={() => setShowCompose(true)}
                    className="text-xs font-semibold text-[var(--ios-blue)] flex items-center gap-1 active:opacity-70 px-2 py-1"
                >
                    <span className="text-base font-semibold">+</span>
                    <span>{t.writeNewMessage}</span>
                </button>
            </div>

            <div className="bg-[var(--ios-element)]/50 rounded-xl px-3 py-2 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-[var(--ios-secondary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    type="text"
                    placeholder={t.searchMessagesPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs text-[var(--ios-label)] outline-none placeholder-[var(--ios-secondary)]"
                />
            </div>

            {isLoading && messages.length === 0 && announcements.length === 0 ? (
                <div className="bg-[var(--ios-card)] rounded-2xl p-12 border border-[var(--ios-border)] backdrop-blur-xl flex flex-col items-center justify-center gap-3">
                    <IosSpinner className="w-6 h-6 text-[var(--ios-blue)]" />
                    <p className="text-xs font-medium text-[var(--ios-secondary)]">Wczytywanie...</p>
                </div>
            ) : (
                <div className="bg-[var(--ios-card)] rounded-2xl border border-[var(--ios-separator)] overflow-hidden shadow-[var(--ios-shadow)] divide-y divide-[var(--ios-separator)]">
                    {activeTab === 'inbox' ? (
                        filteredMessages.length > 0 ? (
                            filteredMessages.map((msg, index) => (
                                <article
                                    key={msg.id}
                                    onClick={() => handleReadMessage(msg)}
                                    style={{ animationDelay: `${index * 30}ms` }}
                                    className="p-3.5 flex items-start gap-2.5 cursor-pointer active:bg-[var(--ios-element)]/30 transition-colors animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-200"
                                >
                                    {!msg.isRead ? (
                                        <span className="w-2 h-2 rounded-full bg-[var(--ios-blue)] mt-1.5 shrink-0" />
                                    ) : (
                                        <span className="w-2 h-2 rounded-full bg-transparent mt-1.5 shrink-0" />
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="text-xs font-semibold text-[var(--ios-label)] truncate">
                                                {cleanSenderName(msg.sender)}
                                            </span>
                                            <span className="text-[10px] font-normal text-[var(--ios-secondary)] shrink-0">
                                                {msg.date.split(' ')[0]}
                                            </span>
                                        </div>
                                        <h4 className="text-xs font-normal text-[var(--ios-secondary)] line-clamp-1 mt-0.5">
                                            {msg.subject}
                                        </h4>
                                    </div>
                                </article>
                            ))
                        ) : (
                            <div className="p-8 text-center text-xs text-[var(--ios-secondary)]">{t.noMessages}</div>
                        )
                    ) : filteredAnnouncements.length > 0 ? (
                        filteredAnnouncements.map((item, index) => (
                            <article
                                key={item.id}
                                onClick={() =>
                                    setActiveReader({
                                        title: item.title,
                                        sender: cleanSenderName(item.author),
                                        date: item.date,
                                        content: item.content,
                                        originalItem: item
                                    })
                                }
                                style={{ animationDelay: `${index * 30}ms` }}
                                className="p-3.5 flex flex-col gap-1 cursor-pointer active:bg-[var(--ios-element)]/30 transition-colors animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-200"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-[var(--ios-blue)]">{cleanSenderName(item.author)}</span>
                                    <span className="text-[10px] font-normal text-[var(--ios-secondary)]">{item.date}</span>
                                </div>
                                <h4 className="text-xs font-semibold text-[var(--ios-label)]">{item.title}</h4>
                                <p className="text-xs font-normal text-[var(--ios-secondary)] line-clamp-2 leading-relaxed">
                                    {item.content}
                                </p>
                            </article>
                        ))
                    ) : (
                        <div className="p-8 text-center text-xs text-[var(--ios-secondary)]">{t.noMessages}</div>
                    )}
                </div>
            )}

            {activeReader && (
                <div
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{
                        transform: `translateX(${dragOffset}px)`,
                        transition: isSwiping.current ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                    className="fixed inset-0 z-50 bg-[var(--ios-bg)] flex flex-col animate-in fade-in slide-in-from-right duration-250"
                >
                    <header className="sticky top-0 z-10 w-full pt-[max(calc(env(safe-area-inset-top,0px)+0.75rem),1.75rem)] pb-2.5 px-4 bg-[var(--ios-bg)]/85 backdrop-blur-xl border-b border-[var(--ios-separator)] flex items-center justify-between">
                        <button
                            onClick={() => setActiveReader(null)}
                            className="flex items-center gap-1 text-[var(--ios-blue)] text-xs font-medium active:opacity-70 -ml-1 py-1 pr-2"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                            <span>{t.backToMessages}</span>
                        </button>

                        <button
                            onClick={handleInitiateReply}
                            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ios-blue)] active:opacity-75 py-1 px-3 bg-[var(--ios-blue)]/12 rounded-full transition-all"
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 17 4 12 9 7" />
                                <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                            </svg>
                            <span>{t.replyAction}</span>
                        </button>
                    </header>

                    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 max-w-lg mx-auto w-full pb-[calc(env(safe-area-inset-bottom,0px)+2rem)]">
                        <div className="bg-[var(--ios-card)] rounded-2xl p-4 border border-[var(--ios-border)] shadow-xs flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2 border-b border-[var(--ios-separator)] pb-2.5">
                                <div className="min-w-0">
                                    <span className="text-[10px] font-semibold text-[var(--ios-blue)] uppercase tracking-wider block">
                                        {cleanSenderName(activeReader.sender)}
                                    </span>
                                    <p className="text-[11px] font-normal text-[var(--ios-secondary)] mt-0.5">
                                        {activeReader.date}
                                    </p>
                                </div>
                            </div>

                            <h2 className="text-base font-semibold text-[var(--ios-label)] leading-snug break-words">
                                {activeReader.title}
                            </h2>
                        </div>

                        <div className="bg-[var(--ios-card)] rounded-2xl p-4 border border-[var(--ios-border)] shadow-xs min-h-[160px] flex flex-col">
                            {isLoadingContent ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-2.5 my-auto">
                                    <IosSpinner className="w-6 h-6 text-[var(--ios-blue)]" />
                                </div>
                            ) : (
                                <p className="text-xs font-normal text-[var(--ios-label)] leading-relaxed whitespace-pre-wrap select-text">
                                    {activeReader.content || 'Brak treści wiadomości'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showCompose && (
                <div
                    onClick={() => setShowCompose(false)}
                    className="fixed inset-0 z-50 bg-black/45 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[var(--ios-card)] rounded-3xl p-5 w-full max-w-lg border border-[var(--ios-border)] shadow-2xl flex flex-col gap-3.5 max-h-[85vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between border-b border-[var(--ios-separator)] pb-2.5">
                            <h3 className="text-sm font-semibold text-[var(--ios-label)]">{t.newMessageTitle}</h3>
                            <button
                                onClick={() => setShowCompose(false)}
                                className="w-7 h-7 rounded-full bg-[var(--ios-element)] text-[var(--ios-secondary)] text-xs font-semibold flex items-center justify-center active:scale-95 transition-transform"
                            >
                                ✕
                            </button>
                        </div>

                        {sendSuccess ? (
                            <div className="bg-[#34c759]/15 text-[#34c759] p-4 rounded-xl text-center text-xs font-semibold flex items-center justify-center gap-2">
                                <span>✓</span>
                                <span>Wysłano wiadomość</span>
                            </div>
                        ) : (
                            <form onSubmit={handleSend} className="flex flex-col gap-2.5">
                                <select
                                    value={selectedReceiverId || ''}
                                    onChange={(e) => setSelectedReceiverId(Number(e.target.value))}
                                    className="w-full bg-[var(--ios-element)] text-[var(--ios-label)] text-xs font-medium rounded-xl px-3.5 py-2.5 outline-none"
                                    required
                                >
                                    <option value="">{t.recipientPlaceholder}</option>
                                    {receivers.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.name} ({r.group})
                                        </option>
                                    ))}
                                </select>

                                <input
                                    type="text"
                                    placeholder={t.subjectPlaceholder}
                                    value={composeTitle}
                                    onChange={(e) => setComposeTitle(e.target.value)}
                                    className="w-full bg-[var(--ios-element)] text-[var(--ios-label)] text-xs font-medium rounded-xl px-3.5 py-2.5 outline-none placeholder-[var(--ios-secondary)]"
                                    required
                                />

                                <textarea
                                    placeholder={t.messagePlaceholder}
                                    value={composeBody}
                                    onChange={(e) => setComposeBody(e.target.value)}
                                    className="w-full bg-[var(--ios-element)] text-[var(--ios-label)] text-xs font-normal rounded-xl p-3 outline-none resize-none h-28 placeholder-[var(--ios-secondary)]"
                                    required
                                />

                                <div className="flex gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowCompose(false)}
                                        className="flex-1 bg-[var(--ios-element)] text-[var(--ios-label)] text-xs font-semibold py-2.5 rounded-xl active:opacity-75 transition-opacity"
                                    >
                                        {t.cancel}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSending}
                                        className="flex-1 bg-[var(--ios-blue)] text-white text-xs font-semibold py-2.5 rounded-xl disabled:opacity-45 active:opacity-85 transition-all shadow-xs flex items-center justify-center gap-1.5"
                                    >
                                        {isSending && <IosSpinner className="w-3.5 h-3.5 text-white" />}
                                        <span>{isSending ? t.sending : t.send}</span>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </section>
    )
}