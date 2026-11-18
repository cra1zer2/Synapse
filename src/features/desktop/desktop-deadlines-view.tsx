'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Calendar, CalendarClock, CalendarPlus, ChevronLeft, ChevronRight, Archive } from 'lucide-react'
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
import { cn } from '@/utils/cn.util'
import {
  MacGroupBox,
  MacPushButton,
  MacSearchField,
  MacSegmentedControl
} from './mac-primitives'

interface DesktopDeadlinesViewProps {
  timetableData: SmartTimetableResult | null
  showHomeworks: boolean
  showFullSubjectNames: boolean
  lang: AppLanguage
  t: AppDictionary
  initialSelectedEvent?: TimetableEvent | null
}

type CategoryFilter = 'all' | 'exam' | 'quiz' | 'homework' | 'other'

export function DesktopDeadlinesView({
  timetableData,
  showHomeworks,
  showFullSubjectNames,
  lang,
  t,
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

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [showArchived, setShowArchived] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<TimetableEvent | null>(initialSelectedEvent || null)
  const [calYear, setCalYear] = useState(todayYear)
  const [calMonth, setCalMonth] = useState(todayMonth)
  const [selectedDateIso, setSelectedDateIso] = useState(todayIso)

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

  useEffect(() => {
    if (!showHomeworks && categoryFilter === 'homework') {
      setCategoryFilter('all')
    }
  }, [showHomeworks, categoryFilter])

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

  const categoryCounts = useMemo(() => {
    const counts = { all: 0, exam: 0, quiz: 0, homework: 0, other: 0 }
    for (const ev of allEvents) {
      if (!showArchived && ev.isoDate < todayIso) continue
      counts.all++
      if (ev.category === 'exam') counts.exam++
      else if (ev.category === 'quiz') counts.quiz++
      else if (ev.category === 'homework') counts.homework++
      else counts.other++
    }
    return counts
  }, [allEvents, showArchived, todayIso])

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return allEvents.filter((ev) => {
      if (!showArchived && ev.isoDate < todayIso) return false
      if (categoryFilter === 'exam' && ev.category !== 'exam') return false
      if (categoryFilter === 'quiz' && ev.category !== 'quiz') return false
      if (categoryFilter === 'homework' && ev.category !== 'homework') return false
      if (
        categoryFilter === 'other' &&
        (ev.category === 'exam' || ev.category === 'quiz' || ev.category === 'homework')
      ) {
        return false
      }
      if (!q) return true
      return (
        (ev.title || '').toLowerCase().includes(q) ||
        (ev.subjectName || '').toLowerCase().includes(q) ||
        (ev.description || '').toLowerCase().includes(q) ||
        (ev.teacher || '').toLowerCase().includes(q) ||
        (ev.eventType || '').toLowerCase().includes(q)
      )
    })
  }, [allEvents, showArchived, categoryFilter, searchQuery, todayIso])

  useEffect(() => {
    if (!selectedEvent && filteredEvents.length > 0) {
      setSelectedEvent(filteredEvents[0])
    }
  }, [filteredEvents, selectedEvent])

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

  const filterChips: Array<{ id: CategoryFilter; label: string; count: number }> = [
    { id: 'all', label: pickText(lang, { pl: 'Wszystkie', en: 'All' }), count: categoryCounts.all },
    { id: 'exam', label: pickText(lang, { pl: 'Sprawdziany', en: 'Exams' }), count: categoryCounts.exam },
    { id: 'quiz', label: pickText(lang, { pl: 'Kartkówki', en: 'Quizzes' }), count: categoryCounts.quiz },
    ...(showHomeworks
      ? [{ id: 'homework' as const, label: pickText(lang, { pl: 'Zadania domowe', en: 'Homework' }), count: categoryCounts.homework }]
      : []),
    { id: 'other', label: pickText(lang, { pl: 'Inne', en: 'Other' }), count: categoryCounts.other }
  ]

  const renderEventDetailInspector = () => {
    if (!selectedEvent) {
      return (
        <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-[var(--mac-label-2)]">
          <CalendarClock className="w-6 h-6 text-[var(--mac-label-3)]" />
          <span className="text-[12px]">
            {pickText(lang, { pl: 'Wybierz termin z listy lub kalendarza', en: 'Select a deadline to inspect' })}
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
            <p className="text-[12.5px] text-[var(--mac-label-1)] leading-relaxed whitespace-pre-wrap select-text">
              {desc}
            </p>
          </MacGroupBox>
        )}

        <MacGroupBox noPadding>
          <div className="divide-y divide-[var(--mac-row-divider)] text-[12px]">
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
        {/* Filter & Controls Toolbar */}
        <div className="px-6 py-3 border-b border-[var(--mac-row-divider)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {filterChips.map((chip) => {
              const active = categoryFilter === chip.id
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setCategoryFilter(chip.id)}
                  className={cn(
                    'h-[28px] px-3 rounded-full text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors',
                    active
                      ? 'bg-[var(--mac-blue)] text-white font-semibold'
                      : 'bg-[var(--mac-fill-3)] text-[var(--mac-label-1)] hover:bg-[var(--mac-fill-2)]'
                  )}
                >
                  <span>{chip.label}</span>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full tabular-nums',
                      active ? 'bg-white/20 text-white' : 'bg-[var(--mac-fill-2)] text-[var(--mac-label-2)]'
                    )}
                  >
                    {chip.count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <MacSearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={pickText(lang, { pl: 'Szukaj terminu...', en: 'Search deadlines...' })}
              className="w-[210px]"
            />
            <MacPushButton
              variant={showArchived ? 'tinted' : 'bordered'}
              size="lg"
              onClick={() => setShowArchived((p) => !p)}
              icon={<Archive className="w-3.5 h-3.5" />}
            >
              {pickText(lang, { pl: 'Archiwum', en: 'Past' })}
            </MacPushButton>
            <MacSegmentedControl<'list' | 'calendar'>
              value={viewMode}
              onChange={setViewMode}
              options={[
                { id: 'list', label: pickText(lang, { pl: 'Lista', en: 'List' }) },
                { id: 'calendar', label: pickText(lang, { pl: 'Kalendarz', en: 'Calendar' }) }
              ]}
              className="w-[170px]"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {viewMode === 'list' ? (
            filteredEvents.length > 0 ? (
              <MacGroupBox noPadding>
                <div className="divide-y divide-[var(--mac-row-divider)]">
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
                        onClick={() => setSelectedEvent(ev)}
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
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-[5px] text-[10px] font-semibold uppercase tracking-wide shrink-0',
                                  st.bgClass,
                                  st.textClass
                                )}
                              >
                                {badgeLabel}
                              </span>
                              <span className="text-[13.5px] font-semibold text-[var(--mac-label-1)] truncate">
                                {primaryTitle}
                              </span>
                            </div>
                            {ev.description && (
                              <p className="text-[12px] text-[var(--mac-label-2)] truncate mt-0.5">
                                {ev.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                          <span className="text-[11px] font-medium text-[var(--mac-label-2)]">
                            {dayMeta.weekday}
                          </span>
                          {ev.lessonNumber !== undefined && (
                            <span className="text-[11px] text-[var(--mac-label-3)] tabular-nums">
                              {t.lessonNumberLabel(ev.lessonNumber)}
                            </span>
                          )}
                        </div>
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
            )
          ) : (
            /* Full Month Desktop Calendar Grid */
            <MacGroupBox
              title={`${monthNames[calMonth]} ${calYear}`}
              trailing={
                <div className="flex items-center gap-1.5">
                  <MacPushButton
                    size="sm"
                    variant="bordered"
                    onClick={() => {
                      setCalYear(todayYear)
                      setCalMonth(todayMonth)
                      setSelectedDateIso(todayIso)
                    }}
                  >
                    {pickText(lang, { pl: 'Dzisiaj', en: 'Today' })}
                  </MacPushButton>
                  <MacPushButton
                    size="sm"
                    variant="bordered"
                    onClick={() => shiftMonth(-1)}
                    icon={<ChevronLeft className="w-3.5 h-3.5" />}
                  />
                  <MacPushButton
                    size="sm"
                    variant="bordered"
                    onClick={() => shiftMonth(1)}
                    icon={<ChevronRight className="w-3.5 h-3.5" />}
                  />
                </div>
              }
              noPadding
            >
              <div className="grid grid-cols-7 border-b border-[var(--mac-row-divider)] bg-[var(--mac-fill-5)]">
                {weekdayHeaders.map((w, i) => (
                  <div
                    key={i}
                    className="py-2 text-center text-[11px] font-semibold uppercase text-[var(--mac-label-2)]"
                  >
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 divide-x divide-y divide-[var(--mac-row-divider)]">
                {calendarGrid.map((cell, idx) => {
                  if (!cell.dayNum || !cell.iso) {
                    return <div key={`empty-${idx}`} className="min-h-[104px] bg-[var(--mac-fill-5)]/50" />
                  }
                  const dayEvs = eventsByDate[cell.iso] || []
                  const isToday = cell.iso === todayIso
                  const isSel = cell.iso === selectedDateIso
                  return (
                    <div
                      key={cell.iso}
                      onClick={() => setSelectedDateIso(cell.iso!)}
                      className={cn(
                        'min-h-[104px] p-2 flex flex-col gap-1 cursor-pointer transition-colors',
                        isSel ? 'bg-[var(--ios-blue-subtle)]/35' : 'hover:bg-[var(--mac-fill-4)]'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            'w-6 h-6 rounded-full text-[11px] font-semibold flex items-center justify-center tabular-nums',
                            isToday
                              ? 'bg-[var(--mac-blue)] text-white'
                              : isSel
                                ? 'bg-[var(--mac-fill-1)] text-[var(--mac-label-1)]'
                                : 'text-[var(--mac-label-2)]'
                          )}
                        >
                          {cell.dayNum}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        {dayEvs.slice(0, 3).map((ev, eIdx) => {
                          const st = getEventCategoryStyle(ev.category, ev.eventType)
                          return (
                            <button
                              key={eIdx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedDateIso(cell.iso!)
                                setSelectedEvent(ev)
                              }}
                              className={cn(
                                'w-full px-1.5 py-0.5 rounded-[5px] text-left text-[10px] font-medium truncate cursor-pointer',
                                st.bgClass,
                                st.textClass,
                                selectedEvent === ev && 'ring-1 ring-[var(--mac-blue)]'
                              )}
                            >
                              {getEventPrimaryTitle(ev, showFullSubjectNames, isEn)}
                            </button>
                          )
                        })}
                        {dayEvs.length > 3 && (
                          <span className="text-[10px] text-[var(--mac-label-2)] pl-1">
                            +{dayEvs.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </MacGroupBox>
          )}
        </div>
      </div>

      {/* Right Inspector Pane (320px): Mini Month Calendar + Selected Event Inspector */}
      <aside className="w-[320px] shrink-0 border-l border-[var(--mac-row-divider)] bg-[var(--mac-window-bg)] p-4 overflow-y-auto flex flex-col gap-5">
        {viewMode === 'list' && (
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
                      if (dayEvs.length > 0) setSelectedEvent(dayEvs[0])
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
        )}

        <div className="flex-1">{renderEventDetailInspector()}</div>
      </aside>
    </div>
  )
}
