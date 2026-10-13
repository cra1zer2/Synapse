'use client'

import { useState } from 'react'
import { StudentProfile } from '@/models/account.model'
import { SmartTimetableResult, LessonItem } from '@/models/timetable.model'
import { GradesResult } from '@/models/grade.model'
import { AttendanceResult } from '@/models/attendance.model'
import { WidgetCustomizerSheet, DashboardWidgetId, DEFAULT_WIDGET_CONFIGS } from './widget-customizer-sheet'

interface HomeDashboardProps {
    profile: StudentProfile | null
    timetableData: SmartTimetableResult | null
    gradesData: GradesResult | null
    attendanceData: AttendanceResult | null
    unreadMessagesCount: number
    onNavigateTab: (tab: 'schedule' | 'grades' | 'attendance' | 'messages') => void
}

export function HomeDashboard({
    profile,
    timetableData,
    gradesData,
    attendanceData,
    unreadMessagesCount,
    onNavigateTab
}: HomeDashboardProps) {
    const [widgetOrder, setWidgetOrder] = useState<DashboardWidgetId[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('synapse_dashboard_widgets')
            if (saved) {
                try {
                    const parsed = JSON.parse(saved)
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return parsed
                    }
                } catch { }
            }
        }
        return DEFAULT_WIDGET_CONFIGS.map((w) => w.id)
    })

    const [activeWidgets, setActiveWidgets] = useState<Record<DashboardWidgetId, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('synapse_dashboard_active_widgets')
            if (saved) {
                try {
                    const parsed = JSON.parse(saved)
                    if (parsed && typeof parsed === 'object') {
                        return parsed
                    }
                } catch { }
            }
        }
        return {
            mini_schedule: true,
            next_lesson: false,
            attendance: false,
            gpa: false,
            messages: false,
            lucky_number: false,
            changes: false
        }
    })

    const [showCustomizer, setShowCustomizer] = useState(false)

    const handleSaveConfig = (newOrder: DashboardWidgetId[], newActive: Record<DashboardWidgetId, boolean>) => {
        setWidgetOrder(newOrder)
        setActiveWidgets(newActive)
        if (typeof window !== 'undefined') {
            localStorage.setItem('synapse_dashboard_widgets', JSON.stringify(newOrder))
            localStorage.setItem('synapse_dashboard_active_widgets', JSON.stringify(newActive))
        }
    }

    const todayDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]
    const todaySchedule = timetableData?.schedule.find((d) => d.dayName === todayDayName || d.isToday)
    const todayLessons = todaySchedule?.lessons || []

    let currentOrNextLesson: LessonItem | null = null
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()

    for (const l of todayLessons) {
        const match = l.time.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/)
        if (match) {
            const end = parseInt(match[3], 10) * 60 + parseInt(match[4], 10)
            if (nowMinutes <= end) {
                currentOrNextLesson = l
                break
            }
        }
    }

    if (!currentOrNextLesson && todayLessons.length > 0) {
        currentOrNextLesson = todayLessons[0]
    }

    const substitutionsTodayCount = todayLessons.filter((l) => l.isSubstitution || l.isCancelled).length

    const renderWidget = (id: DashboardWidgetId) => {
        if (!activeWidgets[id]) return null

        switch (id) {
            case 'next_lesson': {
                const subTitle = currentOrNextLesson ? currentOrNextLesson.subject : 'Brak lekcji'
                const roomText = currentOrNextLesson?.room ? `Sala ${currentOrNextLesson.room}` : 'Dzień wolny'
                const timeText = currentOrNextLesson?.time || '—'

                return (
                    <div
                        key={id}
                        onClick={() => onNavigateTab('schedule')}
                        className="bg-[var(--ios-card)] rounded-[18px] p-3.5 flex flex-col justify-between shadow-xs active:scale-[0.97] transition-all cursor-pointer min-h-[105px]"
                    >
                        <div className="flex items-center justify-between">
                            <div className="w-8 h-8 rounded-[10px] bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] flex items-center justify-center text-sm">
                                ⏱️
                            </div>
                            <span className="text-[11px] font-medium text-[var(--ios-secondary)] tabular-nums">
                                {timeText}
                            </span>
                        </div>

                        <div className="flex flex-col mt-2 min-w-0">
                            <span className="text-[14px] font-semibold text-[var(--ios-label)] truncate leading-tight">
                                {subTitle}
                            </span>
                            <span className="text-[11px] font-normal text-[var(--ios-secondary)] truncate mt-0.5">
                                {roomText}
                            </span>
                        </div>
                    </div>
                )
            }

            case 'attendance': {
                const pct = attendanceData?.overallPercentage !== undefined ? `${attendanceData.overallPercentage}%` : '—'
                const isDanger = attendanceData?.overallStatus === 'danger'
                const isWarning = attendanceData?.overallStatus === 'warning'
                const colorClass = isDanger ? 'text-[var(--ios-red)]' : isWarning ? 'text-[var(--ios-orange)]' : 'text-[var(--ios-green)]'

                return (
                    <div
                        key={id}
                        onClick={() => onNavigateTab('attendance')}
                        className="bg-[var(--ios-card)] rounded-[18px] p-3.5 flex flex-col justify-between shadow-xs active:scale-[0.97] transition-all cursor-pointer min-h-[105px]"
                    >
                        <div className="flex items-center justify-between">
                            <div className="w-8 h-8 rounded-[10px] bg-[var(--ios-green-subtle)] text-[var(--ios-green)] flex items-center justify-center text-sm">
                                🩺
                            </div>
                            <span className={`text-[19px] font-bold tracking-tight tabular-nums ${colorClass}`}>
                                {pct}
                            </span>
                        </div>

                        <div className="flex flex-col mt-2">
                            <span className="text-[13px] font-semibold text-[var(--ios-label)] leading-tight">
                                Frekwencja
                            </span>
                            <span className="text-[11px] font-normal text-[var(--ios-secondary)] truncate mt-0.5">
                                {attendanceData?.totalAbsent ? `${attendanceData.totalAbsent} opuszczonych` : 'Brak nieobecności'}
                            </span>
                        </div>
                    </div>
                )
            }

            case 'gpa': {
                const gpaVal = gradesData?.overallAverage !== null && gradesData?.overallAverage !== undefined ? gradesData.overallAverage : '—'

                return (
                    <div
                        key={id}
                        onClick={() => onNavigateTab('grades')}
                        className="bg-[var(--ios-card)] rounded-[18px] p-3.5 flex flex-col justify-between shadow-xs active:scale-[0.97] transition-all cursor-pointer min-h-[105px]"
                    >
                        <div className="flex items-center justify-between">
                            <div className="w-8 h-8 rounded-[10px] bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)] flex items-center justify-center text-sm">
                                📊
                            </div>
                            <span className="text-[19px] font-bold text-[var(--ios-label)] tracking-tight tabular-nums">
                                {gpaVal}
                            </span>
                        </div>

                        <div className="flex flex-col mt-2">
                            <span className="text-[13px] font-semibold text-[var(--ios-label)] leading-tight">
                                Średnia ocen
                            </span>
                            <span className="text-[11px] font-normal text-[var(--ios-secondary)] mt-0.5">
                                Wszystkie przedmioty
                            </span>
                        </div>
                    </div>
                )
            }

            case 'messages': {
                return (
                    <div
                        key={id}
                        onClick={() => onNavigateTab('messages')}
                        className="bg-[var(--ios-card)] rounded-[18px] p-3.5 flex flex-col justify-between shadow-xs active:scale-[0.97] transition-all cursor-pointer min-h-[105px]"
                    >
                        <div className="flex items-center justify-between">
                            <div className="w-8 h-8 rounded-[10px] bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] flex items-center justify-center text-sm">
                                💬
                            </div>
                            <span className={`text-[19px] font-bold tracking-tight tabular-nums ${unreadMessagesCount > 0 ? 'text-[var(--ios-blue)]' : 'text-[var(--ios-label)]'}`}>
                                {unreadMessagesCount}
                            </span>
                        </div>

                        <div className="flex flex-col mt-2">
                            <span className="text-[13px] font-semibold text-[var(--ios-label)] leading-tight">
                                Wiadomości
                            </span>
                            <span className="text-[11px] font-normal text-[var(--ios-secondary)] mt-0.5">
                                {unreadMessagesCount > 0 ? `${unreadMessagesCount} nieprzeczytane` : 'Brak nowych'}
                            </span>
                        </div>
                    </div>
                )
            }

            case 'lucky_number': {
                const lucky = profile?.luckyNumber !== null && profile?.luckyNumber !== undefined ? profile.luckyNumber : '—'

                return (
                    <div
                        key={id}
                        className="bg-[var(--ios-card)] rounded-[18px] p-3.5 flex flex-col justify-between shadow-xs min-h-[105px]"
                    >
                        <div className="flex items-center justify-between">
                            <div className="w-8 h-8 rounded-[10px] bg-[var(--ios-purple-subtle)] text-[var(--ios-purple)] flex items-center justify-center text-sm">
                                🍀
                            </div>
                            <span className="text-[19px] font-bold text-[var(--ios-purple)] tracking-tight tabular-nums">
                                {lucky}
                            </span>
                        </div>

                        <div className="flex flex-col mt-2">
                            <span className="text-[13px] font-semibold text-[var(--ios-label)] leading-tight">
                                Szczęśliwy numer
                            </span>
                            <span className="text-[11px] font-normal text-[var(--ios-secondary)] mt-0.5">
                                Dzisiejsze losowanie
                            </span>
                        </div>
                    </div>
                )
            }

            case 'changes': {
                return (
                    <div
                        key={id}
                        onClick={() => onNavigateTab('schedule')}
                        className="bg-[var(--ios-card)] rounded-[18px] p-3.5 flex flex-col justify-between shadow-xs active:scale-[0.97] transition-all cursor-pointer min-h-[105px]"
                    >
                        <div className="flex items-center justify-between">
                            <div className="w-8 h-8 rounded-[10px] bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)] flex items-center justify-center text-sm">
                                🔄
                            </div>
                            <span className={`text-[19px] font-bold tracking-tight tabular-nums ${substitutionsTodayCount > 0 ? 'text-[var(--ios-orange)]' : 'text-[var(--ios-label)]'}`}>
                                {substitutionsTodayCount}
                            </span>
                        </div>

                        <div className="flex flex-col mt-2">
                            <span className="text-[13px] font-semibold text-[var(--ios-label)] leading-tight">
                                Zmiany dzisiaj
                            </span>
                            <span className="text-[11px] font-normal text-[var(--ios-secondary)] mt-0.5">
                                {substitutionsTodayCount > 0 ? `${substitutionsTodayCount} zastępstw/odwołań` : 'Plan bez zmian'}
                            </span>
                        </div>
                    </div>
                )
            }

            default:
                return null
        }
    }

    return (
        <section className="w-full flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-medium uppercase text-[var(--ios-secondary)] tracking-wider">
                    Pulpit skrótów
                </span>

                <button
                    type="button"
                    onClick={() => setShowCustomizer(true)}
                    className="w-7 h-7 rounded-full bg-[var(--ios-element)]/60 text-[var(--ios-blue)] flex items-center justify-center active:scale-95 transition-transform"
                    aria-label="Edit widgets"
                >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 w-full">
                {widgetOrder.map((id) => renderWidget(id))}
            </div>

            <WidgetCustomizerSheet
                isOpen={showCustomizer}
                onClose={() => setShowCustomizer(false)}
                currentOrder={widgetOrder}
                activeMap={activeWidgets}
                onSave={handleSaveConfig}
            />
        </section>
    )
}