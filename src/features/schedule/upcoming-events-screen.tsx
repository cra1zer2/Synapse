/**
 * Feature Screen: Upcoming Tests & Deadlines Explorer
 * Combines searchable category-filtered event lists and monthly calendar grid with dynamic Intl month names.
 * Cleanly toggles between list and calendar modes without holding duplicate date utilities.
 */

'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Check, Filter, UserX } from 'lucide-react'
import { TimetableEvent, SmartTimetableResult } from '@/models/timetable.model'
import { AppLanguage, pickText } from '@/config/dictionary.config'
import { UiCard, UiSearchBar, UiSegmentedControl } from '@/components/ui/ui-controls'
import { getMonthNames, getTodayIsoString } from '@/utils/date.util'
import { formatTeacherAbsenceSpan } from '@/utils/teacher-absence.util'
import { cn } from '@/utils/cn.util'
import { EventsListView, LayeredEventGroups, MonthEventGroup } from './events-list-view'
import { EventsCalendarView } from './events-calendar-view'

interface UpcomingEventsScreenProps {
  timetableData?: SmartTimetableResult | null
  isLoading?: boolean
  showHomeworks?: boolean
  showFullSubjectNames?: boolean
  lang?: AppLanguage
  viewMode?: ViewMode
  onChangeViewMode?: (mode: ViewMode) => void
  hideViewSwitcher?: boolean
  onSelectEvent: (event: TimetableEvent) => void
}

export type ViewMode = 'list' | 'calendar'
type CategoryFilter = 'all' | 'exam' | 'quiz' | 'homework' | 'other'

function parseIsoUtcNoon(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0))
}

function formatUtcIsoDate(dt: Date): string {
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function UpcomingEventsScreen({
  timetableData,
  isLoading = false,
  showHomeworks = false,
  showFullSubjectNames = false,
  lang = 'pl',
  viewMode: controlledViewMode,
  onChangeViewMode,
  hideViewSwitcher = false,
  onSelectEvent
}: UpcomingEventsScreenProps) {
  const todayIso = useMemo(() => getTodayIsoString(), [])
  const monthNames = useMemo(() => getMonthNames(lang), [lang])
  const [todayYear, todayMonthIndex] = useMemo(() => {
    const parts = todayIso.split('-').map(Number)
    return [parts[0], (parts[1] || 1) - 1]
  }, [todayIso])

  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('list')
  const viewMode = controlledViewMode ?? internalViewMode
  const setViewMode = onChangeViewMode ?? setInternalViewMode
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [showArchived, setShowArchived] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isFilterMounted, setIsFilterMounted] = useState(false)
  const [isFilterVisible, setIsFilterVisible] = useState(false)
  const filterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isSwappingContent, setIsSwappingContent] = useState(false)
  const contentSwapKey = viewMode + '-' + categoryFilter + '-' + showArchived + '-' + (searchQuery ? 'search' : 'all')
  const prevContentKeyRef = useRef(contentSwapKey)
  const contentSwapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!showHomeworks && categoryFilter === 'homework') {
      setCategoryFilter('all')
    }
  }, [showHomeworks, categoryFilter])

  useEffect(() => {
    if (filterTimerRef.current) clearTimeout(filterTimerRef.current)
    let raf1 = 0
    let raf2 = 0
    if (isFilterOpen) {
      setIsFilterMounted(true)
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setIsFilterVisible(true)
        })
      })
    } else {
      setIsFilterVisible(false)
      filterTimerRef.current = setTimeout(() => setIsFilterMounted(false), 200)
    }
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      if (filterTimerRef.current) clearTimeout(filterTimerRef.current)
    }
  }, [isFilterOpen])

  useEffect(() => {
    if (contentSwapKey === prevContentKeyRef.current) return
    prevContentKeyRef.current = contentSwapKey
    setIsSwappingContent(true)
    if (contentSwapTimerRef.current) clearTimeout(contentSwapTimerRef.current)
    contentSwapTimerRef.current = setTimeout(() => {
      setIsSwappingContent(false)
      contentSwapTimerRef.current = null
    }, 200)
    return () => {
      if (contentSwapTimerRef.current) clearTimeout(contentSwapTimerRef.current)
    }
  }, [contentSwapKey])

  const [calYear, setCalYear] = useState<number>(todayYear)
  const [calMonth, setCalMonth] = useState<number>(todayMonthIndex)
  const [selectedDateIso, setSelectedDateIso] = useState<string>(todayIso)

  const upcomingTeacherAbsences = useMemo(() => {
    const list = timetableData?.teacherAbsences || []
    const q = searchQuery.trim().toLowerCase()
    return list.filter((a) => {
      if (!showArchived && a.dateTo < todayIso) return false
      if (q && !a.teacherName.toLowerCase().includes(q) && !(a.reason || '').toLowerCase().includes(q)) {
        return false
      }
      return true
    })
  }, [timetableData?.teacherAbsences, showArchived, todayIso, searchQuery])

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
      const key =
        ev.isoDate +
        '_' +
        (ev.lessonNumber || '') +
        '_' +
        ev.title +
        '_' +
        ev.category +
        '_' +
        (ev.subjectName || '')
      if (seen.has(key)) continue
      seen.add(key)
      deduped.push(ev)
    }

    return deduped.sort((a, b) => {
      const cmp = a.isoDate.localeCompare(b.isoDate)
      if (cmp !== 0) return cmp
      return (a.lessonNumber || 99) - (b.lessonNumber || 99)
    })
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

  const hasCustomFilter = categoryFilter !== 'all' || showArchived
  const filterButtonLabel = useMemo(() => {
    if (categoryFilter === 'exam') return pickText(lang, { pl: 'Sprawdziany', en: 'Exams' })
    if (categoryFilter === 'quiz') return pickText(lang, { pl: 'Kartkówki', en: 'Quizzes' })
    if (categoryFilter === 'homework') return pickText(lang, { pl: 'Zadania', en: 'Homework' })
    if (categoryFilter === 'other') return pickText(lang, { pl: 'Inne', en: 'Other' })
    if (showArchived) return pickText(lang, { pl: 'Wszystkie daty', en: 'All dates' })
    return pickText(lang, { pl: 'Filtr', en: 'Filter' })
  }, [categoryFilter, showArchived, lang])

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return allEvents.filter((ev) => {
      if (!showArchived && ev.isoDate < todayIso) return false
      if (categoryFilter === 'exam' && ev.category !== 'exam') return false
      if (categoryFilter === 'quiz' && ev.category !== 'quiz') return false
      if (categoryFilter === 'homework' && ev.category !== 'homework') return false
      if (categoryFilter === 'other' && (ev.category === 'exam' || ev.category === 'quiz' || ev.category === 'homework')) {
        return false
      }

      if (q) {
        const titleMatch = (ev.title || '').toLowerCase().includes(q)
        const subjMatch = (ev.subjectName || '').toLowerCase().includes(q)
        const descMatch = (ev.description || '').toLowerCase().includes(q)
        const teachMatch = (ev.teacher || '').toLowerCase().includes(q)
        const typeMatch = (ev.eventType || '').toLowerCase().includes(q)
        if (!titleMatch && !subjMatch && !descMatch && !teachMatch && !typeMatch) {
          return false
        }
      }

      return true
    })
  }, [allEvents, showArchived, categoryFilter, searchQuery, todayIso])

  const tomorrowIso = useMemo(() => {
    const dt = parseIsoUtcNoon(todayIso)
    dt.setUTCDate(dt.getUTCDate() + 1)
    return formatUtcIsoDate(dt)
  }, [todayIso])

  const weekIsoRanges = useMemo(() => {
    const base = parseIsoUtcNoon(todayIso)
    const day = base.getUTCDay()
    const diffToMon = day === 0 ? -6 : 1 - day

    const thisMonday = new Date(base)
    thisMonday.setUTCDate(base.getUTCDate() + diffToMon)

    const thisSunday = new Date(thisMonday)
    thisSunday.setUTCDate(thisMonday.getUTCDate() + 6)

    const nextMonday = new Date(thisMonday)
    nextMonday.setUTCDate(thisMonday.getUTCDate() + 7)

    const nextSunday = new Date(thisMonday)
    nextSunday.setUTCDate(thisMonday.getUTCDate() + 13)

    return {
      thisMonIso: formatUtcIsoDate(thisMonday),
      thisSunIso: formatUtcIsoDate(thisSunday),
      nextMonIso: formatUtcIsoDate(nextMonday),
      nextSunIso: formatUtcIsoDate(nextSunday)
    }
  }, [todayIso])

  const layeredGroups: LayeredEventGroups = useMemo(() => {
    const todayList: TimetableEvent[] = []
    const tomorrowList: TimetableEvent[] = []
    const thisWeekList: TimetableEvent[] = []
    const nextWeekList: TimetableEvent[] = []
    const monthMap: Record<string, MonthEventGroup> = {}
    const pastList: TimetableEvent[] = []

    for (const ev of filteredEvents) {
      if (ev.isoDate < todayIso) {
        pastList.push(ev)
        continue
      }
      if (ev.isoDate === todayIso) {
        todayList.push(ev)
        continue
      }
      if (ev.isoDate === tomorrowIso) {
        tomorrowList.push(ev)
        continue
      }

      if (ev.isoDate >= weekIsoRanges.thisMonIso && ev.isoDate <= weekIsoRanges.thisSunIso) {
        thisWeekList.push(ev)
      } else if (ev.isoDate >= weekIsoRanges.nextMonIso && ev.isoDate <= weekIsoRanges.nextSunIso) {
        nextWeekList.push(ev)
      } else {
        const mKey = ev.isoDate.slice(0, 7)
        const [yStr, mStr] = mKey.split('-')
        const mIdx = Math.max(0, Math.min(11, parseInt(mStr, 10) - 1))
        const label = `${monthNames[mIdx]} ${yStr}`

        if (!monthMap[mKey]) {
          monthMap[mKey] = { key: mKey, label, events: [] }
        }
        monthMap[mKey].events.push(ev)
      }
    }

    const laterMonths = Object.keys(monthMap)
      .sort()
      .map((k) => monthMap[k])
    return {
      today: todayList,
      tomorrow: tomorrowList,
      thisWeek: thisWeekList,
      nextWeek: nextWeekList,
      laterMonths,
      past: pastList
    }
  }, [filteredEvents, todayIso, tomorrowIso, weekIsoRanges, monthNames])

  const eventsByDate = useMemo(() => {
    const map: Record<string, TimetableEvent[]> = {}
    for (const ev of allEvents) {
      if (!map[ev.isoDate]) map[ev.isoDate] = []
      map[ev.isoDate].push(ev)
    }
    return map
  }, [allEvents])

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(Date.UTC(calYear, calMonth, 1))
    const startingDayOfWeek = (firstDay.getUTCDay() + 6) % 7
    const daysInMonth = new Date(Date.UTC(calYear, calMonth + 1, 0)).getUTCDate()

    const cells: Array<{ dayNum: number | null; iso: string | null }> = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      cells.push({ dayNum: null, iso: null })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(calMonth + 1).padStart(2, '0')
      const dStr = String(d).padStart(2, '0')
      cells.push({ dayNum: d, iso: `${calYear}-${mStr}-${dStr}` })
    }
    return cells
  }, [calYear, calMonth])

  const calMonthTitle = `${monthNames[calMonth]} ${calYear}`
  const isCurrentCalMonth = calYear === todayYear && calMonth === todayMonthIndex

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11)
      setCalYear((y) => y - 1)
    } else {
      setCalMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0)
      setCalYear((y) => y + 1)
    } else {
      setCalMonth((m) => m + 1)
    }
  }

  const handleJumpToToday = () => {
    setCalYear(todayYear)
    setCalMonth(todayMonthIndex)
    setSelectedDateIso(todayIso)
  }

  const resetFilters = () => {
    setCategoryFilter('all')
    setShowArchived(false)
    setSearchQuery('')
  }

  const filterCategories = useMemo(() => {
    const base: Array<{ id: CategoryFilter; label: string; count: number }> = [
      { id: 'all', label: pickText(lang, { pl: 'Wszystkie kategorie', en: 'All categories' }), count: categoryCounts.all },
      { id: 'exam', label: pickText(lang, { pl: 'Sprawdziany', en: 'Exams' }), count: categoryCounts.exam },
      { id: 'quiz', label: pickText(lang, { pl: 'Kartkówki', en: 'Quizzes' }), count: categoryCounts.quiz }
    ]
    if (showHomeworks) {
      base.push({
        id: 'homework',
        label: pickText(lang, { pl: 'Zadania', en: 'Homework' }),
        count: categoryCounts.homework
      })
    }
    base.push({
      id: 'other',
      label: pickText(lang, { pl: 'Inne / Wydarzenia', en: 'Other / Notices' }),
      count: categoryCounts.other
    })
    return base
  }, [categoryCounts, lang, showHomeworks])

  return (
    <div className="flex flex-col gap-3.5 pb-16 select-none w-full">
      {!hideViewSwitcher && (
        <UiSegmentedControl<ViewMode>
          value={viewMode}
          onChange={setViewMode}
          options={[
            { id: 'list', label: pickText(lang, { pl: 'Lista', en: 'List' }) },
            { id: 'calendar', label: pickText(lang, { pl: 'Kalendarz', en: 'Calendar' }) }
          ]}
          className="w-full"
        />
      )}

      <div className="relative flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <UiSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={pickText(lang, { pl: 'Szukaj sprawdzianów lub lekcji...', en: 'Search events or subjects...' })}
          />
        </div>

        <button
          type="button"
          onClick={() => setIsFilterOpen((prev) => !prev)}
          className={cn(
            'h-[42px] px-3.5 sm:px-4 rounded-full flex items-center gap-1.5 shrink-0 transition-all duration-150 cursor-pointer select-none text-[13px] active:scale-95',
            hasCustomFilter
              ? 'bg-[var(--ios-blue)] text-white shadow-[var(--ios-primary-pill-shadow)] font-semibold'
              : 'ios-element-pill text-[var(--ios-secondary)] hover:text-[var(--ios-label)] font-medium'
          )}
          aria-label={pickText(lang, { pl: 'Filtr', en: 'Filter' })}
        >
          <Filter className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
          <span className="truncate max-w-[100px]">{filterButtonLabel}</span>
        </button>

        {isFilterMounted && (
          <>
            <div
              className={cn(
                'fixed inset-0 z-40 transition-opacity duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
                isFilterVisible ? 'opacity-100 bg-black/35 pointer-events-auto' : 'opacity-0 pointer-events-none'
              )}
              onClick={() => setIsFilterOpen(false)}
            />
            <div
              style={{ boxShadow: 'var(--ios-modal-shadow)' }}
              className={cn(
                'ios-glass-modal absolute right-0 top-[50px] z-50 w-64 rounded-[26px] p-2 flex flex-col gap-0.5 origin-top-right transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
                isFilterVisible
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 scale-90 -translate-y-2 pointer-events-none'
              )}
            >
              <span className="text-[11px] font-semibold uppercase text-[var(--ios-secondary)] tracking-wider px-3 pt-2 pb-1">
                {pickText(lang, { pl: 'Kategoria', en: 'Category' })}
              </span>

              {filterCategories.map((item) => {
                const isSelected = categoryFilter === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(item.id)
                      setIsFilterOpen(false)
                    }}
                    className={cn(
                      'w-full px-3 py-2 rounded-[14px] flex items-center justify-between text-[14px] transition-all cursor-pointer text-left active:scale-[0.98]',
                      isSelected
                        ? 'ios-well text-[var(--ios-label)] font-semibold'
                        : 'text-[var(--ios-label)] hover:bg-[var(--ios-row-hover)] font-normal'
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[12px] font-normal text-[var(--ios-secondary)] tabular-nums">
                        {item.count}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[var(--ios-blue)]" strokeWidth={2.5} />}
                    </div>
                  </button>
                )
              })}

              <div className="h-[0.5px] bg-[var(--ios-separator)] my-1 mx-2" />

              <button
                type="button"
                onClick={() => {
                  setShowArchived((s) => !s)
                  setIsFilterOpen(false)
                }}
                className={cn(
                  'w-full px-3 py-2 rounded-[14px] flex items-center justify-between text-[13px] transition-all cursor-pointer text-left active:scale-[0.98]',
                  showArchived
                    ? 'ios-well text-[var(--ios-label)] font-semibold'
                    : 'text-[var(--ios-secondary)] hover:bg-[var(--ios-row-hover)]'
                )}
              >
                <span>
                  {showArchived
                    ? pickText(lang, { pl: 'Przeszłe terminy włączone', en: 'Past events included' })
                    : pickText(lang, { pl: 'Pokaż przeszłe terminy', en: 'Include past events' })}
                </span>
                {showArchived && <Check className="w-3.5 h-3.5 text-[var(--ios-blue)]" strokeWidth={2.5} />}
              </button>

              {hasCustomFilter && (
                <button
                  type="button"
                  onClick={() => {
                    resetFilters()
                    setIsFilterOpen(false)
                  }}
                  className="w-full mt-0.5 px-3 py-2 rounded-[14px] text-center text-[13px] font-medium text-[var(--ios-red)] hover:bg-[var(--ios-red-subtle)] active:scale-[0.98] transition-all cursor-pointer"
                >
                  {pickText(lang, { pl: 'Wyczyść filtry', en: 'Reset filters' })}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div
        key={contentSwapKey}
        className={cn('flex flex-col gap-3', isSwappingContent && 'ios-content-swap')}
      >
        {isLoading && allEvents.length === 0 ? (
          <div className="flex flex-col gap-2 pt-1">
            <div className="w-24 h-[12px] rounded-full ios-skeleton ml-4" />
            <UiCard className="overflow-hidden flex flex-col divide-y divide-[var(--ios-separator)]">
              {[0, 1, 2].map((i) => (
                <div key={i} className="px-4 py-3.5 flex items-center justify-between gap-3.5">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-[54px] h-[46px] rounded-[12px] ios-skeleton shrink-0" />
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="w-36 h-[15px] rounded-full ios-skeleton" />
                      <div className="w-52 h-[12px] rounded-full ios-skeleton" />
                    </div>
                  </div>
                  <div className="w-20 h-[22px] rounded-full ios-skeleton shrink-0" />
                </div>
              ))}
            </UiCard>
          </div>
        ) : viewMode === 'list' ? (
          <>
            {upcomingTeacherAbsences.length > 0 && categoryFilter === 'all' && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ios-secondary)] px-3">
                  {pickText(lang, {
                    pl: `Nieobecności nauczycieli (${upcomingTeacherAbsences.length})`,
                    en: `Teacher absences (${upcomingTeacherAbsences.length})`
                  })}
                </span>
                <UiCard className="overflow-hidden divide-y divide-[var(--ios-separator)]">
                  {upcomingTeacherAbsences.map((abs) => (
                    <div
                      key={abs.id}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)] flex items-center justify-center shrink-0 ios-tile">
                          <UserX className="w-3.5 h-3.5" strokeWidth={2.1} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[14px] font-medium text-[var(--ios-label)] truncate">
                            {abs.teacherName}
                          </div>
                          {abs.reason && (
                            <div className="text-[12px] text-[var(--ios-secondary)] truncate">
                              {abs.reason}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-[var(--ios-orange)] bg-[var(--ios-orange-subtle)] ios-tile px-2 py-0.5 rounded-full shrink-0 tabular-nums">
                        {formatTeacherAbsenceSpan(abs, lang)}
                      </span>
                    </div>
                  ))}
                </UiCard>
              </div>
            )}
            <EventsListView
              filteredEvents={filteredEvents}
              layeredGroups={layeredGroups}
              showArchived={showArchived}
              hasSearchOrFilter={Boolean(searchQuery || hasCustomFilter)}
              showFullSubjectNames={showFullSubjectNames}
              lang={lang}
              onResetFilters={resetFilters}
              onSelectEvent={onSelectEvent}
            />
          </>
        ) : (
          <EventsCalendarView
            calMonthTitle={calMonthTitle}
            isCurrentCalMonth={isCurrentCalMonth}
            calendarGrid={calendarGrid}
            selectedDateIso={selectedDateIso}
            todayIso={todayIso}
            eventsByDate={eventsByDate}
            selectedDayEvents={eventsByDate[selectedDateIso] || []}
            showFullSubjectNames={showFullSubjectNames}
            lang={lang}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onJumpToToday={handleJumpToToday}
            onSelectDate={setSelectedDateIso}
            onSelectEvent={onSelectEvent}
          />
        )}
      </div>
    </div>
  )
}
