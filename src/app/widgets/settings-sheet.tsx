'use client'

import { useState } from 'react'
import { StudentProfile, SavedAccount } from '@/models/account.model'
import { NotificationPreferences } from '@/models/notification.model'
import { AppDictionary, AppLanguage, AppTheme } from '@/config/dictionary.config'
import { TextClampOption } from '@/app/page'
import { requestPushPermission, getNotificationPermissionStatus } from '@/services/notification.service'
import { executeLibrusBenchmarkAction } from '@/app/actions'
import { BenchmarkReport } from '@/models/benchmark.model'
import { IosScreen } from '@/components/ios/ios-screen'
import { IosCard, IosCell } from '@/components/ios/ios-ui'
import { IosSwitch } from '@/components/ios/ios-switch'

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
    const [pushStatus, setPushStatus] = useState<string>(() => getNotificationPermissionStatus())

    const [isBenchmarking, setIsBenchmarking] = useState(false)
    const [benchmarkReport, setBenchmarkReport] = useState<BenchmarkReport | null>(null)
    const [isCopied, setIsCopied] = useState(false)

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

    const handleCopyReport = async () => {
        if (!benchmarkReport) return
        try {
            await navigator.clipboard.writeText(JSON.stringify(benchmarkReport, null, 2))
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 2000)
        } catch { }
    }

    return (
        <>
            <IosScreen
                isOpen={isOpen}
                onClose={onClose}
                title={t.settingsTitle}
                backLabel={t.backAction}
                isSubView={true}
            >
                <div className="flex flex-col gap-5">
                    <IosCard>
                        <div className="p-4 flex items-center gap-3.5 border-b border-[var(--ios-separator)]">
                            <div className="w-12 h-12 rounded-full bg-[var(--ios-element)] text-[var(--ios-label)] flex items-center justify-center font-semibold text-sm shrink-0">
                                {heroAvatar}
                            </div>

                            <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-semibold text-[var(--ios-label)] truncate leading-tight">
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
                                <IosCell
                                    key={acc.id}
                                    onClick={() => !isCurrent && onSwitchAccount(acc)}
                                    title={accTitle}
                                    subtitle={`${accRole} • ${acc.username}`}
                                    trailing={
                                        isCurrent ? (
                                            <svg className="w-4 h-4 text-[var(--ios-blue)] mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        ) : (
                                            <span className="text-xs font-medium text-[var(--ios-blue)]">{t.switchAccount}</span>
                                        )
                                    }
                                />
                            )
                        })}

                        <button
                            type="button"
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="w-full p-3.5 text-left text-xs font-medium text-[var(--ios-blue)] flex items-center justify-between active:bg-[var(--ios-element)]/30 transition-colors"
                        >
                            <span>+ {t.addAccount}</span>
                            <svg className={`w-3.5 h-3.5 text-[var(--ios-secondary)] transition-transform duration-200 ${showAddForm ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>

                        {showAddForm && (
                            <form onSubmit={onAddAccount} className="p-3.5 flex flex-col gap-2.5 bg-[var(--ios-element)]/25 border-t border-[var(--ios-separator)]">
                                <input
                                    type="text"
                                    placeholder={t.loginPlaceholder}
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    className="h-10 w-full bg-[var(--ios-input)] text-[var(--ios-label)] text-xs font-normal rounded-[12px] px-3.5 outline-none focus:ring-1 focus:ring-[var(--ios-blue)] transition-colors placeholder-[var(--ios-secondary)]"
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder={t.passwordPlaceholder}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="h-10 w-full bg-[var(--ios-input)] text-[var(--ios-label)] text-xs font-normal rounded-[12px] px-3.5 outline-none focus:ring-1 focus:ring-[var(--ios-blue)] transition-colors placeholder-[var(--ios-secondary)]"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={isAddingAccount}
                                    className="h-10 w-full bg-[var(--ios-blue)] text-white text-xs font-semibold rounded-[12px] disabled:opacity-50 active:opacity-85 shadow-xs transition-all"
                                >
                                    {isAddingAccount ? t.verifyingAccount : t.saveAccount}
                                </button>
                            </form>
                        )}
                    </IosCard>

                    <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] uppercase font-medium text-[var(--ios-secondary)] px-3 tracking-wider">
                            {t.preferences}
                        </span>

                        <IosCard className="divide-y divide-[var(--ios-separator)]">
                            <div className="p-3.5 flex items-center justify-between">
                                <span className="text-xs font-medium text-[var(--ios-label)]">{t.appTheme}</span>
                                <div className="bg-[var(--ios-element)] p-1 rounded-[12px] flex gap-0.5">
                                    {[
                                        { id: 'system' as AppTheme, label: t.themeSystem },
                                        { id: 'light' as AppTheme, label: t.themeLight },
                                        { id: 'dark' as AppTheme, label: t.themeDark }
                                    ].map((th) => (
                                        <button
                                            key={th.id}
                                            onClick={() => onSelectTheme(th.id)}
                                            className={`px-3 py-1 text-xs rounded-[9px] transition-all ${currentTheme === th.id
                                                ? 'bg-[var(--ios-card-solid)] text-[var(--ios-label)] shadow-xs font-medium'
                                                : 'text-[var(--ios-secondary)] font-normal'
                                                }`}
                                        >
                                            {th.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-3.5 flex items-center justify-between">
                                <span className="text-xs font-medium text-[var(--ios-label)]">{t.appLanguage}</span>
                                <div className="bg-[var(--ios-element)] p-1 rounded-[12px] flex gap-0.5">
                                    {[
                                        { id: 'pl' as AppLanguage, label: 'PL' },
                                        { id: 'en' as AppLanguage, label: 'EN' }
                                    ].map((l) => (
                                        <button
                                            key={l.id}
                                            onClick={() => onSelectLang(l.id)}
                                            className={`px-3 py-1 text-xs rounded-[9px] transition-all ${currentLang === l.id
                                                ? 'bg-[var(--ios-card-solid)] text-[var(--ios-label)] shadow-xs font-medium'
                                                : 'text-[var(--ios-secondary)] font-normal'
                                                }`}
                                        >
                                            {l.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </IosCard>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] uppercase font-medium text-[var(--ios-secondary)] px-3 tracking-wider">
                            {t.notifications}
                        </span>

                        <IosCard>
                            <div className="p-3.5 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-[var(--ios-label)]">{t.pushNotificationsTitle}</p>
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
                        </IosCard>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] uppercase font-medium text-[var(--ios-secondary)] px-3 tracking-wider">
                            {t.systemSection}
                        </span>

                        <IosCard>
                            <div
                                onClick={() => setShowAdvanced(true)}
                                className="p-3.5 flex items-center justify-between cursor-pointer active:bg-[var(--ios-element)]/30 transition-colors"
                            >
                                <span className="text-xs font-medium text-[var(--ios-label)]">
                                    {t.advancedTitle}
                                </span>

                                <svg className="w-3.5 h-3.5 text-[var(--ios-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </div>
                        </IosCard>
                    </div>

                    <IosCard>
                        <button
                            onClick={onLogout}
                            className="w-full text-center p-3.5 text-xs font-medium text-[var(--ios-red)] active:bg-[var(--ios-element)]/30 transition-colors"
                        >
                            {t.logout}
                        </button>
                    </IosCard>
                </div>
            </IosScreen>

            <IosScreen
                isOpen={showAdvanced}
                onClose={() => setShowAdvanced(false)}
                title={t.advancedTitle}
                backLabel={t.settingsTitle}
                isSubView={true}
            >
                <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] uppercase font-medium text-[var(--ios-secondary)] px-3 tracking-wider">
                            {t.displaySectionTitle}
                        </span>

                        <IosCard>
                            <div className="p-3.5 flex items-center justify-between gap-3">
                                <div className="min-w-0 pr-2">
                                    <p className="text-xs font-medium text-[var(--ios-label)]">
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
                        </IosCard>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] uppercase font-medium text-[var(--ios-secondary)] px-3 tracking-wider">
                            {t.gradesCalcSectionTitle}
                        </span>

                        <IosCard>
                            <div className="p-3.5 flex items-center justify-between gap-3">
                                <div className="min-w-0 pr-2">
                                    <p className="text-xs font-medium text-[var(--ios-label)]">
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
                        </IosCard>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] uppercase font-medium text-[var(--ios-secondary)] px-3 tracking-wider">
                            {t.benchmarkSectionTitle}
                        </span>

                        <IosCard className="divide-y divide-[var(--ios-separator)]">
                            <div className="p-3.5 flex items-center justify-between gap-3">
                                <div className="min-w-0 pr-2">
                                    <p className="text-xs font-medium text-[var(--ios-label)]">
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
                                <div className="p-3.5 flex flex-col gap-3 bg-[var(--ios-element)]/25 animate-in fade-in">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between text-xs font-normal">
                                            <span className="text-[var(--ios-secondary)]">{t.benchmarkTotalDuration}:</span>
                                            <span className="text-[var(--ios-label)] font-semibold">{benchmarkReport.totalDurationMs} ms</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-normal">
                                            <span className="text-[var(--ios-secondary)]">{t.benchmarkAuthDuration}:</span>
                                            <span className="text-[var(--ios-label)] font-medium">{benchmarkReport.authorizationDurationMs} ms</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-normal">
                                            <span className="text-[var(--ios-secondary)]">{t.benchmarkFastestEndpoint}:</span>
                                            <span className="text-[var(--ios-green)] font-medium truncate max-w-[200px] text-right">{benchmarkReport.fastestEndpoint}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-normal">
                                            <span className="text-[var(--ios-secondary)]">{t.benchmarkSlowestEndpoint}:</span>
                                            <span className="text-[var(--ios-orange)] font-medium truncate max-w-[200px] text-right">{benchmarkReport.slowestEndpoint}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--ios-separator)]/60">
                                        <span className="text-[10px] uppercase font-semibold text-[var(--ios-secondary)] tracking-wider">
                                            {t.benchmarkEndpointsDetails}
                                        </span>

                                        <div className="flex flex-col gap-1">
                                            {benchmarkReport.items.map((item, idx) => (
                                                <div
                                                    key={`${item.endpoint}-${idx}`}
                                                    className="flex items-center justify-between text-[11px] p-2 rounded-[10px] bg-[var(--ios-card)]"
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.success ? 'bg-[var(--ios-green)]' : 'bg-[var(--ios-red)]'}`} />
                                                        <span className="text-[var(--ios-label)] font-medium truncate">
                                                            {item.endpoint}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-[10px] text-[var(--ios-secondary)]">
                                                            {item.payloadBytes > 0 ? `${Math.round(item.payloadBytes / 1024 * 10) / 10} KB` : '0 B'}
                                                        </span>
                                                        <span className="text-xs font-semibold text-[var(--ios-label)] tabular-nums">
                                                            {item.durationMs} ms
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleCopyReport}
                                        className="w-full mt-1 py-2.5 px-3 bg-[var(--ios-blue)] text-white text-xs font-semibold rounded-[12px] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-xs"
                                    >
                                        {isCopied ? (
                                            <>
                                                <span>✓</span>
                                                <span>{t.benchmarkReportCopied}</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                </svg>
                                                <span>{t.benchmarkCopyReportAction}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </IosCard>
                    </div>
                </div>
            </IosScreen>
        </>
    )
}