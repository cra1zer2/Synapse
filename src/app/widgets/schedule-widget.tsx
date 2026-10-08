'use client'

import { useRef, useState, useEffect, Fragment } from 'react'
import { SmartTimetableResult, DaySchedule, LessonItem } from '@/models/timetable.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { TextClampOption } from '@/app/page'
import {
    parseLessonTimeRange,
    getCurrentTimeMinutes,
    calculateBreakDuration,
    getBreakRemainingMinutes
} from '@/utils/time.util'

interface ScheduleWidgetProps {
    timetableData: SmartTimetableResult
    selectedDay: string
    onSelectDay: (day: string) => void
    onSelectLesson: (lesson: LessonItem) => void
    currentWeekPivot: string
    onShiftWeek: (deltaDays: number) => void
    onSelectDate: (dateIso: string) => void
    onManualRefresh: () => void
    onOpenTerminarz: () => void
    isLoadingWeek: boolean
    textClamp?: TextClampOption
    lang?: AppLanguage
    t: AppDictionary
}

function IosSpinner({ className = 'w-5 h-5 text-[var(--ios-secondary)]' }: { className?: string }) {
    return (
        <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
            <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="1" />
            <line x1="19.07" y1="4.93" x2="16.24" y2="7.76" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.875" />
            <line x1="22" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
            <line x1="19.07" y1="19.07" x2="16.24" y2="16.24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.625" />
            <line x1="12" y1="22" x2="12" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.375" />
            <line x1="2" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.25" />
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.125" />
        </svg>
    )
}

function getDayIndicatorColor(day: DaySchedule): string | null {
    const hasCancelled = day.lessons.some((l) => l.isCancelled)
    const hasHoliday = day.events && day.events.some((e) => e.category === 'holiday')
    if (hasCancelled || hasHoliday) return 'bg-[var(--ios-red)]'

    const hasSubstitution = day.lessons.some((l) => l.isSubstitution)
    if (hasSubstitution) return 'bg-[var(--ios-purple)]'

    const hasShortened = day.lessons.some((l) => l.isShortened)
    if (hasShortened) return 'bg-[var(--ios-orange)]'

    return null
}

function getDayAbbr(dayName: string, lang: AppLanguage = 'pl'): string {
    const mapPl: Record<string, string> = {
        Monday: 'Pn',
        Tuesday: 'Wt',
        Wednesday: 'Śr',
        Thursday: 'Cz',
        Friday: 'Pt',
        Saturday: 'So',
        Sunday: 'Nd'
    }
    const mapEn: Record<string, string> = {
        Monday: 'Mo',
        Tuesday: 'Tu',
        Wednesday: 'We',
        Thursday: 'Th',
        Friday: 'Fr',
        Saturday: 'Sa',
        Sunday: 'Su'
    }
    return (lang === 'en' ? mapEn[dayName] : mapPl[dayName]) || dayName.slice(0, 2)
}

export function ScheduleWidget({
    timetableData,
    selectedDay,
    onSelectDay,
    onSelectLesson,
    currentWeekPivot,
    onShiftWeek,
    onSelectDate,
    onManualRefresh,
    onOpenTerminarz,
    isLoadingWeek,
    textClamp = 'full',
    lang = 'pl',
    t
}: ScheduleWidgetProps) {
    const [currentMinutes, setCurrentMinutes] = useState(getCurrentTimeMinutes)
    const activeLessonRef = useRef<HTMLDivElement>(null)
    const hasInitialAutoScrolledRef = useRef(false)

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentMinutes(getCurrentTimeMinutes())
        }, 15000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        if (!hasInitialAutoScrolledRef.current && activeLessonRef.current) {
            hasInitialAutoScrolledRef.current = true
            const timer = setTimeout(() => {
                if (activeLessonRef.current) {
                    activeLessonRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
            }, 80)
            return () => clearTimeout(timer)
        }
    }, [selectedDay])

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

    const todayIsoString = () => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    }

    const realTodayIso = todayIsoString()

    const getLessonLiveState = (lesson: LessonItem, dayIso: string, isToday: boolean): 'active' | 'passed' | 'upcoming' => {
        if (dayIso < realTodayIso) {
            return 'passed'
        }
        if (!isToday) {
            return 'upcoming'
        }
        const range = parseLessonTimeRange(lesson.time)
        if (!range.isValid) return 'upcoming'

        if (currentMinutes >= range.startMinutes && currentMinutes <= range.endMinutes) {
            return 'active'
        }
        if (currentMinutes > range.endMinutes) {
            return 'passed'
        }
        return 'upcoming'
    }

    const isBreakActive = (prevLesson: LessonItem, nextLesson: LessonItem, isToday: boolean): boolean => {
        if (!isToday) return false
        const r1 = parseLessonTimeRange(prevLesson.time)
        const r2 = parseLessonTimeRange(nextLesson.time)
        if (!r1.isValid || !r2.isValid) return false

        return currentMinutes > r1.endMinutes && currentMinutes < r2.startMinutes
    }

    const titleClampClass = textClamp === '1' ? 'line-clamp-1' : textClamp === '2' ? 'line-clamp-2' : ''

    return (
        <section className="w-full flex flex-col gap-3 min-h-[500px]">
            <div className="bg-[var(--ios-card)] rounded-[20px] overflow-hidden shadow-xs border border-[var(--ios-separator)]/60">
                <div className="px-3.5 py-2 flex items-center justify-between border-b border-[var(--ios-separator)]">
                    <button
                        onClick={() => onShiftWeek(-7)}
                        className="w-7 h-7 rounded-full bg-[var(--ios-element)]/70 text-[var(--ios-label)] flex items-center justify-center active:scale-95 transition-all"
                        aria-label="Previous week"
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[var(--ios-label)] tracking-tight">
                            {formatWeekRange(timetableData.weekStart, timetableData.weekEnd)}
                        </span>

                        <div className="relative flex items-center justify-center p-1 text-[var(--ios-secondary)] hover:text-[var(--ios-blue)] transition-colors cursor-pointer">
                            <svg className="w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <input
                                type="date"
                                value={currentWeekPivot}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        onSelectDate(e.target.value)
                                    }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                aria-label="Select date"
                            />
                        </div>

                        <button
                            onClick={onManualRefresh}
                            disabled={isLoadingWeek}
                            className="p-1 text-[var(--ios-secondary)] hover:text-[var(--ios-blue)] transition-colors disabled:opacity-30"
                        >
                            <svg className={`w-3.5 h-3.5 ${isLoadingWeek ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                            </svg>
                        </button>

                        <button
                            onClick={onOpenTerminarz}
                            className="text-[10px] font-semibold text-[var(--ios-blue)] bg-[var(--ios-room-bg)] px-2 py-0.5 rounded-[6px] ml-0.5 active:scale-95 transition-transform"
                        >
                            {t.terminarzButton}
                        </button>
                    </div>

                    <button
                        onClick={() => onShiftWeek(7)}
                        className="w-7 h-7 rounded-full bg-[var(--ios-element)]/70 text-[var(--ios-label)] flex items-center justify-center active:scale-95 transition-all"
                        aria-label="Next week"
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>

                <div className="p-1.5 grid grid-cols-5 gap-1">
                    {timetableData.schedule.map((day) => {
                        const dotColor = getDayIndicatorColor(day)
                        const isSelected = selectedDay === day.dayName

                        return (
                            <button
                                key={day.dayName}
                                onClick={() => onSelectDay(day.dayName)}
                                className={`py-1.5 rounded-[12px] text-xs font-normal flex flex-col items-center justify-center transition-all ${isSelected
                                    ? 'bg-[var(--ios-blue)] text-white shadow-xs font-semibold'
                                    : 'text-[var(--ios-secondary)] hover:bg-[var(--ios-element)]/60'
                                    }`}
                            >
                                <span className="text-[10px] uppercase font-medium opacity-85">{getDayAbbr(day.dayName, lang)}</span>
                                <span className="relative text-[13px] font-semibold mt-0.5">
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
                <div className="bg-[var(--ios-card)] rounded-[20px] p-10 flex flex-col items-center justify-center gap-3 border border-[var(--ios-separator)]/60 shadow-xs">
                    <IosSpinner className="w-6 h-6 text-[var(--ios-blue)]" />
                    <p className="text-xs font-normal text-[var(--ios-secondary)]">{t.loadingTimetable}</p>
                </div>
            ) : (
                <>
                    {currentDaySchedule && currentDaySchedule.events && currentDaySchedule.events.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            {currentDaySchedule.events.map((ev, idx) => (
                                <div
                                    key={idx}
                                    className={`px-3.5 py-2.5 rounded-[14px] text-xs font-normal flex items-center gap-2 ${ev.category === 'holiday'
                                        ? 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)]'
                                        : ev.category === 'exam'
                                            ? 'bg-[var(--ios-green-subtle)] text-[var(--ios-green)]'
                                            : 'bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)]'
                                        }`}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                                    <p className="font-medium">{ev.title}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        {currentDaySchedule && currentDaySchedule.lessons && currentDaySchedule.lessons.length > 0 ? (
                            currentDaySchedule.lessons.map((lesson, idx) => {
                                const nextLesson = currentDaySchedule.lessons[idx + 1]
                                const isToday = Boolean(currentDaySchedule.isToday)
                                const liveState = getLessonLiveState(lesson, currentDaySchedule.isoDate, isToday)
                                const breakActive = nextLesson ? isBreakActive(lesson, nextLesson, isToday) : false
                                const breakMinutes = nextLesson ? calculateBreakDuration(lesson.time, nextLesson.time) : 0
                                const breakRemaining = nextLesson ? getBreakRemainingMinutes(nextLesson.time) : 0

                                const shouldShowUpcomingBreak = liveState === 'active' && breakMinutes > 0
                                const shouldShowCountdown = breakActive && breakRemaining > 0
                                const hasBreakDivider = shouldShowUpcomingBreak || shouldShowCountdown

                                return (
                                    <Fragment key={`${lesson.number}-${lesson.subject}-${lesson.time}-${idx}`}>
                                        <div ref={liveState === 'active' ? activeLessonRef : null} className="w-full">
                                            <article
                                                onClick={() => onSelectLesson(lesson)}
                                                className={`w-full bg-[var(--ios-card)] rounded-[16px] px-4 py-2.5 flex items-start justify-between gap-2.5 cursor-pointer active:scale-[0.985] active:bg-[var(--ios-element)]/30 border border-[var(--ios-separator)]/50 shadow-xs transition-all ${liveState === 'passed' ? 'opacity-45' : 'opacity-100'
                                                    }`}
                                            >
                                                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-1.5">
                                                        {liveState === 'active' && (
                                                            <span className="w-2 h-2 rounded-full bg-[var(--ios-blue)] shadow-[0_0_8px_rgba(10,132,255,0.8)] shrink-0" />
                                                        )}
                                                        <span className="text-[11px] font-normal text-[var(--ios-secondary)] tracking-tight">
                                                            {lesson.time}
                                                        </span>
                                                    </div>

                                                    <h3 className={`text-[15px] font-medium text-[var(--ios-label)] leading-[1.25] break-words ${titleClampClass}`}>
                                                        {lesson.subject}
                                                    </h3>

                                                    <p className="text-[12px] font-normal text-[var(--ios-secondary)]">
                                                        {lesson.teacher || t.notSpecified}
                                                    </p>
                                                </div>

                                                <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5">
                                                    {lesson.room && (
                                                        <span className="text-[11px] font-medium bg-[var(--ios-room-bg)] text-[var(--ios-room-text)] px-2 py-0.5 rounded-[6px] whitespace-nowrap">
                                                            {lesson.room}
                                                        </span>
                                                    )}
                                                    {lesson.isShortened && (
                                                        <span className="text-[10px] font-semibold text-[var(--ios-orange)] bg-[var(--ios-orange-subtle)] px-2 py-0.5 rounded-full whitespace-nowrap">
                                                            {lesson.durationMinutes} min
                                                        </span>
                                                    )}
                                                    {lesson.isCancelled && (
                                                        <span className="text-[10px] font-semibold text-[var(--ios-red)] bg-[var(--ios-red-subtle)] px-2 py-0.5 rounded-full whitespace-nowrap">
                                                            {t.cancelledLabel}
                                                        </span>
                                                    )}
                                                    {lesson.isSubstitution && (
                                                        <span className="text-[10px] font-semibold text-[var(--ios-purple)] bg-[var(--ios-purple-subtle)] px-2 py-0.5 rounded-full whitespace-nowrap">
                                                            {t.substitutionLabel}
                                                        </span>
                                                    )}
                                                </div>
                                            </article>
                                        </div>

                                        {hasBreakDivider && (
                                            <div className="w-full flex items-center gap-3 px-2 py-1">
                                                <div className="h-[1px] flex-1 bg-[var(--ios-separator)]/60" />
                                                <div
                                                    className={`flex items-center gap-1.5 text-[11px] font-medium shrink-0 px-2.5 py-0.5 rounded-full ${shouldShowCountdown
                                                        ? 'text-[var(--ios-blue)] bg-[var(--ios-blue-subtle)] animate-pulse'
                                                        : 'text-[var(--ios-secondary)] bg-[var(--ios-element)]/60'
                                                        }`}
                                                >
                                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <polyline points="12 6 12 12 16 14" />
                                                    </svg>
                                                    <span>
                                                        {shouldShowCountdown
                                                            ? t.breakCountdownLabel(breakRemaining)
                                                            : `${breakMinutes} min`}
                                                    </span>
                                                </div>
                                                <div className="h-[1px] flex-1 bg-[var(--ios-separator)]/60" />
                                            </div>
                                        )}
                                    </Fragment>
                                )
                            })
                        ) : (
                            <div className="bg-[var(--ios-card)] rounded-[20px] p-8 text-center text-xs font-normal text-[var(--ios-secondary)] border border-[var(--ios-separator)]/60 shadow-xs">
                                {t.noLessonsDay}
                            </div>
                        )}
                    </div>
                </>
            )}
        </section>
    )
}