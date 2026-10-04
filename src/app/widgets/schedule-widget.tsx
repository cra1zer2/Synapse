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
            return `${sParts[2]}.${sParts[1]} — ${eParts[2]}.${eParts[1]}.${eParts[0]}`
        }
        return `${startIso} — ${endIso}`
    }

    const getDayIndicatorColor = (day: DaySchedule) => {
        const hasCancelled = day.lessons.some((l) => l.isCancelled)
        const hasHoliday = day.events && day.events.some((e) => e.category === 'holiday')
        if (hasCancelled || hasHoliday) return 'bg-rose-500'

        const hasSubstitution = day.lessons.some((l) => l.isSubstitution)
        if (hasSubstitution) return 'bg-purple-500'

        const hasShortened = day.lessons.some((l) => l.isShortened)
        if (hasShortened) return 'bg-orange-500'

        return null
    }

    return (
        <section className="w-full flex flex-col gap-3 min-h-[540px]">
            <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] shadow-xs flex flex-col overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => onShiftWeek(-7)}
                        className="w-8 h-8 rounded-xl bg-[var(--bg-element)] text-[var(--text-primary)] font-black text-sm flex items-center justify-center active:scale-95 transition-transform shrink-0"
                    >
                        ‹
                    </button>

                    <div className="flex items-center gap-2 overflow-hidden px-1">
                        <span className="text-xs font-black text-[var(--text-primary)] tracking-tight truncate">
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
                            className="w-7 h-7 rounded-lg bg-[var(--bg-element)] text-[var(--text-primary)] flex items-center justify-center active:scale-90 transition-transform shrink-0"
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="3" ry="3" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </button>

                        <button
                            onClick={onManualRefresh}
                            disabled={isLoadingWeek}
                            className="w-7 h-7 rounded-lg bg-[var(--bg-element)] text-[var(--text-primary)] flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40 shrink-0"
                        >
                            <svg className={`w-3.5 h-3.5 ${isLoadingWeek ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                            </svg>
                        </button>
                    </div>

                    <button
                        onClick={() => onShiftWeek(7)}
                        className="w-8 h-8 rounded-xl bg-[var(--bg-element)] text-[var(--text-primary)] font-black text-sm flex items-center justify-center active:scale-95 transition-transform shrink-0"
                    >
                        ›
                    </button>
                </div>

                <div className="border-t border-[var(--border-subtle)] p-2 grid grid-cols-5 gap-1.5">
                    {timetableData.schedule.map((day) => {
                        const dotColor = getDayIndicatorColor(day)
                        const isSelected = selectedDay === day.dayName

                        return (
                            <button
                                key={day.dayName}
                                onClick={() => onSelectDay(day.dayName)}
                                className={`py-2.5 rounded-2xl text-xs font-bold flex flex-col items-center justify-center transition-all ${isSelected
                                        ? 'bg-[var(--text-primary)] text-[var(--bg-card)] shadow-xs dark:bg-[#3a3a3c] dark:text-white dark:border dark:border-white/10'
                                        : 'bg-[var(--bg-element)] text-[var(--text-secondary)] hover:opacity-90'
                                    }`}
                            >
                                <span className="text-[11px] font-bold leading-none">{day.dayName.slice(0, 3)}</span>
                                <span className="relative text-xs font-black leading-none mt-1">
                                    {day.date ? day.date.split('.')[0] : ''}
                                    {dotColor && (
                                        <span className={`absolute -top-0.5 -right-1.5 w-1.5 h-1.5 rounded-full ${dotColor}`} />
                                    )}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {isLoadingWeek ? (
                <div className="bg-[var(--bg-card)] rounded-3xl p-16 border border-[var(--border-subtle)] flex flex-col items-center justify-center gap-3">
                    <div className="w-6 h-6 border-2 border-[var(--text-primary)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-bold text-[var(--text-secondary)]">{t.loadingTimetable}</p>
                </div>
            ) : (
                <>
                    {currentDaySchedule && currentDaySchedule.events && currentDaySchedule.events.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            {currentDaySchedule.events.map((ev, idx) => (
                                <div
                                    key={idx}
                                    className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${ev.category === 'holiday'
                                            ? 'bg-rose-500/15 text-rose-500 border-rose-500/20'
                                            : ev.category === 'exam'
                                                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20'
                                                : 'bg-blue-500/15 text-blue-500 border-blue-500/20'
                                        }`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-current shrink-0" />
                                    <p>{ev.title}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-col gap-2.5">
                        {currentDaySchedule && currentDaySchedule.lessons && currentDaySchedule.lessons.length > 0 ? (
                            currentDaySchedule.lessons.map((lesson) => (
                                <article
                                    key={`${lesson.number}-${lesson.subject}-${lesson.time}`}
                                    className="bg-[var(--bg-card)] rounded-3xl p-4.5 border border-[var(--border-subtle)] shadow-xs flex flex-col gap-2"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-input)] px-2.5 py-1 rounded-lg">
                                                {lesson.time}
                                            </span>
                                            {lesson.lessonCount && lesson.lessonCount > 1 && (
                                                <span className="text-[10px] font-bold text-[#007aff] bg-blue-500/15 px-2 py-0.5 rounded-full border border-blue-500/20">
                                                    {lesson.lessonCount}x
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                            {lesson.isShortened && (
                                                <span className="text-[10px] font-bold text-orange-500 bg-orange-500/15 px-2 py-0.5 rounded-full border border-orange-500/20">
                                                    {lesson.durationMinutes} min
                                                </span>
                                            )}
                                            {lesson.isCancelled && (
                                                <span className="text-[10px] font-bold text-rose-500 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/20">
                                                    Cancelled
                                                </span>
                                            )}
                                            {lesson.isSubstitution && (
                                                <span className="text-[10px] font-bold text-purple-500 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/20">
                                                    Substitution
                                                </span>
                                            )}
                                            {lesson.teacherAbsent && (
                                                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/20">
                                                    Teacher Absent
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-start justify-between gap-2">
                                        <h2 className="text-base font-bold text-[var(--text-primary)] leading-snug">
                                            {lesson.subject}
                                        </h2>
                                        {lesson.room && (
                                            <span className="text-xs font-bold text-[#007aff] bg-blue-500/15 border border-blue-500/20 px-2.5 py-1 rounded-lg shrink-0">
                                                {lesson.room}
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-xs font-medium text-[var(--text-secondary)]">
                                        {lesson.teacher || 'No teacher specified'}
                                    </p>
                                </article>
                            ))
                        ) : (
                            <div className="bg-[var(--bg-card)] rounded-3xl p-10 border border-[var(--border-subtle)] text-center text-[var(--text-secondary)] text-sm font-medium flex flex-col items-center gap-1">
                                <p className="font-bold text-[var(--text-primary)]">{t.noLessonsDay}</p>
                                <p className="text-xs opacity-75">{t.vacationDay}</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </section>
    )
}