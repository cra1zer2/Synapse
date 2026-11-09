'use client'

import { useState, useMemo, Fragment } from 'react'
import { TimetableEvent, SmartTimetableResult } from '@/models/timetable.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosCard, IosSearchBar, IosSegmentedControl } from '@/components/ios/ios-ui'
import { IosSpinner } from '@/components/ios/ios-spinner'
import { formatSubjectName } from '@/utils/text.util'
import { formatHumanPolishDate, formatPolishDayDate, getTodayIsoString } from '@/utils/date.util'
import { cn } from '@/utils/cn.util'

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
type ScopeFilter = 'upcoming' | 'all'

interface MonthGroup {
  key: string
  label: string
  events: TimetableEvent[]
}

function getBadgeStyle(category: TimetableEvent['category']) {
  switch (category) {
    case 'exam':
      return 'bg-[var(--ios-purple-subtle)] text-[var(--ios-purple)]'
    case 'quiz':
      return 'bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)]'
    case 'homework':
      return 'bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)]'
    case 'holiday':
      return 'bg-[var(--ios-teal)]/15 text-[var(--ios-teal)]'
    default:
      return 'bg-[var(--ios-element)] text-[var(--ios-secondary)]'
  }
}

function getCategoryDotColor(category: TimetableEvent['category']) {
  switch (category) {
    case 'exam':
      return 'bg-[var(--ios-purple)]'
    case 'quiz':
      return 'bg-[var(--ios-orange)]'
    case 'homework':
      return 'bg-[var(--ios-blue)]'
    case 'holiday':
      return 'bg-[var(--ios-teal)]'
    default:
      return 'bg-[var(--ios-tertiary)]'
  }
}

function getCategoryLabel(category: TimetableEvent['category'], isEn: boolean) {
  switch (category) {
    case 'exam':
      return isEn ? 'Exam' : 'Sprawdzian'
    case 'quiz':
      return isEn ? 'Quiz' : 'Kartkówka'
    case 'homework':
      return isEn ? 'Homework' : 'Zadanie domowe'
    case 'holiday':
      return isEn ? 'Day off' : 'Dzień wolny'
    default:
      return isEn ? 'Notice' : 'Wydarzenie'
  }
}

export function UpcomingEventsScreen({
  timetableData,
  isLoading = false,
  showHomeworks = false,
  showFullSubjectNames = false,
  lang = 'pl',
  t,
  onSelectEvent,
  onRefresh
}: UpcomingEventsScreenProps) {
  const isEn = lang === 'en'
  const todayIso = useMemo(() => getTodayIsoString(), [])
  const todayDate = useMemo(() => new Date(), [])

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('upcoming')
  const [searchQuery, setSearchQuery] = useState('')

  // Calendar view navigation state
  const [calYear, setCalYear] = useState<number>(() => todayDate.getFullYear())
  const [calMonth, setCalMonth] = useState<number>(() => todayDate.getMonth())
  const [selectedDateIso, setSelectedDateIso] = useState<string>(todayIso)

  // Deduplicate and aggregate all events
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
      const key = `${ev.isoDate}_${ev.lessonNumber || ''}_${ev.title}_${ev.category}_${ev.subjectName || ''}`
      if (seen.has(key)) continue
      seen.add(key)
      deduped.push(ev)
    }

    return deduped.sort((a, b) => {
      const cmp = a.isoDate.localeCompare(b.isoDate)
      if (cmp !== 0) return cmp
      return (a.lessonNumber || 99) - (b.lessonNumber || 99)
    })
  }, [timetableData])

  // Category counts (for badges on filter pills)
  const categoryCounts = useMemo(() => {
    const counts = { all: 0, exam: 0, quiz: 0, homework: 0, other: 0 }
    for (const ev of allEvents) {
      if (scopeFilter === 'upcoming' && ev.isoDate < todayIso) continue
      counts.all++
      if (ev.category === 'exam') counts.exam++
      else if (ev.category === 'quiz') counts.quiz++
      else if (ev.category === 'homework') counts.homework++
      else counts.other++
    }
    return counts
  }, [allEvents, scopeFilter, todayIso])

  // Filtered events
  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return allEvents.filter((ev) => {
      // Scope filter
      if (scopeFilter === 'upcoming' && ev.isoDate < todayIso) return false

      // Category filter
      if (categoryFilter === 'exam' && ev.category !== 'exam') return false
      if (categoryFilter === 'quiz' && ev.category !== 'quiz') return false
      if (categoryFilter === 'homework' && ev.category !== 'homework') return false
      if (categoryFilter === 'other' && (ev.category === 'exam' || ev.category === 'quiz' || ev.category === 'homework')) return false

      // Search query
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
  }, [allEvents, scopeFilter, categoryFilter, searchQuery, todayIso])

  // Tomorrow ISO
  const tomorrowIso = useMemo(() => {
    const tom = new Date()
    tom.setDate(tom.getDate() + 1)
    const y = tom.getFullYear()
    const m = String(tom.getMonth() + 1).padStart(2, '0')
    const d = String(tom.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [])

  // Week ranges for bucketing
  const weekBuckets = useMemo(() => {
    const now = new Date()
    const currentDay = now.getDay()
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() + diffToMonday)
    thisMonday.setHours(0, 0, 0, 0)

    const thisSunday = new Date(thisMonday)
    thisSunday.setDate(thisMonday.getDate() + 6)
    thisSunday.setHours(23, 59, 59, 999)

    const nextMonday = new Date(thisMonday)
    nextMonday.setDate(thisMonday.getDate() + 7)

    const nextSunday = new Date(thisMonday)
    nextSunday.setDate(thisMonday.getDate() + 13)
    nextSunday.setHours(23, 59, 59, 999)

    return {
      thisMonday,
      thisSunday,
      nextMonday,
      nextSunday
    }
  }, [])

  // Layered buckets for list view
  const layeredGroups = useMemo(() => {
    const todayList: TimetableEvent[] = []
    const tomorrowList: TimetableEvent[] = []
    const thisWeekList: TimetableEvent[] = []
    const nextWeekList: TimetableEvent[] = []
    const monthMap: Record<string, MonthGroup> = {}
    const pastList: TimetableEvent[] = []

    const monthNamesPl = [
      'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
      'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ]
    const monthNamesEn = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]

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

      const evDate = new Date(ev.isoDate + 'T12:00:00')

      if (evDate >= weekBuckets.thisMonday && evDate <= weekBuckets.thisSunday) {
        thisWeekList.push(ev)
      } else if (evDate >= weekBuckets.nextMonday && evDate <= weekBuckets.nextSunday) {
        nextWeekList.push(ev)
      } else {
        const mKey = ev.isoDate.slice(0, 7) // e.g. "2026-11"
        const y = evDate.getFullYear()
        const mIdx = evDate.getMonth()
        const mName = isEn ? monthNamesEn[mIdx] : monthNamesPl[mIdx]
        const label = `${mName} ${y}`

        if (!monthMap[mKey]) {
          monthMap[mKey] = {
            key: mKey,
            label,
            events: []
          }
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
  }, [filteredEvents, todayIso, tomorrowIso, weekBuckets, isEn])

  // Events grouped by date for Calendar view lookup
  const eventsByDate = useMemo(() => {
    const map: Record<string, TimetableEvent[]> = {}
    for (const ev of allEvents) {
      if (!map[ev.isoDate]) map[ev.isoDate] = []
      map[ev.isoDate].push(ev)
    }
    return map
  }, [allEvents])

  // Calendar grid calculation
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1)
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7 // Monday = 0
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()

    const cells: Array<{ dayNum: number | null; iso: string | null }> = []

    for (let i = 0; i < startingDayOfWeek; i++) {
      cells.push({ dayNum: null, iso: null })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(calMonth + 1).padStart(2, '0')
      const dStr = String(d).padStart(2, '0')
      const iso = `${calYear}-${mStr}-${dStr}`
      cells.push({ dayNum: d, iso })
    }

    return cells
  }, [calYear, calMonth])

  // Calendar month label
  const calMonthTitle = useMemo(() => {
    const monthNamesPl = [
      'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
      'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ]
    const monthNamesEn = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    const mName = isEn ? monthNamesEn[calMonth] : monthNamesPl[calMonth]
    return `${mName} ${calYear}`
  }, [calMonth, calYear, isEn])

  const isCurrentCalMonth = calYear === todayDate.getFullYear() && calMonth === todayDate.getMonth()

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
    setCalYear(todayDate.getFullYear())
    setCalMonth(todayDate.getMonth())
    setSelectedDateIso(todayIso)
  }

  // Events for selected date in Calendar view
  const selectedDayEvents = useMemo(() => {
    return eventsByDate[selectedDateIso] || []
  }, [eventsByDate, selectedDateIso])

  // Events for entire selected calendar month
  const currentMonthEvents = useMemo(() => {
    const prefix = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`
    return allEvents.filter((ev) => ev.isoDate.startsWith(prefix))
  }, [allEvents, calYear, calMonth])

  // Reusable Event Row
  const renderEventRow = (ev: TimetableEvent, isLast: boolean) => {
    const dateInfo = formatPolishDayDate(ev.isoDate, lang)
    const isToday = ev.isoDate === todayIso
    const isTomorrow = ev.isoDate === tomorrowIso
    const subjLabel = ev.subjectName
      ? formatSubjectName(ev.subjectName, showFullSubjectNames)
      : ev.eventType || (isEn ? 'Event' : 'Wydarzenie')

    return (
      <Fragment key={(ev.id || '') + '-' + ev.isoDate + '-' + (ev.lessonNumber || '') + '-' + ev.title}>
        <div
          onClick={() => onSelectEvent(ev)}
          className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)] transition-colors cursor-pointer select-none"
        >
          {/* Date squircle */}
          <div className="w-[46px] shrink-0 flex flex-col items-center justify-center py-1.5 rounded-[10px] bg-[var(--ios-element)]/65">
            <span className="text-[14px] font-semibold text-[var(--ios-label)] leading-none tabular-nums">
              {dateInfo.dayNum}
            </span>
            <span className="text-[10px] font-medium text-[var(--ios-secondary)] uppercase mt-0.5 leading-none">
              {dateInfo.monthName}
            </span>
            <span className="text-[9px] font-normal text-[var(--ios-tertiary)] mt-0.5 leading-none">
              {isToday ? (isEn ? 'Today' : 'Dziś') : isTomorrow ? (isEn ? 'Tmrw' : 'Jutro') : dateInfo.weekday}
            </span>
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[15px] font-semibold text-[var(--ios-label)] tracking-[-0.2px] truncate leading-snug">
                {subjLabel}
              </span>
            </div>

            <span className="text-[13px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] line-clamp-2 leading-relaxed mt-0.5">
              {ev.title}
            </span>

            {(ev.lessonNumber || ev.time || ev.teacher) && (
              <div className="flex items-center gap-2 mt-1 text-[11px] font-normal text-[var(--ios-tertiary)] tabular-nums truncate">
                {ev.lessonNumber !== undefined && (
                  <span>{isEn ? `Period ${ev.lessonNumber}` : `Lekcja ${ev.lessonNumber}`}</span>
                )}
                {ev.time && (
                  <span>• {ev.time}</span>
                )}
                {ev.teacher && (
                  <span className="truncate">• {ev.teacher}</span>
                )}
              </div>
            )}
          </div>

          {/* Category Badge & Chevron */}
          <div className="shrink-0 flex items-center gap-2">
            <span
              className={cn(
                'text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider',
                getBadgeStyle(ev.category)
              )}
            >
              {ev.eventType || getCategoryLabel(ev.category, isEn)}
            </span>

            <svg width="15" height="15" className="text-[var(--ios-tertiary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>

        {!isLast && (
          <div className="h-[0.5px] bg-[var(--ios-separator)] ml-[74px] mr-4 pointer-events-none" />
        )}
      </Fragment>
    )
  }

  // Section header helper
  const renderSectionHeader = (title: string, count: number) => (
    <div className="flex items-center justify-between px-4 pt-3 pb-1.5 text-[12px] font-medium uppercase text-[var(--ios-secondary)] tracking-[0.02em]">
      <span>{title}</span>
      <span className="tabular-nums normal-case">{count}</span>
    </div>
  )

  return (
    <div className="flex flex-col gap-4 pb-16 select-none max-w-3xl mx-auto w-full">
      {/* Top Controls: Mode Switcher & Search Bar */}
      <div className="flex flex-col gap-3">
        {/* Mode Switcher: Lista vs Kalendarz */}
        <div className="flex items-center justify-center">
          <IosSegmentedControl<ViewMode>
            value={viewMode}
            onChange={setViewMode}
            options={[
              { id: 'list', label: isEn ? 'Layered List' : 'Lista terminów' },
              { id: 'calendar', label: isEn ? 'Calendar' : 'Kalendarz' }
            ]}
            className="w-full max-w-sm"
          />
        </div>

        {/* Search Bar */}
        <IosSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={isEn ? 'Search tests, quizzes, subjects...' : 'Szukaj sprawdzianów, kartkówek, przedmiotów...'}
        />

        {/* Category Filters Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0',
              categoryFilter === 'all'
                ? 'bg-[var(--ios-label)] text-[var(--ios-bg)] shadow-sm'
                : 'bg-[var(--ios-card-solid)] text-[var(--ios-secondary)] hover:text-[var(--ios-label)]'
            )}
          >
            <span>{isEn ? 'All' : 'Wszystkie'}</span>
            <span className="text-[11px] opacity-75 tabular-nums">({categoryCounts.all})</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('exam')}
            className={cn(
              'px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0',
              categoryFilter === 'exam'
                ? 'bg-[var(--ios-purple)] text-white shadow-sm'
                : 'bg-[var(--ios-card-solid)] text-[var(--ios-purple)]'
            )}
          >
            <span>{isEn ? 'Exams' : 'Sprawdziany'}</span>
            <span className="text-[11px] opacity-75 tabular-nums">({categoryCounts.exam})</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('quiz')}
            className={cn(
              'px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0',
              categoryFilter === 'quiz'
                ? 'bg-[var(--ios-orange)] text-white shadow-sm'
                : 'bg-[var(--ios-card-solid)] text-[var(--ios-orange)]'
            )}
          >
            <span>{isEn ? 'Quizzes' : 'Kartkówki'}</span>
            <span className="text-[11px] opacity-75 tabular-nums">({categoryCounts.quiz})</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('homework')}
            className={cn(
              'px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0',
              categoryFilter === 'homework'
                ? 'bg-[var(--ios-blue)] text-white shadow-sm'
                : 'bg-[var(--ios-card-solid)] text-[var(--ios-blue)]'
            )}
          >
            <span>{isEn ? 'Homework' : 'Zadania'}</span>
            <span className="text-[11px] opacity-75 tabular-nums">({categoryCounts.homework})</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('other')}
            className={cn(
              'px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0',
              categoryFilter === 'other'
                ? 'bg-[var(--ios-label)] text-[var(--ios-bg)] shadow-sm'
                : 'bg-[var(--ios-card-solid)] text-[var(--ios-secondary)]'
            )}
          >
            <span>{isEn ? 'Other' : 'Inne'}</span>
            <span className="text-[11px] opacity-75 tabular-nums">({categoryCounts.other})</span>
          </button>

          <div className="h-5 w-[1px] bg-[var(--ios-separator)] mx-1 shrink-0" />

          {/* Scope Toggle: Nadchodzące vs Wszystkie */}
          <button
            type="button"
            onClick={() => setScopeFilter((s) => (s === 'upcoming' ? 'all' : 'upcoming'))}
            className={cn(
              'px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 border border-transparent',
              scopeFilter === 'all'
                ? 'bg-[var(--ios-element)] text-[var(--ios-label)] font-semibold'
                : 'text-[var(--ios-secondary)] hover:text-[var(--ios-label)]'
            )}
          >
            {scopeFilter === 'upcoming'
              ? (isEn ? 'Upcoming only' : 'Tylko nadchodzące')
              : (isEn ? 'Including archive' : 'Z archiwalnymi')}
          </button>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && allEvents.length === 0 ? (
        <div className="flex flex-col gap-3">
          <div className="w-32 h-[13px] rounded-full ios-skeleton px-4" />
          <IosCard className="overflow-hidden flex flex-col divide-y divide-[var(--ios-separator)]">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-[46px] h-[48px] rounded-[10px] ios-skeleton shrink-0" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="w-32 h-[14px] rounded-full ios-skeleton" />
                    <div className="w-48 h-[12px] rounded-full ios-skeleton" />
                  </div>
                </div>
                <div className="w-20 h-[22px] rounded-full ios-skeleton shrink-0" />
              </div>
            ))}
          </IosCard>
        </div>
      ) : viewMode === 'list' ? (
        /* ======================== VIEW 1: LAYERED LIST ======================== */
        filteredEvents.length === 0 ? (
          <IosCard className="p-8 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--ios-element)]/60 text-[var(--ios-secondary)] flex items-center justify-center text-[22px]">
              📅
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-[16px] font-semibold text-[var(--ios-label)] tracking-tight">
                {isEn ? 'No tests or deadlines found' : 'Brak sprawdzianów i terminów'}
              </h3>
              <p className="text-[13px] font-normal text-[var(--ios-secondary)] max-w-sm">
                {searchQuery
                  ? (isEn ? 'Try changing your search query or category filter.' : 'Brak wpisów pasujących do wyszukiwanej frazy lub wybranego filtra.')
                  : (isEn ? 'No upcoming events recorded on Librus.' : 'Wszystko zaliczone! Brak zaplanowanych terminów w wybranym filtrze.')}
              </p>
            </div>
          </IosCard>
        ) : (
          <div className="flex flex-col gap-3">
            {/* 1. Today */}
            {layeredGroups.today.length > 0 && (
              <div className="flex flex-col">
                {renderSectionHeader(isEn ? 'Today' : 'Dzisiaj', layeredGroups.today.length)}
                <IosCard className="overflow-hidden flex flex-col">
                  {layeredGroups.today.map((ev, idx) =>
                    renderEventRow(ev, idx === layeredGroups.today.length - 1)
                  )}
                </IosCard>
              </div>
            )}

            {/* 2. Tomorrow */}
            {layeredGroups.tomorrow.length > 0 && (
              <div className="flex flex-col">
                {renderSectionHeader(isEn ? 'Tomorrow' : 'Jutro', layeredGroups.tomorrow.length)}
                <IosCard className="overflow-hidden flex flex-col">
                  {layeredGroups.tomorrow.map((ev, idx) =>
                    renderEventRow(ev, idx === layeredGroups.tomorrow.length - 1)
                  )}
                </IosCard>
              </div>
            )}

            {/* 3. This Week */}
            {layeredGroups.thisWeek.length > 0 && (
              <div className="flex flex-col">
                {renderSectionHeader(isEn ? 'This Week' : 'W tym tygodniu', layeredGroups.thisWeek.length)}
                <IosCard className="overflow-hidden flex flex-col">
                  {layeredGroups.thisWeek.map((ev, idx) =>
                    renderEventRow(ev, idx === layeredGroups.thisWeek.length - 1)
                  )}
                </IosCard>
              </div>
            )}

            {/* 4. Next Week */}
            {layeredGroups.nextWeek.length > 0 && (
              <div className="flex flex-col">
                {renderSectionHeader(isEn ? 'Next Week' : 'W przyszłym tygodniu', layeredGroups.nextWeek.length)}
                <IosCard className="overflow-hidden flex flex-col">
                  {layeredGroups.nextWeek.map((ev, idx) =>
                    renderEventRow(ev, idx === layeredGroups.nextWeek.length - 1)
                  )}
                </IosCard>
              </div>
            )}

            {/* 5. Later Months */}
            {layeredGroups.laterMonths.map((mGroup) => (
              <div key={mGroup.key} className="flex flex-col">
                {renderSectionHeader(mGroup.label, mGroup.events.length)}
                <IosCard className="overflow-hidden flex flex-col">
                  {mGroup.events.map((ev, idx) =>
                    renderEventRow(ev, idx === mGroup.events.length - 1)
                  )}
                </IosCard>
              </div>
            ))}

            {/* 6. Past Events (Archive) */}
            {layeredGroups.past.length > 0 && (
              <div className="flex flex-col mt-2">
                {renderSectionHeader(isEn ? 'Past Events (Archive)' : 'Archiwum / Przeszłe terminy', layeredGroups.past.length)}
                <IosCard className="overflow-hidden flex flex-col opacity-80">
                  {layeredGroups.past.map((ev, idx) =>
                    renderEventRow(ev, idx === layeredGroups.past.length - 1)
                  )}
                </IosCard>
              </div>
            )}
          </div>
        )
      ) : (
        /* ======================== VIEW 2: CALENDAR ======================== */
        <div className="flex flex-col gap-4">
          {/* Calendar Card */}
          <IosCard className="p-4 flex flex-col gap-3">
            {/* Calendar Month Header */}
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[17px] font-semibold text-[var(--ios-label)] tracking-tight">
                {calMonthTitle}
              </h3>

              <div className="flex items-center gap-1.5">
                {!isCurrentCalMonth && (
                  <button
                    type="button"
                    onClick={handleJumpToToday}
                    className="px-2.5 py-1 rounded-full text-[12px] font-medium bg-[var(--ios-element)] text-[var(--ios-blue)] active:opacity-70 transition-opacity cursor-pointer"
                  >
                    {isEn ? 'Today' : 'Dzisiaj'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-8 h-8 rounded-full bg-[var(--ios-element)] hover:bg-[var(--ios-element)]/80 text-[var(--ios-label)] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                  aria-label="Previous month"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-8 h-8 rounded-full bg-[var(--ios-element)] hover:bg-[var(--ios-element)]/80 text-[var(--ios-label)] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                  aria-label="Next month"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Weekday Names Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[12px] font-medium uppercase text-[var(--ios-secondary)] tracking-wider pt-1">
              <span>{isEn ? 'Mo' : 'Pn'}</span>
              <span>{isEn ? 'Tu' : 'Wt'}</span>
              <span>{isEn ? 'We' : 'Śr'}</span>
              <span>{isEn ? 'Th' : 'Cz'}</span>
              <span>{isEn ? 'Fr' : 'Pt'}</span>
              <span>{isEn ? 'Sa' : 'So'}</span>
              <span>{isEn ? 'Su' : 'Nd'}</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 pt-1">
              {calendarGrid.map((cell, idx) => {
                if (!cell.dayNum || !cell.iso) {
                  return <div key={'empty-' + idx} className="h-10" />
                }

                const isSelected = cell.iso === selectedDateIso
                const isToday = cell.iso === todayIso
                const dayEvs = eventsByDate[cell.iso] || []
                const hasEvents = dayEvs.length > 0

                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => setSelectedDateIso(cell.iso!)}
                    className={cn(
                      'h-11 rounded-[12px] flex flex-col items-center justify-center relative transition-all cursor-pointer select-none',
                      isSelected
                        ? 'bg-[var(--ios-blue)] text-white shadow-sm font-semibold'
                        : isToday
                        ? 'bg-[var(--ios-element)] text-[var(--ios-blue)] font-semibold'
                        : 'text-[var(--ios-label)] hover:bg-[var(--ios-element)]/50 active:scale-95 font-medium'
                    )}
                  >
                    <span className="text-[14px] tabular-nums leading-none">
                      {cell.dayNum}
                    </span>

                    {/* Indicator dots for events */}
                    {hasEvents && (
                      <div className="flex items-center gap-0.5 mt-1 h-1.5">
                        {dayEvs.slice(0, 3).map((ev, dIdx) => (
                          <div
                            key={dIdx}
                            className={cn(
                              'w-1.5 h-1.5 rounded-full shrink-0',
                              isSelected ? 'bg-white' : getCategoryDotColor(ev.category)
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </IosCard>

          {/* Events for Selected Day */}
          <div className="flex flex-col">
            {renderSectionHeader(
              `${isEn ? 'Events on' : 'Wydarzenia w dniu'} ${formatHumanPolishDate(selectedDateIso, false, lang)}`,
              selectedDayEvents.length
            )}

            {selectedDayEvents.length > 0 ? (
              <IosCard className="overflow-hidden flex flex-col">
                {selectedDayEvents.map((ev, idx) =>
                  renderEventRow(ev, idx === selectedDayEvents.length - 1)
                )}
              </IosCard>
            ) : (
              <IosCard className="p-6 text-center text-[14px] font-normal text-[var(--ios-secondary)]">
                {isEn ? 'No tests or deadlines for this day' : 'Brak sprawdzianów i terminów w wybranym dniu'}
              </IosCard>
            )}
          </div>

          {/* All events in this calendar month */}
          {currentMonthEvents.length > 0 && (
            <div className="flex flex-col mt-2">
              {renderSectionHeader(
                `${isEn ? 'All events in' : 'Wszystkie terminy w'} ${calMonthTitle}`,
                currentMonthEvents.length
              )}
              <IosCard className="overflow-hidden flex flex-col">
                {currentMonthEvents.map((ev, idx) =>
                  renderEventRow(ev, idx === currentMonthEvents.length - 1)
                )}
              </IosCard>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
