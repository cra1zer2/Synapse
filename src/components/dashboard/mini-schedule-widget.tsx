'use client'

import { useMemo, useState, useEffect, Fragment } from 'react'
import { SmartTimetableResult, LessonItem } from '@/models/timetable.model'
import { parseLessonTimeRange, calculateBreakDuration, getCurrentTimeMinutes, getBreakRemainingMinutes } from '@/utils/time.util'
import { formatSubjectName } from '@/utils/text.util'
import { TextClampOption } from '@/app/page'
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

function MiniLessonSkeleton() {
  return (
    <div className="w-full bg-[var(--ios-block-bg)] rounded-[16px] p-3.5 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0 flex flex-col gap-1.5 justify-center py-0.5">
        <div className="w-20 h-[12px] rounded-full ios-skeleton" />
        <div className="w-40 h-[16px] rounded-full ios-skeleton" />
        <div className="w-28 h-[12px] rounded-full ios-skeleton" />
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
        'w-full py-2.5 px-1.5 flex items-center justify-between gap-3 transition-all duration-150 cursor-pointer select-none rounded-[12px] hover:bg-[var(--ios-element)]/20 active:bg-[var(--ios-element)]/40 active:scale-[0.985]',
        isCancelled && 'opacity-40',
        isPassed && !isCancelled && 'opacity-65'
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

      <div className="shrink-0 flex items-center gap-2 self-center pr-1">
        {lesson.room ? (
          <span className={cn(
            'text-[13px] tracking-tight font-medium',
            isCancelled ? 'text-[var(--ios-secondary)] line-through' : isSub ? 'text-[var(--ios-purple)] font-semibold' : 'text-[var(--ios-label)]'
          )}>
            {lesson.room}
          </span>
        ) : null}

        {lesson.isShortened && !isCancelled && (
          <span className="text-[11px] font-medium text-[var(--ios-orange)] bg-[var(--ios-orange-subtle)] border border-[var(--ios-orange)]/20 px-2 py-0.5 rounded-full whitespace-nowrap">
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
    return `${y}-${m}-${d}`
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
    if (!timetableData?.schedule || timetableData.schedule.length === 0) return null
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

    if (isWeekend) {
      const monday = timetableData.schedule.find((d) => d.dayName === 'Monday')
      if (monday && monday.lessons.length > 0) return monday
      for (const day of days) {
        const found = timetableData.schedule.find((d) => d.dayName === day && d.lessons.length > 0)
        if (found) return found
      }
      return monday || timetableData.schedule[0] || null
    }

    const currentDay = todaySchedule?.dayName || todayDayName
    const currentIdx = days.indexOf(currentDay)
    if (currentIdx !== -1) {
      for (let i = currentIdx + 1; i < days.length; i++) {
        const nextDay = timetableData.schedule.find((d) => d.dayName === days[i])
        if (nextDay && nextDay.lessons.length > 0) return nextDay
      }
    }

    return (
      timetableData.schedule.find((d) => d.dayName === 'Monday' && d.lessons.length > 0) ||
      timetableData.schedule.find((d) => d.dayName === 'Monday') ||
      null
    )
  }, [timetableData, isWeekend, todaySchedule, todayDayName])

  const todayLessons = useMemo(() => {
    return todaySchedule?.lessons || []
  }, [todaySchedule])

  const activeTodayLessons = useMemo(() => {
    return todayLessons.filter((l) => !l.isCancelled)
  }, [todayLessons])

  const nextDayLessons = useMemo(() => {
    return nextUpcomingDaySchedule?.lessons || []
  }, [nextUpcomingDaySchedule])

  const activeNextDayLessons = useMemo(() => {
    return nextDayLessons.filter((l) => !l.isCancelled)
  }, [nextDayLessons])

  const lastLessonEndMinutes = useMemo(() => {
    let maxEnd = 0
    for (const l of activeTodayLessons) {
      const r = parseLessonTimeRange(l.time)
      if (r.isValid && r.endMinutes > maxEnd) {
        maxEnd = r.endMinutes
      }
    }
    return maxEnd > 0 ? maxEnd : (15 * 60)
  }, [activeTodayLessons])

  const scheduleState = useMemo(() => {
    if (isWeekend) {
      return {
        mode: 'next_day' as const,
        currentLesson: null,
        nextLesson: null,
        breakMinutes: 0
      }
    }

    if (activeTodayLessons.length === 0) {
      return {
        mode: 'empty' as const,
        currentLesson: null,
        nextLesson: null,
        breakMinutes: 0
      }
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
      const threeHoursAfterLessons = lastLessonEndMinutes + 180
      const isPastThreeHours = currentMinutes >= threeHoursAfterLessons

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
    if (shouldShowNextDay) {
      if (isWeekend || nextUpcomingDaySchedule?.dayName === 'Monday') {
        return lang === 'en' ? 'Monday' : 'Poniedziałek'
      }
      return lang === 'en' ? 'Tomorrow' : 'Jutro'
    }
    if (todaySchedule) {
      return lang === 'en' ? 'Today' : 'Dzisiaj'
    }
    return null
  }, [shouldShowNextDay, isWeekend, nextUpcomingDaySchedule, todaySchedule, lang])

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
    if (showAllLessons) {
      return list
    }
    if (scheduleState.currentLesson || scheduleState.nextLesson) {
      const res: LessonItem[] = []
      if (scheduleState.currentLesson) res.push(scheduleState.currentLesson)
      if (scheduleState.nextLesson) res.push(scheduleState.nextLesson)
      return res
    }
    return list.slice(0, 2)
  }, [shouldShowNextDay, nextDayLessons, todayLessons, showAllLessons, scheduleState.currentLesson, scheduleState.nextLesson])

  return (
    <IosCard className="p-4 flex flex-col gap-3 select-none">
      <div
        onClick={handleCardClick}
        className="flex items-center justify-between pb-2.5 border-b border-[var(--ios-separator)] cursor-pointer active:opacity-70 transition-opacity"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[16px] font-semibold text-[var(--ios-label)] tracking-[-0.2px] truncate">
            {t.schedule}
          </span>
          {badgeLabel && (
            <span className="text-[12px] font-medium text-[var(--ios-secondary)] bg-[var(--ios-element)]/60 px-2 py-0.5 rounded-full shrink-0">
              {badgeLabel}
            </span>
          )}
        </div>

        <svg width="16" height="16" className="w-4 h-4 text-[var(--ios-tertiary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {error && !timetableData ? (
        <div className="py-5 flex flex-col items-center justify-center gap-2 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="w-8 h-8 rounded-full bg-[var(--ios-red-subtle)] text-[var(--ios-red)] flex items-center justify-center text-[15px] font-bold">
            !
          </div>
          <span className="text-[13px] font-normal text-[var(--ios-label)] px-3">
            {error}
          </span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-[13px] font-medium text-[var(--ios-blue)] active:opacity-60 cursor-pointer pt-1"
            >
              {t.refresh || 'Spróbuj ponownie'}
            </button>
          )}
        </div>
      ) : isLoading || !timetableData ? (
        <div className="flex flex-col gap-2.5">
          <MiniLessonSkeleton />
          <div className="w-full flex items-center gap-3 px-2 py-0.5">
            <div className="h-[1px] flex-1 bg-[var(--ios-separator)]" />
            <div className="w-16 h-[20px] rounded-full ios-skeleton" />
            <div className="h-[1px] flex-1 bg-[var(--ios-separator)]" />
          </div>
          <MiniLessonSkeleton />
        </div>
      ) : (
        <div className={cn('ios-reveal', isOffline && 'opacity-50 grayscale')}>
          {!showAllLessons && scheduleState.mode === 'all_ended_today' && !shouldShowNextDay ? (
            <div className="py-6 flex flex-col items-center justify-center gap-1.5 text-center">
              <div className="w-9 h-9 rounded-full bg-[var(--ios-green-subtle)] text-[var(--ios-green)] border border-[var(--ios-green)]/20 flex items-center justify-center mb-1">
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
            <div className="py-6 text-center text-[14px] font-normal text-[var(--ios-secondary)]">
              {t.noLessonsDay}
            </div>
          ) : (
            <div className="flex flex-col">
              {showAllLessons && scheduleState.mode === 'all_ended_today' && !shouldShowNextDay && (
                <div className="mb-2 py-1.5 px-3 rounded-[10px] bg-[var(--ios-green-subtle)] text-[var(--ios-green)] text-[12px] font-medium flex items-center justify-between select-none">
                  <span>{lang === 'en' ? 'All lessons for today completed' : 'Lekcje na dziś zakończone'}</span>
                  <span className="opacity-75">{lang === 'en' ? 'Done' : 'Koniec'}</span>
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
                  <Fragment key={`${lesson.time}-${lesson.subject}-${lesson.number}-${idx}`}>
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
                          <div className="h-[1px] bg-[var(--ios-separator)] mx-1.5 my-0.5" />
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
