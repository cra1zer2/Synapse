'use client'

import { useRef } from 'react'
import { SmartTimetableResult, DaySchedule } from '@/models/timetable.model'
import { AppDictionary } from '@/config/dictionary.config'

interface ScheduleWidgetProps {
    timetableData: SmartTimetableResult
    selectedDay: string
    onSelectDay: (day: string) => void
    currentWeekPivot: string
    onShiftWeek: (deltaDays: number) => void
    onSelectDate: (dateIso: string) => void
    onManualRefresh: () => void
    isLoadingWeek: boolean
    t: AppDictionary
}

export function ScheduleWidget({
    timetableData,
    selectedDay,
    onSelectDay,
    currentWeekPivot,
    onShiftWeek,
    onSelectDate,
    onManualRefresh,
    isLoadingWeek,
    t
}: ScheduleWidgetProps) {
    const dateInputRef = useRef<HTMLInputElement>(null)

    const currentDaySchedule: DaySchedule | undefined = timetableData.schedule.find(
        (d) => d.dayName === selectedDay
    )

    const formatWeekRange = (startIso: string, endIso: string) => {
        const sParts = (startIso || '').split('-')
        const eParts = (endIso || '').split('-')
        if (sParts.length === 3 && eParts.length === 3) {
            return `${sParts[2]}.${sParts[1]} — ${eParts[2]}.${eParts[1]}`
        }
        return `${startIso} — ${endIso}`
    }

    const getDayIndicatorColor = (day: DaySchedule) => {
        const hasCancelled = day.lessons.some((l) => l.isCancelled)
        const hasHoliday = day.events && day.events.some((e) => e.category === 'holiday')
        if (hasCancelled || hasHoliday) return 'bg-[#ff3b30]'

        const hasSubstitution = day.lessons.some((l) => l.isSubstitution)
        if (hasSubstitution) return 'bg-[#af52de]'

        const hasShortened = day.lessons.some((l) => l.isShortened)
        if (hasShortened) return 'bg-[#ff9500]'

        return null
    }

    return (
        <section className="w-full flex flex-col gap-4 min-h-[500px]">
            <div className="bg-[var(--ios-card)] rounded-2xl shadow-xs border border-[var(--ios-separator)]/20 overflow-hidden">
                <div className="px-4 py-2.5 flex items-center justify-between border-b border-[var(--ios-separator)]/30">
                    <button
                        onClick={() => onShiftWeek(-7)}
                        className="w-7 h-7 rounded-full bg-[var(--ios-element)]/60 text-[var(--ios-label)] flex items-center justify-center font-bold text-xs active:scale-95 transition-transform"
                    >
                        ‹
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--ios-label)] tracking-tight">
                            {formatWeekRange(timetableData.weekStart, timetableData.weekEnd)}
                        </span>

                        <input
                            ref={dateInputRef}
                            type="date"
                            value={currentWeekPivot}
                            onChange={(e) => {
                                if (e.target.value) {
                                    onSelectDate(e.target.value)
                                }
                            }}
                            className="sr-only"
                        />

                        <button
                            onClick={() => {
                                if (dateInputRef.current) {
                                    if (typeof dateInputRef.current.showPicker === 'function') {
                                        dateInputRef.current.showPicker()
                                    } else {
                                        dateInputRef.current.click()
                                    }
                                }
                            }}
                            className="p-1 text-[var(--ios-secondary)] hover:text-[var(--ios-blue)] transition-colors"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </button>

                        <button
                            onClick={onManualRefresh}
                            disabled={isLoadingWeek}
                            className="p-1 text-[var(--ios-secondary)] hover:text-[var(--ios-blue)] transition-colors disabled:opacity-30"
                        >
                            <svg className={`w-3.5 h-3.5 ${isLoadingWeek ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                            </svg>
                        </button>
                    </div>

                    <button
                        onClick={() => onShiftWeek(7)}
                        className="w-7 h-7 rounded-full bg-[var(--ios-element)]/60 text-[var(--ios-label)] flex items-center justify-center font-bold text-xs active:scale-95 transition-transform"
                    >
                        ›
                    </button>
                </div>

                <div className="p-2 grid grid-cols-5 gap-1">
                    {timetableData.schedule.map((day) => {
                        const dotColor = getDayIndicatorColor(day)
                        const isSelected = selectedDay === day.dayName

                        return (
                            <button
                                key={day.dayName}
                                onClick={() => onSelectDay(day.dayName)}
                                className={`py-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition-all ${isSelected
                                        ? 'bg-[var(--ios-blue)] text-white shadow-xs'
                                        : 'text-[var(--ios-secondary)] hover:bg-[var(--ios-element)]/40'
                                    }`}
                            >
                                <span className="text-[10px] uppercase font-bold opacity-80">{day.dayName.slice(0, 3)}</span>
                                <span className="relative text-sm font-bold mt-0.5">
                                    {day.date ? day.date.split('.')[0] : ''}
                                    {dotColor && (
                                        <span className={`absolute -top-0.5 -right-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : dotColor}`} />
                                    )}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {isLoadingWeek ? (
                <div className="bg-[var(--ios-card)] rounded-2xl p-12 border border-[var(--ios-separator)]/20 flex flex-col items-center justify-center gap-3">
                    <div className="w-6 h-6 border-2 border-[var(--ios-blue)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-medium text-[var(--ios-secondary)]">{t.loadingTimetable}</p>
                </div>
            ) : (
                <>
                    {currentDaySchedule && currentDaySchedule.events && currentDaySchedule.events.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            {currentDaySchedule.events.map((ev, idx) => (
                                <div
                                    key={idx}
                                    className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${ev.category === 'holiday'
                                            ? 'bg-[#ff3b30]/10 text-[#ff3b30]'
                                            : ev.category === 'exam'
                                                ? 'bg-[#34c759]/10 text-[#34c759]'
                                                : 'bg-[#007aff]/10 text-[#007aff]'
                                        }`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-current shrink-0" />
                                    <p>{ev.title}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="bg-[var(--ios-card)] rounded-2xl border border-[var(--ios-separator)]/20 overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]/20">
                        {currentDaySchedule && currentDaySchedule.lessons && currentDaySchedule.lessons.length > 0 ? (
                            currentDaySchedule.lessons.map((lesson) => (
                                <article
                                    key={`${lesson.number}-${lesson.subject}-${lesson.time}`}
                                    className="p-3.5 flex flex-col gap-1.5"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-[var(--ios-secondary)] tracking-tight">
                                                {lesson.time}
                                            </span>
                                            {lesson.lessonCount && lesson.lessonCount > 1 && (
                                                <span className="text-[10px] font-bold text-[var(--ios-blue)] bg-[var(--ios-blue)]/10 px-2 py-0.5 rounded-full">
                                                    {lesson.lessonCount}x
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                            {lesson.isShortened && (
                                                <span className="text-[10px] font-bold text-[#ff9500] bg-[#ff9500]/10 px-2 py-0.5 rounded-full">
                                                    {lesson.durationMinutes} min
                                                </span>
                                            )}
                                            {lesson.isCancelled && (
                                                <span className="text-[10px] font-bold text-[#ff3b30] bg-[#ff3b30]/10 px-2 py-0.5 rounded-full">
                                                    Odwołane
                                                </span>
                                            )}
                                            {lesson.isSubstitution && (
                                                <span className="text-[10px] font-bold text-[#af52de] bg-[#af52de]/10 px-2 py-0.5 rounded-full">
                                                    Zastępstwo
                                                </span>
                                            )}
                                            {lesson.teacherAbsent && (
                                                <span className="text-[10px] font-bold text-[#ff9500] bg-[#ff9500]/10 px-2 py-0.5 rounded-full">
                                                    Nieobecny
                                                </span>
                                            )}
                                            {lesson.room && (
                                                <span className="text-xs font-bold text-[var(--ios-blue)] bg-[var(--ios-blue)]/10 px-2 py-0.5 rounded-md">
                                                    {lesson.room}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="text-sm font-semibold text-[var(--ios-label)] leading-snug">
                                        {lesson.subject}
                                    </h3>

                                    <p className="text-xs font-medium text-[var(--ios-secondary)]">
                                        {lesson.teacher || 'Brak danych'}
                                    </p>
                                </article>
                            ))
                        ) : (
                            <div className="p-10 text-center text-xs font-medium text-[var(--ios-secondary)]">
                                {t.noLessonsDay}
                            </div>
                        )}
                    </div>
                </>
            )}
        </section>
    )
}