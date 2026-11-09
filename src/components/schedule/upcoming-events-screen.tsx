'use client'

import { useState, useMemo, Fragment } from 'react'
import { TimetableEvent, SmartTimetableResult } from '@/models/timetable.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosCard, IosSearchBar, IosSegmentedControl } from '@/components/ios/ios-ui'
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

function getCategoryShortLabel(category: TimetableEvent['category'], isEn: boolean) {
  switch (category) {
    case 'exam':
      return isEn ? 'Exam' : 'Sprawdzian'
    case 'quiz':
      return isEn ? 'Quiz' : 'Kartkówka'
    case 'homework':
      return isEn ? 'Homework' : 'Zadanie'
    case 'holiday':
      return isEn ? 'Holiday' : 'Wolne'
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
  const [showArchived, setShowArchived] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

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

  // Category counts
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

  // Active filter label on button
  const hasCustomFilter = categoryFilter !== 'all' || showArchived
  const filterButtonLabel = useMemo(() => {
    if (categoryFilter === 'exam') return isEn ? 'Exams' : 'Sprawdziany'
    if (categoryFilter === 'quiz') return isEn ? 'Quizzes' : 'Kartkówki'
    if (categoryFilter === 'homework') return isEn ? 'Homework' : 'Zadania'
    if (categoryFilter === 'other') return isEn ? 'Other' : 'Inne'
    if (showArchived) return isEn ? 'All dates' : 'Wszystkie daty'
    return isEn ? 'Filter' : 'Filtr'
  }, [categoryFilter, showArchived, isEn])

  // Filtered events
  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return allEvents.filter((ev) => {
      // Archive/Past filter
      if (!showArchived && ev.isoDate < todayIso) return false

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
  }, [allEvents, showArchived, categoryFilter, searchQuery, todayIso])

  // Tomorrow ISO
  const tomorrowIso = useMemo(() => {
    const tom = new Date()
    tom.setDate(tom.getDate() + 1)
    const y = tom.getFullYear()
    const m = String(tom.getMonth() + 1).padStart(2, '0')
    const d = String(tom.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [])

  // Week ranges for clean bucketing
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
        const mKey = ev.isoDate.slice(0, 7)
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

  // Events grouped by date for Calendar view
  const eventsByDate = useMemo(() => {
    const map: Record<string, TimetableEvent[]> = {}
    for (const ev of allEvents) {
      if (!map[ev.isoDate]) map[ev.isoDate] = []
      map[ev.isoDate].push(ev)
    }
    return map
  }, [allEvents])

  // Calendar grid
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

  const selectedDayEvents = useMemo(() => {
    return eventsByDate[selectedDateIso] || []
  }, [eventsByDate, selectedDateIso])

  // Clean, uncluttered event row aligned with HIG specifications
  const renderEventRow = (ev: TimetableEvent, isLast: boolean) => {
    const dateInfo = formatPolishDayDate(ev.isoDate, lang)
    const isToday = ev.isoDate === todayIso
    const subjLabel = ev.subjectName
      ? formatSubjectName(ev.subjectName, showFullSubjectNames)
      : ev.eventType || (isEn ? 'Event' : 'Wydarzenie')

    return (
      <Fragment key={(ev.id || '') + '-' + ev.isoDate + '-' + (ev.lessonNumber || '') + '-' + ev.title}>
        <div
          onClick={() => onSelectEvent(ev)}
          className="w-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)] transition-colors cursor-pointer select-none"
        >
          {/* Crisp 2-line date squircle */}
          <div className="w-[42px] h-[46px] shrink-0 rounded-[10px] bg-[var(--ios-element)]/65 flex flex-col items-center justify-center">
            <span className="text-[15px] font-semibold text-[var(--ios-label)] leading-none tabular-nums">
              {dateInfo.dayNum}
            </span>
            <span className="text-[10px] font-medium text-[var(--ios-secondary)] uppercase mt-1 leading-none">
              {dateInfo.monthName}
            </span>
          </div>

          {/* Core Info */}
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <span className="text-[15px] font-medium text-[var(--ios-label)] tracking-[-0.2px] truncate leading-tight">
              {subjLabel}
            </span>

            <span className="text-[13px] font-normal text-[var(--ios-secondary)] truncate mt-0.5 leading-snug">
              {ev.title}
            </span>

            {(ev.lessonNumber !== undefined || ev.time) && (
              <span className="text-[11px] font-normal text-[var(--ios-tertiary)] tabular-nums mt-0.5 leading-none">
                {ev.lessonNumber !== undefined && (isEn ? `Period ${ev.lessonNumber}` : `Lekcja ${ev.lessonNumber}`)}
                {ev.time && ` • ${ev.time}`}
              </span>
            )}
          </div>

          {/* Category Badge & Arrow */}
          <div className="shrink-0 flex items-center gap-2">
            <span
              className={cn(
                'text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider',
                getBadgeStyle(ev.category)
              )}
            >
              {ev.eventType || getCategoryShortLabel(ev.category, isEn)}
            </span>

            <svg width="14" height="14" className="text-[var(--ios-tertiary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>

        {!isLast && (
          <div className="h-[0.5px] bg-[var(--ios-separator)] ml-[68px] mr-4 pointer-events-none" />
        )}
      </Fragment>
    )
  }

  // Section header
  const renderSectionHeader = (title: string, count: number) => (
    <div className="flex items-center justify-between px-4 pt-4 pb-1.5 text-[12px] font-medium uppercase text-[var(--ios-secondary)] tracking-[0.02em]">
      <span>{title}</span>
      <span className="tabular-nums normal-case">{count}</span>
    </div>
  )

  return (
    <div className="flex flex-col gap-3 pb-16 select-none max-w-2xl mx-auto w-full">
      {/* 1. View Mode Segmented Control */}
      <div className="flex items-center justify-center">
        <IosSegmentedControl<ViewMode>
          value={viewMode}
          onChange={setViewMode}
          options={[
            { id: 'list', label: isEn ? 'List' : 'Lista' },
            { id: 'calendar', label: isEn ? 'Calendar' : 'Kalendarz' }
          ]}
          className="w-full max-w-xs"
        />
      </div>

      {/* 2. Search Bar + Filter Button (IN A SINGLE LINE) */}
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
            'h-[40px] px-3.5 rounded-full flex items-center gap-1.5 shrink-0 transition-all cursor-pointer select-none text-[13px]',
            hasCustomFilter
              ? 'bg-[var(--ios-blue)] text-white shadow-sm font-semibold'
              : 'bg-[var(--ios-card-solid)] text-[var(--ios-secondary)] hover:text-[var(--ios-label)] font-medium active:bg-[var(--ios-element)]'
          )}
          aria-label="Filter"
          title={isEn ? 'Filter events' : 'Filtruj wydarzenia'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span className="truncate max-w-[110px]">
            {filterButtonLabel}
          </span>
        </button>

        {/* Filter Dropdown Popover */}
        {isFilterOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsFilterOpen(false)}
            />
            <div className="absolute right-0 top-[46px] z-40 w-64 bg-[var(--ios-card-solid)] rounded-[20px] p-2 shadow-2xl border border-[var(--ios-separator)] flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase text-[var(--ios-secondary)] tracking-wider px-3 pt-2 pb-1">
                {isEn ? 'Category' : 'Kategoria'}
              </span>

              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('all')
                  setIsFilterOpen(false)
                }}
                className={cn(
                  'w-full px-3 py-2 rounded-[12px] flex items-center justify-between text-[14px] transition-colors cursor-pointer text-left',
                  categoryFilter === 'all'
                    ? 'bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] font-medium'
                    : 'text-[var(--ios-label)] hover:bg-[var(--ios-element)]/60'
                )}
              >
                <span>{isEn ? 'All categories' : 'Wszystkie kategorie'}</span>
                <span className="text-[12px] opacity-75 tabular-nums">{categoryCounts.all}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('exam')
                  setIsFilterOpen(false)
                }}
                className={cn(
                  'w-full px-3 py-2 rounded-[12px] flex items-center justify-between text-[14px] transition-colors cursor-pointer text-left',
                  categoryFilter === 'exam'
                    ? 'bg-[var(--ios-purple-subtle)] text-[var(--ios-purple)] font-medium'
                    : 'text-[var(--ios-label)] hover:bg-[var(--ios-element)]/60'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--ios-purple)]" />
                  <span>{isEn ? 'Exams' : 'Sprawdziany'}</span>
                </div>
                <span className="text-[12px] opacity-75 tabular-nums">{categoryCounts.exam}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('quiz')
                  setIsFilterOpen(false)
                }}
                className={cn(
                  'w-full px-3 py-2 rounded-[12px] flex items-center justify-between text-[14px] transition-colors cursor-pointer text-left',
                  categoryFilter === 'quiz'
                    ? 'bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)] font-medium'
                    : 'text-[var(--ios-label)] hover:bg-[var(--ios-element)]/60'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--ios-orange)]" />
                  <span>{isEn ? 'Quizzes' : 'Kartkówki'}</span>
                </div>
                <span className="text-[12px] opacity-75 tabular-nums">{categoryCounts.quiz}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('homework')
                  setIsFilterOpen(false)
                }}
                className={cn(
                  'w-full px-3 py-2 rounded-[12px] flex items-center justify-between text-[14px] transition-colors cursor-pointer text-left',
                  categoryFilter === 'homework'
                    ? 'bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] font-medium'
                    : 'text-[var(--ios-label)] hover:bg-[var(--ios-element)]/60'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--ios-blue)]" />
                  <span>{isEn ? 'Homework' : 'Zadania'}</span>
                </div>
                <span className="text-[12px] opacity-75 tabular-nums">{categoryCounts.homework}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('other')
                  setIsFilterOpen(false)
                }}
                className={cn(
                  'w-full px-3 py-2 rounded-[12px] flex items-center justify-between text-[14px] transition-colors cursor-pointer text-left',
                  categoryFilter === 'other'
                    ? 'bg-[var(--ios-element)] text-[var(--ios-label)] font-medium'
                    : 'text-[var(--ios-label)] hover:bg-[var(--ios-element)]/60'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--ios-secondary)]" />
                  <span>{isEn ? 'Other / Notices' : 'Inne / Wydarzenia'}</span>
                </div>
                <span className="text-[12px] opacity-75 tabular-nums">{categoryCounts.other}</span>
              </button>

              <div className="h-[0.5px] bg-[var(--ios-separator)] my-1" />

              {/* Archive Toggle */}
              <button
                type="button"
                onClick={() => {
                  setShowArchived((s) => !s)
                  setIsFilterOpen(false)
                }}
                className="w-full px-3 py-2 rounded-[12px] flex items-center justify-between text-[13px] text-[var(--ios-secondary)] hover:bg-[var(--ios-element)]/60 cursor-pointer text-left"
              >
                <span>{showArchived ? (isEn ? 'Hide past events' : 'Ukryj przeszłe') : (isEn ? 'Include past events' : 'Pokaż także przeszłe')}</span>
                <span className="text-[15px]">{showArchived ? '✓' : ''}</span>
              </button>

              {/* Reset Action */}
              {hasCustomFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter('all')
                    setShowArchived(false)
                    setIsFilterOpen(false)
                  }}
                  className="w-full mt-0.5 px-3 py-1.5 rounded-[12px] text-center text-[13px] font-medium text-[var(--ios-red)] hover:bg-[var(--ios-red-subtle)] cursor-pointer"
                >
                  {isEn ? 'Reset filters' : 'Wyczyść filtry'}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* 3. Main Content Views */}
      {isLoading && allEvents.length === 0 ? (
        <div className="flex flex-col gap-3 pt-2">
          <div className="w-28 h-[13px] rounded-full ios-skeleton px-4" />
          <IosCard className="overflow-hidden flex flex-col divide-y divide-[var(--ios-separator)]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-[42px] h-[46px] rounded-[10px] ios-skeleton shrink-0" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="w-28 h-[14px] rounded-full ios-skeleton" />
                    <div className="w-40 h-[12px] rounded-full ios-skeleton" />
                  </div>
                </div>
                <div className="w-16 h-[20px] rounded-full ios-skeleton shrink-0" />
              </div>
            ))}
          </IosCard>
        </div>
      ) : viewMode === 'list' ? (
        /* ======================== VIEW 1: CLEAN LAYERED LIST ======================== */
        filteredEvents.length === 0 ? (
          <IosCard className="p-8 text-center flex flex-col items-center justify-center gap-2 mt-2">
            <span className="text-[15px] font-medium text-[var(--ios-label)]">
              {isEn ? 'No tests or deadlines found' : 'Brak sprawdzianów i terminów'}
            </span>
            <p className="text-[13px] font-normal text-[var(--ios-secondary)] max-w-xs">
              {searchQuery || hasCustomFilter
                ? (isEn ? 'Try changing your search query or filter.' : 'Brak wpisów pasujących do wyszukiwanej frazy lub filtra.')
                : (isEn ? 'All clear! No upcoming events recorded.' : 'Wszystko zaliczone! Brak zaplanowanych terminów.')}
            </p>
          </IosCard>
        ) : (
          <div className="flex flex-col gap-2">
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
            {showArchived && layeredGroups.past.length > 0 && (
              <div className="flex flex-col">
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
        /* ======================== VIEW 2: CLEAN CALENDAR ======================== */
        <div className="flex flex-col gap-3">
          {/* Calendar Card */}
          <IosCard className="p-4 flex flex-col gap-3">
            {/* Month Header */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[17px] font-semibold text-[var(--ios-label)] tracking-tight">
                {calMonthTitle}
              </span>

              <div className="flex items-center gap-1">
                {!isCurrentCalMonth && (
                  <button
                    type="button"
                    onClick={handleJumpToToday}
                    className="px-2.5 py-1 rounded-full text-[12px] font-medium bg-[var(--ios-element)] text-[var(--ios-blue)] active:opacity-70 transition-opacity cursor-pointer mr-1"
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

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 text-center text-[12px] font-medium uppercase text-[var(--ios-secondary)] tracking-wider pt-0.5">
              <span>{isEn ? 'Mo' : 'Pn'}</span>
              <span>{isEn ? 'Tu' : 'Wt'}</span>
              <span>{isEn ? 'We' : 'Śr'}</span>
              <span>{isEn ? 'Th' : 'Cz'}</span>
              <span>{isEn ? 'Fr' : 'Pt'}</span>
              <span>{isEn ? 'Sa' : 'So'}</span>
              <span>{isEn ? 'Su' : 'Nd'}</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 pt-0.5">
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
                      'h-10 rounded-[12px] flex flex-col items-center justify-center relative transition-all cursor-pointer select-none',
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
                      <div className="flex items-center gap-0.5 mt-1 h-1">
                        {dayEvs.slice(0, 3).map((ev, dIdx) => (
                          <div
                            key={dIdx}
                            className={cn(
                              'w-1 h-1 rounded-full shrink-0',
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
              <IosCard className="p-6 text-center text-[13px] font-normal text-[var(--ios-secondary)]">
                {isEn ? 'No tests or deadlines for this day' : 'Brak sprawdzianów i terminów w wybranym dniu'}
              </IosCard>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
