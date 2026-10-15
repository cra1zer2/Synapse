'use client'

import { useMemo } from 'react'
import { SmartTimetableResult, LessonItem } from '@/models/timetable.model'
import { parseLessonTimeRange, calculateBreakDuration } from '@/utils/time.util'
import { TextClampOption } from '@/app/page'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosCard, IosBreakDivider } from '@/components/ios/ios-ui'
import { IosBadge } from '@/components/ios/ios-badge'

interface MiniScheduleWidgetProps {
    timetableData: SmartTimetableResult | null
    isLoading?: boolean
    textClamp?: TextClampOption
    lang?: AppLanguage
    t: AppDictionary
    onOpenFullSchedule: () => void
}

function MiniLessonItem({
    lesson,
    isActive = false,
    labelBadge,
    textClamp = 'full',
    t
}: {
    lesson: LessonItem
    isActive?: boolean
    labelBadge?: string
    textClamp?: TextClampOption
    t: AppDictionary
}) {
    const titleClampClass = textClamp === '1' ? 'line-clamp-1' : textClamp === '2' ? 'line-clamp-2' : ''

    return (
        <div className="w-full bg-[var(--ios-element)]/35 rounded-[16px] px-4 py-2.5 flex items-start justify-between gap-2.5 transition-all">
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                    {isActive ? (
                        <span className="w-2 h-2 rounded-full bg-[var(--ios-blue)] shadow-[0_0_8px_rgba(10,132,255,0.8)] shrink-0" />
                    ) : labelBadge ? (
                        <span className="text-[10px] font-semibold text-[var(--ios-secondary)] uppercase shrink-0">
                            {labelBadge} •
                        </span>
                    ) : null}

                    <span className="text-[11px] font-normal text-[var(--ios-secondary)] tracking-tight tabular-nums">
                        {lesson.time}
                    </span>
                </div>

                <h4 className={`text-[15px] font-medium text-[var(--ios-label)] leading-[1.25] break-words ${titleClampClass}`}>
                    {lesson.subject}
                </h4>

                <p className="text-[12px] font-normal text-[var(--ios-secondary)]">
                    {lesson.teacher || t.notSpecified}
                </p>
            </div>

            <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5">
                {lesson.room && (
                    <IosBadge variant="room" text={lesson.room} />
                )}
                {lesson.isShortened && (
                    <IosBadge variant="shortened" text={`${lesson.durationMinutes} min`} />
                )}
                {lesson.isCancelled && (
                    <IosBadge variant="cancelled" text={t.cancelledLabel} />
                )}
                {lesson.isSubstitution && (
                    <IosBadge variant="substitution" text={t.substitutionLabel} />
                )}
            </div>
        </div>
    )
}

export function MiniScheduleWidget({
    timetableData,
    isLoading = false,
    textClamp = 'full',
    lang = 'pl',
    t,
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

        return timetableData.schedule.find((d) => d.isToday) || null
    }, [timetableData, realTodayIso, todayDayName])

    const nextUpcomingDaySchedule = useMemo(() => {
        if (!timetableData?.schedule || !todaySchedule) return null
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        const currentIdx = days.indexOf(todaySchedule.dayName)
        if (currentIdx === -1) return null

        for (let i = currentIdx + 1; i < days.length; i++) {
            const nextDay = timetableData.schedule.find((d) => d.dayName === days[i])
            if (nextDay && nextDay.lessons.length > 0) return nextDay
        }
        return null
    }, [timetableData, todaySchedule])

    const lessons = useMemo(() => {
        return todaySchedule?.lessons || []
    }, [todaySchedule])

    const { currentLesson, nextLesson, nextLessonBadge, breakMinutes, allEnded } = useMemo(() => {
        if (lessons.length === 0) {
            return {
                currentLesson: null,
                nextLesson: null,
                nextLessonBadge: undefined,
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
                nextLessonBadge: undefined,
                breakMinutes: 0,
                allEnded: true
            }
        }

        const curr = lessons[focusIdx] || null
        let next = focusIdx < lessons.length - 1 ? lessons[focusIdx + 1] : null
        let badge: string | undefined = undefined

        if (!next && nextUpcomingDaySchedule && nextUpcomingDaySchedule.lessons.length > 0) {
            next = nextUpcomingDaySchedule.lessons[0]
            badge = nextUpcomingDaySchedule.dayName === 'Monday' ? (lang === 'en' ? 'Mo' : 'Pn') : (lang === 'en' ? 'Tomorrow' : 'Jutro')
        }

        const b = curr && next && !badge ? calculateBreakDuration(curr.time, next.time) : 10

        return {
            currentLesson: curr,
            nextLesson: next,
            nextLessonBadge: badge,
            breakMinutes: b,
            allEnded: false
        }
    }, [lessons, nextUpcomingDaySchedule, lang])

    return (
        <IosCard
            onClick={onOpenFullSchedule}
            className="p-3.5 flex flex-col gap-2.5 cursor-pointer active:scale-[0.985] transition-transform select-none"
        >
            <div className="flex items-center justify-between px-1.5 pb-2.5 pt-0.5 border-b border-[var(--ios-separator)]/50">
                <span className="text-[12px] font-semibold text-[var(--ios-label)] tracking-tight leading-none">
                    {t.schedule}
                </span>

                <svg className="w-4 h-4 text-[var(--ios-tertiary)] shrink-0 leading-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </div>

            {isLoading ? (
                <div className="py-7 flex flex-col items-center justify-center gap-2">
                    <div className="w-full h-14 ios-skeleton" />
                    <div className="w-24 h-4 rounded-full ios-skeleton" />
                    <div className="w-full h-14 ios-skeleton" />
                </div>
            ) : allEnded ? (
                <div className="py-7 flex flex-col items-center justify-center gap-1 text-center">
                    <span className="text-sm">🎉</span>
                    <span className="text-[13px] font-medium text-[var(--ios-label)]">
                        {lang === 'en' ? 'All lessons for today completed' : 'Wszystkie lekcje na dziś zakończone'}
                    </span>
                    <span className="text-[11px] font-normal text-[var(--ios-secondary)]">
                        {lang === 'en' ? 'Rest before tomorrow' : 'Odpocznij przed kolejnym dniem'}
                    </span>
                </div>
            ) : lessons.length === 0 ? (
                <div className="py-7 text-center text-xs font-normal text-[var(--ios-secondary)]">
                    {t.noLessonsDay}
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {currentLesson && (
                        <MiniLessonItem
                            lesson={currentLesson}
                            isActive={true}
                            textClamp={textClamp}
                            t={t}
                        />
                    )}

                    {nextLesson && <IosBreakDivider minutes={breakMinutes} />}

                    {nextLesson && (
                        <MiniLessonItem
                            lesson={nextLesson}
                            labelBadge={nextLessonBadge}
                            textClamp={textClamp}
                            t={t}
                        />
                    )}
                </div>
            )}
        </IosCard>
    )
}