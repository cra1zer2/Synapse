'use client'

import { useState } from 'react'
import { MessageItem, AnnouncementItem, ReceiverItem } from '@/models/message.model'
import { AppDictionary } from '@/config/dictionary.config'
import { cleanSenderName } from '@/utils/text.util'

interface MessagesWidgetProps {
    messages: MessageItem[]
    announcements: AnnouncementItem[]
    receivers: ReceiverItem[]
    onOpenMessage: (id: number | string) => Promise<string>
    onSendMessage: (receiverId: number, title: string, body: string) => Promise<boolean>
    t: AppDictionary
}

export function MessagesWidget({
    messages,
    announcements,
    receivers,
    onOpenMessage,
    onSendMessage,
    t
}: MessagesWidgetProps) {
    const [activeTab, setActiveTab] = useState<'inbox' | 'announcements'>('inbox')
    const [searchQuery, setSearchQuery] = useState('')

    const [activeReader, setActiveReader] = useState<{ title: string; sender: string; date: string; content: string } | null>(null)
    const [isLoadingContent, setIsLoadingContent] = useState(false)

    const [showCompose, setShowCompose] = useState(false)
    const [selectedReceiverId, setSelectedReceiverId] = useState<number | null>(null)
    const [composeTitle, setComposeTitle] = useState('')
    const [composeBody, setComposeBody] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [sendSuccess, setSendSuccess] = useState(false)

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
        setActiveReader({ title: msg.subject, sender: msg.sender, date: msg.date, content: '' })
        const fullContent = await onOpenMessage(msg.id)
        setActiveReader({ title: msg.subject, sender: msg.sender, date: msg.date, content: fullContent })
        setIsLoadingContent(false)
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
            }, 1000)
        }
    }

    return (
        <section className="w-full flex flex-col gap-3 min-h-[500px]">
            <div className="flex items-center justify-between gap-2">
                <div className="bg-[var(--ios-element)]/60 p-0.5 rounded-lg flex flex-1 max-w-xs">
                    <button
                        onClick={() => setActiveTab('inbox')}
                        className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${activeTab === 'inbox'
                                ? 'bg-[var(--ios-card)] text-[var(--ios-label)] shadow-xs'
                                : 'text-[var(--ios-secondary)]'
                            }`}
                    >
                        Odebrane ({messages.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('announcements')}
                        className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${activeTab === 'announcements'
                                ? 'bg-[var(--ios-card)] text-[var(--ios-label)] shadow-xs'
                                : 'text-[var(--ios-secondary)]'
                            }`}
                    >
                        Ogłoszenia ({announcements.length})
                    </button>
                </div>

                <button
                    onClick={() => setShowCompose(true)}
                    className="text-xs font-semibold text-[var(--ios-blue)] flex items-center gap-1 active:opacity-70"
                >
                    <span className="text-base font-bold">+</span>
                    <span>Napisz</span>
                </button>
            </div>

            <div className="bg-[var(--ios-element)]/40 rounded-xl px-3 py-1.5 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-[var(--ios-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    type="text"
                    placeholder="Szukaj w wiadomościach..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs text-[var(--ios-label)] outline-none"
                />
            </div>

            <div className="bg-[var(--ios-card)] rounded-2xl border border-[var(--ios-separator)]/20 overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]/20">
                {activeTab === 'inbox' ? (
                    filteredMessages.length > 0 ? (
                        filteredMessages.map((msg) => (
                            <article
                                key={msg.id}
                                onClick={() => handleReadMessage(msg)}
                                className="p-3.5 flex items-start gap-2.5 cursor-pointer active:bg-[var(--ios-element)]/30 transition-colors"
                            >
                                {!msg.isRead ? (
                                    <span className="w-2 h-2 rounded-full bg-[var(--ios-blue)] mt-1.5 shrink-0" />
                                ) : (
                                    <span className="w-2 h-2 rounded-full bg-transparent mt-1.5 shrink-0" />
                                )}

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="text-xs font-bold text-[var(--ios-label)] truncate">
                                            {cleanSenderName(msg.sender)}
                                        </span>
                                        <span className="text-[10px] text-[var(--ios-secondary)] shrink-0">
                                            {msg.date.split(' ')[0]}
                                        </span>
                                    </div>
                                    <h4 className="text-xs text-[var(--ios-secondary)] line-clamp-1 mt-0.5">
                                        {msg.subject}
                                    </h4>
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className="p-8 text-center text-xs text-[var(--ios-secondary)]">{t.noMessages}</div>
                    )
                ) : filteredAnnouncements.length > 0 ? (
                    filteredAnnouncements.map((item) => (
                        <article
                            key={item.id}
                            onClick={() =>
                                setActiveReader({
                                    title: item.title,
                                    sender: cleanSenderName(item.author),
                                    date: item.date,
                                    content: item.content
                                })
                            }
                            className="p-3.5 flex flex-col gap-1 cursor-pointer active:bg-[var(--ios-element)]/30 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[var(--ios-blue)]">{cleanSenderName(item.author)}</span>
                                <span className="text-[10px] text-[var(--ios-secondary)]">{item.date}</span>
                            </div>
                            <h4 className="text-xs font-bold text-[var(--ios-label)]">{item.title}</h4>
                            <p className="text-xs text-[var(--ios-secondary)] line-clamp-2 leading-relaxed">
                                {item.content}
                            </p>
                        </article>
                    ))
                ) : (
                    <div className="p-8 text-center text-xs text-[var(--ios-secondary)]">{t.noMessages}</div>
                )}
            </div>

            {activeReader && (
                <div
                    onClick={() => setActiveReader(null)}
                    className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[var(--ios-card)] rounded-2xl p-5 w-full max-w-lg border border-[var(--ios-separator)]/30 shadow-2xl flex flex-col gap-3 max-h-[80vh] overflow-y-auto"
                    >
                        <div className="flex items-start justify-between gap-2 border-b border-[var(--ios-separator)]/20 pb-3">
                            <div className="flex-1 min-w-0 pr-2">
                                <span className="text-[10px] font-bold text-[var(--ios-blue)] uppercase tracking-wider block">
                                    {cleanSenderName(activeReader.sender)}
                                </span>
                                <h3 className="text-sm font-bold text-[var(--ios-label)] mt-0.5 leading-snug break-words">
                                    {activeReader.title}
                                </h3>
                                <p className="text-[10px] text-[var(--ios-secondary)] mt-1">{activeReader.date}</p>
                            </div>
                            <button
                                onClick={() => setActiveReader(null)}
                                className="w-7 h-7 rounded-full bg-[var(--ios-element)] text-[var(--ios-secondary)] text-xs font-bold flex items-center justify-center shrink-0 active:scale-95"
                            >
                                ✕
                            </button>
                        </div>

                        {isLoadingContent ? (
                            <div className="py-8 flex items-center justify-center">
                                <div className="w-5 h-5 border-2 border-[var(--ios-blue)] border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <p className="text-xs text-[var(--ios-label)] leading-relaxed whitespace-pre-wrap">
                                {activeReader.content || 'Brak treści wiadomości'}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {showCompose && (
                <div
                    onClick={() => setShowCompose(false)}
                    className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[var(--ios-card)] rounded-2xl p-5 w-full max-w-lg border border-[var(--ios-separator)]/30 shadow-2xl flex flex-col gap-3"
                    >
                        <div className="flex items-center justify-between border-b border-[var(--ios-separator)]/20 pb-2">
                            <h3 className="text-sm font-bold text-[var(--ios-label)]">Nowa wiadomość</h3>
                            <button
                                onClick={() => setShowCompose(false)}
                                className="w-7 h-7 rounded-full bg-[var(--ios-element)] text-[var(--ios-secondary)] text-xs font-bold flex items-center justify-center shrink-0"
                            >
                                ✕
                            </button>
                        </div>

                        {sendSuccess ? (
                            <div className="bg-[#34c759]/10 text-[#34c759] p-3 rounded-xl text-center text-xs font-bold">
                                Wysłano wiadomość
                            </div>
                        ) : (
                            <form onSubmit={handleSend} className="flex flex-col gap-2">
                                <select
                                    value={selectedReceiverId || ''}
                                    onChange={(e) => setSelectedReceiverId(Number(e.target.value))}
                                    className="w-full bg-[var(--ios-element)]/50 text-[var(--ios-label)] text-xs rounded-xl px-3 py-2 outline-none"
                                    required
                                >
                                    <option value="">Wybierz odbiorcę</option>
                                    {receivers.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.name} ({r.group})
                                        </option>
                                    ))}
                                </select>

                                <input
                                    type="text"
                                    placeholder="Temat"
                                    value={composeTitle}
                                    onChange={(e) => setComposeTitle(e.target.value)}
                                    className="w-full bg-[var(--ios-element)]/50 text-[var(--ios-label)] text-xs rounded-xl px-3 py-2 outline-none"
                                    required
                                />

                                <textarea
                                    placeholder="Treść wiadomości..."
                                    value={composeBody}
                                    onChange={(e) => setComposeBody(e.target.value)}
                                    className="w-full bg-[var(--ios-element)]/50 text-[var(--ios-label)] text-xs rounded-xl p-3 outline-none resize-none h-24"
                                    required
                                />

                                <div className="flex gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowCompose(false)}
                                        className="flex-1 bg-[var(--ios-element)] text-[var(--ios-label)] text-xs font-bold py-2 rounded-xl"
                                    >
                                        Anuluj
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSending}
                                        className="flex-1 bg-[var(--ios-blue)] text-white text-xs font-bold py-2 rounded-xl disabled:opacity-40"
                                    >
                                        {isSending ? 'Wysyłanie...' : 'Wyślij'}
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