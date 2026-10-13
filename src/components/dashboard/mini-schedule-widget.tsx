'use client'

import { useMemo } from 'react'
import { SmartTimetableResult, LessonItem } from '@/models/timetable.model'
import { parseLessonTimeRange, calculateBreakDuration } from '@/utils/time.util'

interface MiniScheduleWidgetProps {
    timetableData: SmartTimetableResult | null
    onOpenFullSchedule: () => void
}

function LessonRowCard({
    lesson,
    isPast = false,
    isActive = false
}: {
    lesson: LessonItem
    isPast?: boolean
    isActive?: boolean
}) {
    return (
        <div
            className={`w-full bg-[var(--ios-element)]/35 rounded-[16px] px-4 py-2.5 flex items-start justify-between gap-2.5 transition-all ${isPast ? 'opacity-45' : 'opacity-100'
                }`}
        >
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                    {isActive && (
                        <span className="w-2 h-2 rounded-full bg-[var(--ios-blue)] shadow-[0_0_8px_rgba(10,132,255,0.8)] shrink-0" />
                    )}
                    <span className="text-[11px] font-normal text-[var(--ios-secondary)] tracking-tight tabular-nums">
                        {lesson.time}
                    </span>
                </div>

                <h4 className="text-[15px] font-medium text-[var(--ios-label)] leading-[1.25] break-words">
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
    onOpenFullSchedule
}: MiniScheduleWidgetProps) {
    const todayDayName = useMemo(() => {
        const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        return dayMap[new Date().getDay()]
    }, [])

    const todaySchedule = useMemo(() => {
        if (!timetableData?.schedule) return null
        return (
            timetableData.schedule.find((d) => d.isToday) ||
            timetableData.schedule.find((d) => d.dayName === todayDayName) ||
            timetableData.schedule[0]
        )
    }, [timetableData, todayDayName])

    const lessons = useMemo(() => {
        return todaySchedule?.lessons || []
    }, [todaySchedule])

    const { pastLesson, currentLesson, nextLesson, breakMinutes } = useMemo(() => {
        if (lessons.length === 0) {
            return {
                pastLesson: null,
                currentLesson: null,
                nextLesson: null,
                breakMinutes: 0
            }
        }

        const now = new Date()
        const currentMinutes = now.getHours() * 60 + now.getMinutes()

        let focusIdx = 0

        for (let i = 0; i < lessons.length; i++) {
            const range = parseLessonTimeRange(lessons[i].time)
            if (range.isValid) {
                if (currentMinutes >= range.startMinutes && currentMinutes <= range.endMinutes) {
                    focusIdx = i
                    break
                }
                if (currentMinutes < range.startMinutes) {
                    focusIdx = i
                    break
                }
            }
        }

        const curr = lessons[focusIdx] || lessons[0] || null
        const past = focusIdx > 0 ? lessons[focusIdx - 1] : null
        const next = focusIdx < lessons.length - 1 ? lessons[focusIdx + 1] : null

        const b = curr && next ? calculateBreakDuration(curr.time, next.time) : 0

        return {
            pastLesson: past,
            currentLesson: curr,
            nextLesson: next,
            breakMinutes: b
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

            {lessons.length === 0 ? (
                <div className="py-8 text-center text-xs font-normal text-[var(--ios-secondary)]">
                    Brak zaplanowanych lekcji na dziś
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {pastLesson && (
                        <LessonRowCard lesson={pastLesson} isPast={true} />
                    )}

                    {currentLesson && (
                        <LessonRowCard lesson={currentLesson} isActive={true} />
                    )}

                    {breakMinutes > 0 && <BreakIndicator minutes={breakMinutes} />}

                    {nextLesson && (
                        <LessonRowCard lesson={nextLesson} />
                    )}
                </div>
            )}
        </section>
    )
}