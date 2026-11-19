'use client'

import React, { useMemo, useState, useEffect, useRef } from 'react'
import {
  AlertCircle,
  BookOpen,
  CalendarPlus,
  Clock,
  MapPin,
  User
} from 'lucide-react'
import { DaySchedule, LessonItem, SmartTimetableResult, TimetableEvent } from '@/models/timetable.model'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { formatSubjectName } from '@/utils/text.util'
import {
  computeLiveWeekDays,
  formatHumanDate,
  getTodayIsoString,
  getWeekdayLongLabel
} from '@/utils/date.util'
import {
  calculateBreakDuration,
  getBreakRemainingMinutes,
  getCurrentTimeMinutes,
  parseLessonTimeRange
} from '@/utils/time.util'
import {
  getEventCategoryStyle,
  getEventPrimaryTitle,
  resolveEventBadgeLabel
} from '@/utils/badge.util'
import { downloadEventIcs } from '@/utils/calendar.util'
import { UiSpinner } from '@/components/ui/ui-spinner'
import { cn } from '@/utils/cn.util'
import { MacGroupBox, MacPushButton } from './mac-primitives'

interface DesktopTimetableViewProps {
  timetableData: SmartTimetableResult | null
  timetableError: string | null
  onRetry: () => void
  selectedDay: string
  onSelectDay: (day: string) => void
  currentWeekPivot: string
  viewMode: 'week' | 'day'
  showFullSubjectNames: boolean
  showHomeworks: boolean
  lang: AppLanguage
  t: AppDictionary
  initialInspectorSelection?: { lesson?: LessonItem; isToday?: boolean; event?: TimetableEvent } | null
}

type TimetableInspectorItem =
  | { kind: 'lesson'; lesson: LessonItem; dayName: string; dateStr: string; isToday: boolean }
  | { kind: 'event'; event: TimetableEvent }
  | { kind: 'day'; dayName: string; dateStr: string; isoDate: string; isToday: boolean }
  | null

function resolveEventScope(ev: TimetableEvent, isEn: boolean): string {
  const title = getEventPrimaryTitle(ev, true, isEn)
  if (ev.description && ev.description !== title) return ev.description
  if (ev.title && ev.title !== title) return ev.title
  return ''
}

const STANDARD_BELL_TIMES: Record<number, { start: string; end: string }> = {
  0: { start: '07:10', end: '07:55' },
  1: { start: '08:00', end: '08:45' },
  2: { start: '08:50', end: '09:35' },
  3: { start: '09:45', end: '10:30' },
  4: { start: '10:40', end: '11:25' },
  5: { start: '11:35', end: '12:20' },
  6: { start: '12:40', end: '13:25' },
  7: { start: '13:30', end: '14:15' },
  8: { start: '14:25', end: '15:10' },
  9: { start: '15:15', end: '16:00' }
}

function splitTimeRange(timeStr?: string): { start: string; end: string } | null {
  if (!timeStr) return null
  const parts = timeStr.split(/[-–]/).map((s) => s.trim())
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return { start: parts[0], end: parts[1] }
  }
  return null
}

/**
 * Picks the currently running lesson, next upcoming lesson, or last finished lesson for today;
 * falls back to the first active lesson for non-today days.
 */
function pickDefaultLessonForDay(
  day: DaySchedule,
  currentMinutes: number,
  todayIso: string
): LessonItem | null {
  if (!day.lessons.length) return null
  const activeLessons = day.lessons.filter((l) => !l.isCancelled)
  const pool = activeLessons.length > 0 ? activeLessons : day.lessons
  const isTodayDay = Boolean(day.isToday || (day.isoDate && day.isoDate === todayIso))

  if (isTodayDay) {
    const inProgress = pool.find((l) => {
      const r = parseLessonTimeRange(l.time)
      return r.isValid && currentMinutes >= r.startMinutes && currentMinutes <= r.endMinutes
    })
    if (inProgress) return inProgress

    const upcoming = pool.find((l) => {
      const r = parseLessonTimeRange(l.time)
      return r.isValid && currentMinutes < r.startMinutes
    })
    if (upcoming) return upcoming

    return pool[pool.length - 1]
  }

  return pool[0]
}

export function DesktopTimetableView({
  timetableData,
  timetableError,
  onRetry,
  selectedDay,
  onSelectDay,
  currentWeekPivot,
  viewMode,
  showFullSubjectNames,
  showHomeworks,
  lang,
  t,
  initialInspectorSelection
}: DesktopTimetableViewProps) {
  const [inspector, setInspector] = useState<TimetableInspectorItem>(null)
  const [currentMinutes, setCurrentMinutes] = useState(getCurrentTimeMinutes)
  const todayIso = useMemo(() => getTodayIsoString(), [])
  const liveWeek = useMemo(() => computeLiveWeekDays(currentWeekPivot), [currentWeekPivot])
  const isEn = lang !== 'pl'
  const hasInitializedTodayRef = useRef(false)
  const lastSyncedDayKeyRef = useRef('')

  useEffect(() => {
    const timer = setInterval(() => setCurrentMinutes(getCurrentTimeMinutes()), 15000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (initialInspectorSelection?.lesson) {
      hasInitializedTodayRef.current = true
      lastSyncedDayKeyRef.current = `${selectedDay}__${timetableData?.weekStart || ''}`
      setInspector({
        kind: 'lesson',
        lesson: initialInspectorSelection.lesson,
        dayName: selectedDay,
        dateStr: '',
        isToday: Boolean(initialInspectorSelection.isToday)
      })
    } else if (initialInspectorSelection?.event) {
      hasInitializedTodayRef.current = true
      lastSyncedDayKeyRef.current = `${selectedDay}__${timetableData?.weekStart || ''}`
      setInspector({ kind: 'event', event: initialInspectorSelection.event })
    }
  }, [initialInspectorSelection, selectedDay, timetableData?.weekStart])

  // Auto-select current/next lesson on initial load, and re-sync when user switches day or week
  useEffect(() => {
    if (!timetableData?.schedule?.length) return

    if (!hasInitializedTodayRef.current) {
      if (initialInspectorSelection) return
      const todayMatch = timetableData.schedule.find(
        (d) => (d.isToday || d.isoDate === todayIso) && d.lessons.length > 0
      )
      const selectedMatch = timetableData.schedule.find(
        (d) => d.dayName === selectedDay && d.lessons.length > 0
      )
      const targetDay =
        todayMatch || selectedMatch || timetableData.schedule.find((d) => d.lessons.length > 0)

      if (targetDay) {
        hasInitializedTodayRef.current = true
        lastSyncedDayKeyRef.current = `${targetDay.dayName}__${timetableData.weekStart || ''}`
        if (todayMatch && todayMatch.dayName !== selectedDay) {
          onSelectDay(todayMatch.dayName)
        }
        const chosen = pickDefaultLessonForDay(targetDay, getCurrentTimeMinutes(), todayIso)
        if (chosen) {
          setInspector({
            kind: 'lesson',
            lesson: chosen,
            dayName: targetDay.dayName,
            dateStr: targetDay.date,
            isToday: Boolean(targetDay.isToday || targetDay.isoDate === todayIso)
          })
        }
      }
      return
    }

    const curKey = `${selectedDay}__${timetableData.weekStart || ''}`
    if (curKey !== lastSyncedDayKeyRef.current) {
      lastSyncedDayKeyRef.current = curKey
      const dayObj = timetableData.schedule.find((d) => d.dayName === selectedDay)
      if (dayObj && dayObj.lessons.length > 0) {
        const chosen = pickDefaultLessonForDay(dayObj, getCurrentTimeMinutes(), todayIso)
        if (chosen) {
          setInspector({
            kind: 'lesson',
            lesson: chosen,
            dayName: dayObj.dayName,
            dateStr: dayObj.date,
            isToday: Boolean(dayObj.isToday || dayObj.isoDate === todayIso)
          })
          return
        }
      }
      setInspector(null)
    }
  }, [timetableData, selectedDay, initialInspectorSelection, todayIso, onSelectDay])

  const filterDayEvents = (events: TimetableEvent[] = []) =>
    events.filter((ev) => {
      if (!showHomeworks && ev.category === 'homework') return false
      const lower = (ev.title || '').toLowerCase()
      return !lower.includes('zastępstw') && !lower.includes('zastepstw') && !lower.includes('nieobecn')
    })

  // Canonical 0-9 (or higher) period list with inferred/standard bell times
  const periodMetaList = useMemo(() => {
    const allLessons = (timetableData?.schedule || []).flatMap((d) => d.lessons || [])
    const maxPeriod = allLessons.reduce((max, l) => Math.max(max, Number(l.number) || 0), 9)

    return Array.from({ length: maxPeriod + 1 }, (_, num) => {
      let start = ''
      let end = ''
      for (const l of allLessons) {
        if (Number(l.number) === num) {
          const parsed = splitTimeRange(l.time)
          if (parsed) {
            start = parsed.start
            end = parsed.end
            break
          }
        }
      }
      if (!start && STANDARD_BELL_TIMES[num]) {
        start = STANDARD_BELL_TIMES[num].start
        end = STANDARD_BELL_TIMES[num].end
      }
      const hasAnyLesson = allLessons.some((l) => Number(l.number) === num)
      return { num, start, end, hasAnyLesson }
    })
  }, [timetableData])

  const hasAnyWeekEvents = useMemo(() => {
    if (!timetableData?.schedule?.length) return false
    return liveWeek.days.some((slot) => {
      const dayData = timetableData.schedule.find((d) => d.dayName === slot.dayName)
      return filterDayEvents(dayData?.events).length > 0
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timetableData, liveWeek, showHomeworks])

  const activeDayData = timetableData?.schedule?.find((d) => d.dayName === selectedDay)

  const handleInspectDay = (
    slot: { dayName: string; dateDot: string; isoDate: string },
    isToday: boolean
  ) => {
    hasInitializedTodayRef.current = true
    lastSyncedDayKeyRef.current = `${slot.dayName}__${timetableData?.weekStart || ''}`
    onSelectDay(slot.dayName)
    setInspector({
      kind: 'day',
      dayName: slot.dayName,
      dateStr: slot.dateDot,
      isoDate: slot.isoDate,
      isToday
    })
  }

  const activeBreakBanner = useMemo(() => {
    if (!activeDayData?.lessons?.length) return null
    const isDayToday = Boolean(activeDayData.isToday || activeDayData.isoDate === todayIso)
    if (!isDayToday) return null

    for (let i = 0; i < activeDayData.lessons.length - 1; i++) {
      const cur = activeDayData.lessons[i]
      const nxt = activeDayData.lessons[i + 1]
      const r = parseLessonTimeRange(cur.time)
      const nextR = parseLessonTimeRange(nxt.time)
      if (r.isValid && nextR.isValid && currentMinutes > r.endMinutes && currentMinutes < nextR.startMinutes) {
        const total = calculateBreakDuration(cur.time, nxt.time)
        const rem = getBreakRemainingMinutes(nxt.time)
        return { total, rem }
      }
    }
    return null
  }, [activeDayData, todayIso, currentMinutes])

  const renderInspectorContent = () => {
    if (!inspector) {
      return (
        <MacGroupBox
          className="flex-1"
          contentClassName="flex-1 flex flex-col items-center justify-center text-center p-6 gap-2 text-[var(--mac-label-2)]"
        >
          <BookOpen className="w-6 h-6 text-[var(--mac-label-3)]" strokeWidth={1.7} />
          <p className="text-[12px]">
            {pickText(lang, {
              pl: 'Kliknij lekcję lub wydarzenie, aby wyświetlić temat, salę i szczegóły.',
              en: 'Select a lesson or event to inspect topic, classroom, and details.'
            })}
          </p>
        </MacGroupBox>
      )
    }

    if (inspector.kind === 'lesson') {
      const { lesson, dayName, isToday } = inspector
      const range = parseLessonTimeRange(lesson.time)
      const isActive =
        isToday &&
        !lesson.isCancelled &&
        range.isValid &&
        currentMinutes >= range.startMinutes &&
        currentMinutes <= range.endMinutes
      const minsLeft = isActive ? range.endMinutes - currentMinutes : null

      return (
        <div className="flex flex-col gap-3.5">
          <MacGroupBox contentClassName="p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-blue)] truncate">
                {getWeekdayLongLabel(dayName, lang)} · {t.lessonNumberLabel(lesson.number)}
              </span>
              {isActive && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)] text-[10px] font-semibold shrink-0 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--mac-blue)] animate-pulse" />
                  {pickText(lang, { pl: 'Teraz trwa', en: 'Live' })}
                </span>
              )}
            </div>
            <h3 className="text-[17px] font-bold text-[var(--mac-label-1)] leading-snug break-words mt-0.5">
              {lesson.subject}
            </h3>
            <span className="text-[12px] text-[var(--mac-label-2)] tabular-nums">
              {lesson.time || lesson.flag || ''}
            </span>

            {(lesson.isCancelled || lesson.isSubstitution || lesson.isShortened) && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {lesson.isCancelled && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--ios-red-subtle)] text-[var(--mac-red)] text-[11px] font-semibold">
                    {pickText(lang, { pl: 'Lekcja odwołana', en: 'Cancelled' })}
                  </span>
                )}
                {lesson.isSubstitution && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--ios-purple-subtle)] text-[var(--mac-purple)] text-[11px] font-semibold">
                    {pickText(lang, { pl: 'Zastępstwo', en: 'Substitution' })}
                  </span>
                )}
                {lesson.isShortened && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--ios-orange-subtle)] text-[var(--mac-orange)] text-[11px] font-semibold">
                    {lesson.durationMinutes} min
                  </span>
                )}
              </div>
            )}
          </MacGroupBox>

          <MacGroupBox
            title={t.lessonTopic}
            contentClassName={cn(lesson.topic && 'bg-[var(--ios-blue-subtle)]/20')}
          >
            <p
              className={cn(
                'text-[13px] leading-relaxed whitespace-pre-wrap select-text',
                lesson.topic ? 'font-medium text-[var(--mac-label-1)]' : 'text-[var(--mac-label-2)]'
              )}
            >
              {lesson.topic || t.noTopicRecorded}
            </p>
          </MacGroupBox>

          <MacGroupBox noPadding>
            <div className="mac-divide-y text-[12px]">
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                <span className="text-[var(--mac-label-2)] flex items-center gap-1.5 shrink-0">
                  <User className="w-3.5 h-3.5" />
                  {t.teacherLabel}
                </span>
                <span className="font-medium text-[var(--mac-label-1)] text-right break-words">
                  {lesson.teacher || t.notSpecified}
                </span>
              </div>
              {lesson.room && (
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                  <span className="text-[var(--mac-label-2)] flex items-center gap-1.5 shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                    {t.roomLabel}
                  </span>
                  <span
                    className={cn(
                      'font-semibold',
                      lesson.isSubstitution ? 'text-[var(--mac-purple)]' : 'text-[var(--mac-label-1)]'
                    )}
                  >
                    {lesson.room}
                  </span>
                </div>
              )}
              {lesson.durationMinutes > 0 && (
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                  <span className="text-[var(--mac-label-2)] flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    {t.durationLabel}
                  </span>
                  <span className="font-medium text-[var(--mac-label-1)] tabular-nums">
                    {lesson.durationMinutes} min
                    {minsLeft !== null
                      ? pickText(lang, { pl: ` (${minsLeft} min do końca)`, en: ` (${minsLeft}m left)` })
                      : ''}
                  </span>
                </div>
              )}
            </div>
          </MacGroupBox>
        </div>
      )
    }

    if (inspector.kind === 'day') {
      const dayData = timetableData?.schedule?.find((d) => d.dayName === inspector.dayName)
      const dayEvents = filterDayEvents(dayData?.events)
      const dayLessons = dayData?.lessons || []
      const dayChanges = dayLessons.filter(
        (l) => l.isCancelled || l.isSubstitution || l.isShortened
      )
      const activeCount = dayLessons.filter((l) => !l.isCancelled).length

      return (
        <div className="flex flex-col gap-3.5">
          <MacGroupBox contentClassName="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-blue)] truncate">
                {pickText(lang, { pl: 'Podgląd dnia', en: 'Day Overview' })}
              </span>
              {inspector.isToday && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)] text-[10px] font-semibold shrink-0">
                  {pickText(lang, { pl: 'Dzisiaj', en: 'Today' })}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-[var(--mac-label-1)] leading-snug">
                {getWeekdayLongLabel(inspector.dayName, lang)}
              </h3>
              <span className="text-[12px] text-[var(--mac-label-2)] tabular-nums">
                {formatHumanDate(inspector.isoDate || inspector.dateStr, false, lang)}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--mac-fill-3)] text-[var(--mac-label-1)] text-[11px] font-medium tabular-nums">
                {activeCount} {pickText(lang, { pl: 'lekcji', en: 'lessons' })}
              </span>
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-[11px] font-semibold tabular-nums',
                  dayEvents.length > 0
                    ? 'bg-[var(--ios-red-subtle)] text-[var(--mac-red)]'
                    : 'bg-[var(--mac-fill-3)] text-[var(--mac-label-2)]'
                )}
              >
                {dayEvents.length} {pickText(lang, { pl: 'wydarzeń', en: 'events' })}
              </span>
            </div>
          </MacGroupBox>

          <MacGroupBox
            title={pickText(lang, { pl: 'Sprawdziany i wydarzenia', en: 'Tests & Events' })}
            noPadding={dayEvents.length > 0}
          >
            {dayEvents.length > 0 ? (
              <div className="mac-divide-y">
                {dayEvents.map((ev, eIdx) => {
                  const st = getEventCategoryStyle(ev.category, ev.eventType)
                  const badgeLabel = resolveEventBadgeLabel(ev, isEn)
                  const title = getEventPrimaryTitle(ev, true, isEn)
                  const scope = resolveEventScope(ev, isEn)

                  return (
                    <div key={`${ev.id || eIdx}-${title}`} className="p-3.5 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase shrink-0',
                              st.bgClass,
                              st.textClass
                            )}
                          >
                            {badgeLabel}
                          </span>
                          {ev.lessonNumber !== undefined && (
                            <span className="text-[11px] text-[var(--mac-label-2)] tabular-nums truncate">
                              {t.lessonNumberLabel(ev.lessonNumber)}
                            </span>
                          )}
                        </div>
                        {ev.isoDate && (
                          <button
                            type="button"
                            onClick={() => downloadEventIcs(ev)}
                            title={t.exportCalendarIcs}
                            aria-label={t.exportCalendarIcs}
                            className="w-6 h-6 rounded-full hover:bg-[var(--mac-fill-3)] text-[var(--mac-blue)] inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="text-[13px] font-semibold text-[var(--mac-label-1)] leading-snug select-text">
                        {title}
                      </div>
                      {scope && (
                        <p className="text-[12px] text-[var(--mac-label-2)] leading-relaxed whitespace-pre-wrap select-text">
                          {scope}
                        </p>
                      )}
                      {ev.teacher && (
                        <div className="text-[11px] text-[var(--mac-label-3)] truncate">
                          {ev.teacher}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-[12px] text-[var(--mac-label-2)] leading-relaxed">
                {pickText(lang, {
                  pl: 'Brak sprawdzianów i wydarzeń w tym dniu.',
                  en: 'No tests or events scheduled for this day.'
                })}
              </p>
            )}
          </MacGroupBox>

          {dayChanges.length > 0 && (
            <MacGroupBox
              title={pickText(lang, { pl: 'Zmiany w planie', en: 'Schedule Changes' })}
              noPadding
            >
              <div className="mac-divide-y">
                {dayChanges.map((lesson, lIdx) => (
                  <button
                    key={`${lesson.number}-${lIdx}`}
                    type="button"
                    onClick={() =>
                      setInspector({
                        kind: 'lesson',
                        lesson,
                        dayName: inspector.dayName,
                        dateStr: inspector.dateStr,
                        isToday: inspector.isToday
                      })
                    }
                    className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-[var(--mac-fill-4)] transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          'text-[12px] font-semibold text-[var(--mac-label-1)] truncate',
                          lesson.isCancelled && 'line-through text-[var(--mac-label-2)]'
                        )}
                      >
                        #{lesson.number} · {formatSubjectName(lesson.subject, showFullSubjectNames)}
                      </div>
                      <div className="text-[11px] text-[var(--mac-label-2)] truncate">
                        {lesson.teacher || t.notSpecified}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0',
                        lesson.isCancelled
                          ? 'bg-[var(--ios-red-subtle)] text-[var(--mac-red)]'
                          : lesson.isSubstitution
                            ? 'bg-[var(--ios-purple-subtle)] text-[var(--mac-purple)]'
                            : 'bg-[var(--ios-orange-subtle)] text-[var(--mac-orange)]'
                      )}
                    >
                      {lesson.isCancelled
                        ? pickText(lang, { pl: 'Odwołana', en: 'Cancelled' })
                        : lesson.isSubstitution
                          ? pickText(lang, { pl: 'Zastępstwo', en: 'Sub' })
                          : `${lesson.durationMinutes} min`}
                    </span>
                  </button>
                ))}
              </div>
            </MacGroupBox>
          )}
        </div>
      )
    }

    const ev = inspector.event
    const st = getEventCategoryStyle(ev.category, ev.eventType)
    const badgeLabel = resolveEventBadgeLabel(ev, isEn)
    const title = getEventPrimaryTitle(ev, true, isEn)
    const scope = resolveEventScope(ev, isEn)

    return (
      <div className="flex flex-col gap-3.5">
        <MacGroupBox contentClassName="p-4 flex flex-col gap-1.5">
          <div>
            <span className={cn('px-2 py-0.5 rounded-[6px] text-[10px] font-semibold uppercase', st.bgClass, st.textClass)}>
              {badgeLabel}
            </span>
          </div>
          <h3 className="text-[17px] font-bold text-[var(--mac-label-1)] leading-snug">{title}</h3>
          <span className="text-[12px] text-[var(--mac-label-2)] tabular-nums">
            {formatHumanDate(ev.isoDate || ev.date, false, lang)}
          </span>
        </MacGroupBox>

        {scope && (
          <MacGroupBox title={pickText(lang, { pl: 'Opis / Zakres materiału', en: 'Description / Scope' })}>
            <p className="text-[13px] text-[var(--mac-label-1)] leading-relaxed whitespace-pre-wrap select-text">
              {scope}
            </p>
          </MacGroupBox>
        )}

        <MacGroupBox noPadding>
          <div className="mac-divide-y text-[12px]">
            {ev.lessonNumber !== undefined && (
              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-[var(--mac-label-2)]">{pickText(lang, { pl: 'Lekcja', en: 'Period' })}</span>
                <span className="font-medium text-[var(--mac-label-1)]">{t.lessonNumberLabel(ev.lessonNumber)}</span>
              </div>
            )}
            {ev.time && (
              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-[var(--mac-label-2)]">{pickText(lang, { pl: 'Godziny', en: 'Time' })}</span>
                <span className="font-medium text-[var(--mac-label-1)] tabular-nums">{ev.time}</span>
              </div>
            )}
            {ev.teacher && (
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                <span className="text-[var(--mac-label-2)] shrink-0">{t.teacherLabel}</span>
                <span className="font-medium text-[var(--mac-label-1)] truncate text-right">{ev.teacher}</span>
              </div>
            )}
          </div>
        </MacGroupBox>

        {ev.isoDate && (
          <MacPushButton
            variant="tinted"
            size="lg"
            onClick={() => downloadEventIcs(ev)}
            icon={<CalendarPlus className="w-3.5 h-3.5" />}
            className="w-full"
          >
            {t.exportCalendarIcs}
          </MacPushButton>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex min-h-0 select-none bg-[var(--mac-canvas-bg)]">
      {/* Main Schedule Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {timetableError && !timetableData ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-[var(--mac-red)]" />
              <p className="text-[13px] font-medium text-[var(--mac-label-1)]">{timetableError}</p>
              <MacPushButton variant="prominent" size="lg" onClick={onRetry}>
                {t.refresh}
              </MacPushButton>
            </div>
          ) : !timetableData ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <UiSpinner size="large" className="text-[var(--mac-blue)]" />
              <span className="text-[13px] text-[var(--mac-label-2)]">{t.loadingTimetable}</span>
            </div>
          ) : viewMode === 'week' ? (
            /* Synchronized Fluid Weekly Matrix (0-9 Periods x Mon-Fri, zero horizontal clipping) */
            <MacGroupBox noPadding className="w-full">
              {/* Day Column Header Row */}
              <div className="grid grid-cols-[56px_repeat(5,minmax(0,1fr))] border-b border-[var(--mac-row-divider)] bg-[var(--mac-fill-5)] [&>*:not(:last-child)]:border-r [&>*:not(:last-child)]:border-[var(--mac-row-divider)]">
                <div className="px-2 py-2.5 flex items-center justify-center text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-label-2)] text-center">
                  {pickText(lang, { pl: '# / Godz.', en: '# / Time' })}
                </div>
                {liveWeek.days.map((slot) => {
                  const dayData = timetableData.schedule?.find((d) => d.dayName === slot.dayName)
                  const isToday = Boolean(dayData?.isToday || slot.isoDate === todayIso)
                  const isDaySelected = selectedDay === slot.dayName
                  const isInspectingThisDay =
                    inspector?.kind === 'day' && inspector.dayName === slot.dayName

                  return (
                    <button
                      key={slot.dayName}
                      type="button"
                      onClick={() => handleInspectDay(slot, isToday)}
                      className={cn(
                        'px-2.5 py-2.5 flex items-center justify-between gap-1.5 cursor-pointer transition-colors min-w-0',
                        isToday
                          ? 'bg-[var(--ios-blue-subtle)]/55'
                          : isDaySelected
                            ? 'bg-[var(--ios-blue-subtle)]/30'
                            : 'hover:bg-[var(--mac-fill-4)]',
                        isInspectingThisDay && 'ring-2 ring-inset ring-[var(--mac-blue)]/65'
                      )}
                    >
                      <div className="min-w-0 text-left">
                        <div
                          className={cn(
                            'text-[12px] font-semibold truncate',
                            isToday || isDaySelected ? 'text-[var(--mac-blue)]' : 'text-[var(--mac-label-1)]'
                          )}
                        >
                          {getWeekdayLongLabel(slot.dayName, lang)}
                        </div>
                        <div className="text-[11px] text-[var(--mac-label-2)] tabular-nums">
                          {slot.dateDot.slice(0, 5)}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'w-[22px] h-[22px] rounded-full text-[10px] font-bold flex items-center justify-center tabular-nums shrink-0',
                          isToday
                            ? 'bg-[var(--mac-blue)] text-white'
                            : isDaySelected
                              ? 'bg-[var(--mac-label-1)] text-[var(--mac-window-bg)]'
                              : 'bg-[var(--mac-fill-2)] text-[var(--mac-label-2)]'
                        )}
                      >
                        {slot.dateNum}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Synchronized Day Events Strip (if any day this week has events) */}
              {hasAnyWeekEvents && (
                <div className="grid grid-cols-[56px_repeat(5,minmax(0,1fr))] border-b border-[var(--mac-row-divider)] bg-[var(--mac-fill-5)]/60 [&>*:not(:last-child)]:border-r [&>*:not(:last-child)]:border-[var(--mac-row-divider)]">
                  <div className="px-2 py-2 flex items-center justify-center text-[10px] font-semibold uppercase text-[var(--mac-label-3)]">
                    {pickText(lang, { pl: 'Info', en: 'Events' })}
                  </div>
                  {liveWeek.days.map((slot) => {
                    const dayData = timetableData.schedule?.find((d) => d.dayName === slot.dayName)
                    const events = filterDayEvents(dayData?.events)
                    return (
                      <div key={`ev-${slot.dayName}`} className="p-1.5 flex flex-col gap-1 min-w-0">
                        {events.map((ev, eIdx) => {
                          const st = getEventCategoryStyle(ev.category, ev.eventType)
                          const isSelectedEv = inspector?.kind === 'event' && inspector.event === ev
                          return (
                            <button
                              key={eIdx}
                              type="button"
                              onClick={() => setInspector({ kind: 'event', event: ev })}
                              className={cn(
                                'w-full px-2 py-1 rounded-[7px] text-left text-[11px] font-medium truncate cursor-pointer transition-all',
                                st.bgClass,
                                st.textClass,
                                isSelectedEv && 'ring-2 ring-[var(--mac-blue)]'
                              )}
                              title={getEventPrimaryTitle(ev, showFullSubjectNames, isEn)}
                            >
                              {resolveEventBadgeLabel(ev, isEn)}:{' '}
                              {getEventPrimaryTitle(ev, showFullSubjectNames, isEn)}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Synchronized Period Rows (0 - maxPeriod) */}
              <div className="mac-divide-y">
                {periodMetaList.map((period) => {
                  const pRange =
                    period.start && period.end
                      ? parseLessonTimeRange(`${period.start} - ${period.end}`)
                      : null
                  const hasTodayInWeek = liveWeek.days.some((s) => s.isoDate === todayIso)
                  const isLivePeriodNow =
                    hasTodayInWeek &&
                    Boolean(pRange?.isValid) &&
                    currentMinutes >= pRange!.startMinutes &&
                    currentMinutes <= pRange!.endMinutes

                  return (
                    <div
                      key={`period-row-${period.num}`}
                      className="grid grid-cols-[56px_repeat(5,minmax(0,1fr))] min-h-[64px] [&>*:not(:last-child)]:border-r [&>*:not(:last-child)]:border-[var(--mac-row-divider)]"
                    >
                      {/* Col 0: Period # + Stacked Bell Time */}
                      <div className="px-1.5 py-2 flex flex-col items-center justify-center gap-0.5 bg-[var(--mac-fill-5)]/40">
                        <span
                          className={cn(
                            'w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center tabular-nums',
                            isLivePeriodNow
                              ? 'bg-[var(--mac-blue)] text-white'
                              : period.hasAnyLesson
                                ? 'bg-[var(--mac-fill-2)] text-[var(--mac-label-1)]'
                                : 'bg-[var(--mac-fill-4)] text-[var(--mac-label-3)]'
                          )}
                        >
                          {period.num}
                        </span>
                        {period.start && period.end && (
                          <div className="text-[10px] leading-[12px] text-[var(--mac-label-2)] tabular-nums text-center">
                            <div>{period.start}</div>
                            <div>{period.end}</div>
                          </div>
                        )}
                      </div>

                      {/* Cols 1-5: Mon-Fri Cells */}
                      {liveWeek.days.map((slot) => {
                        const dayData = timetableData.schedule?.find((d) => d.dayName === slot.dayName)
                        const isToday = Boolean(dayData?.isToday || slot.isoDate === todayIso)
                        const isDaySelected = selectedDay === slot.dayName
                        const slotLessons = (dayData?.lessons || []).filter(
                          (l) => Number(l.number) === period.num
                        )

                        if (slotLessons.length === 0) {
                          return (
                            <div
                              key={`${slot.dayName}-${period.num}-empty`}
                              className={cn(
                                'p-1.5 flex items-center justify-center min-w-0',
                                isToday
                                  ? 'bg-[var(--ios-blue-subtle)]/10'
                                  : isDaySelected && 'bg-[var(--mac-fill-5)]/60'
                              )}
                            >
                              <span className="text-[11px] text-[var(--mac-label-4)]">—</span>
                            </div>
                          )
                        }

                        return (
                          <div
                            key={`${slot.dayName}-${period.num}`}
                            className={cn(
                              'p-1 flex flex-col gap-1 min-w-0',
                              isToday
                                ? 'bg-[var(--ios-blue-subtle)]/10'
                                : isDaySelected && 'bg-[var(--mac-fill-5)]/60'
                            )}
                          >
                            {slotLessons.map((lesson, lIdx) => {
                              const r = parseLessonTimeRange(lesson.time)
                              const isActive =
                                isToday &&
                                !lesson.isCancelled &&
                                r.isValid &&
                                currentMinutes >= r.startMinutes &&
                                currentMinutes <= r.endMinutes
                              const isSelected =
                                inspector?.kind === 'lesson' &&
                                inspector.lesson === lesson &&
                                inspector.dayName === slot.dayName

                              return (
                                <button
                                  key={`${lesson.number}-${lIdx}`}
                                  type="button"
                                  onClick={() => {
                                    onSelectDay(slot.dayName)
                                    setInspector({
                                      kind: 'lesson',
                                      lesson,
                                      dayName: slot.dayName,
                                      dateStr: slot.dateDot,
                                      isToday
                                    })
                                  }}
                                  className={cn(
                                    'w-full flex-1 p-2 rounded-[10px] text-left transition-all cursor-pointer flex flex-col justify-between gap-1 min-w-0',
                                    isSelected
                                      ? 'bg-[var(--ios-blue-subtle)]/65 ring-2 ring-[var(--mac-blue)]'
                                      : isActive
                                        ? 'bg-[var(--ios-blue-subtle)]/45 ring-1 ring-[var(--mac-blue)]/60'
                                        : 'hover:bg-[var(--mac-fill-4)]',
                                    lesson.isCancelled && 'opacity-45'
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-1 min-w-0">
                                    <span
                                      className={cn(
                                        'text-[12px] font-semibold text-[var(--mac-label-1)] leading-snug min-w-0',
                                        showFullSubjectNames ? 'line-clamp-3' : 'line-clamp-2',
                                        lesson.isCancelled && 'line-through text-[var(--mac-label-2)]'
                                      )}
                                    >
                                      {formatSubjectName(lesson.subject, showFullSubjectNames)}
                                    </span>
                                    {isActive && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--mac-blue)] animate-pulse shrink-0 mt-1" />
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between gap-1.5 min-w-0">
                                    <span className="text-[11px] text-[var(--mac-label-2)] truncate flex-1">
                                      {lesson.teacher || t.notSpecified}
                                    </span>
                                    {lesson.room && (
                                      <span
                                        className={cn(
                                          'px-1.5 py-0.5 rounded-[6px] text-[10px] font-semibold shrink-0 tabular-nums leading-none',
                                          lesson.isSubstitution
                                            ? 'bg-[var(--ios-purple-subtle)] text-[var(--mac-purple)]'
                                            : 'bg-[var(--mac-fill-3)] text-[var(--mac-label-1)]'
                                        )}
                                      >
                                        {lesson.room}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </MacGroupBox>
          ) : (
            /* Single Day Detailed View with 0-9 Fixed Slots */
            <div className="max-w-3xl mx-auto flex flex-col gap-4">
              <div className="flex items-center gap-1.5">
                {liveWeek.days.map((slot) => {
                  const isSel = selectedDay === slot.dayName
                  const isTod = slot.isoDate === todayIso
                  return (
                    <button
                      key={slot.dayName}
                      type="button"
                      onClick={() => onSelectDay(slot.dayName)}
                      className={cn(
                        'flex-1 py-2 px-3 rounded-[14px] text-center cursor-pointer transition-all border',
                        isSel
                          ? 'bg-[var(--mac-blue)] text-white border-transparent shadow-[0_2px_8px_rgba(0,136,255,0.28)]'
                          : 'bg-[var(--mac-group-bg)] text-[var(--mac-label-1)] border-[var(--mac-group-border)] shadow-[var(--mac-group-shadow)] hover:brightness-[0.98] dark:hover:brightness-110'
                      )}
                    >
                      <div className="text-[12px] font-semibold">
                        {getWeekdayLongLabel(slot.dayName, lang)}
                      </div>
                      <div
                        className={cn(
                          'text-[11px] tabular-nums',
                          isSel
                            ? 'text-white/85'
                            : isTod
                              ? 'text-[var(--mac-blue)] font-semibold'
                              : 'text-[var(--mac-label-2)]'
                        )}
                      >
                        {slot.dateDot.slice(0, 5)}
                      </div>
                    </button>
                  )
                })}
              </div>

              {activeBreakBanner && (
                <div className="px-4 py-2 rounded-[14px] bg-[var(--ios-blue-subtle)]/50 border border-[var(--mac-blue)]/25 text-[12px] text-[var(--mac-blue)] font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--mac-blue)] animate-pulse" />
                    {activeBreakBanner.rem > 0
                      ? t.breakCountdownLabel(activeBreakBanner.rem)
                      : `${t.breakWord} ${activeBreakBanner.total} min`}
                  </span>
                </div>
              )}

              <MacGroupBox noPadding>
                {activeDayData && activeDayData.lessons.length > 0 ? (
                  <div className="mac-divide-y">
                    {periodMetaList.flatMap((period) => {
                      const slotLessons = activeDayData.lessons.filter(
                        (l) => Number(l.number) === period.num
                      )
                      const isDayToday = Boolean(activeDayData.isToday || activeDayData.isoDate === todayIso)

                      if (slotLessons.length === 0) {
                        const bellText =
                          period.start && period.end ? `${period.start} - ${period.end}` : '—'
                        return [
                          <div
                            key={`day-empty-${period.num}`}
                            className="w-full h-[62px] min-h-[62px] px-4 py-2.5 flex items-center justify-between gap-4 text-left opacity-55"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className="w-7 h-7 rounded-full bg-[var(--mac-fill-4)] text-[var(--mac-label-3)] text-[12px] font-semibold flex items-center justify-center shrink-0 tabular-nums">
                                {period.num}
                              </span>
                              <span className="text-[12px] text-[var(--mac-label-3)] tabular-nums w-[92px] shrink-0">
                                {bellText}
                              </span>
                              <span className="text-[13px] text-[var(--mac-label-3)] truncate">
                                {pickText(lang, { pl: 'Okienko', en: 'Free period' })}
                              </span>
                            </div>
                          </div>
                        ]
                      }

                      return slotLessons.map((lesson, idx) => {
                        const r = parseLessonTimeRange(lesson.time)
                        const isActive =
                          isDayToday &&
                          !lesson.isCancelled &&
                          r.isValid &&
                          currentMinutes >= r.startMinutes &&
                          currentMinutes <= r.endMinutes
                        const isSelected = inspector?.kind === 'lesson' && inspector.lesson === lesson

                        return (
                          <button
                            key={`${lesson.number}-${idx}`}
                            type="button"
                            onClick={() =>
                              setInspector({
                                kind: 'lesson',
                                lesson,
                                dayName: activeDayData.dayName,
                                dateStr: activeDayData.date,
                                isToday: isDayToday
                              })
                            }
                            className={cn(
                              'w-full min-h-[62px] px-4 py-2.5 flex items-center justify-between gap-4 text-left cursor-pointer transition-colors',
                              isSelected
                                ? 'bg-[var(--ios-blue-subtle)]/50'
                                : isActive
                                  ? 'bg-[var(--ios-blue-subtle)]/30 hover:bg-[var(--ios-blue-subtle)]/45'
                                  : 'hover:bg-[var(--mac-fill-4)]',
                              lesson.isCancelled && 'opacity-45'
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span
                                className={cn(
                                  'w-7 h-7 rounded-full text-[12px] font-semibold flex items-center justify-center shrink-0 tabular-nums',
                                  isActive
                                    ? 'bg-[var(--mac-blue)] text-white'
                                    : 'bg-[var(--mac-fill-2)] text-[var(--mac-label-1)]'
                                )}
                              >
                                {lesson.number}
                              </span>
                              <span className="text-[12px] text-[var(--mac-label-2)] tabular-nums w-[92px] shrink-0">
                                {lesson.time}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div
                                  className={cn(
                                    'text-[13px] font-semibold text-[var(--mac-label-1)] truncate',
                                    lesson.isCancelled && 'line-through'
                                  )}
                                >
                                  {formatSubjectName(lesson.subject, showFullSubjectNames)}
                                </div>
                                <div className="text-[12px] text-[var(--mac-label-2)] truncate">
                                  {lesson.teacher || t.notSpecified}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {lesson.isSubstitution && !lesson.isCancelled && (
                                <span className="px-2 py-0.5 rounded-full bg-[var(--ios-purple-subtle)] text-[var(--mac-purple)] text-[10px] font-semibold">
                                  {pickText(lang, { pl: 'Zastępstwo', en: 'Sub' })}
                                </span>
                              )}
                              {lesson.isCancelled && (
                                <span className="px-2 py-0.5 rounded-full bg-[var(--ios-red-subtle)] text-[var(--mac-red)] text-[10px] font-semibold">
                                  {pickText(lang, { pl: 'Odwołana', en: 'Cancelled' })}
                                </span>
                              )}
                              {lesson.room && (
                                <span className="px-2.5 py-0.5 rounded-full bg-[var(--mac-fill-2)] text-[var(--mac-label-1)] text-[12px] font-medium shrink-0 tabular-nums">
                                  {lesson.room}
                                </span>
                              )}
                            </div>
                          </button>
                        )
                      })
                    })}
                  </div>
                ) : (
                  <div className="p-10 text-center text-[13px] text-[var(--mac-label-2)]">{t.noLessonsDay}</div>
                )}
              </MacGroupBox>
            </div>
          )}
        </div>
      </div>

      {/* Right Floating Card Inspector Column (320px) */}
      <aside className="w-[320px] shrink-0 p-4 pl-0 overflow-y-auto flex flex-col gap-3.5">
        {renderInspectorContent()}
      </aside>
    </div>
  )
}
