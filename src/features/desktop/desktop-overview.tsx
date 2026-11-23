'use client'

import React, { useMemo, useState, useEffect } from 'react'
import {
  ArrowRight,
  Calendar,
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  Inbox,
  Clock,
  UserX
} from 'lucide-react'
import { SmartTimetableResult, LessonItem, TimetableEvent, DaySchedule } from '@/models/timetable.model'
import { GradesResult, GradeItem } from '@/models/grade.model'
import { AttendanceResult } from '@/models/attendance.model'
import { MessageItem } from '@/models/message.model'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { formatSubjectName } from '@/utils/text.util'
import {
  formatDayDate,
  formatHumanDate,
  getTodayIsoString,
  getWeekdayLongLabel
} from '@/utils/date.util'
import {
  parseLessonTimeRange,
  getCurrentTimeMinutes
} from '@/utils/time.util'
import {
  getEventCategoryStyle,
  getEventPrimaryTitle,
  getGradeBadgeStyle,
  resolveEventBadgeLabel
} from '@/utils/badge.util'
import { calculateSubjectWeightedAverage } from '@/utils/grade.util'
import { getTeacherAbsencesForDate, formatTeacherAbsenceSpan } from '@/utils/teacher-absence.util'
import { cn } from '@/utils/cn.util'
import { MacGroupBox, MacPushButton } from './mac-primitives'
import { DesktopNavSection } from './desktop-sidebar'

interface DesktopOverviewProps {
  timetableData: SmartTimetableResult | null
  todayTimetableData: SmartTimetableResult | null
  gradesData: GradesResult | null
  attendanceData: AttendanceResult | null
  messages: MessageItem[]
  isUpdating: boolean
  showFullSubjectNames: boolean
  showHomeworks: boolean
  lang: AppLanguage
  t: AppDictionary
  onNavigate: (section: DesktopNavSection) => void
  onOpenLessonInTimetable: (dayName: string, lesson: LessonItem, isoDate?: string) => void
  onOpenEventInDeadlines: (ev: TimetableEvent) => void
  onOpenGradeInGrades: (grade: GradeItem, subject: string) => void
}

function resolveDisplayDay(source: SmartTimetableResult | null, todayIso: string): DaySchedule | null {
  if (!source) return null
  const exactToday = source.schedule?.find((d) => d.isToday || d.isoDate === todayIso)
  if (exactToday && exactToday.lessons.length > 0) return exactToday
  if (source.nextUpcomingDay && source.nextUpcomingDay.lessons.length > 0) return source.nextUpcomingDay
  const nextWithLessons = source.schedule?.find((d) => d.isoDate >= todayIso && d.lessons.length > 0)
  return nextWithLessons || exactToday || source.schedule?.[0] || null
}

export function DesktopOverview({
  timetableData,
  todayTimetableData,
  gradesData,
  attendanceData,
  messages,
  isUpdating,
  showFullSubjectNames,
  showHomeworks,
  lang,
  t,
  onNavigate,
  onOpenLessonInTimetable,
  onOpenEventInDeadlines,
  onOpenGradeInGrades
}: DesktopOverviewProps) {
  const [currentMinutes, setCurrentMinutes] = useState(getCurrentTimeMinutes)
  const todayIso = useMemo(() => getTodayIsoString(), [])
  const isEn = lang !== 'pl'

  useEffect(() => {
    const timer = setInterval(() => setCurrentMinutes(getCurrentTimeMinutes()), 15000)
    return () => clearInterval(timer)
  }, [])

  const scheduleSource = todayTimetableData || timetableData
  const displayDay = useMemo(() => resolveDisplayDay(scheduleSource, todayIso), [scheduleSource, todayIso])
  const isDisplayToday = Boolean(displayDay && (displayDay.isToday || displayDay.isoDate === todayIso))

  const lessonFocus = useMemo(() => {
    const lessons = displayDay?.lessons?.filter((l) => !l.isCancelled) || []
    if (lessons.length === 0) return null
    if (!isDisplayToday) {
      return { state: 'upcoming-day' as const, lesson: lessons[0], remaining: null as number | null }
    }
    for (const l of lessons) {
      const r = parseLessonTimeRange(l.time)
      if (!r.isValid) continue
      if (currentMinutes >= r.startMinutes && currentMinutes <= r.endMinutes) {
        return { state: 'active' as const, lesson: l, remaining: r.endMinutes - currentMinutes }
      }
      if (currentMinutes < r.startMinutes) {
        return { state: 'next' as const, lesson: l, remaining: r.startMinutes - currentMinutes }
      }
    }
    return { state: 'finished' as const, lesson: lessons[lessons.length - 1], remaining: null }
  }, [displayDay, isDisplayToday, currentMinutes])

  const overallGpa = useMemo(() => {
    if (!gradesData?.subjects?.length) {
      return gradesData?.overallAverage ? gradesData.overallAverage.toFixed(2) : '—'
    }
    let sum = 0
    let count = 0
    for (const sub of gradesData.subjects) {
      const allInputs = [...sub.semester1, ...sub.semester2].map((g) => ({
        value: g.grade,
        weight: g.weight,
        countsToAverage: g.numericValue !== null
      }))
      const avg = calculateSubjectWeightedAverage(allInputs)
      if (avg !== null) {
        sum += avg
        count++
      }
    }
    if (count === 0) return gradesData.overallAverage ? gradesData.overallAverage.toFixed(2) : '—'
    return (Math.round((sum / count) * 100) / 100).toFixed(2)
  }, [gradesData])

  const upcomingEvents = useMemo(() => {
    if (!scheduleSource) return []
    const raw =
      scheduleSource.calendarEvents?.length
        ? scheduleSource.calendarEvents
        : scheduleSource.schedule.flatMap((d) => d.events || [])
    const seen = new Set<string>()
    const list: TimetableEvent[] = []
    for (const ev of raw) {
      if (!ev || !ev.isoDate || ev.isoDate < todayIso) continue
      if (!showHomeworks && ev.category === 'homework') continue
      const key = `${ev.isoDate}_${ev.lessonNumber || ''}_${ev.title}_${ev.category}`
      if (seen.has(key)) continue
      seen.add(key)
      list.push(ev)
    }
    return list
      .sort((a, b) => a.isoDate.localeCompare(b.isoDate) || (a.lessonNumber || 99) - (b.lessonNumber || 99))
      .slice(0, 4)
  }, [scheduleSource, todayIso, showHomeworks])

  const recentGrades = useMemo(() => {
    if (!gradesData) return []
    if (gradesData.recentGrades && gradesData.recentGrades.length > 0) {
      return gradesData.recentGrades.slice(0, 4)
    }
    const collected: GradeItem[] = []
    for (const sub of gradesData.subjects || []) {
      for (const g of [...sub.semester2, ...sub.semester1]) {
        collected.push({ ...g, subject: g.subject || sub.subject })
      }
    }
    return collected.slice(0, 4)
  }, [gradesData])

  const unreadCount = useMemo(() => messages.filter((m) => !m.isRead).length, [messages])

  const attPercentage = attendanceData?.overallPercentage ?? null
  const attBarColor =
    attendanceData?.overallStatus === 'danger'
      ? 'bg-[var(--mac-red)]'
      : attendanceData?.overallStatus === 'warning'
        ? 'bg-[var(--mac-orange)]'
        : 'bg-[var(--mac-green)]'

  const dayTitle = displayDay
    ? `${isDisplayToday ? pickText(lang, { pl: 'Dzisiaj', en: 'Today' }) : getWeekdayLongLabel(displayDay.dayName, lang)} · ${displayDay.date}`
    : t.schedule

  const displayDayAbsences = useMemo(() => {
    const source = todayTimetableData || timetableData
    if (!displayDay?.isoDate || !source?.teacherAbsences?.length) return []
    return getTeacherAbsencesForDate(source.teacherAbsences, displayDay.isoDate)
  }, [todayTimetableData, timetableData, displayDay?.isoDate])

  return (
    <div className="w-full max-w-[1440px] mx-auto px-6 py-3.5 flex flex-col gap-3.5 select-none">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 md:auto-rows-fr gap-3.5 items-stretch">
        <MacGroupBox
          className="h-full cursor-pointer"
          contentClassName="flex-1 h-full hover:bg-[var(--mac-fill-4)] transition-colors flex flex-col justify-between min-h-[92px]"
        >
          <div onClick={() => onNavigate('timetable')} className="flex-1 flex flex-col justify-between h-full gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-label-2)]">
                {lessonFocus?.state === 'active'
                  ? pickText(lang, { pl: 'Teraz trwa', en: 'In progress' })
                  : lessonFocus?.state === 'next'
                    ? pickText(lang, { pl: 'Następna lekcja', en: 'Up next' })
                    : pickText(lang, { pl: 'Plan lekcji', en: 'Schedule' })}
              </span>
              <Calendar className="w-4 h-4 text-[var(--mac-blue)]" strokeWidth={1.9} />
            </div>
            {lessonFocus ? (
              <div className="min-w-0">
                <div className="text-[15px] font-bold text-[var(--mac-label-1)] truncate leading-tight">
                  {formatSubjectName(lessonFocus.lesson.subject, showFullSubjectNames)}
                </div>
                <div className="text-[12px] text-[var(--mac-label-2)] mt-1.5 flex items-center gap-2 tabular-nums">
                  <span>{lessonFocus.lesson.time}</span>
                  {lessonFocus.lesson.room && (
                    <span className="px-2 py-0.5 rounded-full bg-[var(--ios-blue-subtle)] text-[var(--mac-blue)] text-[11px] font-semibold">
                      {lessonFocus.lesson.room}
                    </span>
                  )}
                  {lessonFocus.remaining !== null && lessonFocus.state === 'active' && (
                    <span className="text-[var(--mac-blue)] font-semibold">
                      · {lessonFocus.remaining} min
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-[13px] font-medium text-[var(--mac-label-2)]">
                {isUpdating ? t.updatingStatus : t.noLessonsDay}
              </div>
            )}
          </div>
        </MacGroupBox>

        <MacGroupBox
          className="h-full cursor-pointer"
          contentClassName="flex-1 h-full hover:bg-[var(--mac-fill-4)] transition-colors flex flex-col justify-between min-h-[92px]"
        >
          <div onClick={() => onNavigate('grades')} className="flex-1 flex flex-col justify-between h-full gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-label-2)]">
                {t.gpaTitle}
              </span>
              <GraduationCap className="w-4 h-4 text-[var(--mac-blue)]" strokeWidth={1.9} />
            </div>
            <div className="flex items-end justify-between gap-2">
              <div className="text-[26px] font-bold text-[var(--mac-label-1)] leading-none tabular-nums">
                {overallGpa}
              </div>
              <div className="flex items-center gap-1">
                {recentGrades.slice(0, 4).map((g, i) => {
                  const st = getGradeBadgeStyle(g.grade)
                  const subjectName = g.subject || ''
                  return (
                    <button
                      key={`${g.id || i}-${g.grade}`}
                      type="button"
                      title={[subjectName, g.category].filter(Boolean).join(' · ') || undefined}
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenGradeInGrades(g, subjectName)
                      }}
                      className={cn(
                        'min-w-[24px] h-[24px] px-1 rounded-[9px] text-[12px] font-semibold flex items-center justify-center tabular-nums cursor-pointer transition-transform duration-150 hover:scale-110 active:scale-95',
                        st.bg,
                        st.text
                      )}
                    >
                      {g.grade}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </MacGroupBox>

        <MacGroupBox
          className="h-full cursor-pointer"
          contentClassName="flex-1 h-full hover:bg-[var(--mac-fill-4)] transition-colors flex flex-col justify-between min-h-[92px]"
        >
          <div onClick={() => onNavigate('attendance')} className="flex-1 flex flex-col justify-between h-full gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-label-2)]">
                {t.attendanceRate}
              </span>
              <CheckCircle2 className="w-4 h-4 text-[var(--mac-green)]" strokeWidth={1.9} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[26px] font-bold text-[var(--mac-label-1)] leading-none tabular-nums">
                  {attPercentage !== null ? `${attPercentage}%` : '—'}
                </span>
                {attendanceData && (
                  <span className="text-[11px] font-medium text-[var(--mac-label-2)] tabular-nums">
                    {attendanceData.unexcusedAbsences.length > 0 ? (
                      <span className="text-[var(--mac-red)] font-semibold">
                        {attendanceData.unexcusedAbsences.length} nb
                      </span>
                    ) : (
                      `${attendanceData.totalAbsent}/${attendanceData.totalScheduled}`
                    )}
                  </span>
                )}
              </div>
              <div className="w-full h-[5px] rounded-full bg-[var(--mac-fill-2)] overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-[width] duration-500', attBarColor)}
                  style={{ width: `${Math.min(Math.max(attPercentage ?? 0, 0), 100)}%` }}
                />
              </div>
            </div>
          </div>
        </MacGroupBox>

        <MacGroupBox
          className="h-full cursor-pointer"
          contentClassName="flex-1 h-full hover:bg-[var(--mac-fill-4)] transition-colors flex flex-col justify-between min-h-[92px]"
        >
          <div onClick={() => onNavigate('inbox')} className="flex-1 flex flex-col justify-between h-full gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--mac-label-2)]">
                {t.messagesInbox}
              </span>
              <Inbox className="w-4 h-4 text-[var(--mac-blue)]" strokeWidth={1.9} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-bold text-[var(--mac-label-1)] leading-none tabular-nums">
                {unreadCount}
              </span>
              <span className="text-[12px] text-[var(--mac-label-2)]">
                {pickText(lang, { pl: 'nieprzeczytanych', en: 'unread' })}
              </span>
            </div>
          </div>
        </MacGroupBox>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        <div className="lg:col-span-7 h-full flex flex-col gap-3.5">
          <MacGroupBox
            title={dayTitle}
            className="flex-1 h-full"
            contentClassName="flex-1 flex flex-col"
            trailing={
              <MacPushButton
                size="sm"
                variant="ghost"
                onClick={() => onNavigate('timetable')}
                icon={<ArrowRight className="w-3 h-3" />}
              >
                {pickText(lang, { pl: 'Cały tydzień', en: 'Full week' })}
              </MacPushButton>
            }
            noPadding
          >
            {displayDayAbsences.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('timetable')}
                className="w-full px-4 py-2 bg-[var(--ios-orange-subtle)]/35 border-b border-[var(--mac-row-divider)] flex items-center justify-between gap-2 text-left hover:bg-[var(--ios-orange-subtle)]/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <UserX className="w-3.5 h-3.5 text-[var(--mac-orange)] shrink-0" />
                  <span className="text-[11px] font-semibold text-[var(--mac-orange)] shrink-0">
                    {pickText(lang, { pl: 'Nieobecni:', en: 'Absent:' })}
                  </span>
                  <span className="text-[11px] text-[var(--mac-label-1)] truncate">
                    {displayDayAbsences
                      .map((a) =>
                        a.timeFrom && a.timeTo
                          ? `${a.teacherName} (${formatTeacherAbsenceSpan(a, lang, { includeDate: false })})`
                          : a.teacherName
                      )
                      .join(', ')}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-[var(--mac-orange)] shrink-0 tabular-nums">
                  {displayDayAbsences.length}
                </span>
              </button>
            )}
            {displayDay && displayDay.lessons.length > 0 ? (
              <div className="mac-divide-y flex-1 flex flex-col">
                {(() => {
                  const maxLessonNum = displayDay.lessons.reduce(
                    (max, l) => Math.max(max, Number(l.number) || 0),
                    9
                  )
                  const slots = Array.from({ length: maxLessonNum + 1 }, (_, n) => n)
                  return slots.flatMap((slotNum) => {
                    const slotLessons = displayDay.lessons.filter((l) => Number(l.number) === slotNum)
                    if (slotLessons.length === 0) {
                      return [
                        <div
                          key={`empty-slot-${slotNum}`}
                          className="w-full flex-1 min-h-[46px] px-4 py-1.5 flex items-center justify-between gap-3 text-left opacity-55"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="w-6 h-6 rounded-full bg-[var(--mac-fill-4)] text-[var(--mac-label-3)] text-[11px] font-semibold flex items-center justify-center shrink-0 tabular-nums">
                              {slotNum}
                            </span>
                            <span className="text-[12px] text-[var(--mac-label-3)] tabular-nums w-[86px] shrink-0">
                              —
                            </span>
                            <span className="text-[12px] text-[var(--mac-label-3)] truncate">
                              {pickText(lang, { pl: 'Okienko', en: 'Free period' })}
                            </span>
                          </div>
                        </div>
                      ]
                    }

                    return slotLessons.map((lesson, idx) => {
                      const r = parseLessonTimeRange(lesson.time)
                      const isActive =
                        isDisplayToday &&
                        !lesson.isCancelled &&
                        r.isValid &&
                        currentMinutes >= r.startMinutes &&
                        currentMinutes <= r.endMinutes
                      const isPassed = isDisplayToday && r.isValid && currentMinutes > r.endMinutes
                      return (
                        <button
                          key={`${lesson.number}-${lesson.subject}-${idx}`}
                          type="button"
                          onClick={() => onOpenLessonInTimetable(displayDay.dayName, lesson, displayDay.isoDate)}
                          className={cn(
                            'w-full flex-1 min-h-[46px] px-4 py-1.5 flex items-center justify-between gap-3 text-left hover:bg-[var(--mac-fill-4)] transition-colors cursor-pointer',
                            lesson.isCancelled && 'opacity-45',
                            isPassed && !lesson.isCancelled && 'opacity-65',
                            isActive && 'bg-[var(--ios-blue-subtle)]/40'
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span
                              className={cn(
                                'w-6 h-6 rounded-full text-[11px] font-semibold flex items-center justify-center shrink-0 tabular-nums',
                                isActive
                                  ? 'bg-[var(--mac-blue)] text-white'
                                  : 'bg-[var(--mac-fill-2)] text-[var(--mac-label-2)]'
                              )}
                            >
                              {lesson.number}
                            </span>
                            <span className="text-[12px] text-[var(--mac-label-2)] tabular-nums w-[86px] shrink-0">
                              {lesson.time}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div
                                className={cn(
                                  'text-[13px] font-semibold text-[var(--mac-label-1)] truncate',
                                  lesson.isCancelled && 'line-through text-[var(--mac-label-2)]'
                                )}
                              >
                                {formatSubjectName(lesson.subject, showFullSubjectNames)}
                              </div>
                              <div className="text-[11px] text-[var(--mac-label-2)] truncate">
                                {lesson.teacher || t.notSpecified}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!lesson.isCancelled && !lesson.isSubstitution && lesson.teacherAbsent && (
                              <span className="px-2 py-0.5 rounded-full bg-[var(--ios-orange-subtle)] text-[var(--mac-orange)] text-[10px] font-semibold">
                                {pickText(lang, { pl: 'Nieobecny', en: 'Absent' })}
                              </span>
                            )}
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
                              <span className="px-2 py-0.5 rounded-full bg-[var(--mac-fill-2)] text-[var(--mac-label-1)] text-[11px] font-medium tabular-nums">
                                {lesson.room}
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })
                  })
                })()}
              </div>
            ) : (
              <div className="flex-1 p-8 text-center text-[13px] text-[var(--mac-label-2)] flex flex-col items-center justify-center gap-2">
                <Clock className="w-5 h-5 text-[var(--mac-label-3)]" />
                <span>{t.noLessonsDay}</span>
              </div>
            )}
          </MacGroupBox>
        </div>

        <div className="lg:col-span-5 h-full flex flex-col gap-3.5">
          <MacGroupBox
            title={pickText(lang, { pl: 'Nadchodzące sprawdziany i terminy', en: 'Upcoming Tests & Deadlines' })}
            className="flex-1"
            contentClassName="flex-1 flex flex-col"
            trailing={
              <MacPushButton
                size="sm"
                variant="ghost"
                onClick={() => onNavigate('deadlines')}
                icon={<ArrowRight className="w-3 h-3" />}
              >
                {t.terminarzButton}
              </MacPushButton>
            }
            noPadding
          >
            {upcomingEvents.length > 0 ? (
              <div className="mac-divide-y flex-1 flex flex-col">
                {upcomingEvents.map((ev, idx) => {
                  const st = getEventCategoryStyle(ev.category, ev.eventType)
                  const dayMeta = formatDayDate(ev.isoDate, lang)
                  const badgeLabel = resolveEventBadgeLabel(ev, isEn)
                  const title = getEventPrimaryTitle(ev, showFullSubjectNames, isEn)
                  return (
                    <button
                      key={`${ev.isoDate}-${idx}`}
                      type="button"
                      onClick={() => onOpenEventInDeadlines(ev)}
                      className="w-full flex-1 px-4 py-2 flex items-center justify-between gap-3 text-left hover:bg-[var(--mac-fill-4)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-[42px] h-[38px] rounded-[11px] bg-[var(--mac-fill-3)] flex flex-col items-center justify-center shrink-0 leading-none">
                          <span className="text-[13px] font-bold text-[var(--mac-label-1)] tabular-nums">
                            {dayMeta.dayNum}
                          </span>
                          <span className="text-[10px] uppercase font-semibold text-[var(--mac-label-2)] mt-0.5">
                            {dayMeta.monthName}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0',
                                st.bgClass,
                                st.textClass
                              )}
                            >
                              {badgeLabel}
                            </span>
                            <span className="text-[13px] font-semibold text-[var(--mac-label-1)] truncate">
                              {title}
                            </span>
                          </div>
                          {ev.description && (
                            <p className="text-[11px] text-[var(--mac-label-2)] truncate mt-0.5">
                              {ev.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] text-[var(--mac-label-2)] shrink-0">
                        {dayMeta.weekday}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex-1 p-8 text-center text-[13px] text-[var(--mac-label-2)] flex flex-col items-center justify-center gap-2">
                <CalendarClock className="w-5 h-5 text-[var(--mac-label-3)]" />
                <span>
                  {pickText(lang, { pl: 'Brak nadchodzących terminów', en: 'No upcoming deadlines' })}
                </span>
              </div>
            )}
          </MacGroupBox>

          <MacGroupBox
            title={pickText(lang, { pl: 'Ostatnie oceny', en: 'Recent Grades' })}
            className="flex-1"
            contentClassName="flex-1 flex flex-col"
            trailing={
              <MacPushButton
                size="sm"
                variant="ghost"
                onClick={() => onNavigate('grades')}
                icon={<ArrowRight className="w-3 h-3" />}
              >
                {t.grades}
              </MacPushButton>
            }
            noPadding
          >
            {recentGrades.length > 0 ? (
              <div className="mac-divide-y flex-1 flex flex-col">
                {recentGrades.map((g, idx) => {
                  const st = getGradeBadgeStyle(g.grade)
                  const subjectName = g.subject || ''
                  return (
                    <button
                      key={`${g.id || idx}-${g.grade}`}
                      type="button"
                      onClick={() => onOpenGradeInGrades(g, subjectName)}
                      className="w-full flex-1 px-4 py-2 flex items-center justify-between gap-3 text-left hover:bg-[var(--mac-fill-4)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={cn(
                            'min-w-[30px] h-[30px] px-1.5 rounded-[10px] text-[13px] font-bold flex items-center justify-center shrink-0 tabular-nums',
                            st.bg,
                            st.text
                          )}
                        >
                          {g.grade}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold text-[var(--mac-label-1)] truncate">
                            {formatSubjectName(subjectName, showFullSubjectNames) || t.grades}
                          </div>
                          <div className="text-[11px] text-[var(--mac-label-2)] truncate">
                            {g.category || pickText(lang, { pl: 'Ocena cząstkowa', en: 'Partial grade' })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-semibold text-[var(--mac-label-1)] tabular-nums">
                          {t.weight} {g.weight}
                        </div>
                        {g.date && (
                          <div className="text-[10px] text-[var(--mac-label-2)] tabular-nums">
                            {formatHumanDate(g.date, false, lang)}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-[13px] text-[var(--mac-label-2)]">
                {t.noGradesRecorded}
              </div>
            )}
          </MacGroupBox>
        </div>
      </div>
    </div>
  )
}
