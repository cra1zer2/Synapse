'use client'

import { useRef, useState, useEffect, useMemo, Fragment } from 'react'
import { Calendar } from 'lucide-react'
import { SmartTimetableResult, DaySchedule, LessonItem, TimetableEvent } from '@/models/timetable.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { formatSubjectName } from '@/utils/text.util'
import { getEventCategoryStyle } from '@/utils/badge.util'
import { TextClampOption } from '@/hooks/settings.hook'
import { IosBadge, IosBreakDivider, IosCard, IosEmptyState } from '@/components/ios/ios-ui'
import { IosSpinner } from '@/components/ios/ios-spinner'
import { getDayAbbr, computeLiveWeekDays, getTodayIsoString } from '@/utils/date.util'
import {
  parseLessonTimeRange,
  getCurrentTimeMinutes,
  calculateBreakDuration,
  getBreakRemainingMinutes
} from '@/utils/time.util'
import { cn } from '@/utils/cn.util'

interface ScheduleWidgetProps {
  timetableData?: SmartTimetableResult | null
  selectedDay: string
  onSelectDay: (day: string) => void
  onSelectLesson: (lesson: LessonItem) => void
  onSelectEvent?: (event: TimetableEvent) => void
  currentWeekPivot: string
  onShiftWeek: (deltaDays: number) => void
  onSelectDate?: (dateIso: string) => void
  isLoadingWeek?: boolean
  textClamp?: TextClampOption
  showFullSubjectNames?: boolean
  showHomeworks?: boolean
  lang?: AppLanguage
  t: AppDictionary
}

function getFocusLessonIndex(lessons: LessonItem[], currentMinutes: number): number {
  if (!lessons || lessons.length === 0) return -1

  const valid = lessons
    .map((l, index) => ({ lesson: l, index, range: parseLessonTimeRange(l.time) }))
    .filter((item) => item.range.isValid && !item.lesson.isCancelled)

  if (valid.length === 0) return 0

  if (currentMinutes < valid[0].range.startMinutes) {
    return valid[0].index
  }

  for (let i = 0; i < valid.length; i++) {
    const curr = valid[i]
    const next = valid[i + 1]

    if (currentMinutes >= curr.range.startMinutes && currentMinutes <= curr.range.endMinutes) {
      return curr.index
    }

    if (next && currentMinutes > curr.range.endMinutes && currentMinutes < next.range.startMinutes) {
      return curr.index
    }
  }

  return valid[valid.length - 1].index
}

function getDayIndicatorColor(day?: DaySchedule): string | null {
  if (!day) return null

  const hasCancelled = day.lessons.some((l) => l.isCancelled)
  const hasHoliday = day.events && day.events.some((e) => e.category === 'holiday')
  if (hasCancelled || hasHoliday) return 'bg-[var(--ios-red)]'

  const hasEventsOrExams = day.events && day.events.length > 0
  const hasSubstitution = day.lessons.some((l) => l.isSubstitution)
  const hasShortened = day.lessons.some((l) => l.isShortened)
  if (hasEventsOrExams || hasSubstitution || hasShortened) {
    return 'bg-[var(--ios-blue)]'
  }

  return null
}

function LessonSkeletonRow() {
  return (
    <div className="w-full bg-[var(--ios-card-solid)] rounded-[14px] p-3.5 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0 flex flex-col gap-1.5 justify-center py-0.5">
        <div className="w-20 h-[12px] rounded-full ios-skeleton" />
        <div className="w-44 h-[16px] rounded-full ios-skeleton" />
        <div className="w-28 h-[12px] rounded-full ios-skeleton" />
      </div>
      <div className="w-10 h-[16px] rounded-full ios-skeleton shrink-0" />
    </div>
  )
}

export function ScheduleWidget({
  timetableData,
  selectedDay,
  onSelectDay,
  onSelectLesson,
  onSelectEvent,
  currentWeekPivot,
  onShiftWeek,
  onSelectDate,
  isLoadingWeek = false,
  textClamp = 'full',
  showFullSubjectNames = false,
  showHomeworks = false,
  lang = 'pl',
  t
}: ScheduleWidgetProps) {
  const [currentMinutes, setCurrentMinutes] = useState(getCurrentTimeMinutes)
  const [cachedLessonCount, setCachedLessonCount] = useState<number>(6)
  const activeLessonRef = useRef<HTMLDivElement>(null)
  const hasAutoScrolledRef = useRef(false)
  const isEn = lang === 'en'

  const currentDaySchedule: DaySchedule | undefined = timetableData?.schedule?.find(
    (d) => d.dayName === selectedDay
  )

  const liveWeek = useMemo(() => computeLiveWeekDays(currentWeekPivot), [currentWeekPivot])

  const selectedDayIndex = useMemo(() => {
    const idx = liveWeek.days.findIndex((d) => d.dayName === selectedDay)
    return idx >= 0 ? idx : 0
  }, [liveWeek.days, selectedDay])

  const realTodayIso = useMemo(() => getTodayIsoString(), [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentMinutes(getCurrentTimeMinutes())
    }, 15000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (currentDaySchedule?.lessons && currentDaySchedule.lessons.length > 0) {
      setCachedLessonCount(currentDaySchedule.lessons.length)
    }
  }, [currentDaySchedule])

  const handleDaySelect = (dayName: string) => {
    if (dayName === selectedDay) return
    hasAutoScrolledRef.current = false
    onSelectDay(dayName)
  }

  const focusIndex = useMemo(() => {
    if (!currentDaySchedule?.isToday || !currentDaySchedule.lessons) return -1
    return getFocusLessonIndex(currentDaySchedule.lessons, currentMinutes)
  }, [currentDaySchedule, currentMinutes])

  useEffect(() => {
    if (currentDaySchedule?.isToday && !hasAutoScrolledRef.current && activeLessonRef.current) {
      hasAutoScrolledRef.current = true
      const timer = setTimeout(() => {
        if (activeLessonRef.current) {
          activeLessonRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [currentDaySchedule?.isToday, selectedDay, focusIndex])

  const getLessonLiveState = (lesson: LessonItem, dayIso: string, isToday: boolean): 'active' | 'passed' | 'upcoming' => {
    if (dayIso < realTodayIso) return 'passed'
    if (!isToday) return 'upcoming'
    const range = parseLessonTimeRange(lesson.time)
    if (!range.isValid) return 'upcoming'
    if (currentMinutes >= range.startMinutes && currentMinutes <= range.endMinutes) return 'active'
    if (currentMinutes > range.endMinutes) return 'passed'
    return 'upcoming'
  }

  const isBreakActive = (prevLesson: LessonItem, nextLesson: LessonItem, isToday: boolean): boolean => {
    if (!isToday) return false
    const r1 = parseLessonTimeRange(prevLesson.time)
    const r2 = parseLessonTimeRange(nextLesson.time)
    if (!r1.isValid || !r2.isValid) return false
    return currentMinutes > r1.endMinutes && currentMinutes < r2.startMinutes
  }

  const displayEvents = useMemo(() => {
    if (!currentDaySchedule?.events) return []
    return currentDaySchedule.events.filter((ev) => {
      if (!showHomeworks && ev.category === 'homework') return false
      const lower = (ev.title || '').toLowerCase()
      if (lower.includes('zastępstw') || lower.includes('zastepstw') || lower.includes('nieobecn')) {
        return false
      }
      return true
    })
  }, [currentDaySchedule, showHomeworks])

  const dayLessons = currentDaySchedule?.lessons || []
  const hasAnyActiveLesson = dayLessons.some((l) => !l.isCancelled)
  const hasLaterStart = Boolean(hasAnyActiveLesson && dayLessons[0]?.isCancelled)
  const hasEarlierFinish = Boolean(
    hasAnyActiveLesson && dayLessons.length > 1 && dayLessons[dayLessons.length - 1]?.isCancelled
  )

  return (
    <section className="w-full flex flex-col gap-3.5 pb-12 select-none">
      <IosCard className="overflow-hidden">
        <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-[var(--ios-separator)]">
          <button
            type="button"
            onClick={() => onShiftWeek(-7)}
            className="w-[34px] h-[34px] rounded-full bg-[var(--ios-element)] text-[var(--ios-label)] flex items-center justify-center active:scale-90 transition-transform duration-150 cursor-pointer"
            aria-label={isEn ? 'Previous week' : 'Poprzedni tydzień'}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-[var(--ios-label)] tracking-tight tabular-nums">
              {liveWeek.rangeLabel}
            </span>

            {isLoadingWeek ? (
              <div className="w-5 h-5 flex items-center justify-center">
                <IosSpinner size="small" className="text-[var(--ios-blue)]" />
              </div>
            ) : (
              <div className="relative w-7 h-7 rounded-full flex items-center justify-center text-[var(--ios-secondary)] hover:text-[var(--ios-blue)] active:scale-90 transition-all overflow-hidden cursor-pointer">
                <Calendar className="w-4 h-4 pointer-events-none" strokeWidth={2} />
                <input
                  type="date"
                  value={currentWeekPivot}
                  onChange={(e) => {
                    if (e.target.value && onSelectDate) {
                      onSelectDate(e.target.value)
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                  aria-label={isEn ? 'Pick date' : 'Wybierz datę'}
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onShiftWeek(7)}
            className="w-[34px] h-[34px] rounded-full bg-[var(--ios-element)] text-[var(--ios-label)] flex items-center justify-center active:scale-90 transition-transform duration-150 cursor-pointer"
            aria-label={isEn ? 'Next week' : 'Następny tydzień'}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <div className="px-1.5 py-2 sm:p-2">
          <div className="relative grid grid-cols-5 items-center">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-1/5 flex flex-col items-center justify-end pb-[4px] transition-transform duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform"
              style={{
                transform: 'translate3d(' + selectedDayIndex * 100 + '%, 0, 0)'
              }}
            >
              <div className="w-[32px] sm:w-[34px] h-[32px] sm:h-[34px] rounded-full bg-[var(--ios-blue)]" />
            </div>

            {liveWeek.days.map((daySlot) => {
              const dayData = timetableData?.schedule?.find((d) => d.dayName === daySlot.dayName)
              const dotColor = getDayIndicatorColor(dayData)
              const isSelected = selectedDay === daySlot.dayName

              return (
                <button
                  key={daySlot.dayName}
                  type="button"
                  onClick={() => handleDaySelect(daySlot.dayName)}
                  className="relative z-10 py-1 flex flex-col items-center justify-center select-none cursor-pointer gap-1 w-full active:scale-[0.94] transition-transform duration-150"
                >
                  <span
                    className={cn(
                      'text-[11px] uppercase font-semibold tracking-wide transition-colors duration-150',
                      isSelected ? 'text-[var(--ios-blue)]' : 'text-[var(--ios-secondary)]'
                    )}
                  >
                    {getDayAbbr(daySlot.dayName, lang)}
                  </span>
                  <span
                    className={cn(
                      'relative w-[32px] sm:w-[34px] h-[32px] sm:h-[34px] flex items-center justify-center text-[15px] sm:text-[16px] rounded-full transition-colors duration-150 tabular-nums',
                      isSelected
                        ? 'text-white font-semibold'
                        : 'text-[var(--ios-label)] font-normal hover:bg-[var(--ios-row-hover)]'
                    )}
                  >
                    {daySlot.dateNum}
                    {dotColor && (
                      <span
                        className={cn(
                          'absolute -bottom-1 w-1.5 h-1.5 rounded-full ring-2 ring-[var(--ios-card-solid)]',
                          dotColor
                        )}
                      />
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </IosCard>

      <div className="flex flex-col gap-2.5 select-none">
        {isLoadingWeek ? (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: Math.min(Math.max(cachedLessonCount, 4), 7) }).map((_, i) => (
              <LessonSkeletonRow key={i} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {(hasLaterStart || hasEarlierFinish) && (
              <div className="flex flex-wrap items-center gap-1.5 px-1">
                {hasLaterStart && <IosBadge variant="orange" size="sm" text={t.laterStartLabel} />}
                {hasEarlierFinish && <IosBadge variant="blue" size="sm" text={t.earlierFinishLabel} />}
              </div>
            )}

            {displayEvents.length > 0 && (
              <div className="flex flex-col gap-2 pb-1">
                {displayEvents.map((ev, i) => {
                  const style = getEventCategoryStyle(ev.category)
                  const fallbackBadge =
                    ev.category === 'holiday'
                      ? isEn
                        ? 'Holiday'
                        : 'Dzień wolny'
                      : ev.category === 'quiz'
                        ? isEn
                          ? 'Quiz'
                          : 'Kartkówka'
                        : ev.category === 'homework'
                          ? isEn
                            ? 'Homework'
                            : 'Zadanie'
                          : isEn
                            ? 'Exam'
                            : 'Sprawdzian'
                  const badgeText = ev.eventType || fallbackBadge
                  const lessonInfo =
                    ev.lessonNumber !== undefined && ev.lessonNumber !== null
                      ? t.lessonNumberLabel(ev.lessonNumber) + ' • '
                      : ''
                  const displayTitle =
                    ev.subjectName && ev.subjectName !== ev.eventType ? ev.subjectName : ev.title

                  return (
                    <div
                      key={i}
                      onClick={() => onSelectEvent?.(ev)}
                      className={cn(
                        'px-3.5 py-2.5 rounded-[14px] text-[13px] font-medium cursor-pointer active:scale-[0.985] transition-transform duration-150 flex items-center justify-between',
                        style.bgClass,
                        style.textClass
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={cn(
                            'font-semibold uppercase text-[10px] px-2 py-0.5 rounded-full shrink-0 text-white',
                            style.dotClass
                          )}
                        >
                          {badgeText}
                        </span>
                        <p className="truncate text-[13px] text-[var(--ios-label)] font-medium">
                          {lessonInfo + displayTitle}
                        </p>
                      </div>
                      <svg
                        className="w-4 h-4 text-[var(--ios-tertiary)] shrink-0 ml-2"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  )
                })}
              </div>
            )}

            {currentDaySchedule && dayLessons.length > 0 ? (
              <IosCard className="overflow-hidden">
                {dayLessons.map((lesson, idx) => {
                  const nextLesson = dayLessons[idx + 1]
                  const isToday = Boolean(currentDaySchedule.isToday)
                  const liveState = getLessonLiveState(lesson, currentDaySchedule.isoDate, isToday)
                  const isFocusLesson = isToday && idx === focusIndex
                  const breakActive = nextLesson ? isBreakActive(lesson, nextLesson, isToday) : false
                  const breakMinutes = nextLesson ? calculateBreakDuration(lesson.time, nextLesson.time) : 0
                  const breakRemaining = nextLesson ? getBreakRemainingMinutes(nextLesson.time) : 0

                  const isCancelled = Boolean(lesson.isCancelled)
                  const isSub = Boolean(lesson.isSubstitution)
                  const displayTitle = formatSubjectName(lesson.subject, showFullSubjectNames)
                  const shouldShowCountdown = breakActive && breakRemaining > 0

                  return (
                    <Fragment key={lesson.number + '-' + lesson.subject + '-' + lesson.time + '-' + idx}>
                      <div ref={isFocusLesson ? activeLessonRef : null} className="w-full scroll-my-16">
                        <div
                          onClick={() => onSelectLesson(lesson)}
                          className={cn(
                            'w-full p-3.5 px-4 flex items-center justify-between gap-3 transition-colors duration-150 cursor-pointer select-none hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)]',
                            isCancelled && 'opacity-40'
                          )}
                        >
                          <div className="flex-1 min-w-0 flex flex-col gap-0.5 justify-center">
                            <div className="flex items-center gap-1.5">
                              {liveState === 'active' && !isCancelled && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ios-blue)] shrink-0 animate-pulse" />
                              )}
                              <span
                                className={cn(
                                  'text-[12px] font-normal tracking-[-0.1px] leading-[16px] tabular-nums',
                                  isCancelled ? 'line-through text-[var(--ios-secondary)]' : 'text-[var(--ios-secondary)]'
                                )}
                              >
                                {lesson.time}
                              </span>
                              {lesson.number !== undefined && lesson.number !== null && (
                                <span className="text-[11px] font-medium text-[var(--ios-tertiary)] tabular-nums">
                                  #{lesson.number}
                                </span>
                              )}
                            </div>

                            <h4
                              className={cn(
                                'text-[15px] font-medium tracking-[-0.2px] leading-snug',
                                isCancelled ? 'line-through text-[var(--ios-secondary)]' : 'text-[var(--ios-label)]',
                                textClamp === '2' ? 'line-clamp-2' : 'truncate'
                              )}
                            >
                              {displayTitle}
                            </h4>

                            <p
                              className={cn(
                                'text-[12px] font-normal tracking-[-0.1px] leading-[16px] truncate',
                                isCancelled ? 'line-through text-[var(--ios-secondary)]' : 'text-[var(--ios-secondary)]'
                              )}
                            >
                              {lesson.teacher || t.notSpecified}
                            </p>
                          </div>

                          <div className="shrink-0 flex items-center gap-2 self-center pr-1">
                            {lesson.room ? (
                              <span
                                className={cn(
                                  'text-[13px] tracking-tight font-medium',
                                  isCancelled
                                    ? 'text-[var(--ios-secondary)] line-through'
                                    : isSub
                                      ? 'text-[var(--ios-purple)] font-semibold'
                                      : 'text-[var(--ios-label)]'
                                )}
                              >
                                {lesson.room}
                              </span>
                            ) : null}

                            {lesson.isShortened && !isCancelled && (
                              <span className="text-[11px] font-medium text-[var(--ios-orange)] bg-[var(--ios-orange-subtle)] px-2.5 py-0.5 rounded-full whitespace-nowrap">
                                {lesson.durationMinutes} min
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {idx < dayLessons.length - 1 &&
                        (shouldShowCountdown ? (
                          <IosBreakDivider
                            label={t.breakWord}
                            minutes={breakMinutes}
                            isCountdown={true}
                            countdownText={t.breakCountdownLabel(breakRemaining)}
                          />
                        ) : (
                          <div className="h-[0.5px] bg-[var(--ios-separator)] mx-4" />
                        ))}
                    </Fragment>
                  )
                })}
              </IosCard>
            ) : (
              <IosEmptyState
                inCard
                iconTone="neutral"
                icon={<Calendar className="w-[22px] h-[22px]" strokeWidth={1.9} />}
                title={t.noLessonsDay}
              />
            )}
          </div>
        )}
      </div>
    </section>
  )
}
