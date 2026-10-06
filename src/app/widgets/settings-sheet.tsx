'use client'

import { useState, useRef } from 'react'
import { StudentProfile, SavedAccount } from '@/models/account.model'
import { NotificationPreferences } from '@/models/notification.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { requestPushPermission, getNotificationPermissionStatus } from '@/services/notification.service'

interface SettingsSheetProps {
    isOpen: boolean
    onClose: () => void
    profile: StudentProfile | null
    savedAccounts?: SavedAccount[]
    onSwitchAccount: (account: SavedAccount) => void
    onAddAccount: (e: React.FormEvent) => void
    newUsername: string
    setNewUsername: (u: string) => void
    newPassword: string
    setNewPassword: (p: string) => void
    isAddingAccount: boolean
    currentLang: AppLanguage
    onSelectLang: (lang: AppLanguage) => void
    currentTheme: any
    onSelectTheme: any
    onLogout: () => void
    t: AppDictionary
}

export function SettingsSheet({
    isOpen,
    onClose,
    profile,
    savedAccounts = [],
    onSwitchAccount,
    onAddAccount,
    newUsername,
    setNewUsername,
    newPassword,
    setNewPassword,
    isAddingAccount,
    currentLang,
    onSelectLang,
    onLogout,
    t
}: SettingsSheetProps) {
    const [showAddForm, setShowAddForm] = useState(false)
    const [showNotificationChannels, setShowNotificationChannels] = useState(false)
    const [pushStatus, setPushStatus] = useState<string>(() => getNotificationPermissionStatus())

    const [dragOffset, setDragOffset] = useState(0)
    const touchStartX = useRef(0)
    const isSwiping = useRef(false)

    const accountsList = Array.isArray(savedAccounts) ? savedAccounts : []
    const activeAccount = accountsList.find((a) => a.isActive) || accountsList[0]

    const displayName = profile?.fullName && profile.fullName !== 'Konto Librus'
        ? profile.fullName
        : activeAccount?.profile?.fullName && activeAccount.profile.fullName !== 'Konto Librus'
            ? activeAccount.profile.fullName
            : activeAccount?.username || 'Uczeń'

    const displaySubtitle = `${activeAccount?.profile?.className || profile?.className || 'Klasa Technikum'} • ${activeAccount?.profile?.schoolName || profile?.schoolName || 'TEB Edukacja'}`

    const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('synapse_notification_prefs')
            if (stored) {
                try {
                    return JSON.parse(stored)
                } catch { }
            }
        }
        return {
            enabled: true,
            grades: true,
            timetableChanges: true,
            absences: true,
            messages: true,
            calendarEvents: true
        }
    })

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
            onClose()
        }
        setDragOffset(0)
    }

    const handleTogglePushMaster = async (e: React.MouseEvent) => {
        e.stopPropagation()
        const res = await requestPushPermission()
        setPushStatus(res)
        const updated = { ...notificationPrefs, enabled: res === 'granted' }
        setNotificationPrefs(updated)
        localStorage.setItem('synapse_notification_prefs', JSON.stringify(updated))
    }

    const handleToggleChannel = (key: keyof NotificationPreferences) => {
        const updated = { ...notificationPrefs, [key]: !notificationPrefs[key] }
        setNotificationPrefs(updated)
        localStorage.setItem('synapse_notification_prefs', JSON.stringify(updated))
    }

    if (!isOpen) return null

    return (
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
                    onClick={onClose}
                    className="flex items-center gap-1 text-[var(--ios-blue)] text-xs font-medium active:opacity-70 -ml-1 py-1 pr-2"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <span>{t.done}</span>
                </button>

                <h2 className="text-sm font-semibold text-[var(--ios-label)] tracking-tight">{t.settingsTitle}</h2>

                <div className="w-8" />
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5 max-w-lg mx-auto w-full pb-[calc(env(safe-area-inset-bottom,0px)+2rem)]">
                <div className="bg-[var(--ios-card)] rounded-2xl p-4 border border-[var(--ios-border)] flex items-center gap-3.5 shadow-xs">
                    <div className="w-11 h-11 rounded-full bg-[var(--ios-blue)] text-white flex items-center justify-center font-semibold text-base shrink-0 shadow-xs">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-[var(--ios-label)] truncate">
                            {displayName}
                        </h3>
                        <p className="text-xs font-normal text-[var(--ios-secondary)] truncate mt-0.5">
                            {displaySubtitle}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] uppercase font-semibold text-[var(--ios-secondary)] px-1">{t.accountSwitcher}</span>
                    <div className="bg-[var(--ios-card)] rounded-2xl border border-[var(--ios-separator)] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                        {accountsList.map((acc) => (
                            <div
                                key={acc.id}
                                onClick={() => onSwitchAccount(acc)}
                                className="p-3.5 flex items-center justify-between cursor-pointer active:bg-[var(--ios-element)]/30 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 ${acc.role === 'student' ? 'bg-[#007aff]' : 'bg-[#af52de]'
                                        }`}>
                                        {acc.role === 'student' ? 'U' : 'R'}
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-semibold text-[var(--ios-label)]">{acc.profile?.fullName || acc.username}</h3>
                                        <p className="text-[11px] font-normal text-[var(--ios-secondary)]">
                                            {acc.role === 'student' ? t.studentRole : t.parentRole} • {acc.username}
                                        </p>
                                    </div>
                                </div>

                                {acc.isActive ? (
                                    <span className="text-xs font-semibold text-[#34c759] bg-[#34c759]/15 px-2.5 py-0.5 rounded-full">
                                        Aktywne
                                    </span>
                                ) : (
                                    <span className="text-xs font-medium text-[var(--ios-blue)]">
                                        Przełącz ›
                                    </span>
                                )}
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="w-full p-3.5 text-left text-xs font-semibold text-[var(--ios-blue)] flex items-center justify-between hover:bg-[var(--ios-element)]/20 transition-colors"
                        >
                            <span>+ Dodaj kolejne konto</span>
                            <span>{showAddForm ? '▲' : '▼'}</span>
                        </button>
                    </div>
                </div>

                {showAddForm && (
                    <form onSubmit={onAddAccount} className="bg-[var(--ios-card)] rounded-2xl p-4 border border-[var(--ios-border)] shadow-xs flex flex-col gap-2.5">
                        <span className="text-xs font-semibold text-[var(--ios-label)]">Nowe konto</span>
                        <input
                            type="text"
                            placeholder="Login / ID"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            className="w-full bg-[var(--ios-bg)] text-[var(--ios-label)] text-xs rounded-xl px-3.5 py-2.5 outline-none"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Hasło"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-[var(--ios-bg)] text-[var(--ios-label)] text-xs rounded-xl px-3.5 py-2.5 outline-none"
                            required
                        />
                        <button
                            type="submit"
                            disabled={isAddingAccount}
                            className="w-full bg-[var(--ios-blue)] text-white text-xs font-semibold py-2.5 rounded-xl disabled:opacity-50"
                        >
                            {isAddingAccount ? 'Weryfikacja...' : 'Zapisz konto'}
                        </button>
                    </form>
                )}

                <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] uppercase font-semibold text-[var(--ios-secondary)] px-1">{t.appLanguage}</span>
                    <div className="bg-[var(--ios-card)] rounded-2xl border border-[var(--ios-separator)] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                        <div className="p-3.5 flex items-center justify-between">
                            <span className="text-xs font-medium text-[var(--ios-label)]">{t.appLanguage}</span>
                            <div className="bg-[var(--ios-element)]/60 p-0.5 rounded-xl flex gap-0.5">
                                {[
                                    { id: 'pl' as AppLanguage, label: 'PL' },
                                    { id: 'en' as AppLanguage, label: 'EN' }
                                ].map((l) => (
                                    <button
                                        key={l.id}
                                        onClick={() => onSelectLang(l.id)}
                                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${currentLang === l.id
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

                <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] uppercase font-semibold text-[var(--ios-secondary)] px-1">Powiadomienia</span>
                    <div className="bg-[var(--ios-card)] rounded-2xl border border-[var(--ios-separator)] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                        <div
                            onClick={() => setShowNotificationChannels(!showNotificationChannels)}
                            className="p-3.5 flex items-center justify-between cursor-pointer active:bg-[var(--ios-element)]/30 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-[var(--ios-label)]">Konfiguracja powiadomień</span>
                                <span className="text-xs text-[var(--ios-secondary)]">›</span>
                            </div>

                            <div className="flex items-center gap-2.5 pl-2 border-l border-[var(--ios-separator)]">
                                <button
                                    type="button"
                                    onClick={handleTogglePushMaster}
                                    className={`text-[11px] font-semibold px-3 py-1 rounded-full transition-all ${pushStatus === 'granted'
                                            ? 'bg-[#34c759]/15 text-[#34c759]'
                                            : 'bg-[var(--ios-blue)] text-white shadow-xs'
                                        }`}
                                >
                                    {pushStatus === 'granted' ? 'Włączone' : 'Włącz'}
                                </button>
                            </div>
                        </div>

                        {showNotificationChannels && (
                            <div className="p-3.5 bg-[var(--ios-bg)]/40 flex flex-col gap-2.5 animate-in fade-in">
                                {[
                                    { key: 'grades' as const, label: 'Oceny (nowe i zmiany)' },
                                    { key: 'timetableChanges' as const, label: 'Zastępstwa i odwołania lekcji' },
                                    { key: 'absences' as const, label: 'Nieobecności (alerty o NB)' },
                                    { key: 'messages' as const, label: 'Wiadomości i ogłoszenia' },
                                    { key: 'calendarEvents' as const, label: 'Wydarzenia i sprawdziany (data)' }
                                ].map((item) => (
                                    <label key={item.key} className="flex items-center justify-between text-xs cursor-pointer py-1">
                                        <span className="text-[var(--ios-label)] font-medium">{item.label}</span>
                                        <input
                                            type="checkbox"
                                            {...{ switch: '' }}
                                            checked={Boolean(notificationPrefs[item.key])}
                                            onChange={() => handleToggleChannel(item.key)}
                                            className="cursor-pointer"
                                        />
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={onLogout}
                    className="w-full text-xs font-semibold text-[#ff3b30] bg-[var(--ios-card)] border border-[var(--ios-border)] py-3 rounded-2xl active:opacity-70 shadow-xs"
                >
                    {t.logout}
                </button>
            </div>
        </div>
    )
}