'use client'

import { useState, useMemo, useEffect } from 'react'
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
      return 'bg-[var(--ios-green-subtle)] text-[var(--ios-green)]'
    default:
      return 'bg-[var(--bg-card-secondary)] text-[var(--ios-secondary)]'
  }
}

function getCategoryColor(category: TimetableEvent['category']) {
  switch (category) {
    case 'exam':
      return 'bg-[var(--ios-purple)]'
    case 'quiz':
      return 'bg-[var(--ios-orange)]'
    case 'homework':
      return 'bg-[var(--ios-blue)]'
    case 'holiday':
      return 'bg-[var(--ios-green)]'
    default:
      return 'bg-[var(--ios-secondary)]'
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
  showFullSubjectNames = false,
  lang = 'pl',
  onSelectEvent
}: UpcomingEventsScreenProps) {
  const isEn = lang === 'en'
  const todayIso = useMemo(() => getTodayIsoString(), [])
  const todayDate = useMemo(() => new Date(), [])

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [showArchived, setShowArchived] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isFilterMounted, setIsFilterMounted] = useState(false)

  useEffect(() => {
    if (isFilterOpen) {
      setIsFilterMounted(true)
    } else if (isFilterMounted) {
      const timer = setTimeout(() => setIsFilterMounted(false), 200)
      return () => clearTimeout(timer)
    }
  }, [isFilterOpen, isFilterMounted])

  const [calYear, setCalYear] = useState<number>(() => todayDate.getFullYear())
  const [calMonth, setCalMonth] = useState<number>(() => todayDate.getMonth())
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
      const key = ev.isoDate + '_' + (ev.lessonNumber || '') + '_' + ev.title + '_' + ev.category + '_' + (ev.subjectName || '')
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
      if (categoryFilter === 'other' && (ev.category === 'exam' || ev.category === 'quiz' || ev.category === 'homework')) return false

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
    const tom = new Date()
    tom.setDate(tom.getDate() + 1)
    const y = tom.getFullYear()
    const m = String(tom.getMonth() + 1).padStart(2, '0')
    const d = String(tom.getDate()).padStart(2, '0')
    return y + '-' + m + '-' + d
  }, [])

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

    return { thisMonday, thisSunday, nextMonday, nextSunday }
  }, [])

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
        const label = mName + ' ' + y

        if (!monthMap[mKey]) {
          monthMap[mKey] = { key: mKey, label, events: [] }
        }
        monthMap[mKey].events.push(ev)
      }
    }

    const laterMonths = Object.keys(monthMap).sort().map((k) => monthMap[k])
    return {
      today: todayList,
      tomorrow: tomorrowList,
      thisWeek: thisWeekList,
      nextWeek: nextWeekList,
      laterMonths,
      past: pastList
    }
  }, [filteredEvents, todayIso, tomorrowIso, weekBuckets, isEn])

  const eventsByDate = useMemo(() => {
    const map: Record<string, TimetableEvent[]> = {}
    for (const ev of allEvents) {
      if (!map[ev.isoDate]) map[ev.isoDate] = []
      map[ev.isoDate].push(ev)
    }
    return map
  }, [allEvents])

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1)
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()

    const cells: Array<{ dayNum: number | null; iso: string | null }> = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      cells.push({ dayNum: null, iso: null })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(calMonth + 1).padStart(2, '0')
      const dStr = String(d).padStart(2, '0')
      cells.push({ dayNum: d, iso: calYear + '-' + mStr + '-' + dStr })
    }
    return cells
  }, [calYear, calMonth])

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
    return mName + ' ' + calYear
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

  const renderEventRow = (ev: TimetableEvent) => {
    const dateInfo = formatPolishDayDate(ev.isoDate, lang)
    const subjLabel = ev.subjectName
      ? formatSubjectName(ev.subjectName, showFullSubjectNames)
      : ev.eventType || (isEn ? 'Event' : 'Wydarzenie')

    const metaParts: string[] = []
    if (ev.lessonNumber !== undefined) {
      metaParts.push(isEn ? 'Period ' + ev.lessonNumber : 'Lekcja ' + ev.lessonNumber)
    }
    if (ev.time) {
      metaParts.push(ev.time)
    }
    if (ev.teacher) {
      metaParts.push(ev.teacher)
    }

    return (
      <div
        key={(ev.id || '') + '-' + ev.isoDate + '-' + (ev.lessonNumber || '') + '-' + ev.title}
        onClick={() => onSelectEvent(ev)}
        className="w-full px-4 py-3.5 flex items-start gap-3.5 hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)] transition-colors duration-150 cursor-pointer select-none"
      >
        <div className="w-[44px] h-[46px] shrink-0 rounded-[12px] bg-[var(--bg-card-secondary)] flex flex-col items-center justify-center mt-0.5">
          <span className="text-[16px] font-semibold text-[var(--ios-label)] leading-none tabular-nums">
            {dateInfo.dayNum}
          </span>
          <span className="text-[10px] font-medium text-[var(--ios-secondary)] lowercase mt-1 leading-none">
            {dateInfo.monthName}
          </span>
        </div>

        <div className="min-w-0 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[15px] font-semibold text-[var(--ios-label)] tracking-[-0.2px] leading-snug">
              {subjLabel}
            </span>

            <span
              className={cn(
                'text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 leading-tight mt-0.5',
                getBadgeStyle(ev.category)
              )}
            >
              {ev.eventType || getCategoryShortLabel(ev.category, isEn)}
            </span>
          </div>

          {ev.title && ev.title !== subjLabel && (
            <p className="text-[13px] font-normal text-[var(--ios-secondary)] line-clamp-2 mt-0.5 leading-snug">
              {ev.title}
            </p>
          )}

          {metaParts.length > 0 && (
            <span className="text-[12px] font-normal text-[var(--ios-tertiary)] tabular-nums truncate mt-1 leading-tight">
              {metaParts.join(' • ')}
            </span>
          )}
        </div>
      </div>
    )
  }

  const renderSectionHeader = (title: string) => (
    <div className="px-4 pt-3 pb-1.5">
      <span className="text-[12px] font-medium uppercase text-[var(--ios-secondary)] tracking-[0.02em]">
        {title}
      </span>
    </div>
  )

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
            'h-[42px] px-4 rounded-full flex items-center gap-1.5 shrink-0 transition-all duration-150 cursor-pointer select-none text-[13px] active:scale-95',
            hasCustomFilter
              ? 'bg-[var(--ios-blue)] text-white font-semibold'
              : 'bg-[var(--ios-element)] text-[var(--ios-secondary)] hover:text-[var(--ios-label)] font-medium'
          )}
          aria-label="Filter"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span className="truncate max-w-[110px]">
            {filterButtonLabel}
          </span>
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
                'absolute right-0 top-[50px] z-40 w-64 bg-[var(--ios-card-solid)] border border-[var(--ios-border)] rounded-[26px] p-2 flex flex-col gap-0.5 origin-top-right transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
                isFilterOpen
                  ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 scale-90 -translate-y-2 pointer-events-none'
              )}
            >
              <span className="text-[11px] font-semibold uppercase text-[var(--ios-secondary)] tracking-wider px-3 pt-2 pb-1">
                {isEn ? 'Category' : 'Kategoria'}
              </span>

              {[
                { id: 'all', label: isEn ? 'All categories' : 'Wszystkie kategorie', count: categoryCounts.all },
                { id: 'exam', label: isEn ? 'Exams' : 'Sprawdziany', count: categoryCounts.exam },
                { id: 'quiz', label: isEn ? 'Quizzes' : 'Kartkówki', count: categoryCounts.quiz },
                { id: 'homework', label: isEn ? 'Homework' : 'Zadania', count: categoryCounts.homework },
                { id: 'other', label: isEn ? 'Other / Notices' : 'Inne / Wydarzenia', count: categoryCounts.other }
              ].map((item) => {
                const isSelected = categoryFilter === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(item.id as CategoryFilter)
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
                      {isSelected && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--ios-blue)]">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
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
                <span>{showArchived ? (isEn ? 'Past events included' : 'Przeszłe terminy włączone') : (isEn ? 'Include past events' : 'Pokaż przeszłe terminy')}</span>
                {showArchived && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--ios-blue)]">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>

              {hasCustomFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter('all')
                    setShowArchived(false)
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
            <IosCard className="overflow-hidden flex flex-col divide-y">
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
          filteredEvents.length === 0 ? (
            <IosCard className="py-12 px-6 text-center flex flex-col items-center justify-center gap-2 mt-1">
              <span className="text-[16px] font-semibold text-[var(--ios-label)] tracking-tight">
                {searchQuery || hasCustomFilter
                  ? (isEn ? 'No matching events' : 'Brak pasujących terminów')
                  : (isEn ? 'No upcoming deadlines' : 'Brak nadchodzących terminów')}
              </span>
              <p className="text-[13px] font-normal text-[var(--ios-secondary)] max-w-xs leading-relaxed">
                {searchQuery || hasCustomFilter
                  ? (isEn ? 'Try changing your search query or active category filter.' : 'Zmień kryteria wyszukiwania lub wybrany filtr kategorii.')
                  : (isEn ? 'No scheduled tests, quizzes, or assignments recorded.' : 'W terminarzu nie ma zaplanowanych sprawdzianów ani kartkówek.')}
              </p>
              {(searchQuery || hasCustomFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter('all')
                    setShowArchived(false)
                    setSearchQuery('')
                  }}
                  className="mt-2 px-4 py-2 rounded-full bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] text-[13px] font-semibold active:scale-95 transition-all cursor-pointer"
                >
                  {isEn ? 'Reset filters' : 'Wyczyść filtry'}
                </button>
              )}
            </IosCard>
          ) : (
            <div className="flex flex-col gap-2">
              {layeredGroups.today.length > 0 && (
                <div className="flex flex-col">
                  {renderSectionHeader(isEn ? 'Today' : 'Dzisiaj')}
                  <IosCard className="overflow-hidden flex flex-col divide-y">
                    {layeredGroups.today.map((ev) => renderEventRow(ev))}
                  </IosCard>
                </div>
              )}

              {layeredGroups.tomorrow.length > 0 && (
                <div className="flex flex-col">
                  {renderSectionHeader(isEn ? 'Tomorrow' : 'Jutro')}
                  <IosCard className="overflow-hidden flex flex-col divide-y">
                    {layeredGroups.tomorrow.map((ev) => renderEventRow(ev))}
                  </IosCard>
                </div>
              )}

              {layeredGroups.thisWeek.length > 0 && (
                <div className="flex flex-col">
                  {renderSectionHeader(isEn ? 'This Week' : 'W tym tygodniu')}
                  <IosCard className="overflow-hidden flex flex-col divide-y">
                    {layeredGroups.thisWeek.map((ev) => renderEventRow(ev))}
                  </IosCard>
                </div>
              )}

              {layeredGroups.nextWeek.length > 0 && (
                <div className="flex flex-col">
                  {renderSectionHeader(isEn ? 'Next Week' : 'W przyszłym tygodniu')}
                  <IosCard className="overflow-hidden flex flex-col divide-y">
                    {layeredGroups.nextWeek.map((ev) => renderEventRow(ev))}
                  </IosCard>
                </div>
              )}

              {layeredGroups.laterMonths.map((mGroup) => (
                <div key={mGroup.key} className="flex flex-col">
                  {renderSectionHeader(mGroup.label)}
                  <IosCard className="overflow-hidden flex flex-col divide-y">
                    {mGroup.events.map((ev) => renderEventRow(ev))}
                  </IosCard>
                </div>
              ))}

              {showArchived && layeredGroups.past.length > 0 && (
                <div className="flex flex-col">
                  {renderSectionHeader(isEn ? 'Past Events' : 'Przeszłe terminy')}
                  <IosCard className="overflow-hidden flex flex-col divide-y opacity-80">
                    {layeredGroups.past.map((ev) => renderEventRow(ev))}
                  </IosCard>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="flex flex-col gap-3">
            <IosCard className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[17px] font-semibold text-[var(--ios-label)] tracking-tight">
                  {calMonthTitle}
                </span>

                <div className="flex items-center gap-1.5">
                  {!isCurrentCalMonth && (
                    <button
                      type="button"
                      onClick={handleJumpToToday}
                      className="px-3 py-1 rounded-full text-[12px] font-semibold bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] active:scale-95 transition-all cursor-pointer mr-0.5"
                    >
                      {isEn ? 'Today' : 'Dzisiaj'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="w-8 h-8 rounded-full bg-[var(--ios-element)] text-[var(--ios-label)] flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                    aria-label="Previous month"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="w-8 h-8 rounded-full bg-[var(--ios-element)] text-[var(--ios-label)] flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                    aria-label="Next month"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-[var(--ios-tertiary)] tracking-wider pt-0.5">
                <span>{isEn ? 'Mo' : 'Pn'}</span>
                <span>{isEn ? 'Tu' : 'Wt'}</span>
                <span>{isEn ? 'We' : 'Śr'}</span>
                <span>{isEn ? 'Th' : 'Cz'}</span>
                <span>{isEn ? 'Fr' : 'Pt'}</span>
                <span>{isEn ? 'Sa' : 'So'}</span>
                <span>{isEn ? 'Su' : 'Nd'}</span>
              </div>

              <div className="grid grid-cols-7 gap-1 pt-0.5">
                {calendarGrid.map((cell, idx) => {
                  if (!cell.dayNum || !cell.iso) {
                    return <div key={'empty-' + idx} className="h-11" />
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
                        'h-11 rounded-[12px] flex flex-col items-center justify-center relative transition-all duration-150 cursor-pointer select-none',
                        isSelected
                          ? 'bg-[var(--ios-blue)] text-white font-semibold'
                          : isToday
                          ? 'bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] font-semibold'
                          : 'text-[var(--ios-label)] hover:bg-[var(--bg-card-secondary)] font-normal active:scale-95'
                      )}
                    >
                      <span className="text-[14px] tabular-nums leading-none">
                        {cell.dayNum}
                      </span>

                      {hasEvents && (
                        <div className="flex items-center gap-0.5 mt-1 h-1.5">
                          {dayEvs.slice(0, 3).map((ev, dIdx) => (
                            <div
                              key={dIdx}
                              className={cn(
                                'w-1.5 h-1.5 rounded-full shrink-0',
                                isSelected ? 'bg-white' : getCategoryColor(ev.category)
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

            <div className="flex flex-col">
              {renderSectionHeader(
                (isEn ? 'Events on ' : 'Wydarzenia w dniu ') + formatHumanPolishDate(selectedDateIso, false, lang)
              )}

              {selectedDayEvents.length > 0 ? (
                <IosCard className="overflow-hidden flex flex-col divide-y">
                  {selectedDayEvents.map((ev) => renderEventRow(ev))}
                </IosCard>
              ) : (
                <IosCard className="p-8 text-center text-[14px] font-normal text-[var(--ios-secondary)]">
                  {isEn ? 'No events for this day' : 'Brak wydarzeń w tym dniu'}
                </IosCard>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
