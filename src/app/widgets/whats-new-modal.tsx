'use client'

import { useState, useEffect } from 'react'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'

interface FeatureItem {
    icon: string
    title: string
    description: string
}

const CHANGELOG: Record<'pl' | 'en', FeatureItem[]> = {
    pl: [
        {
            icon: '📅',
            title: 'Składany pasek tygodnia',
            description: 'Kompaktowy kalendarz płynnie zwija się pod nagłówek przy przewijaniu lekcji.'
        },
        {
            icon: '🩺',
            title: 'Czysta frekwencja',
            description: 'Scalone statystyki przedmiotów, brak nieznanych lekcji i pełny ekran nieobecności.'
        },
        {
            icon: '⚡',
            title: 'Zaawansowane opcje',
            description: 'Kalkulator średniej bez +/- oraz natychmiastowy test opóźnień Librusa jednym kliknięciem.'
        },
        {
            icon: '📱',
            title: 'Metaliczne ikony i animacje',
            description: 'Nowa srebrna ikona PWA oraz płynne gesty powrotu w fizyce Apple.'
        }
    ],
    en: [
        {
            icon: '📅',
            title: 'Collapsible Week Bar',
            description: 'Compact weekly schedule bar pins seamlessly into the header on scroll.'
        },
        {
            icon: '🩺',
            title: 'Revamped Attendance',
            description: 'Merged subjects, zero phantom lessons, and native fullscreen absence details.'
        },
        {
            icon: '⚡',
            title: 'Advanced Settings',
            description: 'Grade GPA calculation without +/- and instant Librus latency tests in one tap.'
        },
        {
            icon: '📱',
            title: 'Metallic Icons & Gestures',
            description: 'New metallic silver PWA app icon and authentic iOS spring curve animations.'
        }
    ]
}

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

    useEffect(() => {
        if (isOpen) {
            const frame = requestAnimationFrame(() => setIsEntered(true))
            return () => cancelAnimationFrame(frame)
        } else {
            setIsEntered(false)
            setIsDismissing(false)
        }
    }, [isOpen])

    const handleDismiss = () => {
        if (isDismissing) return
        setIsDismissing(true)
        setTimeout(() => {
            onClose()
        }, 260)
    }

    if (!isOpen) return null

    const features = CHANGELOG[lang] || CHANGELOG.pl

    return (
        <div
            onClick={handleDismiss}
            className={`fixed inset-0 z-60 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 transition-opacity duration-260 ease-[cubic-bezier(0.16,1,0.3,1)] ${isEntered && !isDismissing ? 'opacity-100' : 'opacity-0'
                }`}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className={`bg-[var(--ios-card-solid)] rounded-[22px] w-full max-w-sm p-6 shadow-2xl flex flex-col gap-5 transition-all duration-260 ease-[cubic-bezier(0.16,1,0.3,1)] ${isEntered && !isDismissing
                        ? 'opacity-100 scale-100 translate-y-0'
                        : 'opacity-0 scale-95 translate-y-4 sm:translate-y-2'
                    }`}
            >
                <div className="flex flex-col items-center text-center gap-1.5 pt-1">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--ios-element)] flex items-center justify-center text-2xl shadow-xs mb-1">
                        ✨
                    </div>
                    <h3 className="text-xl font-semibold tracking-tight text-[var(--ios-label)]">
                        {t.whatsNewTitle}
                    </h3>
                    <p className="text-xs font-normal text-[var(--ios-secondary)]">
                        {t.whatsNewSubtitle}
                    </p>
                </div>

                <div className="flex flex-col gap-3.5 my-1">
                    {features.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[var(--ios-room-bg)] text-[var(--ios-blue)] flex items-center justify-center text-base shrink-0 mt-0.5">
                                {item.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-semibold text-[var(--ios-label)] leading-snug">
                                    {item.title}
                                </h4>
                                <p className="text-[11px] font-normal text-[var(--ios-secondary)] leading-relaxed mt-0.5">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={handleDismiss}
                    className="h-12 w-full bg-[var(--ios-blue)] text-white text-xs font-semibold rounded-xl active:scale-[0.98] active:opacity-85 shadow-xs transition-all mt-1 flex items-center justify-center cursor-pointer"
                >
                    {t.whatsNewAction}
                </button>
            </div>
        </div>
    )
}

export default WhatsNewModal