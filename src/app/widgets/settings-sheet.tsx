'use client'

import { useState, useEffect } from 'react'
import { StudentProfile, SavedAccount } from '@/models/account.model'
import { NotificationPreferences } from '@/models/notification.model'
import { AppDictionary, AppLanguage, AppTheme } from '@/config/dictionary.config'
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
    currentTheme: AppTheme
    onSelectTheme: (theme: AppTheme) => void
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
    currentTheme,
    onSelectTheme,
    onLogout,
    t
}: SettingsSheetProps) {
    const [showAddForm, setShowAddForm] = useState(false)
    const [showNotificationChannels, setShowNotificationChannels] = useState(false)
    const [pushStatus, setPushStatus] = useState<string>('default')

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

    useEffect(() => {
        if (isOpen) {
            setPushStatus(getNotificationPermissionStatus())
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

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
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--ios-bg)] rounded-3xl p-5 w-full max-w-lg shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-[var(--ios-label)]">{t.settingsTitle}</h2>
                    <button
                        onClick={onClose}
                        className="text-xs font-bold text-[var(--ios-blue)] active:opacity-70 px-2 py-1"
                    >
                        {t.done}
                    </button>
                </div>

                <div className="bg-[var(--ios-card)] rounded-2xl p-4 border border-[var(--ios-separator)]/20 flex items-center gap-3.5 shadow-xs">
                    <div className="w-11 h-11 rounded-full bg-[var(--ios-blue)] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-[var(--ios-label)] truncate">
                            {displayName}
                        </h3>
                        <p className="text-xs text-[var(--ios-secondary)] truncate mt-0.5">
                            {displaySubtitle}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] uppercase font-bold text-[var(--ios-secondary)] px-1">{t.accountSwitcher}</span>
                    <div className="bg-[var(--ios-card)] rounded-2xl border border-[var(--ios-separator)]/20 overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]/20">
                        {accountsList.map((acc) => (
                            <div
                                key={acc.id}
                                onClick={() => onSwitchAccount(acc)}
                                className="p-3.5 flex items-center justify-between cursor-pointer active:bg-[var(--ios-element)]/30 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${acc.role === 'student' ? 'bg-[#007aff]' : 'bg-[#af52de]'
                                        }`}>
                                        {acc.role === 'student' ? 'U' : 'R'}
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-[var(--ios-label)]">{acc.profile?.fullName || acc.username}</h3>
                                        <p className="text-[11px] text-[var(--ios-secondary)]">
                                            {acc.role === 'student' ? t.studentRole : t.parentRole} • {acc.username}
                                        </p>
                                    </div>
                                </div>

                                {acc.isActive ? (
                                    <span className="text-xs font-bold text-[#34c759] bg-[#34c759]/15 px-2.5 py-0.5 rounded-full">
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
                            className="w-full p-3.5 text-left text-xs font-bold text-[var(--ios-blue)] flex items-center justify-between hover:bg-[var(--ios-element)]/20 transition-colors"
                        >
                            <span>+ Dodaj kolejne konto</span>
                            <span>{showAddForm ? '▲' : '▼'}</span>
                        </button>
                    </div>
                </div>

                {showAddForm && (
                    <form onSubmit={onAddAccount} className="bg-[var(--ios-card)] rounded-2xl p-4 border border-[var(--ios-separator)]/20 shadow-xs flex flex-col gap-2.5">
                        <span className="text-xs font-bold text-[var(--ios-label)]">Nowe konto</span>
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
                            className="w-full bg-[var(--ios-blue)] text-white text-xs font-bold py-2.5 rounded-xl disabled:opacity-50"
                        >
                            {isAddingAccount ? 'Weryfikacja...' : 'Zapisz konto'}
                        </button>
                    </form>
                )}

                <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] uppercase font-bold text-[var(--ios-secondary)] px-1">{t.appTheme} & {t.appLanguage}</span>
                    <div className="bg-[var(--ios-card)] rounded-2xl border border-[var(--ios-separator)]/20 overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]/20">
                        <div className="p-3.5 flex items-center justify-between">
                            <span className="text-xs font-medium text-[var(--ios-label)]">{t.appTheme}</span>
                            <div className="bg-[var(--ios-element)]/60 p-0.5 rounded-lg flex gap-0.5">
                                {[
                                    { id: 'system' as AppTheme, label: 'Auto' },
                                    { id: 'light' as AppTheme, label: 'Jasny' },
                                    { id: 'dark' as AppTheme, label: 'Ciemny' }
                                ].map((th) => (
                                    <button
                                        key={th.id}
                                        onClick={() => onSelectTheme(th.id)}
                                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${currentTheme === th.id
                                                ? 'bg-[var(--ios-card)] text-[var(--ios-label)] shadow-xs'
                                                : 'text-[var(--ios-secondary)]'
                                            }`}
                                    >
                                        {th.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-3.5 flex items-center justify-between">
                            <span className="text-xs font-medium text-[var(--ios-label)]">{t.appLanguage}</span>
                            <div className="bg-[var(--ios-element)]/60 p-0.5 rounded-lg flex gap-0.5">
                                {[
                                    { id: 'pl' as AppLanguage, label: 'PL' },
                                    { id: 'en' as AppLanguage, label: 'EN' },
                                    { id: 'ru' as AppLanguage, label: 'RU' }
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
                    <span className="text-[11px] uppercase font-bold text-[var(--ios-secondary)] px-1">Powiadomienia</span>
                    <div className="bg-[var(--ios-card)] rounded-2xl border border-[var(--ios-separator)]/20 overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]/20">
                        <div
                            onClick={() => setShowNotificationChannels(!showNotificationChannels)}
                            className="p-3.5 flex items-center justify-between cursor-pointer active:bg-[var(--ios-element)]/30 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-[var(--ios-label)]">Konfiguracja powiadomień</span>
                                <span className="text-xs text-[var(--ios-secondary)]">›</span>
                            </div>

                            <div className="flex items-center gap-2.5 pl-2 border-l border-[var(--ios-separator)]/30">
                                <button
                                    type="button"
                                    onClick={handleTogglePushMaster}
                                    className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all ${pushStatus === 'granted'
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
                    className="w-full text-xs font-semibold text-[#ff3b30] bg-[var(--ios-card)] border border-[var(--ios-separator)]/20 py-3 rounded-2xl active:opacity-70 shadow-xs"
                >
                    {t.logout}
                </button>
            </div>
        </div>
    )
}