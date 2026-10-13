'use client'

import { useMemo } from 'react'
import { SmartTimetableResult, LessonItem } from '@/models/timetable.model'
import { parseLessonTimeRange, calculateBreakDuration } from '@/utils/time.util'
import { TextClampOption } from '@/app/page'

interface MiniScheduleWidgetProps {
    timetableData: SmartTimetableResult | null
    textClamp?: TextClampOption
    onOpenFullSchedule: () => void
}

function LessonRowCard({
    lesson,
    isActive = false,
    textClamp = 'full'
}: {
    lesson: LessonItem
    isActive?: boolean
    textClamp?: TextClampOption
}) {
    const titleClampClass = textClamp === '1' ? 'line-clamp-1' : textClamp === '2' ? 'line-clamp-2' : ''

    return (
        <div className="w-full bg-[var(--ios-element)]/35 rounded-[16px] px-4 py-2.5 flex items-start justify-between gap-2.5 transition-all">
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                    {isActive && (
                        <span className="w-2 h-2 rounded-full bg-[var(--ios-blue)] shadow-[0_0_8px_rgba(10,132,255,0.8)] shrink-0" />
                    )}
                    <span className="text-[11px] font-normal text-[var(--ios-secondary)] tracking-tight tabular-nums">
                        {lesson.time}
                    </span>
                </div>

                <h4 className={`text-[15px] font-medium text-[var(--ios-label)] leading-[1.25] break-words ${titleClampClass}`}>
                    {lesson.subject}
                </h4>

                <p className="text-[12px] font-normal text-[var(--ios-secondary)]">
                    {lesson.teacher || '—'}
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
                        Odwołane
                    </span>
                )}
                {lesson.isSubstitution && (
                    <span className="text-[10px] font-semibold text-[var(--ios-purple)] bg-[var(--ios-purple-subtle)] px-2 py-0.5 rounded-full whitespace-nowrap">
                        Zastępstwo
                    </span>
                )}
            </div>
        </div>
    )
}

function BreakIndicator({ minutes }: { minutes: number }) {
    if (minutes <= 0) return null

    return (
        <div className="w-full flex items-center gap-3 px-2 py-0.5">
            <div className="h-[1px] flex-1 bg-[var(--ios-separator)]/40" />
            <div className="flex items-center gap-1 text-[11px] font-medium shrink-0 px-2.5 py-0.5 rounded-full text-[var(--ios-secondary)] bg-[var(--ios-element)]/60">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="tabular-nums">{minutes} min</span>
            </div>
            <div className="h-[1px] flex-1 bg-[var(--ios-separator)]/40" />
        </div>
    )
}

export function MiniScheduleWidget({
    timetableData,
    textClamp = 'full',
    onOpenFullSchedule
}: MiniScheduleWidgetProps) {
    const realTodayIso = useMemo(() => {
        const now = new Date()
        const y = now.getFullYear()
        const m = String(now.getMonth() + 1).padStart(2, '0')
        const d = String(now.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
    }, [])

    const todayDayName = useMemo(() => {
        const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        return dayMap[new Date().getDay()]
    }, [])

    const todaySchedule = useMemo(() => {
        if (!timetableData?.schedule) return null
        const exactMatch = timetableData.schedule.find((d) => d.isoDate === realTodayIso)
        if (exactMatch) return exactMatch

        const isWeekend = todayDayName === 'Saturday' || todayDayName === 'Sunday'
        if (isWeekend) {
            return timetableData.schedule.find((d) => d.dayName === 'Monday') || null
        }

        return null
    }, [timetableData, realTodayIso, todayDayName])

    const lessons = useMemo(() => {
        return todaySchedule?.lessons || []
    }, [todaySchedule])

    const { currentLesson, nextLesson, breakMinutes, allEnded } = useMemo(() => {
        if (lessons.length === 0) {
            return {
                currentLesson: null,
                nextLesson: null,
                breakMinutes: 0,
                allEnded: false
            }
        }

        const now = new Date()
        const currentMinutes = now.getHours() * 60 + now.getMinutes()

        let focusIdx = -1

        for (let i = 0; i < lessons.length; i++) {
            const range = parseLessonTimeRange(lessons[i].time)
            if (range.isValid) {
                if (currentMinutes <= range.endMinutes) {
                    focusIdx = i
                    break
                }
            }
        }

        if (focusIdx === -1) {
            return {
                currentLesson: null,
                nextLesson: null,
                breakMinutes: 0,
                allEnded: true
            }
        }

        const curr = lessons[focusIdx] || null
        const next = focusIdx < lessons.length - 1 ? lessons[focusIdx + 1] : null
        const b = curr && next ? calculateBreakDuration(curr.time, next.time) : 0

        return {
            currentLesson: curr,
            nextLesson: next,
            breakMinutes: b,
            allEnded: false
        }
    }, [lessons])

    return (
        <section
            onClick={onOpenFullSchedule}
            className="w-full bg-[var(--ios-card)] rounded-[22px] p-3.5 flex flex-col gap-2.5 shadow-xs cursor-pointer active:scale-[0.985] transition-transform select-none"
        >
            <div className="flex items-center justify-between px-1.5 pb-2.5 pt-0.5 border-b border-[var(--ios-separator)]/50">
                <span className="text-[12px] font-semibold text-[var(--ios-label)] tracking-tight leading-none">
                    Plan lekcji
                </span>

                <svg className="w-4 h-4 text-[var(--ios-tertiary)] shrink-0 leading-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </div>

            {allEnded ? (
                <div className="py-7 flex flex-col items-center justify-center gap-1 text-center">
                    <span className="text-sm">🎉</span>
                    <span className="text-[13px] font-medium text-[var(--ios-label)]">
                        Wszystkie lekcje na dziś zakończone
                    </span>
                    <span className="text-[11px] font-normal text-[var(--ios-secondary)]">
                        Odpocznij przed kolejnym dniem
                    </span>
                </div>
            ) : lessons.length === 0 ? (
                <div className="py-7 text-center text-xs font-normal text-[var(--ios-secondary)]">
                    Brak zaplanowanych lekcji na dziś
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {currentLesson && (
                        <LessonRowCard
                            lesson={currentLesson}
                            isActive={true}
                            textClamp={textClamp}
                        />
                    )}

                    {breakMinutes > 0 && <BreakIndicator minutes={breakMinutes} />}

                    {nextLesson && (
                        <LessonRowCard
                            lesson={nextLesson}
                            textClamp={textClamp}
                        />
                    )}
                </div>
            )}
        </section>
    )
}