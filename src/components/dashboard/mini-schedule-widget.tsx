'use client'

import { useMemo, useState, useEffect, Fragment } from 'react'
import { SmartTimetableResult, LessonItem } from '@/models/timetable.model'
import { parseLessonTimeRange, calculateBreakDuration, getCurrentTimeMinutes, getBreakRemainingMinutes } from '@/utils/time.util'
import { formatSubjectName } from '@/utils/text.util'
import { formatPolishDayDate } from '@/utils/date.util'
import { TextClampOption } from '@/hooks/settings.hook'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosCard, IosBreakDivider } from '@/components/ios/ios-ui'
import { cn } from '@/utils/cn.util'

export interface MiniScheduleWidgetProps {
  isOffline?: boolean
  timetableData: SmartTimetableResult | null
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  textClamp?: TextClampOption
  showFullSubjectNames?: boolean
  lang?: AppLanguage
  t: AppDictionary
  showAllLessons?: boolean
  onSelectLesson?: (lesson: LessonItem) => void
  onOpenFullSchedule: (targetDay?: string, targetIsoDate?: string) => void
}

const WEEKDAY_LABELS_PL: Record<string, string> = {
  Monday: 'Poniedziałek',
  Tuesday: 'Wtorek',
  Wednesday: 'Środa',
  Thursday: 'Czwartek',
  Friday: 'Piątek',
  Saturday: 'Sobota',
  Sunday: 'Niedziela'
}

const WEEKDAY_LABELS_EN: Record<string, string> = {
  Monday: 'Monday',
  Tuesday: 'Tuesday',
  Wednesday: 'Wednesday',
  Thursday: 'Thursday',
  Friday: 'Friday',
  Saturday: 'Saturday',
  Sunday: 'Sunday'
}

function getDaysDiff(fromIso: string, toIso: string): number {
  const p1 = fromIso.split('-').map(Number)
  const p2 = toIso.split('-').map(Number)
  if (p1.length !== 3 || p2.length !== 3) return 1
  const d1 = new Date(p1[0], p1[1] - 1, p1[2])
  const d2 = new Date(p2[0], p2[1] - 1, p2[2])
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
}

function MiniLessonSkeleton({
  subjectWidth = 'w-40',
  teacherWidth = 'w-28'
}: {
  subjectWidth?: string
  teacherWidth?: string
}) {
  return (
    <div className="w-full px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0 flex flex-col gap-1.5 justify-center py-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-20 h-[12px] rounded-full ios-skeleton" />
          <div className="w-5 h-[11px] rounded-full ios-skeleton" />
        </div>
        <div className={cn('h-[16px] rounded-full ios-skeleton', subjectWidth)} />
        <div className={cn('h-[12px] rounded-full ios-skeleton', teacherWidth)} />
      </div>
      <div className="w-9 h-[16px] rounded-full ios-skeleton shrink-0" />
    </div>
  )
}

function MiniLessonItem({
  lesson,
  isActive = false,
  isPassed = false,
  showFull = false,
  onSelect,
  t
}: {
  lesson: LessonItem
  isActive?: boolean
  isPassed?: boolean
  showFull?: boolean
  onSelect?: (lesson: LessonItem) => void
  t: AppDictionary
}) {
  const displaySubject = formatSubjectName(lesson.subject, showFull)
  const isSub = Boolean(lesson.isSubstitution)
  const isCancelled = Boolean(lesson.isCancelled)

  return (
    <div
      onClick={(e) => {
        if (onSelect) {
          e.stopPropagation()
          onSelect(lesson)
        }
      }}
      className={cn(
        'w-full py-3 px-4 flex items-center justify-between gap-3 transition-colors duration-150 cursor-pointer select-none hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)]',
        isCancelled && 'opacity-40',
        isPassed && !isCancelled && 'opacity-60'
      )}
    >
      <div className="flex-1 min-w-0 flex flex-col gap-0.5 justify-center">
        <div className="flex items-center gap-1.5">
          {isActive && !isCancelled && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ios-blue)] shrink-0 animate-pulse" />
          )}
          <span className={cn(
            'text-[12px] font-normal tracking-[-0.1px] leading-[16px] tabular-nums',
            isCancelled ? 'line-through text-[var(--ios-secondary)]' : isActive ? 'text-[var(--ios-blue)] font-semibold' : 'text-[var(--ios-secondary)]'
          )}>
            {lesson.time}
          </span>
          {lesson.number !== undefined && lesson.number !== null && (
            <span className="text-[11px] font-medium text-[var(--ios-tertiary)] tabular-nums">
              #{lesson.number}
            </span>
          )}
        </div>

        <h4 className={cn(
          'text-[15px] font-medium tracking-[-0.2px] leading-snug truncate',
          isCancelled ? 'line-through text-[var(--ios-secondary)]' : isActive ? 'text-[var(--ios-label)] font-semibold' : 'text-[var(--ios-label)]'
        )}>
          {displaySubject}
        </h4>

        <p className={cn('text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] leading-[16px] truncate', isCancelled && 'line-through')}>
          {lesson.teacher || t.notSpecified}
        </p>
      </div>

      <div className="shrink-0 flex items-center gap-2 self-center">
        {lesson.room ? (
          <span className={cn(
            'text-[13px] tracking-tight font-medium',
            isCancelled ? 'text-[var(--ios-secondary)] line-through' : isSub ? 'text-[var(--ios-purple)] font-semibold' : 'text-[var(--ios-secondary)]'
          )}>
            {lesson.room}
          </span>
        ) : null}

        {lesson.isShortened && !isCancelled && (
          <span className="text-[11px] font-medium text-[var(--ios-orange)] bg-[var(--ios-orange-subtle)] px-2 py-0.5 rounded-full whitespace-nowrap">
            {lesson.durationMinutes} min
          </span>
        )}
      </div>
    </div>
  )
}

export function MiniScheduleWidget({
  timetableData,
  isLoading = false,
  error = null,
  onRetry,
  isOffline = false,
  showFullSubjectNames = false,
  lang = 'pl',
  t,
  showAllLessons = false,
  onSelectLesson,
  onOpenFullSchedule
}: MiniScheduleWidgetProps) {
  const [currentMinutes, setCurrentMinutes] = useState(getCurrentTimeMinutes)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentMinutes(getCurrentTimeMinutes())
    }, 15000)
    return () => clearInterval(timer)
  }, [])

  const realTodayIso = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return y + '-' + m + '-' + d
  }, [])

  const todayDayName = useMemo(() => {
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return dayMap[new Date().getDay()]
  }, [])

  const isWeekend = todayDayName === 'Saturday' || todayDayName === 'Sunday'

  const todaySchedule = useMemo(() => {
    if (!timetableData?.schedule || isWeekend) return null
    const exactMatch = timetableData.schedule.find((d) => d.isoDate === realTodayIso)
    if (exactMatch) return exactMatch
    return timetableData.schedule.find((d) => d.dayName === todayDayName) || null
  }, [timetableData, realTodayIso, todayDayName, isWeekend])

  const nextUpcomingDaySchedule = useMemo(() => {
    if (!timetableData) return null
    const schedule = timetableData.schedule || []

    const futureDaysInSchedule = schedule
      .filter((d) => d.isoDate > realTodayIso && d.lessons.some((l) => !l.isCancelled))
      .sort((a, b) => a.isoDate.localeCompare(b.isoDate))

    if (futureDaysInSchedule.length > 0) {
      return futureDaysInSchedule[0]
    }

    if (timetableData.nextUpcomingDay && timetableData.nextUpcomingDay.lessons.some((l) => !l.isCancelled)) {
      return timetableData.nextUpcomingDay
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    if (isWeekend) {
      for (const day of days) {
        const found = schedule.find((d) => d.dayName === day && d.lessons.some((l) => !l.isCancelled))
        if (found) return found
      }
    } else {
      const currentDay = todaySchedule?.dayName || todayDayName
      const currentIdx = days.indexOf(currentDay)
      if (currentIdx !== -1) {
        for (let i = currentIdx + 1; i < days.length; i++) {
          const nextDay = schedule.find((d) => d.dayName === days[i])
          if (nextDay && nextDay.lessons.some((l) => !l.isCancelled)) return nextDay
        }
      }
    }

    return null
  }, [timetableData, realTodayIso, isWeekend, todaySchedule, todayDayName])

  const todayLessons = useMemo(() => todaySchedule?.lessons || [], [todaySchedule])
  const activeTodayLessons = useMemo(() => todayLessons.filter((l) => !l.isCancelled), [todayLessons])
  const nextDayLessons = useMemo(() => nextUpcomingDaySchedule?.lessons || [], [nextUpcomingDaySchedule])
  const activeNextDayLessons = useMemo(() => nextDayLessons.filter((l) => !l.isCancelled), [nextDayLessons])

  const lastLessonEndMinutes = useMemo(() => {
    let maxEnd = 0
    for (const l of activeTodayLessons) {
      const r = parseLessonTimeRange(l.time)
      if (r.isValid && r.endMinutes > maxEnd) maxEnd = r.endMinutes
    }
    return maxEnd > 0 ? maxEnd : (15 * 60)
  }, [activeTodayLessons])

  const scheduleState = useMemo(() => {
    if (isWeekend || activeTodayLessons.length === 0) {
      if (activeNextDayLessons.length > 0) {
        return { mode: 'next_day' as const, currentLesson: null, nextLesson: null, breakMinutes: 0 }
      }
      return { mode: 'empty' as const, currentLesson: null, nextLesson: null, breakMinutes: 0 }
    }

    let focusIdx = -1
    for (let i = 0; i < activeTodayLessons.length; i++) {
      const range = parseLessonTimeRange(activeTodayLessons[i].time)
      if (range.isValid && currentMinutes <= range.endMinutes) {
        focusIdx = i
        break
      }
    }

    if (focusIdx === -1) {
      const isPastThreeHours = currentMinutes >= lastLessonEndMinutes + 180
      return {
        mode: (isPastThreeHours && activeNextDayLessons.length > 0) ? ('next_day' as const) : ('all_ended_today' as const),
        currentLesson: null,
        nextLesson: null,
        breakMinutes: 0
      }
    }

    const curr = activeTodayLessons[focusIdx] || null
    const next = focusIdx < activeTodayLessons.length - 1 ? activeTodayLessons[focusIdx + 1] : null
    const b = curr && next ? calculateBreakDuration(curr.time, next.time) : 10

    return {
      mode: 'in_progress' as const,
      currentLesson: curr,
      nextLesson: next,
      breakMinutes: b
    }
  }, [isWeekend, activeTodayLessons, currentMinutes, lastLessonEndMinutes, activeNextDayLessons.length])

  const shouldShowNextDay = scheduleState.mode === 'next_day' && activeNextDayLessons.length > 0

  const badgeLabel = useMemo(() => {
    if (shouldShowNextDay && nextUpcomingDaySchedule) {
      const diffDays = getDaysDiff(realTodayIso, nextUpcomingDaySchedule.isoDate)
      if (diffDays > 7) {
        const dInfo = formatPolishDayDate(nextUpcomingDaySchedule.isoDate, lang)
        return dInfo.dayNum + ' ' + dInfo.monthName
      }
      const map = lang === 'en' ? WEEKDAY_LABELS_EN : WEEKDAY_LABELS_PL
      return map[nextUpcomingDaySchedule.dayName] || nextUpcomingDaySchedule.dayName
    }
    if (todaySchedule) {
      return lang === 'en' ? 'Today' : 'Dzisiaj'
    }
    return null
  }, [shouldShowNextDay, nextUpcomingDaySchedule, realTodayIso, todaySchedule, lang])

  const handleCardClick = () => {
    if (shouldShowNextDay && nextUpcomingDaySchedule) {
      onOpenFullSchedule(nextUpcomingDaySchedule.dayName, nextUpcomingDaySchedule.isoDate)
    } else if (todaySchedule) {
      onOpenFullSchedule(todaySchedule.dayName, todaySchedule.isoDate)
    } else if (nextUpcomingDaySchedule) {
      onOpenFullSchedule(nextUpcomingDaySchedule.dayName, nextUpcomingDaySchedule.isoDate)
    } else {
      onOpenFullSchedule()
    }
  }

  const displayLessons = useMemo(() => {
    const list = shouldShowNextDay ? nextDayLessons : todayLessons
    if (showAllLessons) return list
    if (!shouldShowNextDay && (scheduleState.currentLesson || scheduleState.nextLesson)) {
      const res: LessonItem[] = []
      if (scheduleState.currentLesson) res.push(scheduleState.currentLesson)
      if (scheduleState.nextLesson) res.push(scheduleState.nextLesson)
      return res
    }
    return list.filter((l) => !l.isCancelled).slice(0, 2)
  }, [shouldShowNextDay, nextDayLessons, todayLessons, showAllLessons, scheduleState.currentLesson, scheduleState.nextLesson])

  return (
    <IosCard className="overflow-hidden flex flex-col select-none">
      <div
        onClick={handleCardClick}
        className="px-4 h-[46px] flex items-center justify-between border-b border-[var(--ios-separator)] cursor-pointer hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)] transition-colors duration-150"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[15px] font-semibold text-[var(--ios-label)] tracking-[-0.2px] truncate">
            {t.schedule}
          </span>
          {(isLoading || !timetableData) ? (
            <div className="w-16 h-[20px] rounded-full ios-skeleton shrink-0" />
          ) : badgeLabel ? (
            <span className="text-[11px] font-semibold text-[var(--ios-secondary)] bg-[var(--ios-element)] px-2.5 py-0.5 rounded-full shrink-0">
              {badgeLabel}
            </span>
          ) : null}
        </div>

        <svg width="16" height="16" className="w-4 h-4 text-[var(--ios-tertiary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {error && !timetableData ? (
        <div className="px-4 py-6 flex flex-col items-center justify-center gap-2 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="w-8 h-8 rounded-full bg-[var(--ios-red-subtle)] text-[var(--ios-red)] flex items-center justify-center text-[15px] font-bold">
            !
          </div>
          <span className="text-[13px] font-normal text-[var(--ios-label)] px-3">{error}</span>
          {onRetry && (
            <button type="button" onClick={onRetry} className="text-[13px] font-medium text-[var(--ios-blue)] active:opacity-60 cursor-pointer pt-1">
              {t.refresh || 'Spróbuj ponownie'}
            </button>
          )}
        </div>
      ) : isLoading || !timetableData ? (
        showAllLessons ? (
          <div className="flex flex-col">
            {[
              { subjectWidth: 'w-44', teacherWidth: 'w-32' },
              { subjectWidth: 'w-36', teacherWidth: 'w-28' },
              { subjectWidth: 'w-52', teacherWidth: 'w-36' },
              { subjectWidth: 'w-40', teacherWidth: 'w-28' },
              { subjectWidth: 'w-48', teacherWidth: 'w-32' },
              { subjectWidth: 'w-32', teacherWidth: 'w-24' }
            ].map((row, idx, arr) => (
              <Fragment key={idx}>
                <MiniLessonSkeleton subjectWidth={row.subjectWidth} teacherWidth={row.teacherWidth} />
                {idx < arr.length - 1 && <div className="h-[1px] bg-[var(--ios-separator)] mx-4" />}
              </Fragment>
            ))}
          </div>
        ) : (
          <div className="flex flex-col py-1">
            <MiniLessonSkeleton />
            <div className="w-full flex items-center gap-3 px-4 py-1">
              <div className="h-[1px] flex-1 bg-[var(--ios-separator)]" />
              <div className="w-16 h-[20px] rounded-full ios-skeleton" />
              <div className="h-[1px] flex-1 bg-[var(--ios-separator)]" />
            </div>
            <MiniLessonSkeleton />
          </div>
        )
      ) : (
        <div className={cn('ios-reveal', isOffline && 'opacity-50 grayscale')}>
          {!showAllLessons && scheduleState.mode === 'all_ended_today' && !shouldShowNextDay ? (
            <div className="px-4 py-7 flex flex-col items-center justify-center gap-1.5 text-center">
              <div className="w-9 h-9 rounded-full bg-[var(--ios-green-subtle)] text-[var(--ios-green)] flex items-center justify-center mb-1">
                <svg className="w-4 h-4 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="text-[15px] font-medium text-[var(--ios-label)] tracking-[-0.2px]">
                {lang === 'en' ? 'All lessons for today completed' : 'Wszystkie lekcje na dziś zakończone'}
              </span>
              <span className="text-[12px] font-normal text-[var(--ios-secondary)]">
                {lang === 'en' ? 'Rest before tomorrow' : 'Odpocznij przed kolejnym dniem'}
              </span>
            </div>
          ) : displayLessons.length === 0 ? (
            <div className="px-4 py-7 text-center text-[14px] font-normal text-[var(--ios-secondary)]">
              {t.noLessonsDay}
            </div>
          ) : (
            <div className="flex flex-col">
              {showAllLessons && scheduleState.mode === 'all_ended_today' && !shouldShowNextDay && (
                <div className="mx-4 mt-3 mb-1 py-1.5 px-3 rounded-[10px] bg-[var(--ios-green-subtle)] text-[var(--ios-green)] text-[12px] font-medium flex items-center justify-between select-none">
                  <span>{lang === 'en' ? 'All lessons for today completed' : 'Lekcje na dziś zakończone'}</span>
                  <span>{lang === 'en' ? 'Done' : 'Koniec'}</span>
                </div>
              )}

              {displayLessons.map((lesson, idx) => {
                const isLast = idx === displayLessons.length - 1
                const nextLesson = !isLast ? displayLessons[idx + 1] : null
                const breakMinutes = nextLesson ? calculateBreakDuration(lesson.time, nextLesson.time) : 0

                const r = parseLessonTimeRange(lesson.time)
                const isOngoing = !shouldShowNextDay && !isWeekend && r.isValid && currentMinutes >= r.startMinutes && currentMinutes <= r.endMinutes
                const isPassed = !shouldShowNextDay && !isWeekend && r.isValid && currentMinutes > r.endMinutes

                const isBreakActive = Boolean(!shouldShowNextDay && !isWeekend && nextLesson && (() => {
                  const rNext = parseLessonTimeRange(nextLesson.time)
                  return r.isValid && rNext.isValid && currentMinutes > r.endMinutes && currentMinutes < rNext.startMinutes
                })())
                const breakRemaining = isBreakActive && nextLesson ? getBreakRemainingMinutes(nextLesson.time) : 0

                return (
                  <Fragment key={lesson.time + '-' + lesson.subject + '-' + lesson.number + '-' + idx}>
                    <MiniLessonItem
                      lesson={lesson}
                      isActive={isOngoing}
                      isPassed={isPassed}
                      showFull={showFullSubjectNames}
                      onSelect={onSelectLesson}
                      t={t}
                    />

                    {!isLast && (
                      !showAllLessons ? (
                        <IosBreakDivider
                          minutes={breakMinutes || 10}
                          isCountdown={Boolean(isBreakActive && breakRemaining > 0)}
                          countdownText={t.breakCountdownLabel(breakRemaining)}
                        />
                      ) : (
                        isBreakActive && breakRemaining > 0 ? (
                          <IosBreakDivider
                            minutes={breakMinutes}
                            isCountdown={true}
                            countdownText={t.breakCountdownLabel(breakRemaining)}
                          />
                        ) : (
                          <div className="h-[1px] bg-[var(--ios-separator)] mx-4" />
                        )
                      )
                    )}
                  </Fragment>
                )
              })}
            </div>
          )}
        </div>
      )}
    </IosCard>
  )
}
