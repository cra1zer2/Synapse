'use client'

import { useState } from 'react'
import { MessageItem, AnnouncementItem, ReceiverItem } from '@/models/message.model'
import { AppDictionary } from '@/config/dictionary.config'

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

    const filteredMessages = messages.filter((m) =>
        searchQuery === '' ||
        m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.sender.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredAnnouncements = announcements.filter((a) =>
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
            }, 1200)
        }
    }

    return (
        <section className="w-full flex flex-col gap-3 min-h-[540px]">
            <div className="bg-[var(--bg-card)] rounded-3xl p-3 border border-[var(--border-subtle)] shadow-xs flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                    <div className="bg-[var(--bg-element)] p-1 rounded-2xl flex flex-1">
                        <button
                            onClick={() => setActiveTab('inbox')}
                            className={`flex-1 py-1.5 text-xs font-extrabold rounded-xl transition-all ${activeTab === 'inbox'
                                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs'
                                    : 'text-[var(--text-secondary)]'
                                }`}
                        >
                            {t.messagesInbox} ({messages.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('announcements')}
                            className={`flex-1 py-1.5 text-xs font-extrabold rounded-xl transition-all ${activeTab === 'announcements'
                                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs'
                                    : 'text-[var(--text-secondary)]'
                                }`}
                        >
                            {t.messagesAnnouncements} ({announcements.length})
                        </button>
                    </div>

                    <button
                        onClick={() => setShowCompose(true)}
                        className="h-9 px-3 rounded-2xl bg-[#007aff] text-white text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-transform shrink-0"
                    >
                        <span>+</span>
                        <span>{t.composeMessage}</span>
                    </button>
                </div>

                <input
                    type="text"
                    placeholder="Szukaj..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] text-xs font-medium rounded-xl px-3.5 py-2 outline-none focus:ring-2 focus:ring-[#007aff]"
                />
            </div>

            <div className="flex flex-col gap-2">
                {activeTab === 'inbox' ? (
                    filteredMessages.length > 0 ? (
                        filteredMessages.map((msg) => (
                            <article
                                key={msg.id}
                                onClick={() => handleReadMessage(msg)}
                                className="bg-[var(--bg-card)] rounded-3xl p-4 border border-[var(--border-subtle)] shadow-xs flex flex-col gap-1.5 cursor-pointer active:scale-[0.99] transition-transform"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-[var(--text-primary)] truncate max-w-[200px]">
                                        {msg.sender}
                                    </span>
                                    <span className="text-[10px] text-[var(--text-secondary)] bg-[var(--bg-input)] px-2 py-0.5 rounded-lg">
                                        {msg.date}
                                    </span>
                                </div>
                                <h4 className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">
                                    {msg.subject}
                                </h4>
                            </article>
                        ))
                    ) : (
                        <div className="bg-[var(--bg-card)] rounded-3xl p-10 border border-[var(--border-subtle)] text-center text-xs text-[var(--text-secondary)]">
                            {t.noMessages}
                        </div>
                    )
                ) : filteredAnnouncements.length > 0 ? (
                    filteredAnnouncements.map((item) => (
                        <article
                            key={item.id}
                            onClick={() => setActiveReader({ title: item.title, sender: item.author, date: item.date, content: item.content })}
                            className="bg-[var(--bg-card)] rounded-3xl p-4 border border-[var(--border-subtle)] shadow-xs flex flex-col gap-2 cursor-pointer active:scale-[0.99] transition-transform"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-[#007aff]">{item.author}</span>
                                <span className="text-[10px] text-[var(--text-secondary)]">{item.date}</span>
                            </div>
                            <h4 className="text-xs font-extrabold text-[var(--text-primary)]">{item.title}</h4>
                            <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                                {item.content}
                            </p>
                        </article>
                    ))
                ) : (
                    <div className="bg-[var(--bg-card)] rounded-3xl p-10 border border-[var(--border-subtle)] text-center text-xs text-[var(--text-secondary)]">
                        {t.noMessages}
                    </div>
                )}
            </div>

            {activeReader && (
                <div
                    onClick={() => setActiveReader(null)}
                    className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[var(--bg-card)] rounded-3xl p-5 w-full max-w-lg border border-[var(--border-subtle)] shadow-2xl flex flex-col gap-3.5 max-h-[85vh] overflow-y-auto"
                    >
                        <div className="flex items-start justify-between border-b border-[var(--border-subtle)] pb-3">
                            <div>
                                <span className="text-[10px] font-bold text-[#007aff] uppercase tracking-wider">{activeReader.sender}</span>
                                <h3 className="text-sm font-black text-[var(--text-primary)] mt-0.5">{activeReader.title}</h3>
                                <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{activeReader.date}</p>
                            </div>
                            <button
                                onClick={() => setActiveReader(null)}
                                className="w-7 h-7 rounded-full bg-[var(--bg-element)] text-[var(--text-secondary)] text-xs font-bold flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>

                        {isLoadingContent ? (
                            <div className="py-8 flex items-center justify-center">
                                <div className="w-5 h-5 border-2 border-[var(--text-primary)] border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <p className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                                {activeReader.content || 'Brak treści wiadomości'}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {showCompose && (
                <div
                    onClick={() => setShowCompose(false)}
                    className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[var(--bg-card)] rounded-3xl p-5 w-full max-w-lg border border-[var(--border-subtle)] shadow-2xl flex flex-col gap-3.5"
                    >
                        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                            <h3 className="text-sm font-black text-[var(--text-primary)]">{t.composeMessage}</h3>
                            <button
                                onClick={() => setShowCompose(false)}
                                className="w-7 h-7 rounded-full bg-[var(--bg-element)] text-[var(--text-secondary)] text-xs font-bold flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>

                        {sendSuccess ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 p-4 rounded-2xl text-center text-xs font-bold">
                                ✓ Wysłano wiadomość
                            </div>
                        ) : (
                            <form onSubmit={handleSend} className="flex flex-col gap-2.5">
                                <select
                                    value={selectedReceiverId || ''}
                                    onChange={(e) => setSelectedReceiverId(Number(e.target.value))}
                                    className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] text-xs rounded-xl px-3 py-2.5 outline-none"
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
                                    className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] text-xs rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#007aff]"
                                    required
                                />

                                <textarea
                                    placeholder={t.messagePlaceholder}
                                    value={composeBody}
                                    onChange={(e) => setComposeBody(e.target.value)}
                                    className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] text-xs rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#007aff] resize-none h-28"
                                    required
                                />

                                <div className="flex gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowCompose(false)}
                                        className="flex-1 bg-[var(--bg-element)] text-[var(--text-primary)] text-xs font-bold py-2.5 rounded-xl active:opacity-80"
                                    >
                                        {t.cancel}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSending}
                                        className="flex-1 bg-[#007aff] text-white text-xs font-bold py-2.5 rounded-xl active:opacity-80 disabled:opacity-40 transition-all shadow-xs"
                                    >
                                        {isSending ? t.sending : t.send}
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