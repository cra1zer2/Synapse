'use client'

import { useState, useEffect } from 'react'
import { StudentProfile } from '@/models/account.model'
import { AbsentTeacherItem } from '@/models/timetable.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { TeachersWidget } from './teachers-widget'
import { requestPushPermission, getNotificationPermissionStatus } from '@/services/notification.service'

interface SettingsSheetProps {
    isOpen: boolean
    onClose: () => void
    profile: StudentProfile | null
    currentLang: AppLanguage
    onSelectLang: (lang: AppLanguage) => void
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
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-5 w-full max-w-lg border border-[#e5e5ea] shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            >
                <div className="flex items-center justify-between border-b border-[#e5e5ea] pb-3">
                    <h2 className="text-base font-black text-[#1c1c1e]">{t.settingsTitle}</h2>
                    <button
                        onClick={onClose}
                        className="text-xs font-bold text-[#007aff] bg-blue-50 px-3 py-1.5 rounded-xl active:scale-95 transition-transform"
                    >
                        {t.done}
                    </button>
                </div>

                {profile && (
                    <div className="bg-[#f2f2f7] rounded-3xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-white border border-[#e5e5ea] flex items-center justify-center text-sm font-black text-[#1c1c1e] shadow-xs">
                                {profile.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                                <h3 className="text-sm font-extrabold text-[#1c1c1e] leading-snug">{profile.fullName}</h3>
                                <p className="text-[11px] font-medium text-[#8e8e93] mt-0.5">{profile.className} • {profile.schoolName}</p>
                            </div>
                        </div>

                        {profile.luckyNumber !== null && (
                            <div className="text-center bg-white px-3 py-1.5 rounded-2xl border border-[#e5e5ea] shadow-xs shrink-0">
                                <span className="text-[9px] uppercase font-bold text-[#8e8e93] block">{t.luckyNumber}</span>
                                <span className="text-base font-black text-[#007aff]">{profile.luckyNumber}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-[#f2f2f7] rounded-3xl p-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-xs font-extrabold text-[#1c1c1e]">Powiadomienia Web Push</h3>
                        <p className="text-[11px] text-[#8e8e93] mt-0.5">
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
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-[#007aff] text-white shadow-xs'
                            }`}
                    >
                        {pushStatus === 'granted' ? 'Włączone' : 'Włącz'}
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-[#8e8e93] uppercase tracking-wider">{t.appLanguage}</label>
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
                                        ? 'bg-[#1c1c1e] text-white border-[#1c1c1e] shadow-xs'
                                        : 'bg-[#f2f2f7] text-[#1c1c1e] border-transparent hover:bg-[#e5e5ea]'
                                    }`}
                            >
                                <span>{l.label}</span>
                                <span className="text-[10px] opacity-70">{l.code}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="border border-[#e5e5ea] rounded-3xl p-4 flex flex-col gap-2.5">
                    <button
                        onClick={() => setShowTeachersTool(!showTeachersTool)}
                        className="flex items-center justify-between text-left"
                    >
                        <div>
                            <h3 className="text-xs font-extrabold text-[#1c1c1e]">{t.teacherAbsencesTool}</h3>
                            <p className="text-[11px] text-[#8e8e93] mt-0.5">
                                {allAbsentTeachers.length} {t.teachers.toLowerCase()}
                            </p>
                        </div>
                        <span className="text-xs font-bold text-[#007aff]">
                            {showTeachersTool ? '▲' : '▼'}
                        </span>
                    </button>

                    {showTeachersTool && (
                        <div className="pt-2 border-t border-[#e5e5ea]">
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

                <form onSubmit={onSaveCredentials} className="bg-[#f2f2f7] rounded-3xl p-4 flex flex-col gap-2.5">
                    <span className="text-xs font-bold text-[#1c1c1e]">{t.saveCreds}</span>
                    <input
                        type="text"
                        placeholder="Login / ID"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-white text-[#1c1c1e] text-xs font-medium rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#007aff]"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white text-[#1c1c1e] text-xs font-medium rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#007aff]"
                        required
                    />
                    <button
                        type="submit"
                        className="w-full bg-[#1c1c1e] text-white text-xs font-bold py-2.5 rounded-xl active:opacity-80 transition-all shadow-xs"
                    >
                        {t.saveCreds}
                    </button>
                </form>

                <button
                    onClick={onLogout}
                    className="w-full text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 py-3 rounded-2xl active:opacity-80 transition-all"
                >
                    {t.logout}
                </button>
            </div>
        </div>
    )
}