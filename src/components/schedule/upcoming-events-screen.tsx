'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Check, Filter } from 'lucide-react'
import { TimetableEvent, SmartTimetableResult } from '@/models/timetable.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosCard, IosSearchBar, IosSegmentedControl } from '@/components/ios/ios-ui'
import { getTodayIsoString } from '@/utils/date.util'
import { cn } from '@/utils/cn.util'
import { EventsListView, LayeredEventGroups, MonthEventGroup } from './events-list-view'
import { EventsCalendarView } from './events-calendar-view'

export interface UpcomingEventsScreenProps {
  timetableData?: SmartTimetableResult | null
  isLoading?: boolean
  showHomeworks?: boolean
  showFullSubjectNames?: boolean
  lang?: AppLanguage
  t: AppDictionary
  onSelectEvent: (event: TimetableEvent) => void
  onRefresh?: () => void
}

type ViewMode = 'list' | 'calendar'
type CategoryFilter = 'all' | 'exam' | 'quiz' | 'homework' | 'other'

const MONTH_NAMES_PL = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień'
]

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

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
  onSelectEvent
}: UpcomingEventsScreenProps) {
  const isEn = lang === 'en'
  const todayIso = useMemo(() => getTodayIsoString(), [])
  const [todayYear, todayMonthIndex] = useMemo(() => {
    const parts = todayIso.split('-').map(Number)
    return [parts[0], (parts[1] || 1) - 1]
  }, [todayIso])

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [showArchived, setShowArchived] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isFilterMounted, setIsFilterMounted] = useState(false)
  const filterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!showHomeworks && categoryFilter === 'homework') {
      setCategoryFilter('all')
    }
  }, [showHomeworks, categoryFilter])

  useEffect(() => {
    if (filterTimerRef.current) clearTimeout(filterTimerRef.current)
    if (isFilterOpen) {
      setIsFilterMounted(true)
    } else if (isFilterMounted) {
      filterTimerRef.current = setTimeout(() => setIsFilterMounted(false), 200)
    }
    return () => {
      if (filterTimerRef.current) clearTimeout(filterTimerRef.current)
    }
  }, [isFilterOpen, isFilterMounted])

  const [calYear, setCalYear] = useState<number>(todayYear)
  const [calMonth, setCalMonth] = useState<number>(todayMonthIndex)
  const [selectedDateIso, setSelectedDateIso] = useState<string>(todayIso)

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
    if (categoryFilter === 'exam') return isEn ? 'Exams' : 'Sprawdziany'
    if (categoryFilter === 'quiz') return isEn ? 'Quizzes' : 'Kartkówki'
    if (categoryFilter === 'homework') return isEn ? 'Homework' : 'Zadania'
    if (categoryFilter === 'other') return isEn ? 'Other' : 'Inne'
    if (showArchived) return isEn ? 'All dates' : 'Wszystkie daty'
    return isEn ? 'Filter' : 'Filtr'
  }, [categoryFilter, showArchived, isEn])

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
        const mName = isEn ? MONTH_NAMES_EN[mIdx] : MONTH_NAMES_PL[mIdx]
        const label = `${mName} ${yStr}`

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
  }, [filteredEvents, todayIso, tomorrowIso, weekIsoRanges, isEn])

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

  const calMonthTitle = (isEn ? MONTH_NAMES_EN[calMonth] : MONTH_NAMES_PL[calMonth]) + ' ' + calYear
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
      { id: 'all', label: isEn ? 'All categories' : 'Wszystkie kategorie', count: categoryCounts.all },
      { id: 'exam', label: isEn ? 'Exams' : 'Sprawdziany', count: categoryCounts.exam },
      { id: 'quiz', label: isEn ? 'Quizzes' : 'Kartkówki', count: categoryCounts.quiz }
    ]
    if (showHomeworks) {
      base.push({ id: 'homework', label: isEn ? 'Homework' : 'Zadania', count: categoryCounts.homework })
    }
    base.push({ id: 'other', label: isEn ? 'Other / Notices' : 'Inne / Wydarzenia', count: categoryCounts.other })
    return base
  }, [categoryCounts, isEn, showHomeworks])

  return (
    <div className="flex flex-col gap-3.5 pb-16 select-none w-full">
      <IosSegmentedControl<ViewMode>
        value={viewMode}
        onChange={setViewMode}
        options={[
          { id: 'list', label: isEn ? 'List' : 'Lista' },
          { id: 'calendar', label: isEn ? 'Calendar' : 'Kalendarz' }
        ]}
        className="w-full"
      />

      <div className="relative flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <IosSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={isEn ? 'Search events or subjects...' : 'Szukaj sprawdzianów lub lekcji...'}
          />
        </div>

        <button
          type="button"
          onClick={() => setIsFilterOpen((prev) => !prev)}
          className={cn(
            'h-[42px] px-3.5 sm:px-4 rounded-full flex items-center gap-1.5 shrink-0 transition-all duration-150 cursor-pointer select-none text-[13px] active:scale-95',
            hasCustomFilter
              ? 'bg-[var(--ios-blue)] text-white font-semibold'
              : 'bg-[var(--ios-element)] text-[var(--ios-secondary)] hover:text-[var(--ios-label)] font-medium'
          )}
          aria-label={isEn ? 'Filter' : 'Filtr'}
        >
          <Filter className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
          <span className="truncate max-w-[100px]">{filterButtonLabel}</span>
        </button>

        {isFilterMounted && (
          <>
            <div
              className={cn(
                'fixed inset-0 z-30 transition-opacity duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
                isFilterOpen ? 'opacity-100 bg-black/35 pointer-events-auto' : 'opacity-0 pointer-events-none'
              )}
              onClick={() => setIsFilterOpen(false)}
            />
            <div
              style={{ boxShadow: 'var(--ios-modal-shadow)' }}
              className={cn(
                'ios-glass-modal absolute right-0 top-[50px] z-40 w-64 rounded-[26px] p-2 flex flex-col gap-0.5 origin-top-right transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
                isFilterOpen
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 scale-90 -translate-y-2 pointer-events-none'
              )}
            >
              <span className="text-[11px] font-semibold uppercase text-[var(--ios-secondary)] tracking-wider px-3 pt-2 pb-1">
                {isEn ? 'Category' : 'Kategoria'}
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
                        ? 'bg-[var(--bg-card-secondary)] text-[var(--ios-label)] font-semibold'
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
                    ? 'bg-[var(--bg-card-secondary)] text-[var(--ios-label)] font-semibold'
                    : 'text-[var(--ios-secondary)] hover:bg-[var(--ios-row-hover)]'
                )}
              >
                <span>
                  {showArchived
                    ? isEn
                      ? 'Past events included'
                      : 'Przeszłe terminy włączone'
                    : isEn
                      ? 'Include past events'
                      : 'Pokaż przeszłe terminy'}
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
                  {isEn ? 'Reset filters' : 'Wyczyść filtry'}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div
        key={viewMode + '-' + categoryFilter + '-' + showArchived + '-' + (searchQuery ? 'search' : 'all')}
        className="ios-content-swap flex flex-col gap-3"
      >
        {isLoading && allEvents.length === 0 ? (
          <div className="flex flex-col gap-2 pt-1">
            <div className="w-24 h-[12px] rounded-full ios-skeleton ml-4" />
            <IosCard className="overflow-hidden flex flex-col divide-y divide-[var(--ios-separator)]">
              {[0, 1, 2].map((i) => (
                <div key={i} className="px-4 py-3.5 flex items-center justify-between gap-3.5">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-[44px] h-[46px] rounded-[12px] ios-skeleton shrink-0" />
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="w-36 h-[15px] rounded-full ios-skeleton" />
                      <div className="w-52 h-[12px] rounded-full ios-skeleton" />
                    </div>
                  </div>
                  <div className="w-20 h-[22px] rounded-full ios-skeleton shrink-0" />
                </div>
              ))}
            </IosCard>
          </div>
        ) : viewMode === 'list' ? (
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
