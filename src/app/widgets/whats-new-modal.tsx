'use client'

import { useState, useEffect } from 'react'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { CURRENT_APP_VERSION, getSmartChangelog, ChangelogItem } from '@/config/version.config'

interface WhatsNewModalProps {
    isOpen: boolean
    onClose: () => void
    lang: AppLanguage
    t: AppDictionary
}

export function WhatsNewModal({
    isOpen,
    onClose,
    lang,
    t
}: WhatsNewModalProps) {
    const [isEntered, setIsEntered] = useState(false)
    const [isDismissing, setIsDismissing] = useState(false)
    const [showFullLog, setShowFullLog] = useState(false)
    const [changelogData, setChangelogData] = useState<{
        topHighlights: ChangelogItem[]
        fullReleases: Array<{ version: string; releaseDate: string; items: ChangelogItem[] }>
        hasMultipleVersions: boolean
        totalNewItemsCount: number
    }>({
        topHighlights: [],
        fullReleases: [],
        hasMultipleVersions: false,
        totalNewItemsCount: 0
    })

    useEffect(() => {
        if (isOpen) {
            const lastSeen = typeof window !== 'undefined' ? localStorage.getItem('synapse_seen_version') : null
            const smart = getSmartChangelog(lastSeen, lang)
            setChangelogData(smart)

            const frame = requestAnimationFrame(() => setIsEntered(true))
            return () => cancelAnimationFrame(frame)
        } else {
            setIsEntered(false)
            setIsDismissing(false)
            setShowFullLog(false)
        }
    }, [isOpen, lang])

    const handleDismiss = () => {
        if (isDismissing) return
        setIsDismissing(true)
        setTimeout(() => {
            onClose()
        }, 260)
    }

    if (!isOpen) return null

    const toggleLabel = lang === 'en'
        ? (showFullLog ? 'Show Highlights Only' : `Read All Release Notes (+${changelogData.totalNewItemsCount - changelogData.topHighlights.length} more)`)
        : (showFullLog ? 'Pokaż tylko najważniejsze' : `Czytaj pełny dziennik zmian (+${changelogData.totalNewItemsCount - changelogData.topHighlights.length} więcej)`)

    return (
        <div
            onClick={handleDismiss}
            className={`fixed inset-0 z-60 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 transition-opacity duration-260 ease-[cubic-bezier(0.16,1,0.3,1)] ${isEntered && !isDismissing ? 'opacity-100' : 'opacity-0'
                }`}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className={`bg-[var(--ios-card-solid)] rounded-[22px] w-full max-w-sm p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto transition-all duration-260 ease-[cubic-bezier(0.16,1,0.3,1)] ${isEntered && !isDismissing
                    ? 'opacity-100 scale-100 translate-y-0'
                    : 'opacity-0 scale-95 translate-y-4 sm:translate-y-2'
                    }`}
            >
                <div className="flex flex-col items-center text-center gap-1 pt-1">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--ios-element)] flex items-center justify-center text-2xl shadow-xs mb-1">
                        ✨
                    </div>
                    <h3 className="text-xl font-semibold tracking-tight text-[var(--ios-label)]">
                        {t.whatsNewTitle}
                    </h3>
                    <p className="text-xs font-normal text-[var(--ios-secondary)]">
                        v{CURRENT_APP_VERSION}
                    </p>
                </div>

                {!showFullLog ? (
                    <div className="flex flex-col gap-3 my-1">
                        {changelogData.topHighlights.map((item) => (
                            <div key={item.id} className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-[var(--ios-room-bg)] text-[var(--ios-blue)] flex items-center justify-center text-base shrink-0 mt-0.5">
                                    {item.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-xs font-semibold text-[var(--ios-label)] leading-snug">
                                        {item.title[lang]}
                                    </h4>
                                    <p className="text-[11px] font-normal text-[var(--ios-secondary)] leading-relaxed mt-0.5">
                                        {item.description[lang]}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 my-1">
                        {changelogData.fullReleases.map((release) => (
                            <div key={release.version} className="flex flex-col gap-2">
                                <div className="flex items-center justify-between border-b border-[var(--ios-separator)] pb-1 px-0.5">
                                    <span className="text-xs font-semibold text-[var(--ios-blue)]">
                                        v{release.version}
                                    </span>
                                    <span className="text-[10px] text-[var(--ios-secondary)] font-normal">
                                        {release.releaseDate}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-2.5 pl-1">
                                    {release.items.map((item) => (
                                        <div key={item.id} className="flex items-start gap-2.5">
                                            <span className="text-sm shrink-0 mt-0.5">{item.icon}</span>
                                            <div className="min-w-0 flex-1">
                                                <h5 className="text-xs font-medium text-[var(--ios-label)] leading-tight">
                                                    {item.title[lang]}
                                                </h5>
                                                <p className="text-[10px] font-normal text-[var(--ios-secondary)] leading-normal mt-0.5">
                                                    {item.description[lang]}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {changelogData.totalNewItemsCount > changelogData.topHighlights.length && (
                    <button
                        type="button"
                        onClick={() => setShowFullLog(!showFullLog)}
                        className="text-[11px] font-semibold text-[var(--ios-blue)] text-center py-1 active:opacity-70 transition-opacity"
                    >
                        {toggleLabel}
                    </button>
                )}

                <button
                    type="button"
                    onClick={handleDismiss}
                    className="h-11 w-full bg-[var(--ios-blue)] text-white text-xs font-semibold rounded-xl active:scale-[0.98] active:opacity-85 shadow-xs transition-all mt-1 flex items-center justify-center cursor-pointer shrink-0"
                >
                    {t.whatsNewAction}
                </button>
            </div>
        </div>
    )
}

export default WhatsNewModal