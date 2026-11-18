'use client'

import React, { useMemo, useState, useEffect, Fragment } from 'react'
import {
  Calendar,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  BookOpen,
  AlertCircle
} from 'lucide-react'
import { SmartTimetableResult, LessonItem, TimetableEvent } from '@/models/timetable.model'
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
import {
  MacGroupBox,
  MacPushButton,
  MacSegmentedControl
} from './mac-primitives'

interface DesktopTimetableViewProps {
  timetableData: SmartTimetableResult | null
  timetableError: string | null
  onRetry: () => void
  selectedDay: string
  onSelectDay: (day: string) => void
  currentWeekPivot: string
  onShiftWeek: (deltaDays: number) => void
  onSelectDate: (dateIso: string) => void
  isLoadingWeek: boolean
  showFullSubjectNames: boolean
  showHomeworks: boolean
  lang: AppLanguage
  t: AppDictionary
  initialInspectorSelection?: { lesson?: LessonItem; isToday?: boolean; event?: TimetableEvent } | null
}

type TimetableInspectorItem =
  | { kind: 'lesson'; lesson: LessonItem; dayName: string; dateStr: string; isToday: boolean }
  | { kind: 'event'; event: TimetableEvent }
  | null

export function DesktopTimetableView({
  timetableData,
  timetableError,
  onRetry,
  selectedDay,
  onSelectDay,
  currentWeekPivot,
  onShiftWeek,
  onSelectDate,
  isLoadingWeek,
  showFullSubjectNames,
  showHomeworks,
  lang,
  t,
  initialInspectorSelection
}: DesktopTimetableViewProps) {
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')
  const [inspector, setInspector] = useState<TimetableInspectorItem>(null)
  const [currentMinutes, setCurrentMinutes] = useState(getCurrentTimeMinutes)
  const todayIso = useMemo(() => getTodayIsoString(), [])
  const liveWeek = useMemo(() => computeLiveWeekDays(currentWeekPivot), [currentWeekPivot])
  const isEn = lang !== 'pl'

  useEffect(() => {
    const timer = setInterval(() => setCurrentMinutes(getCurrentTimeMinutes()), 15000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (initialInspectorSelection?.lesson) {
      setInspector({
        kind: 'lesson',
        lesson: initialInspectorSelection.lesson,
        dayName: selectedDay,
        dateStr: '',
        isToday: Boolean(initialInspectorSelection.isToday)
      })
    } else if (initialInspectorSelection?.event) {
      setInspector({ kind: 'event', event: initialInspectorSelection.event })
    }
  }, [initialInspectorSelection, selectedDay])

  // Auto-select today's active/first lesson if inspector is empty once data arrives
  useEffect(() => {
    if (inspector || !timetableData?.schedule?.length) return
    const targetDay =
      timetableData.schedule.find((d) => d.isToday) ||
      timetableData.schedule.find((d) => d.dayName === selectedDay) ||
      timetableData.schedule.find((d) => d.lessons.length > 0)
    if (targetDay && targetDay.lessons.length > 0) {
      const firstActive = targetDay.lessons.find((l) => !l.isCancelled) || targetDay.lessons[0]
      setInspector({
        kind: 'lesson',
        lesson: firstActive,
        dayName: targetDay.dayName,
        dateStr: targetDay.date,
        isToday: targetDay.isToday
      })
    }
  }, [timetableData, selectedDay, inspector])

  const filterDayEvents = (events: TimetableEvent[] = []) =>
    events.filter((ev) => {
      if (!showHomeworks && ev.category === 'homework') return false
      const lower = (ev.title || '').toLowerCase()
      return !lower.includes('zastępstw') && !lower.includes('zastepstw') && !lower.includes('nieobecn')
    })

  const activeDayData = timetableData?.schedule?.find((d) => d.dayName === selectedDay)

  const renderInspectorContent = () => {
    if (!inspector) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--mac-label-2)] gap-2">
          <BookOpen className="w-6 h-6 text-[var(--mac-label-3)]" strokeWidth={1.7} />
          <p className="text-[12px]">
            {pickText(lang, {
              pl: 'Kliknij lekcję lub wydarzenie, aby wyświetlić temat, salę i szczegóły.',
              en: 'Select a lesson or event to inspect topic, classroom, and details.'
            })}
          </p>
        </div>
      )
    }

    if (inspector.kind === 'lesson') {
      const { lesson, dayName, isToday } = inspector
      const range = parseLessonTimeRange(lesson.time)
      const isActive =
        isToday && !lesson.isCancelled && range.isValid && currentMinutes >= range.startMinutes && currentMinutes <= range.endMinutes
      const minsLeft = isActive ? range.endMinutes - currentMinutes : null

      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-blue)]">
                {getWeekdayLongLabel(dayName, lang)} · {t.lessonNumberLabel(lesson.number)}
              </span>
              {isActive && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)] text-[10px] font-semibold">
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
          </div>

          <div className="flex flex-wrap gap-1.5">
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

          <MacGroupBox title={t.lessonTopic}>
            <p className="text-[13px] text-[var(--mac-label-1)] leading-relaxed whitespace-pre-wrap select-text">
              {lesson.topic || t.noTopicRecorded}
            </p>
          </MacGroupBox>

          <MacGroupBox noPadding>
            <div className="divide-y divide-[var(--mac-row-divider)] text-[12px]">
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                <span className="text-[var(--mac-label-2)] flex items-center gap-1.5 shrink-0">
                  <User className="w-3.5 h-3.5" />
                  {t.teacherLabel}
                </span>
                <span className="font-medium text-[var(--mac-label-1)] text-right truncate">
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

    const ev = inspector.event
    const st = getEventCategoryStyle(ev.category, ev.eventType)
    const badgeLabel = resolveEventBadgeLabel(ev, isEn)
    const title = getEventPrimaryTitle(ev, true, isEn)
    const scope =
      ev.description && ev.description !== title
        ? ev.description
        : ev.title && ev.title !== title
          ? ev.title
          : ''

    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div>
            <span className={cn('px-2 py-0.5 rounded-[6px] text-[10px] font-semibold uppercase', st.bgClass, st.textClass)}>
              {badgeLabel}
            </span>
          </div>
          <h3 className="text-[17px] font-bold text-[var(--mac-label-1)] leading-snug">{title}</h3>
          <span className="text-[12px] text-[var(--mac-label-2)] tabular-nums">
            {formatHumanDate(ev.isoDate || ev.date, false, lang)}
          </span>
        </div>

        {scope && (
          <MacGroupBox title={pickText(lang, { pl: 'Opis / Zakres materiału', en: 'Description / Scope' })}>
            <p className="text-[13px] text-[var(--mac-label-1)] leading-relaxed whitespace-pre-wrap select-text">
              {scope}
            </p>
          </MacGroupBox>
        )}

        <MacGroupBox noPadding>
          <div className="divide-y divide-[var(--mac-row-divider)] text-[12px]">
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
    <div className="h-full flex min-h-0 select-none">
      {/* Main Schedule Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {/* Sub-Toolbar Controls */}
        <div className="px-6 py-3 border-b border-[var(--mac-row-divider)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <MacPushButton
              variant="bordered"
              size="lg"
              onClick={() => onShiftWeek(-7)}
              icon={<ChevronLeft className="w-4 h-4" />}
              aria-label={pickText(lang, { pl: 'Poprzedni tydzień', en: 'Previous week' })}
            />
            <MacPushButton
              variant="bordered"
              size="lg"
              onClick={() => onSelectDate(todayIso)}
            >
              {pickText(lang, { pl: 'Dzisiaj', en: 'Today' })}
            </MacPushButton>
            <MacPushButton
              variant="bordered"
              size="lg"
              onClick={() => onShiftWeek(7)}
              icon={<ChevronRight className="w-4 h-4" />}
              aria-label={pickText(lang, { pl: 'Następny tydzień', en: 'Next week' })}
            />

            <div className="ml-2 flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[var(--mac-label-1)] tabular-nums">
                {liveWeek.rangeLabel}
              </span>
              {isLoadingWeek ? (
                <UiSpinner size="small" className="text-[var(--mac-blue)]" />
              ) : (
                <label className="relative w-7 h-7 rounded-full hover:bg-[var(--mac-fill-3)] flex items-center justify-center cursor-pointer text-[var(--mac-label-2)] hover:text-[var(--mac-blue)] transition-colors">
                  <Calendar className="w-3.5 h-3.5" />
                  <input
                    type="date"
                    value={currentWeekPivot}
                    onChange={(e) => e.target.value && onSelectDate(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    aria-label={pickText(lang, { pl: 'Wybierz datę', en: 'Pick date' })}
                  />
                </label>
              )}
            </div>
          </div>

          <MacSegmentedControl<'week' | 'day'>
            value={viewMode}
            onChange={setViewMode}
            options={[
              { id: 'week', label: pickText(lang, { pl: 'Tydzień (5 dni)', en: 'Week (5 days)' }) },
              { id: 'day', label: pickText(lang, { pl: 'Dzień', en: 'Day' }) }
            ]}
            className="w-[220px]"
          />
        </div>

        {/* Main Content Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {timetableError && !timetableData ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-[var(--mac-red)]" />
              <p className="text-[14px] font-medium text-[var(--mac-label-1)]">{timetableError}</p>
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
            <div className="grid grid-cols-5 gap-3 items-start min-w-[780px]">
              {liveWeek.days.map((slot) => {
                const dayData = timetableData.schedule?.find((d) => d.dayName === slot.dayName)
                const isToday = Boolean(dayData?.isToday || slot.isoDate === todayIso)
                const isDaySelected = selectedDay === slot.dayName
                const events = filterDayEvents(dayData?.events)
                const lessons = dayData?.lessons || []

                return (
                  <div
                    key={slot.dayName}
                    className={cn(
                      'rounded-[12px] border flex flex-col overflow-hidden transition-colors',
                      isToday
                        ? 'border-[var(--mac-blue)]/40 bg-[var(--mac-group-bg)]'
                        : 'border-[var(--mac-group-border)] bg-[var(--mac-group-bg)]'
                    )}
                  >
                    {/* Day Column Header */}
                    <button
                      type="button"
                      onClick={() => onSelectDay(slot.dayName)}
                      className={cn(
                        'px-3 py-2.5 border-b border-[var(--mac-row-divider)] flex items-center justify-between gap-2 cursor-pointer transition-colors',
                        isToday ? 'bg-[var(--ios-blue-subtle)]/55' : 'hover:bg-[var(--mac-fill-4)]',
                        isDaySelected && !isToday && 'bg-[var(--mac-fill-4)]'
                      )}
                    >
                      <div className="min-w-0 text-left">
                        <div
                          className={cn(
                            'text-[12px] font-semibold truncate',
                            isToday ? 'text-[var(--mac-blue)]' : 'text-[var(--mac-label-1)]'
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
                          'w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center tabular-nums shrink-0',
                          isToday
                            ? 'bg-[var(--mac-blue)] text-white'
                            : 'bg-[var(--mac-fill-2)] text-[var(--mac-label-2)]'
                        )}
                      >
                        {slot.dateNum}
                      </span>
                    </button>

                    {/* Day Events Chips */}
                    {events.length > 0 && (
                      <div className="p-2 flex flex-col gap-1 border-b border-[var(--mac-row-divider)] bg-[var(--mac-fill-5)]">
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
                    )}

                    {/* Lessons List */}
                    <div className="p-1.5 flex flex-col gap-1">
                      {lessons.length > 0 ? (
                        lessons.map((lesson, lIdx) => {
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
                                'w-full p-2 rounded-[9px] text-left transition-all cursor-pointer flex flex-col gap-1 border',
                                isSelected
                                  ? 'bg-[var(--mac-window-bg)] border-[var(--mac-blue)] shadow-[0_1px_4px_rgba(0,136,255,0.16)]'
                                  : isActive
                                    ? 'bg-[var(--ios-blue-subtle)]/50 border-[var(--mac-blue)]/30 hover:bg-[var(--ios-blue-subtle)]/70'
                                    : 'bg-[var(--mac-window-bg)]/80 border-transparent hover:border-[var(--mac-group-border)] hover:bg-[var(--mac-window-bg)]',
                                lesson.isCancelled && 'opacity-45'
                              )}
                            >
                              <div className="flex items-center justify-between gap-1 text-[10px] tabular-nums">
                                <span
                                  className={cn(
                                    'font-medium flex items-center gap-1',
                                    isActive ? 'text-[var(--mac-blue)] font-semibold' : 'text-[var(--mac-label-2)]',
                                    lesson.isCancelled && 'line-through'
                                  )}
                                >
                                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[var(--mac-blue)] animate-pulse" />}
                                  #{lesson.number} · {lesson.time}
                                </span>
                                {lesson.room && (
                                  <span
                                    className={cn(
                                      'px-1.5 py-0.2 rounded-[4px] font-semibold',
                                      lesson.isSubstitution
                                        ? 'bg-[var(--ios-purple-subtle)] text-[var(--mac-purple)]'
                                        : 'bg-[var(--mac-fill-3)] text-[var(--mac-label-1)]'
                                    )}
                                  >
                                    {lesson.room}
                                  </span>
                                )}
                              </div>
                              <div
                                className={cn(
                                  'text-[12px] font-semibold text-[var(--mac-label-1)] leading-snug line-clamp-2',
                                  lesson.isCancelled && 'line-through text-[var(--mac-label-2)]'
                                )}
                              >
                                {formatSubjectName(lesson.subject, showFullSubjectNames)}
                              </div>
                              <div className="text-[10px] text-[var(--mac-label-2)] truncate">
                                {lesson.teacher || t.notSpecified}
                              </div>
                            </button>
                          )
                        })
                      ) : (
                        <div className="py-8 px-2 text-center text-[11px] text-[var(--mac-label-3)]">
                          {t.noLessonsDay}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Single Day Detailed View */
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
                        'flex-1 py-2 px-3 rounded-[10px] text-center cursor-pointer transition-all border',
                        isSel
                          ? 'bg-[var(--mac-blue)] text-white border-transparent shadow-[0_2px_8px_rgba(0,136,255,0.28)]'
                          : 'bg-[var(--mac-group-bg)] text-[var(--mac-label-1)] border-[var(--mac-group-border)] hover:bg-[var(--mac-fill-4)]'
                      )}
                    >
                      <div className="text-[12px] font-semibold">
                        {getWeekdayLongLabel(slot.dayName, lang)}
                      </div>
                      <div className={cn('text-[11px] tabular-nums', isSel ? 'text-white/85' : isTod ? 'text-[var(--mac-blue)] font-semibold' : 'text-[var(--mac-label-2)]')}>
                        {slot.dateDot.slice(0, 5)}
                      </div>
                    </button>
                  )
                })}
              </div>

              <MacGroupBox noPadding>
                {activeDayData && activeDayData.lessons.length > 0 ? (
                  <div className="divide-y divide-[var(--mac-row-divider)]">
                    {activeDayData.lessons.map((lesson, idx) => {
                      const nextLesson = activeDayData.lessons[idx + 1]
                      const breakMins = nextLesson ? calculateBreakDuration(lesson.time, nextLesson.time) : 0
                      const r = parseLessonTimeRange(lesson.time)
                      const nextR = nextLesson ? parseLessonTimeRange(nextLesson.time) : null
                      const isBreakActive =
                        activeDayData.isToday &&
                        r.isValid &&
                        nextR?.isValid &&
                        currentMinutes > r.endMinutes &&
                        currentMinutes < nextR.startMinutes
                      const breakRem = nextLesson ? getBreakRemainingMinutes(nextLesson.time) : 0
                      const isSelected = inspector?.kind === 'lesson' && inspector.lesson === lesson

                      return (
                        <Fragment key={`${lesson.number}-${idx}`}>
                          <button
                            type="button"
                            onClick={() =>
                              setInspector({
                                kind: 'lesson',
                                lesson,
                                dayName: activeDayData.dayName,
                                dateStr: activeDayData.date,
                                isToday: activeDayData.isToday
                              })
                            }
                            className={cn(
                              'w-full px-4 py-3 flex items-center justify-between gap-4 text-left cursor-pointer transition-colors',
                              isSelected ? 'bg-[var(--ios-blue-subtle)]/50' : 'hover:bg-[var(--mac-fill-4)]',
                              lesson.isCancelled && 'opacity-45'
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className="w-7 h-7 rounded-[7px] bg-[var(--mac-fill-2)] text-[var(--mac-label-1)] text-[12px] font-semibold flex items-center justify-center shrink-0 tabular-nums">
                                {lesson.number}
                              </span>
                              <span className="text-[12px] text-[var(--mac-label-2)] tabular-nums w-[92px] shrink-0">
                                {lesson.time}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className={cn('text-[14px] font-semibold text-[var(--mac-label-1)] truncate', lesson.isCancelled && 'line-through')}>
                                  {formatSubjectName(lesson.subject, showFullSubjectNames)}
                                </div>
                                <div className="text-[12px] text-[var(--mac-label-2)] truncate">
                                  {lesson.teacher || t.notSpecified}
                                </div>
                              </div>
                            </div>
                            {lesson.room && (
                              <span className="px-2.5 py-1 rounded-[7px] bg-[var(--mac-fill-2)] text-[var(--mac-label-1)] text-[12px] font-medium shrink-0">
                                {lesson.room}
                              </span>
                            )}
                          </button>
                          {idx < activeDayData.lessons.length - 1 && breakMins > 0 && (
                            <div className="px-4 py-1 bg-[var(--mac-fill-5)] text-[11px] text-[var(--mac-label-2)] flex items-center justify-between">
                              <span>
                                {isBreakActive && breakRem > 0 ? (
                                  <span className="text-[var(--mac-blue)] font-semibold">
                                    {t.breakCountdownLabel(breakRem)}
                                  </span>
                                ) : (
                                  `${t.breakWord} ${breakMins} min`
                                )}
                              </span>
                            </div>
                          )}
                        </Fragment>
                      )
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

      {/* Right Inspector Pane (320px) */}
      <aside className="w-[320px] shrink-0 border-l border-[var(--mac-row-divider)] bg-[var(--mac-window-bg)] p-4 overflow-y-auto">
        {renderInspectorContent()}
      </aside>
    </div>
  )
}
