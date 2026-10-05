'use client'

import { useState, useEffect } from 'react'
import { StudentProfile } from '@/models/account.model'
import { AppDictionary, AppLanguage, AppTheme } from '@/config/dictionary.config'
import { requestPushPermission, getNotificationPermissionStatus } from '@/services/notification.service'

interface SettingsSheetProps {
    isOpen: boolean
    onClose: () => void
    profile: StudentProfile | null
    currentLang: AppLanguage
    onSelectLang: (lang: AppLanguage) => void
    currentTheme: AppTheme
    onSelectTheme: (theme: AppTheme) => void
    username: string
    setUsername: (u: string) => void
    password: string
    setPassword: (p: string) => void
    onSaveCredentials: (e: React.FormEvent) => void
    onLogout: () => void
    t: AppDictionary
}

export function SettingsSheet({
    isOpen,
    onClose,
    profile,
    currentLang,
    onSelectLang,
    currentTheme,
    onSelectTheme,
    username,
    setUsername,
    password,
    setPassword,
    onSaveCredentials,
    onLogout,
    t
}: SettingsSheetProps) {
    const [showCredentialsForm, setShowCredentialsForm] = useState(false)
    const [pushStatus, setPushStatus] = useState<string>('default')

    useEffect(() => {
        if (isOpen) {
            setPushStatus(getNotificationPermissionStatus())
            document.body.classList.add('overflow-hidden')
        } else {
            document.body.classList.remove('overflow-hidden')
        }
        return () => {
            document.body.classList.remove('overflow-hidden')
        }
    }, [isOpen])

    const handleTogglePush = async () => {
        const res = await requestPushPermission()
        setPushStatus(res)
    }

    if (!isOpen) return null

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--ios-bg)] rounded-2xl p-4 w-full max-w-lg shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-[var(--ios-label)]">Ustawienia</h2>
                    <button
                        onClick={onClose}
                        className="text-xs font-bold text-[var(--ios-blue)] active:opacity-70"
                    >
                        Gotowe
                    </button>
                </div>

                <div className="bg-[var(--ios-card)] rounded-xl p-3 border border-[var(--ios-separator)]/20 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--ios-blue)] text-white flex items-center justify-center font-bold text-sm shrink-0">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-xs font-bold text-[var(--ios-label)] truncate">
                            {profile?.fullName && profile.fullName !== 'Konto Librus' ? profile.fullName : username}
                        </h3>
                        <p className="text-[11px] text-[var(--ios-secondary)] truncate">
                            {profile?.className || 'Klasa Technikum'} • {profile?.schoolName || 'TEB Edukacja'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-[var(--ios-secondary)] px-1">Wygląd i język</span>
                    <div className="bg-[var(--ios-card)] rounded-xl border border-[var(--ios-separator)]/20 divide-y divide-[var(--ios-separator)]/20">
                        <div className="p-3 flex items-center justify-between">
                            <span className="text-xs font-medium text-[var(--ios-label)]">Motyw</span>
                            <div className="bg-[var(--ios-element)]/60 p-0.5 rounded-lg flex gap-0.5">
                                {[
                                    { id: 'system' as AppTheme, label: 'Auto' },
                                    { id: 'light' as AppTheme, label: 'Jasny' },
                                    { id: 'dark' as AppTheme, label: 'Ciemny' }
                                ].map((th) => (
                                    <button
                                        key={th.id}
                                        onClick={() => onSelectTheme(th.id)}
                                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-all ${currentTheme === th.id
                                                ? 'bg-[var(--ios-card)] text-[var(--ios-label)] shadow-xs'
                                                : 'text-[var(--ios-secondary)]'
                                            }`}
                                    >
                                        {th.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-3 flex items-center justify-between">
                            <span className="text-xs font-medium text-[var(--ios-label)]">Język</span>
                            <div className="bg-[var(--ios-element)]/60 p-0.5 rounded-lg flex gap-0.5">
                                {[
                                    { id: 'pl' as AppLanguage, label: 'PL' },
                                    { id: 'en' as AppLanguage, label: 'EN' },
                                    { id: 'ru' as AppLanguage, label: 'RU' }
                                ].map((l) => (
                                    <button
                                        key={l.id}
                                        onClick={() => onSelectLang(l.id)}
                                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-all ${currentLang === l.id
                                                ? 'bg-[var(--ios-card)] text-[var(--ios-label)] shadow-xs'
                                                : 'text-[var(--ios-secondary)]'
                                            }`}
                                    >
                                        {l.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-[var(--ios-secondary)] px-1">Powiadomienia</span>
                    <div className="bg-[var(--ios-card)] rounded-xl border border-[var(--ios-separator)]/20 p-3 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-[var(--ios-label)]">Web Push</p>
                            <p className="text-[10px] text-[var(--ios-secondary)]">Dzwonki, oceny, zastępstwa</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleTogglePush}
                            className={`text-xs font-bold px-2.5 py-1 rounded-full ${pushStatus === 'granted'
                                    ? 'bg-[#34c759]/15 text-[#34c759]'
                                    : 'bg-[var(--ios-blue)] text-white'
                                }`}
                        >
                            {pushStatus === 'granted' ? 'Włączone' : 'Włącz'}
                        </button>
                    </div>
                </div>

                <div className="bg-[var(--ios-card)] rounded-xl border border-[var(--ios-separator)]/20 overflow-hidden">
                    <button
                        onClick={() => setShowCredentialsForm(!showCredentialsForm)}
                        className="w-full p-3 flex items-center justify-between text-left"
                    >
                        <span className="text-xs font-medium text-[var(--ios-label)]">Konto Librus Synergia</span>
                        <span className="text-xs text-[var(--ios-secondary)]">
                            {showCredentialsForm ? '▲' : '›'}
                        </span>
                    </button>

                    {showCredentialsForm && (
                        <form onSubmit={onSaveCredentials} className="p-3 border-t border-[var(--ios-separator)]/20 flex flex-col gap-2">
                            <input
                                type="text"
                                placeholder="Login / ID"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-[var(--ios-bg)] text-[var(--ios-label)] text-xs rounded-lg px-3 py-2 outline-none"
                                required
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[var(--ios-bg)] text-[var(--ios-label)] text-xs rounded-lg px-3 py-2 outline-none"
                                required
                            />
                            <button
                                type="submit"
                                className="w-full bg-[var(--ios-blue)] text-white text-xs font-bold py-2 rounded-lg"
                            >
                                Zapisz
                            </button>
                        </form>
                    )}
                </div>

                <button
                    onClick={onLogout}
                    className="w-full text-xs font-semibold text-[#ff3b30] bg-[var(--ios-card)] border border-[var(--ios-separator)]/20 py-2.5 rounded-xl active:opacity-70"
                >
                    Wyloguj się
                </button>
            </div>
        </div>
    )
}