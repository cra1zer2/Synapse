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
    const [showCredentialsForm, setShowCredentialsForm] = useState(false)
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

    const getProfileInitials = () => {
        if (!profile || !profile.fullName || profile.fullName === 'Konto Librus') {
            return null
        }
        const letters = profile.fullName
            .split(' ')
            .filter((p) => p.length > 0 && isNaN(Number(p)))
            .map((p) => p[0].toUpperCase())
            .join('')
            .slice(0, 2)
        return letters.length > 0 ? letters : null
    }

    const initials = getProfileInitials()

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--bg-canvas)] rounded-3xl p-4 sm:p-5 w-full max-w-lg border border-[var(--border-subtle)] shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            >
                <div className="flex items-center justify-between pb-1">
                    <h2 className="text-base font-black text-[var(--text-primary)]">{t.settingsTitle}</h2>
                    <button
                        onClick={onClose}
                        className="text-xs font-bold text-[#007aff] bg-blue-500/10 px-3.5 py-1.5 rounded-xl active:scale-95 transition-transform"
                    >
                        {t.done}
                    </button>
                </div>

                <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-subtle)] flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--bg-element)] border border-[var(--border-subtle)] flex items-center justify-center text-sm font-black text-[var(--text-primary)] shrink-0">
                            {initials ? (
                                initials
                            ) : (
                                <svg className="w-5 h-5 text-[var(--text-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            )}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-extrabold text-[var(--text-primary)] truncate">
                                {profile?.fullName || username || 'Uczeń'}
                            </h3>
                            <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-0.5 truncate">
                                {profile?.className || '4 Tsa Technikum'} • {profile?.schoolName || 'TEB Edukacja'}
                            </p>
                        </div>
                    </div>

                    {profile?.luckyNumber !== null && (
                        <div className="text-center bg-[var(--bg-element)] px-3 py-1.5 rounded-xl shrink-0">
                            <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)] block">Numerek</span>
                            <span className="text-base font-black text-[#007aff]">{profile?.luckyNumber}</span>
                        </div>
                    )}
                </div>

                <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden shadow-xs">
                    <div className="p-3.5 flex flex-col gap-2 border-b border-[var(--border-subtle)]">
                        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t.appTheme}</label>
                        <div className="bg-[var(--bg-element)] p-1 rounded-xl grid grid-cols-3 gap-1">
                            {[
                                { id: 'system' as AppTheme, label: t.themeSystem },
                                { id: 'light' as AppTheme, label: t.themeLight },
                                { id: 'dark' as AppTheme, label: t.themeDark }
                            ].map((th) => (
                                <button
                                    key={th.id}
                                    onClick={() => onSelectTheme(th.id)}
                                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${currentTheme === th.id
                                            ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs'
                                            : 'text-[var(--text-secondary)]'
                                        }`}
                                >
                                    {th.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-3.5 flex flex-col gap-2">
                        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t.appLanguage}</label>
                        <div className="bg-[var(--bg-element)] p-1 rounded-xl grid grid-cols-3 gap-1">
                            {[
                                { id: 'pl' as AppLanguage, label: 'Polski' },
                                { id: 'en' as AppLanguage, label: 'English' },
                                { id: 'ru' as AppLanguage, label: 'Русский' }
                            ].map((l) => (
                                <button
                                    key={l.id}
                                    onClick={() => onSelectLang(l.id)}
                                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${currentLang === l.id
                                            ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs'
                                            : 'text-[var(--text-secondary)]'
                                        }`}
                                >
                                    {l.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden shadow-xs">
                    <div className="p-3.5 flex items-center justify-between border-b border-[var(--border-subtle)]">
                        <div>
                            <h4 className="text-xs font-bold text-[var(--text-primary)]">Powiadomienia Push</h4>
                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Dzwonki, oceny, zastępstwa</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleTogglePush}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${pushStatus === 'granted'
                                    ? 'bg-emerald-500/15 text-emerald-600'
                                    : 'bg-[#007aff] text-white shadow-xs'
                                }`}
                        >
                            {pushStatus === 'granted' ? 'Aktywne' : 'Włącz'}
                        </button>
                    </div>

                    <div className="p-3.5">
                        <button
                            onClick={() => setShowTeachersTool(!showTeachersTool)}
                            className="w-full flex items-center justify-between text-left"
                        >
                            <div>
                                <h4 className="text-xs font-bold text-[var(--text-primary)]">{t.teacherAbsencesTool}</h4>
                                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                    {allAbsentTeachers.length} zarejestrowanych nieobecności
                                </p>
                            </div>
                            <span className="text-xs font-bold text-[var(--text-secondary)]">
                                {showTeachersTool ? '▲' : '›'}
                            </span>
                        </button>

                        {showTeachersTool && (
                            <div className="pt-3 mt-3 border-t border-[var(--border-subtle)]">
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
                </div>

                <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden shadow-xs">
                    <button
                        onClick={() => setShowCredentialsForm(!showCredentialsForm)}
                        className="w-full p-3.5 flex items-center justify-between text-left"
                    >
                        <div>
                            <h4 className="text-xs font-bold text-[var(--text-primary)]">Konto Librus Synergia</h4>
                            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Zmień dane logowania</p>
                        </div>
                        <span className="text-xs font-bold text-[var(--text-secondary)]">
                            {showCredentialsForm ? '▲' : '›'}
                        </span>
                    </button>

                    {showCredentialsForm && (
                        <form onSubmit={onSaveCredentials} className="p-3.5 border-t border-[var(--border-subtle)] flex flex-col gap-2.5">
                            <input
                                type="text"
                                placeholder="Login / ID"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-[var(--bg-element)] text-[var(--text-primary)] text-xs font-medium rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#007aff]"
                                required
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[var(--bg-element)] text-[var(--text-primary)] text-xs font-medium rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#007aff]"
                                required
                            />
                            <button
                                type="submit"
                                className="w-full bg-[var(--text-primary)] text-[var(--bg-card)] text-xs font-bold py-2.5 rounded-xl active:opacity-80 transition-all shadow-xs"
                            >
                                {t.saveCreds}
                            </button>
                        </form>
                    )}
                </div>

                <button
                    onClick={onLogout}
                    className="w-full text-xs font-bold text-rose-600 bg-[var(--bg-card)] border border-[var(--border-subtle)] py-3 rounded-2xl active:opacity-80 transition-all shadow-xs"
                >
                    {t.logout}
                </button>
            </div>
        </div>
    )
}