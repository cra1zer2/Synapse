'use client'

import { useState, useRef, useEffect } from 'react'
import { StudentProfile, SavedAccount } from '@/models/account.model'
import { NotificationPreferences } from '@/models/notification.model'
import { AppDictionary, AppLanguage, AppTheme } from '@/config/dictionary.config'
import { TextClampOption } from '@/app/page'
import { requestPushPermission, getNotificationPermissionStatus } from '@/services/notification.service'
import { executeLibrusBenchmarkAction } from '@/app/actions'
import { BenchmarkReport } from '@/models/benchmark.model'

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
    ignoreGradeModifiers: boolean
    onToggleIgnoreGradeModifiers: (val: boolean) => void
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
            className={`relative inline-flex h-[24px] w-[42px] shrink-0 cursor-pointer rounded-full p-[2px] transition-colors duration-250 ease-in-out ${checked ? 'bg-[#34c759]' : 'bg-[var(--ios-switch-off)]'
                }`}
        >
            <span
                className={`pointer-events-none inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition duration-250 ease-in-out ${checked ? 'translate-x-[18px]' : 'translate-x-0'
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
    ignoreGradeModifiers,
    onToggleIgnoreGradeModifiers,
    onLogout,
    t
}: SettingsSheetProps) {
    const [showAddForm, setShowAddForm] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [isEntered, setIsEntered] = useState(false)
    const [isDismissing, setIsDismissing] = useState(false)
    const [isSubEntered, setIsSubEntered] = useState(false)
    const [isSubDismissing, setIsSubDismissing] = useState(false)
    const [pushStatus, setPushStatus] = useState<string>(() => getNotificationPermissionStatus())

    const [isBenchmarking, setIsBenchmarking] = useState(false)
    const [benchmarkReport, setBenchmarkReport] = useState<BenchmarkReport | null>(null)

    const [dragOffset, setDragOffset] = useState(0)
    const touchStartX = useRef(0)
    const isSwiping = useRef(false)

    const [subDragOffset, setSubDragOffset] = useState(0)
    const subTouchStartX = useRef(0)
    const isSubSwiping = useRef(false)

    useEffect(() => {
        if (isOpen) {
            const frame = requestAnimationFrame(() => setIsEntered(true))
            return () => cancelAnimationFrame(frame)
        } else {
            setIsEntered(false)
        }
    }, [isOpen])

    const handleOpenAdvanced = () => {
        setShowAdvanced(true)
        setIsSubDismissing(false)
        requestAnimationFrame(() => {
            setIsSubEntered(true)
        })
    }

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

    const handleDismiss = () => {
        setIsDismissing(true)
        setTimeout(() => {
            setIsDismissing(false)
            setIsEntered(false)
            setDragOffset(0)
            onClose()
        }, 350)
    }

    const handleSubDismiss = () => {
        setIsSubDismissing(true)
        setIsSubEntered(false)
        setTimeout(() => {
            setIsSubDismissing(false)
            setSubDragOffset(0)
            setShowAdvanced(false)
        }, 350)
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        if (showAdvanced) return
        const clientX = e.touches[0].clientX
        touchStartX.current = clientX
        if (clientX < 60) {
            isSwiping.current = true
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (showAdvanced || !isSwiping.current) return
        const currentX = e.touches[0].clientX
        const delta = currentX - touchStartX.current
        if (delta > 0) {
            setDragOffset(delta)
        }
    }

    const handleTouchEnd = () => {
        if (showAdvanced || !isSwiping.current) return
        isSwiping.current = false
        if (dragOffset > 85) {
            handleDismiss()
        } else {
            setDragOffset(0)
        }
    }

    const handleSubTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation()
        const clientX = e.touches[0].clientX
        subTouchStartX.current = clientX
        if (clientX < 60) {
            isSubSwiping.current = true
        }
    }

    const handleSubTouchMove = (e: React.TouchEvent) => {
        e.stopPropagation()
        if (!isSubSwiping.current) return
        const currentX = e.touches[0].clientX
        const delta = currentX - subTouchStartX.current
        if (delta > 0) {
            setSubDragOffset(delta)
        }
    }

    const handleSubTouchEnd = (e: React.TouchEvent) => {
        e.stopPropagation()
        if (!isSubSwiping.current) return
        isSubSwiping.current = false
        if (subDragOffset > 85) {
            handleSubDismiss()
        } else {
            setSubDragOffset(0)
        }
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

    const handleRunBenchmark = async () => {
        if (!activeAccount || !activeAccount.username || !activeAccount.password || isBenchmarking) return
        setIsBenchmarking(true)
        const res = await executeLibrusBenchmarkAction(activeAccount.username, activeAccount.password)
        setIsBenchmarking(false)
        if (res.success && res.data) {
            setBenchmarkReport(res.data)
        }
    }

    if (!isOpen) return null

    return (
        <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                transform: isDismissing
                    ? 'translateX(100%)'
                    : !isEntered
                        ? 'translateX(100%)'
                        : `translateX(${dragOffset}px)`,
                transition: isSwiping.current ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)'
            }}
            className="fixed inset-0 z-50 bg-[var(--ios-bg)] flex flex-col shadow-[-16px_0_36px_rgba(0,0,0,0.22)] dark:shadow-[-20px_0_48px_rgba(0,0,0,0.6)] will-change-transform"
        >
            <header className="sticky top-0 z-10 w-full pt-[max(calc(env(safe-area-inset-top,0px)+0.75rem),1.75rem)] pb-2.5 px-4 bg-[var(--ios-bg)]/85 backdrop-blur-xl border-b border-[var(--ios-separator)] flex items-center justify-between">
                <button
                    onClick={handleDismiss}
                    className="flex items-center gap-1 text-[var(--ios-blue)] text-xs font-normal active:opacity-70 -ml-1 py-1 pr-2 w-20"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <span>{t.backAction}</span>
                </button>

                <h2 className="text-sm font-medium text-[var(--ios-label)] tracking-tight">
                    {t.settingsTitle}
                </h2>

                <div className="w-20" />
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5 max-w-lg mx-auto w-full pb-[calc(env(safe-area-inset-bottom,0px)+2rem)]">
                <div className="flex flex-col gap-1.5">
                    <div className="bg-[var(--ios-card)] rounded-[18px] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                        <div className="p-4 flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-full bg-[var(--ios-element)] text-[var(--ios-label)] flex items-center justify-center font-medium text-sm shrink-0">
                                {heroAvatar}
                            </div>

                            <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-medium text-[var(--ios-label)] truncate leading-tight">
                                    {heroTitle}
                                </h3>
                                <p className="text-xs font-normal text-[var(--ios-secondary)] truncate mt-0.5">
                                    {heroSubtitle}
                                </p>
                                <span className="text-[10px] font-normal text-[var(--ios-secondary)]/80 mt-0.5 block">
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
                                        <div className="w-6 h-6 rounded-full bg-[var(--ios-element)] text-[var(--ios-label)] flex items-center justify-center text-[10px] font-medium shrink-0">
                                            {resolveAvatarLetter(acc.profile?.fullName, acc.username, acc.role)}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-xs font-normal text-[var(--ios-label)] truncate">
                                                {accTitle}
                                            </h4>
                                            <p className="text-[10px] font-normal text-[var(--ios-secondary)] truncate">
                                                {accRole} • {acc.username}
                                            </p>
                                        </div>
                                    </div>

                                    {isCurrent ? (
                                        <span className="text-sm font-medium text-[var(--ios-blue)] pr-1">✓</span>
                                    ) : (
                                        <span className="text-xs font-normal text-[var(--ios-blue)]">{t.switchAccount}</span>
                                    )}
                                </div>
                            )
                        })}

                        <button
                            type="button"
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="w-full p-3.5 text-left text-xs font-normal text-[var(--ios-blue)] flex items-center justify-between active:bg-[var(--ios-element)]/30 transition-colors"
                        >
                            <span>+ {t.addAccount}</span>
                            <span className="text-xs text-[var(--ios-secondary)] font-normal">{showAddForm ? '▲' : '›'}</span>
                        </button>

                        {showAddForm && (
                            <form onSubmit={onAddAccount} className="p-3.5 flex flex-col gap-2.5 bg-[var(--ios-bg)]/40">
                                <input
                                    type="text"
                                    placeholder={t.loginPlaceholder}
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    className="h-10 w-full bg-[var(--ios-input)] text-[var(--ios-label)] text-xs font-normal rounded-xl px-3.5 outline-none border border-transparent focus:border-[var(--ios-blue)] transition-colors placeholder-[var(--ios-secondary)]"
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder={t.passwordPlaceholder}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="h-10 w-full bg-[var(--ios-input)] text-[var(--ios-label)] text-xs font-normal rounded-xl px-3.5 outline-none border border-transparent focus:border-[var(--ios-blue)] transition-colors placeholder-[var(--ios-secondary)]"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={isAddingAccount}
                                    className="h-10 w-full bg-[var(--ios-blue)] text-white text-xs font-medium rounded-xl disabled:opacity-50 active:opacity-85 shadow-xs transition-all"
                                >
                                    {isAddingAccount ? t.verifyingAccount : t.saveAccount}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] uppercase font-normal text-[var(--ios-secondary)] px-3 tracking-wider">
                        {t.preferences}
                    </span>

                    <div className="bg-[var(--ios-card)] rounded-[18px] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                        <div className="p-3.5 flex items-center justify-between">
                            <span className="text-xs font-normal text-[var(--ios-label)]">{t.appTheme}</span>
                            <div className="bg-[var(--ios-element)]/60 p-0.5 rounded-xl flex gap-0.5">
                                {[
                                    { id: 'system' as AppTheme, label: t.themeSystem },
                                    { id: 'light' as AppTheme, label: t.themeLight },
                                    { id: 'dark' as AppTheme, label: t.themeDark }
                                ].map((th) => (
                                    <button
                                        key={th.id}
                                        onClick={() => onSelectTheme(th.id)}
                                        className={`px-3 py-1 text-xs font-normal rounded-lg transition-all ${currentTheme === th.id
                                            ? 'bg-[var(--ios-card-solid)] text-[var(--ios-label)] shadow-xs font-medium'
                                            : 'text-[var(--ios-secondary)]'
                                            }`}
                                    >
                                        {th.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-3.5 flex items-center justify-between">
                            <span className="text-xs font-normal text-[var(--ios-label)]">{t.appLanguage}</span>
                            <div className="bg-[var(--ios-element)]/60 p-0.5 rounded-xl flex gap-0.5">
                                {[
                                    { id: 'pl' as AppLanguage, label: 'PL' },
                                    { id: 'en' as AppLanguage, label: 'EN' }
                                ].map((l) => (
                                    <button
                                        key={l.id}
                                        onClick={() => onSelectLang(l.id)}
                                        className={`px-3 py-1 text-xs font-normal rounded-lg transition-all ${currentLang === l.id
                                            ? 'bg-[var(--ios-card-solid)] text-[var(--ios-label)] shadow-xs font-medium'
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
                    <span className="text-[11px] uppercase font-normal text-[var(--ios-secondary)] px-3 tracking-wider">
                        {t.notifications}
                    </span>

                    <div className="bg-[var(--ios-card)] rounded-[18px] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                        <div className="p-3.5 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-normal text-[var(--ios-label)]">{t.pushNotificationsTitle}</p>
                                <p className="text-[11px] font-normal text-[var(--ios-secondary)]">{t.pushSubtitle}</p>
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
                                    className="text-xs font-medium px-3 py-1 bg-[var(--ios-blue)] text-white rounded-full shadow-xs active:scale-95 transition-transform"
                                >
                                    {t.pushEnableAction}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] uppercase font-normal text-[var(--ios-secondary)] px-3 tracking-wider">
                        {t.systemSection}
                    </span>

                    <div className="bg-[var(--ios-card)] rounded-[18px] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                        <div
                            onClick={handleOpenAdvanced}
                            className="p-3.5 flex items-center justify-between cursor-pointer active:bg-[var(--ios-element)]/30 transition-colors"
                        >
                            <span className="text-xs font-normal text-[var(--ios-label)]">
                                {t.advancedTitle}
                            </span>

                            <span className="text-xs text-[var(--ios-secondary)] font-normal">›</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <div className="bg-[var(--ios-card)] rounded-[18px] overflow-hidden shadow-xs">
                        <button
                            onClick={onLogout}
                            className="w-full text-center p-3.5 text-xs font-medium text-[#ff3b30] active:bg-[var(--ios-element)]/30 transition-colors"
                        >
                            {t.logout}
                        </button>
                    </div>
                </div>
            </div>

            {showAdvanced && (
                <div
                    onTouchStart={handleSubTouchStart}
                    onTouchMove={handleSubTouchMove}
                    onTouchEnd={handleSubTouchEnd}
                    style={{
                        transform: isSubDismissing
                            ? 'translateX(100%)'
                            : !isSubEntered
                                ? 'translateX(100%)'
                                : `translateX(${subDragOffset}px)`,
                        transition: isSubSwiping.current ? 'none' : 'transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)'
                    }}
                    className="fixed inset-0 z-60 bg-[var(--ios-bg)] flex flex-col shadow-[-16px_0_36px_rgba(0,0,0,0.22)] dark:shadow-[-20px_0_48px_rgba(0,0,0,0.6)] will-change-transform"
                >
                    <header className="sticky top-0 z-10 w-full pt-[max(calc(env(safe-area-inset-top,0px)+0.75rem),1.75rem)] pb-2.5 px-4 bg-[var(--ios-bg)]/85 backdrop-blur-xl border-b border-[var(--ios-separator)] flex items-center justify-between">
                        <button
                            onClick={handleSubDismiss}
                            className="flex items-center gap-1 text-[var(--ios-blue)] text-xs font-normal active:opacity-70 -ml-1 py-1 pr-2 w-24"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                            <span>{t.settingsTitle}</span>
                        </button>

                        <h2 className="text-sm font-medium text-[var(--ios-label)] tracking-tight">
                            {t.advancedTitle}
                        </h2>

                        <div className="w-24" />
                    </header>

                    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5 max-w-lg mx-auto w-full pb-[calc(env(safe-area-inset-bottom,0px)+2rem)]">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] uppercase font-normal text-[var(--ios-secondary)] px-3 tracking-wider">
                                {t.displaySectionTitle}
                            </span>

                            <div className="bg-[var(--ios-card)] rounded-[18px] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                                <div className="p-3.5 flex items-center justify-between gap-3">
                                    <div className="min-w-0 pr-2">
                                        <p className="text-xs font-normal text-[var(--ios-label)]">
                                            {t.textClampLabel}
                                        </p>
                                        <p className="text-[11px] font-normal text-[var(--ios-secondary)] mt-0.5 leading-snug">
                                            {t.textClampSingleLineDescription}
                                        </p>
                                    </div>

                                    <IosSwitch
                                        checked={textClamp === '1'}
                                        onChange={() => onSelectTextClamp(textClamp === '1' ? 'full' : '1')}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] uppercase font-normal text-[var(--ios-secondary)] px-3 tracking-wider">
                                {t.gradesCalcSectionTitle}
                            </span>

                            <div className="bg-[var(--ios-card)] rounded-[18px] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                                <div className="p-3.5 flex items-center justify-between gap-3">
                                    <div className="min-w-0 pr-2">
                                        <p className="text-xs font-normal text-[var(--ios-label)]">
                                            {t.ignoreModifiersLabel}
                                        </p>
                                        <p className="text-[11px] font-normal text-[var(--ios-secondary)] mt-0.5 leading-snug">
                                            {t.ignoreModifiersDescription}
                                        </p>
                                    </div>

                                    <IosSwitch
                                        checked={ignoreGradeModifiers}
                                        onChange={() => onToggleIgnoreGradeModifiers(!ignoreGradeModifiers)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] uppercase font-normal text-[var(--ios-secondary)] px-3 tracking-wider">
                                {t.benchmarkSectionTitle}
                            </span>

                            <div className="bg-[var(--ios-card)] rounded-[18px] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                                <div className="p-3.5 flex items-center justify-between gap-3">
                                    <div className="min-w-0 pr-2">
                                        <p className="text-xs font-normal text-[var(--ios-label)]">
                                            {t.benchmarkButtonLabel}
                                        </p>
                                        <p className="text-[11px] font-normal text-[var(--ios-secondary)] mt-0.5 leading-snug">
                                            {t.benchmarkDescription}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleRunBenchmark}
                                        disabled={isBenchmarking}
                                        className="text-xs font-medium px-3 py-1.5 bg-[var(--ios-blue)] text-white rounded-full shadow-xs active:scale-95 disabled:opacity-50 transition-all shrink-0 flex items-center gap-1.5"
                                    >
                                        {isBenchmarking && (
                                            <svg className="w-3 h-3 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                                                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                                            </svg>
                                        )}
                                        <span>{isBenchmarking ? t.benchmarkingStatus : t.runBenchmarkAction}</span>
                                    </button>
                                </div>

                                {benchmarkReport && (
                                    <div className="p-3.5 flex flex-col gap-2 bg-[var(--ios-bg)]/50 animate-in fade-in">
                                        <div className="flex items-center justify-between text-xs font-normal">
                                            <span className="text-[var(--ios-secondary)]">{t.benchmarkTotalDuration}:</span>
                                            <span className="text-[var(--ios-label)]">{benchmarkReport.totalDurationMs} ms</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-normal">
                                            <span className="text-[var(--ios-secondary)]">{t.benchmarkAuthDuration}:</span>
                                            <span className="text-[var(--ios-label)]">{benchmarkReport.authorizationDurationMs} ms</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-normal">
                                            <span className="text-[var(--ios-secondary)]">{t.benchmarkFastestEndpoint}:</span>
                                            <span className="text-[#34c759] truncate max-w-[200px] text-right">{benchmarkReport.fastestEndpoint}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-normal">
                                            <span className="text-[var(--ios-secondary)]">{t.benchmarkSlowestEndpoint}:</span>
                                            <span className="text-[#ff9500] truncate max-w-[200px] text-right">{benchmarkReport.slowestEndpoint}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}