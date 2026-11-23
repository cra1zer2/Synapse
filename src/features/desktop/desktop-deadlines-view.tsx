'use client'

import React, { useMemo, useState, useEffect, useRef } from 'react'
import { Calendar, CalendarClock, CalendarPlus, ChevronLeft, ChevronRight, UserX } from 'lucide-react'
import { SmartTimetableResult, TimetableEvent } from '@/models/timetable.model'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import {
  formatDayDate,
  formatHumanDate,
  getMonthNames,
  getTodayIsoString,
  getWeekdayHeaders
} from '@/utils/date.util'
import {
  getEventCategoryStyle,
  getEventPrimaryTitle,
  resolveEventBadgeLabel
} from '@/utils/badge.util'
import { downloadEventIcs } from '@/utils/calendar.util'
import { formatTeacherAbsenceSpan } from '@/utils/teacher-absence.util'
import { cn } from '@/utils/cn.util'
import {
  MacGroupBox,
  MacPushButton
} from './mac-primitives'

interface DesktopDeadlinesViewProps {
  timetableData: SmartTimetableResult | null
  showHomeworks: boolean
  showFullSubjectNames: boolean
  lang: AppLanguage
  t: AppDictionary
  showArchived: boolean
  initialSelectedEvent?: TimetableEvent | null
}

export function DesktopDeadlinesView({
  timetableData,
  showHomeworks,
  showFullSubjectNames,
  lang,
  t,
  showArchived,
  initialSelectedEvent
}: DesktopDeadlinesViewProps) {
  const todayIso = useMemo(() => getTodayIsoString(), [])
  const monthNames = useMemo(() => getMonthNames(lang), [lang])
  const weekdayHeaders = useMemo(() => getWeekdayHeaders(lang), [lang])
  const isEn = lang !== 'pl'

  const [todayYear, todayMonth] = useMemo(() => {
    const parts = todayIso.split('-').map(Number)
    return [parts[0], (parts[1] || 1) - 1]
  }, [todayIso])

  const [selectedEvent, setSelectedEvent] = useState<TimetableEvent | null>(initialSelectedEvent || null)
  const [calYear, setCalYear] = useState(todayYear)
  const [calMonth, setCalMonth] = useState(todayMonth)
  const [selectedDateIso, setSelectedDateIso] = useState(todayIso)
  const hasAutoSelectedRef = useRef(Boolean(initialSelectedEvent))

  useEffect(() => {
    if (initialSelectedEvent) {
      setSelectedEvent(initialSelectedEvent)
      if (initialSelectedEvent.isoDate) {
        setSelectedDateIso(initialSelectedEvent.isoDate)
        const [y, m] = initialSelectedEvent.isoDate.split('-').map(Number)
        if (y && m) {
          setCalYear(y)
          setCalMonth(m - 1)
        }
      }
    }
  }, [initialSelectedEvent])

  const allEvents = useMemo(() => {
    if (!timetableData) return []
    const rawList = [
      ...(timetableData.calendarEvents || []),
      ...(timetableData.schedule || []).flatMap((d) => d.events || [])
    ]
    const seen = new Set<string>()
    const deduped: TimetableEvent[] = []
    for (const ev of rawList) {
      if (!ev || !ev.isoDate) continue
      if (!showHomeworks && ev.category === 'homework') continue
      const key = `${ev.isoDate}_${ev.lessonNumber || ''}_${ev.title}_${ev.category}_${ev.subjectName || ''}`
      if (seen.has(key)) continue
      seen.add(key)
      deduped.push(ev)
    }
    return deduped.sort((a, b) => a.isoDate.localeCompare(b.isoDate) || (a.lessonNumber || 99) - (b.lessonNumber || 99))
  }, [timetableData, showHomeworks])

  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => showArchived || ev.isoDate >= todayIso)
  }, [allEvents, showArchived, todayIso])

  const filteredTeacherAbsences = useMemo(() => {
    const list = timetableData?.teacherAbsences || []
    return list.filter((a) => showArchived || a.dateTo >= todayIso)
  }, [timetableData?.teacherAbsences, showArchived, todayIso])

  useEffect(() => {
    if (!hasAutoSelectedRef.current && filteredEvents.length > 0) {
      hasAutoSelectedRef.current = true
      setSelectedEvent(filteredEvents[0])
      if (filteredEvents[0].isoDate) {
        setSelectedDateIso(filteredEvents[0].isoDate)
      }
    }
  }, [filteredEvents])

  const eventsByDate = useMemo(() => {
    const map: Record<string, TimetableEvent[]> = {}
    for (const ev of filteredEvents) {
      if (!map[ev.isoDate]) map[ev.isoDate] = []
      map[ev.isoDate].push(ev)
    }
    return map
  }, [filteredEvents])

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(Date.UTC(calYear, calMonth, 1))
    const startWeekday = (firstDay.getUTCDay() + 6) % 7 // Mon=0
    const daysInMonth = new Date(Date.UTC(calYear, calMonth + 1, 0)).getUTCDate()
    const cells: Array<{ dayNum: number | null; iso: string | null }> = []
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ dayNum: null, iso: null })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(calMonth + 1).padStart(2, '0')
      const dStr = String(d).padStart(2, '0')
      cells.push({ dayNum: d, iso: `${calYear}-${mStr}-${dStr}` })
    }
    while (cells.length % 7 !== 0) {
      cells.push({ dayNum: null, iso: null })
    }
    return cells
  }, [calYear, calMonth])

  const shiftMonth = (delta: number) => {
    const dt = new Date(Date.UTC(calYear, calMonth + delta, 1))
    setCalYear(dt.getUTCFullYear())
    setCalMonth(dt.getUTCMonth())
  }

  const renderEventDetailInspector = () => {
    if (!selectedEvent) {
      return (
        <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-[var(--mac-label-2)]">
          <CalendarClock className="w-6 h-6 text-[var(--mac-label-3)]" />
          <span className="text-[12px]">
            {pickText(lang, { pl: 'Brak wydarzeń w wybranym dniu', en: 'No deadlines on selected day' })}
          </span>
        </div>
      )
    }
    const st = getEventCategoryStyle(selectedEvent.category, selectedEvent.eventType)
    const badgeLabel = resolveEventBadgeLabel(selectedEvent, isEn)
    const title = getEventPrimaryTitle(selectedEvent, true, isEn)
    const desc =
      selectedEvent.description && selectedEvent.description !== title
        ? selectedEvent.description
        : selectedEvent.title && selectedEvent.title !== title
          ? selectedEvent.title
          : ''

    return (
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1">
          <div>
            <span className={cn('px-2 py-0.5 rounded-[6px] text-[10px] font-semibold uppercase', st.bgClass, st.textClass)}>
              {badgeLabel}
            </span>
          </div>
          <h3 className="text-[16px] font-bold text-[var(--mac-label-1)] leading-snug">{title}</h3>
          <span className="text-[12px] text-[var(--mac-label-2)] tabular-nums">
            {formatHumanDate(selectedEvent.isoDate || selectedEvent.date, false, lang)}
          </span>
        </div>

        {desc && (
          <MacGroupBox title={pickText(lang, { pl: 'Zakres materiału / Opis', en: 'Scope / Description' })}>
            <p className="text-[12px] text-[var(--mac-label-1)] leading-relaxed whitespace-pre-wrap select-text">
              {desc}
            </p>
          </MacGroupBox>
        )}

        <MacGroupBox noPadding>
          <div className="mac-divide-y text-[12px]">
            {selectedEvent.lessonNumber !== undefined && (
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-[var(--mac-label-2)]">{pickText(lang, { pl: 'Lekcja', en: 'Period' })}</span>
                <span className="font-medium text-[var(--mac-label-1)]">{t.lessonNumberLabel(selectedEvent.lessonNumber)}</span>
              </div>
            )}
            {selectedEvent.time && (
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-[var(--mac-label-2)]">{pickText(lang, { pl: 'Godziny', en: 'Time' })}</span>
                <span className="font-medium text-[var(--mac-label-1)] tabular-nums">{selectedEvent.time}</span>
              </div>
            )}
            {selectedEvent.teacher && (
              <div className="px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-[var(--mac-label-2)] shrink-0">{t.teacherLabel}</span>
                <span className="font-medium text-[var(--mac-label-1)] truncate text-right">{selectedEvent.teacher}</span>
              </div>
            )}
          </div>
        </MacGroupBox>

        {selectedEvent.isoDate && (
          <MacPushButton
            variant="tinted"
            size="lg"
            onClick={() => downloadEventIcs(selectedEvent)}
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
      {/* Main Pane */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {filteredEvents.length > 0 ? (
            <MacGroupBox noPadding>
              <div className="mac-divide-y">
                {filteredEvents.map((ev, idx) => {
                  const st = getEventCategoryStyle(ev.category, ev.eventType)
                  const dayMeta = formatDayDate(ev.isoDate, lang)
                  const badgeLabel = resolveEventBadgeLabel(ev, isEn)
                  const primaryTitle = getEventPrimaryTitle(ev, showFullSubjectNames, isEn)
                  const isSelected = selectedEvent === ev
                  const isPast = ev.isoDate < todayIso
                  return (
                    <button
                      key={`${ev.isoDate}-${idx}`}
                      type="button"
                      onClick={() => {
                        setSelectedEvent(ev)
                        if (ev.isoDate) setSelectedDateIso(ev.isoDate)
                      }}
                      className={cn(
                        'w-full px-4 py-3 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer',
                        isSelected ? 'bg-[var(--ios-blue-subtle)]/50' : 'hover:bg-[var(--mac-fill-4)]',
                        isPast && 'opacity-55'
                      )}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-[46px] h-[42px] rounded-[9px] bg-[var(--mac-fill-3)] flex flex-col items-center justify-center shrink-0 leading-none">
                          <span className="text-[14px] font-bold text-[var(--mac-label-1)] tabular-nums">
                            {dayMeta.dayNum}
                          </span>
                          <span className="text-[9px] uppercase font-semibold text-[var(--mac-label-2)] mt-0.5">
                            {dayMeta.monthName}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold text-[var(--mac-label-1)] leading-snug">
                            {primaryTitle}
                          </div>
                          {ev.description && (
                            <p className="text-[12px] text-[var(--mac-label-2)] truncate mt-0.5">
                              {ev.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide shrink-0',
                          st.bgClass,
                          st.textClass
                        )}
                      >
                        {badgeLabel}
                      </span>
                    </button>
                  )
                })}
              </div>
            </MacGroupBox>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-[var(--mac-label-2)]">
              <Calendar className="w-8 h-8 text-[var(--mac-label-3)]" />
              <span className="text-[14px] font-medium">
                {pickText(lang, { pl: 'Brak pasujących wydarzeń', en: 'No matching deadlines' })}
              </span>
            </div>
          )}

          {filteredTeacherAbsences.length > 0 && (
            <div className="mt-4">
              <MacGroupBox
                noPadding
                title={pickText(lang, {
                  pl: `Nieobecności nauczycieli (${filteredTeacherAbsences.length})`,
                  en: `Teacher absences (${filteredTeacherAbsences.length})`
                })}
              >
                <div className="mac-divide-y">
                  {filteredTeacherAbsences.map((abs) => (
                    <div
                      key={abs.id}
                      className="px-4 py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-[8px] bg-[var(--ios-orange-subtle)] text-[var(--mac-orange)] flex items-center justify-center shrink-0">
                          <UserX className="w-3.5 h-3.5" strokeWidth={2} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-[var(--mac-label-1)] truncate">
                            {abs.teacherName}
                          </div>
                          {abs.reason && (
                            <div className="text-[11px] text-[var(--mac-label-2)] truncate">
                              {abs.reason}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-[var(--ios-orange-subtle)] text-[var(--mac-orange)] text-[11px] font-semibold shrink-0 tabular-nums">
                        {formatTeacherAbsenceSpan(abs, lang)}
                      </span>
                    </div>
                  ))}
                </div>
              </MacGroupBox>
            </div>
          )}
        </div>
      </div>

      {/* Right Inspector Pane (320px): Mini Month Calendar + Selected Event Inspector */}
      <aside className="w-[320px] shrink-0 border-l border-[var(--mac-row-divider)] bg-[var(--mac-window-bg)] p-4 overflow-y-auto flex flex-col gap-5">
        <MacGroupBox
          title={`${monthNames[calMonth]} ${calYear}`}
          trailing={
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="w-5 h-5 rounded-full hover:bg-[var(--mac-fill-3)] flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="w-5 h-5 rounded-full hover:bg-[var(--mac-fill-3)] flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-[var(--mac-label-3)] mb-1">
            {weekdayHeaders.map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {calendarGrid.map((cell, idx) => {
              if (!cell.dayNum || !cell.iso) return <div key={idx} className="h-7" />
              const dayEvs = eventsByDate[cell.iso] || []
              const isToday = cell.iso === todayIso
              const isSel = cell.iso === selectedDateIso
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => {
                    setSelectedDateIso(cell.iso!)
                    setSelectedEvent(dayEvs[0] || null)
                  }}
                  className={cn(
                    'relative h-7 rounded-[6px] text-[11px] font-medium flex items-center justify-center cursor-pointer tabular-nums transition-colors',
                    isToday
                      ? 'bg-[var(--mac-blue)] text-white font-bold'
                      : isSel
                        ? 'bg-[var(--mac-fill-1)] text-[var(--mac-label-1)] font-semibold'
                        : 'text-[var(--mac-label-1)] hover:bg-[var(--mac-fill-3)]'
                  )}
                >
                  {cell.dayNum}
                  {dayEvs.length > 0 && !isToday && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[var(--mac-blue)]" />
                  )}
                </button>
              )
            })}
          </div>
        </MacGroupBox>

        <div className="flex-1">{renderEventDetailInspector()}</div>
      </aside>
    </div>
  )
}
