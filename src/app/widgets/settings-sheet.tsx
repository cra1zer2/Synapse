'use client'

import { useState, useRef } from 'react'
import { StudentProfile, SavedAccount } from '@/models/account.model'
import { NotificationPreferences } from '@/models/notification.model'
import { AppDictionary, AppLanguage, AppTheme } from '@/config/dictionary.config'
import { TextClampOption } from '@/app/page'
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
    textClamp: TextClampOption
    onSelectTextClamp: (clamp: TextClampOption) => void
    onLogout: () => void
    t: AppDictionary
}

function IosSwitch({
    checked,
    onChange
}: {
    checked: boolean
    onChange: () => void
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={onChange}
            className={`relative inline-flex h-[24px] w-[42px] shrink-0 cursor-pointer rounded-full p-[2px] transition-colors duration-200 ease-in-out ${checked ? 'bg-[#34c759]' : 'bg-[var(--ios-switch-off)]'
                }`}
        >
            <span
                className={`pointer-events-none inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition duration-200 ease-in-out ${checked ? 'translate-x-[18px]' : 'translate-x-0'
                    }`}
            />
        </button>
    )
}

function resolveAccountTitle(fullName: string | undefined, username: string, role: 'student' | 'parent', t: AppDictionary): string {
    if (fullName && fullName !== 'Konto Librus' && !/^\d+$/.test(fullName)) {
        return fullName
    }
    return role === 'parent' ? t.parentRoleTitle : t.studentRoleTitle
}

function resolveAvatarLetter(fullName: string | undefined, username: string, role: 'student' | 'parent'): string {
    if (fullName && fullName !== 'Konto Librus' && !/^\d+$/.test(fullName)) {
        const parts = fullName.trim().split(/\s+/)
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase()
        }
        return fullName.slice(0, 2).toUpperCase()
    }
    return role === 'parent' ? 'R' : 'U'
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
    textClamp,
    onSelectTextClamp,
    onLogout,
    t
}: SettingsSheetProps) {
    const [showAddForm, setShowAddForm] = useState(false)
    const [pushStatus, setPushStatus] = useState<string>(() => getNotificationPermissionStatus())

    const [dragOffset, setDragOffset] = useState(0)
    const touchStartX = useRef(0)
    const isSwiping = useRef(false)

    const accountsList = Array.isArray(savedAccounts) ? savedAccounts : []
    const activeAccount = accountsList.find((a) => a.isActive) || accountsList[0]

    const activeRole = activeAccount?.role || profile?.role || 'student'
    const activeRawName = profile?.fullName || activeAccount?.profile?.fullName || ''
    const activeUsername = activeAccount?.username || ''
    const heroTitle = resolveAccountTitle(activeRawName, activeUsername, activeRole, t)
    const heroAvatar = resolveAvatarLetter(activeRawName, activeUsername, activeRole)
    const heroSubtitle = `${activeAccount?.profile?.className || profile?.className || '4 Tsa Technikum'} • ${activeAccount?.profile?.schoolName || profile?.schoolName || 'TEB Edukacja'}`

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
            announcements: true,
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

    const handleTogglePushMaster = async () => {
        if (pushStatus !== 'granted') {
            const res = await requestPushPermission()
            setPushStatus(res)
            const updated = { ...notificationPrefs, enabled: res === 'granted' }
            setNotificationPrefs(updated)
            localStorage.setItem('synapse_notification_prefs', JSON.stringify(updated))
        } else {
            const updated = { ...notificationPrefs, enabled: !notificationPrefs.enabled }
            setNotificationPrefs(updated)
            localStorage.setItem('synapse_notification_prefs', JSON.stringify(updated))
        }
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
                <div className="w-16" />

                <h2 className="text-sm font-semibold text-[var(--ios-label)] tracking-tight">
                    {t.settingsTitle}
                </h2>

                <button
                    onClick={onClose}
                    className="w-16 text-right text-sm font-semibold text-[var(--ios-blue)] active:opacity-70"
                >
                    {t.done}
                </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5 max-w-lg mx-auto w-full pb-[calc(env(safe-area-inset-bottom,0px)+2rem)]">
                <div className="flex flex-col gap-1.5">
                    <div className="bg-[var(--ios-card)] rounded-[18px] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                        <div className="p-4 flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-full bg-[var(--ios-element)] text-[var(--ios-label)] flex items-center justify-center font-semibold text-sm shrink-0">
                                {heroAvatar}
                            </div>

                            <div className="min-w-0 flex-1">
                                <h3 className="text-[15px] font-semibold text-[var(--ios-label)] truncate leading-tight">
                                    {heroTitle}
                                </h3>
                                <p className="text-xs font-normal text-[var(--ios-secondary)] truncate mt-0.5">
                                    {heroSubtitle}
                                </p>
                                <span className="text-[10px] font-medium text-[var(--ios-secondary)]/80 mt-0.5 block">
                                    Login: {activeUsername}
                                </span>
                            </div>
                        </div>

                        {accountsList.map((acc) => {
                            if (acc.id === activeAccount?.id && accountsList.length === 1) return null
                            const isCurrent = acc.id === activeAccount?.id
                            const accRole = acc.role === 'student' ? t.studentRole : t.parentRole
                            const accTitle = resolveAccountTitle(acc.profile?.fullName, acc.username, acc.role, t)

                            return (
                                <div
                                    key={acc.id}
                                    onClick={() => !isCurrent && onSwitchAccount(acc)}
                                    className={`p-3.5 flex items-center justify-between transition-colors ${isCurrent ? 'bg-[var(--ios-element)]/15' : 'cursor-pointer active:bg-[var(--ios-element)]/30'
                                        }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-6 h-6 rounded-full bg-[var(--ios-element)] text-[var(--ios-label)] flex items-center justify-center text-[10px] font-semibold shrink-0">
                                            {resolveAvatarLetter(acc.profile?.fullName, acc.username, acc.role)}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-xs font-medium text-[var(--ios-label)] truncate">
                                                {accTitle}
                                            </h4>
                                            <p className="text-[10px] text-[var(--ios-secondary)] truncate">
                                                {accRole} • {acc.username}
                                            </p>
                                        </div>
                                    </div>

                                    {isCurrent ? (
                                        <span className="text-sm font-semibold text-[var(--ios-blue)] pr-1">✓</span>
                                    ) : (
                                        <span className="text-xs font-medium text-[var(--ios-blue)]">{t.switchAccount}</span>
                                    )}
                                </div>
                            )
                        })}

                        <button
                            type="button"
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="w-full p-3.5 text-left text-xs font-medium text-[var(--ios-blue)] flex items-center justify-between active:bg-[var(--ios-element)]/30 transition-colors"
                        >
                            <span>+ {t.addAccount}</span>
                            <span className="text-xs text-[var(--ios-secondary)]">{showAddForm ? '▲' : '›'}</span>
                        </button>

                        {showAddForm && (
                            <form onSubmit={onAddAccount} className="p-3.5 flex flex-col gap-2.5 bg-[var(--ios-bg)]/40">
                                <input
                                    type="text"
                                    placeholder={t.loginPlaceholder}
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    className="h-10 w-full bg-[var(--ios-input)] text-[var(--ios-label)] text-xs font-medium rounded-xl px-3.5 outline-none border border-transparent focus:border-[var(--ios-blue)] transition-colors placeholder-[var(--ios-secondary)]"
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder={t.passwordPlaceholder}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="h-10 w-full bg-[var(--ios-input)] text-[var(--ios-label)] text-xs font-medium rounded-xl px-3.5 outline-none border border-transparent focus:border-[var(--ios-blue)] transition-colors placeholder-[var(--ios-secondary)]"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={isAddingAccount}
                                    className="h-10 w-full bg-[var(--ios-blue)] text-white text-xs font-semibold rounded-xl disabled:opacity-50 active:opacity-85 shadow-xs transition-all"
                                >
                                    {isAddingAccount ? t.verifyingAccount : t.saveAccount}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] uppercase font-semibold text-[var(--ios-secondary)] px-3 tracking-wider">
                        {t.preferences}
                    </span>

                    <div className="bg-[var(--ios-card)] rounded-[18px] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                        <div className="p-3.5 flex items-center justify-between">
                            <span className="text-xs font-medium text-[var(--ios-label)]">{t.appTheme}</span>
                            <div className="bg-[var(--ios-element)]/60 p-0.5 rounded-xl flex gap-0.5">
                                {[
                                    { id: 'system' as AppTheme, label: t.themeSystem },
                                    { id: 'light' as AppTheme, label: t.themeLight },
                                    { id: 'dark' as AppTheme, label: t.themeDark }
                                ].map((th) => (
                                    <button
                                        key={th.id}
                                        onClick={() => onSelectTheme(th.id)}
                                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${currentTheme === th.id
                                            ? 'bg-[var(--ios-card-solid)] text-[var(--ios-label)] shadow-xs'
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
                            <div className="bg-[var(--ios-element)]/60 p-0.5 rounded-xl flex gap-0.5">
                                {[
                                    { id: 'pl' as AppLanguage, label: 'PL' },
                                    { id: 'en' as AppLanguage, label: 'EN' }
                                ].map((l) => (
                                    <button
                                        key={l.id}
                                        onClick={() => onSelectLang(l.id)}
                                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${currentLang === l.id
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

                <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] uppercase font-semibold text-[var(--ios-secondary)] px-3 tracking-wider">
                        {t.accessibilityTitle}
                    </span>

                    <div className="bg-[var(--ios-card)] rounded-[18px] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                        <div className="p-3.5 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-[var(--ios-label)]">{t.textClampLabel}</p>
                                <p className="text-[11px] text-[var(--ios-secondary)]">{t.textClampSubtitle}</p>
                            </div>
                            <div className="bg-[var(--ios-element)]/60 p-0.5 rounded-xl flex gap-0.5">
                                {[
                                    { id: 'full' as TextClampOption, label: t.textClampFull },
                                    { id: '2' as TextClampOption, label: t.textClampTwo },
                                    { id: '1' as TextClampOption, label: t.textClampOne }
                                ].map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => onSelectTextClamp(opt.id)}
                                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${textClamp === opt.id
                                            ? 'bg-[var(--ios-card-solid)] text-[var(--ios-label)] shadow-xs'
                                            : 'text-[var(--ios-secondary)]'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] uppercase font-semibold text-[var(--ios-secondary)] px-3 tracking-wider">
                        {t.notifications}
                    </span>

                    <div className="bg-[var(--ios-card)] rounded-[18px] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                        <div className="p-3.5 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-[var(--ios-label)]">{t.pushNotificationsTitle}</p>
                                <p className="text-[11px] text-[var(--ios-secondary)]">{t.pushSubtitle}</p>
                            </div>

                            {pushStatus === 'granted' ? (
                                <IosSwitch
                                    checked={notificationPrefs.enabled}
                                    onChange={handleTogglePushMaster}
                                />
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleTogglePushMaster}
                                    className="text-xs font-semibold px-3 py-1 bg-[var(--ios-blue)] text-white rounded-full shadow-xs active:scale-95 transition-transform"
                                >
                                    {t.pushEnableAction}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <div className="bg-[var(--ios-card)] rounded-[18px] overflow-hidden shadow-xs">
                        <button
                            onClick={onLogout}
                            className="w-full text-center p-3.5 text-xs font-semibold text-[#ff3b30] active:bg-[var(--ios-element)]/30 transition-colors"
                        >
                            {t.logout}
                        </button>
                    </div>
                </div>

                <div className="text-center pt-2 pb-4">
                    <p className="text-[11px] font-normal text-[var(--ios-secondary)]/60">
                        {t.appVersionFooter}
                    </p>
                </div>
            </div>
        </div>
    )
}