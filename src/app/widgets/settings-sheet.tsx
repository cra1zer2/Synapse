'use client'

import { useState, useEffect } from 'react'
import { StudentProfile, SavedAccount } from '@/models/account.model'
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
    const [pushStatus, setPushStatus] = useState<string>('default')

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

    const handleTogglePush = async () => {
        const res = await requestPushPermission()
        setPushStatus(res)
    }

    if (!isOpen) return null

    const accountsList = Array.isArray(savedAccounts) ? savedAccounts : []

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--ios-bg)] rounded-3xl p-4 w-full max-w-lg shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-[var(--ios-label)]">{t.settingsTitle}</h2>
                    <button
                        onClick={onClose}
                        className="text-xs font-bold text-[var(--ios-blue)] active:opacity-70"
                    >
                        {t.done}
                    </button>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-[var(--ios-secondary)] px-1">{t.accountSwitcher}</span>
                    <div className="bg-[var(--ios-card-solid)] rounded-2xl border border-[var(--ios-separator)] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                        {accountsList.length > 0 ? (
                            accountsList.map((acc) => (
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
                                        <span className="text-xs font-bold text-[#34c759] bg-[#34c759]/15 px-2 py-0.5 rounded-full">
                                            Aktywne
                                        </span>
                                    ) : (
                                        <span className="text-xs font-medium text-[var(--ios-blue)]">
                                            Przełącz ›
                                        </span>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="p-3.5 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#007aff] text-white flex items-center justify-center text-xs font-bold shrink-0">
                                    U
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-[var(--ios-label)]">{profile?.fullName || 'Uczeń'}</h3>
                                    <p className="text-[11px] text-[var(--ios-secondary)]">{profile?.className || '4 Tsa Technikum'}</p>
                                </div>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="w-full p-3 text-left text-xs font-bold text-[var(--ios-blue)] flex items-center justify-between hover:bg-[var(--ios-element)]/20 transition-colors"
                        >
                            <span>+ Dodaj kolejne konto (Uczeń / Rodzic)</span>
                            <span>{showAddForm ? '▲' : '▼'}</span>
                        </button>
                    </div>
                </div>

                {showAddForm && (
                    <form onSubmit={onAddAccount} className="bg-[var(--ios-card-solid)] rounded-2xl p-4 border border-[var(--ios-separator)] shadow-xs flex flex-col gap-2.5">
                        <span className="text-xs font-bold text-[var(--ios-label)]">Nowe konto</span>
                        <input
                            type="text"
                            placeholder="Login / ID"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            className="w-full bg-[var(--ios-bg)] text-[var(--ios-label)] text-xs rounded-xl px-3 py-2.5 outline-none"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Hasło"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-[var(--ios-bg)] text-[var(--ios-label)] text-xs rounded-xl px-3 py-2.5 outline-none"
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

                <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-[var(--ios-secondary)] px-1">{t.appTheme} & {t.appLanguage}</span>
                    <div className="bg-[var(--ios-card-solid)] rounded-2xl border border-[var(--ios-separator)] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                        <div className="p-3 flex items-center justify-between">
                            <span className="text-xs font-medium text-[var(--ios-label)]">{t.appTheme}</span>
                            <div className="bg-[var(--ios-element)] p-0.5 rounded-lg flex gap-0.5">
                                {[
                                    { id: 'system' as AppTheme, label: 'Auto' },
                                    { id: 'light' as AppTheme, label: 'Jasny' },
                                    { id: 'dark' as AppTheme, label: 'Ciemny' }
                                ].map((th) => (
                                    <button
                                        key={th.id}
                                        onClick={() => onSelectTheme(th.id)}
                                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${currentTheme === th.id
                                                ? 'bg-[var(--ios-card-solid)] text-[var(--ios-label)] shadow-xs'
                                                : 'text-[var(--ios-secondary)]'
                                            }`}
                                    >
                                        {th.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-3 flex items-center justify-between">
                            <span className="text-xs font-medium text-[var(--ios-label)]">{t.appLanguage}</span>
                            <div className="bg-[var(--ios-element)] p-0.5 rounded-lg flex gap-0.5">
                                {[
                                    { id: 'pl' as AppLanguage, label: 'PL' },
                                    { id: 'en' as AppLanguage, label: 'EN' },
                                    { id: 'ru' as AppLanguage, label: 'RU' }
                                ].map((l) => (
                                    <button
                                        key={l.id}
                                        onClick={() => onSelectLang(l.id)}
                                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${currentLang === l.id
                                                ? 'bg-[var(--ios-card-solid)] text-[var(--ios-label)] shadow-xs'
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
                    <div className="bg-[var(--ios-card-solid)] rounded-2xl border border-[var(--ios-separator)] p-3 flex items-center justify-between shadow-xs">
                        <div>
                            <p className="text-xs font-medium text-[var(--ios-label)]">Web Push</p>
                            <p className="text-[10px] text-[var(--ios-secondary)]">Dzwonki, oceny, zastępstwa</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleTogglePush}
                            className={`text-xs font-bold px-3 py-1.5 rounded-full ${pushStatus === 'granted'
                                    ? 'bg-[#34c759]/15 text-[#34c759]'
                                    : 'bg-[var(--ios-blue)] text-white'
                                }`}
                        >
                            {pushStatus === 'granted' ? 'Włączone' : 'Włącz'}
                        </button>
                    </div>
                </div>

                <button
                    onClick={onLogout}
                    className="w-full text-xs font-semibold text-[#ff3b30] bg-[var(--ios-card-solid)] border border-[var(--ios-separator)] py-3 rounded-2xl active:opacity-70 shadow-xs"
                >
                    {t.logout}
                </button>
            </div>
        </div>
    )
}