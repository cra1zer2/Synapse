'use client'

import { useState, useEffect } from 'react'
import { StudentProfile } from '@/models/account.model'
import { AbsentTeacherItem } from '@/models/timetable.model'
import { AppDictionary, AppLanguage, AppTheme } from '@/config/dictionary.config'
import { TeachersWidget } from './teachers-widget'
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
    allAbsentTeachers: AbsentTeacherItem[]
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
    allAbsentTeachers,
    t
}: SettingsSheetProps) {
    const [showTeachersTool, setShowTeachersTool] = useState(false)
    const [teacherSearch, setTeacherSearch] = useState('')
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date()
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })
    const [showAllDates, setShowAllDates] = useState(false)
    const [pushStatus, setPushStatus] = useState<string>('default')

    useEffect(() => {
        if (isOpen) {
            setPushStatus(getNotificationPermissionStatus())
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
            className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--bg-card)] rounded-3xl p-5 w-full max-w-lg border border-[var(--border-subtle)] shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            >
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                    <h2 className="text-base font-black text-[var(--text-primary)]">{t.settingsTitle}</h2>
                    <button
                        onClick={onClose}
                        className="text-xs font-bold text-[#007aff] bg-blue-500/10 px-3 py-1.5 rounded-xl active:scale-95 transition-transform"
                    >
                        {t.done}
                    </button>
                </div>

                {profile && (
                    <div className="bg-[var(--bg-element)] rounded-3xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-sm font-black text-[var(--text-primary)] shadow-xs">
                                {profile.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                                <h3 className="text-sm font-extrabold text-[var(--text-primary)] leading-snug">{profile.fullName}</h3>
                                <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-0.5">{profile.className} • {profile.schoolName}</p>
                            </div>
                        </div>

                        {profile.luckyNumber !== null && (
                            <div className="text-center bg-[var(--bg-card)] px-3 py-1.5 rounded-2xl border border-[var(--border-subtle)] shadow-xs shrink-0">
                                <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)] block">{t.luckyNumber}</span>
                                <span className="text-base font-black text-[#007aff]">{profile.luckyNumber}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t.appTheme}</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 'system' as AppTheme, label: t.themeSystem },
                            { id: 'light' as AppTheme, label: t.themeLight },
                            { id: 'dark' as AppTheme, label: t.themeDark }
                        ].map((theme) => (
                            <button
                                key={theme.id}
                                onClick={() => onSelectTheme(theme.id)}
                                className={`py-2 px-3 rounded-2xl text-xs font-bold border transition-all ${currentTheme === theme.id
                                        ? 'bg-[var(--text-primary)] text-[var(--bg-card)] border-[var(--text-primary)] shadow-xs'
                                        : 'bg-[var(--bg-element)] text-[var(--text-primary)] border-transparent hover:opacity-90'
                                    }`}
                            >
                                {theme.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-[var(--bg-element)] rounded-3xl p-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-xs font-extrabold text-[var(--text-primary)]">Powiadomienia Web Push</h3>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                            {pushStatus === 'granted'
                                ? 'Aktywne • Dzwonki i nowe oceny'
                                : pushStatus === 'denied'
                                    ? 'Zablokowane w przeglądarce'
                                    : 'Wymaga aktywacji'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleTogglePush}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${pushStatus === 'granted'
                                ? 'bg-emerald-500/20 text-emerald-600'
                                : 'bg-[#007aff] text-white shadow-xs'
                            }`}
                    >
                        {pushStatus === 'granted' ? 'Włączone' : 'Włącz'}
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t.appLanguage}</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 'pl' as AppLanguage, label: 'Polski', code: 'PL' },
                            { id: 'en' as AppLanguage, label: 'English', code: 'EN' },
                            { id: 'ru' as AppLanguage, label: 'Русский', code: 'RU' }
                        ].map((l) => (
                            <button
                                key={l.id}
                                onClick={() => onSelectLang(l.id)}
                                className={`py-2.5 px-3 rounded-2xl text-xs font-bold flex flex-col items-center gap-0.5 border transition-all ${currentLang === l.id
                                        ? 'bg-[var(--text-primary)] text-[var(--bg-card)] border-[var(--text-primary)] shadow-xs'
                                        : 'bg-[var(--bg-element)] text-[var(--text-primary)] border-transparent hover:opacity-90'
                                    }`}
                            >
                                <span>{l.label}</span>
                                <span className="text-[10px] opacity-70">{l.code}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="border border-[var(--border-subtle)] rounded-3xl p-4 flex flex-col gap-2.5">
                    <button
                        onClick={() => setShowTeachersTool(!showTeachersTool)}
                        className="flex items-center justify-between text-left"
                    >
                        <div>
                            <h3 className="text-xs font-extrabold text-[var(--text-primary)]">{t.teacherAbsencesTool}</h3>
                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                {allAbsentTeachers.length} {t.teachers.toLowerCase()}
                            </p>
                        </div>
                        <span className="text-xs font-bold text-[#007aff]">
                            {showTeachersTool ? '▲' : '▼'}
                        </span>
                    </button>

                    {showTeachersTool && (
                        <div className="pt-2 border-t border-[var(--border-subtle)]">
                            <TeachersWidget
                                allAbsentTeachers={allAbsentTeachers}
                                teacherSearch={teacherSearch}
                                onSearchChange={setTeacherSearch}
                                selectedCalendarDate={selectedDate}
                                onDateChange={setSelectedDate}
                                showAllDates={showAllDates}
                                onToggleShowAllDates={() => setShowAllDates(!showAllDates)}
                                t={t}
                            />
                        </div>
                    )}
                </div>

                <form onSubmit={onSaveCredentials} className="bg-[var(--bg-element)] rounded-3xl p-4 flex flex-col gap-2.5">
                    <span className="text-xs font-bold text-[var(--text-primary)]">{t.saveCreds}</span>
                    <input
                        type="text"
                        placeholder="Login / ID"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] text-xs font-medium rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#007aff]"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] text-xs font-medium rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#007aff]"
                        required
                    />
                    <button
                        type="submit"
                        className="w-full bg-[var(--text-primary)] text-[var(--bg-card)] text-xs font-bold py-2.5 rounded-xl active:opacity-80 transition-all shadow-xs"
                    >
                        {t.saveCreds}
                    </button>
                </form>

                <button
                    onClick={onLogout}
                    className="w-full text-xs font-bold text-rose-600 bg-rose-500/10 border border-rose-500/20 py-3 rounded-2xl active:opacity-80 transition-all"
                >
                    {t.logout}
                </button>
            </div>
        </div>
    )
}