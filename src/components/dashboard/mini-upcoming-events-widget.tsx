'use client'

import { useMemo } from 'react'
import { SmartTimetableResult, TimetableEvent } from '@/models/timetable.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosCard } from '@/components/ios/ios-ui'
import { formatSubjectName } from '@/utils/text.util'
import { formatPolishDayDate, getTodayIsoString } from '@/utils/date.util'

interface MiniUpcomingEventsWidgetProps {
  timetableData: SmartTimetableResult | null
  isLoading?: boolean
  showHomeworks?: boolean
  showFullSubjectNames?: boolean
  lang?: AppLanguage
  t: AppDictionary
  onSelectEvent: (ev: TimetableEvent) => void
  onOpenCalendar?: () => void
  isDesktop?: boolean
}

export function MiniUpcomingEventsWidget({
  timetableData,
  isLoading = false,
  showHomeworks = false,
  showFullSubjectNames = false,
  lang = 'pl',
  t,
  onSelectEvent,
  onOpenCalendar,
  isDesktop = false
}: MiniUpcomingEventsWidgetProps) {
  const isEn = lang === 'en'
  const todayIso = useMemo(() => getTodayIsoString(), [])

  const upcomingEvents = useMemo(() => {
    if (!timetableData) return []
    const rawList =
      timetableData.calendarEvents && timetableData.calendarEvents.length > 0
        ? timetableData.calendarEvents
        : timetableData.schedule.flatMap((d) => d.events || [])

    const seen = new Set<string>()
    const filtered: TimetableEvent[] = []

    for (const ev of rawList) {
      if (!ev || !ev.isoDate) continue
      if (ev.isoDate < todayIso) continue
      if (!showHomeworks && ev.category === 'homework') continue

      const key = `${ev.isoDate}_${ev.lessonNumber || ''}_${ev.title}_${ev.category}`
      if (seen.has(key)) continue
      seen.add(key)
      filtered.push(ev)
    }

    return filtered.sort((a, b) => {
      const cmp = a.isoDate.localeCompare(b.isoDate)
      if (cmp !== 0) return cmp
      return (a.lessonNumber || 99) - (b.lessonNumber || 99)
    })
  }, [timetableData, todayIso, showHomeworks])

  const previewList = upcomingEvents.slice(0, 4)

  const getBadgeStyle = (category: TimetableEvent['category']) => {
    switch (category) {
      case 'exam':
        return 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)] border-[var(--ios-red)]/25'
      case 'quiz':
        return 'bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)] border-[var(--ios-orange)]/25'
      case 'homework':
        return 'bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] border-[var(--ios-blue)]/25'
      case 'holiday':
        return 'bg-[var(--ios-green-subtle)] text-[var(--ios-green)] border-[var(--ios-green)]/25'
      default:
        return 'bg-[var(--ios-purple-subtle)] text-[var(--ios-purple)] border-[var(--ios-purple)]/25'
    }
  }

  return (
    <IosCard
      onClick={!isDesktop ? onOpenCalendar : undefined}
      className={
        'overflow-hidden flex flex-col select-none transition-colors duration-100 ' +
        (!isDesktop && onOpenCalendar ? 'cursor-pointer active:bg-[var(--ios-row-active)]' : '')
      }
    >
      <div
        onClick={isDesktop ? onOpenCalendar : undefined}
        className={
          'px-4 pt-3.5 pb-3 flex items-center justify-between transition-colors duration-100 ' +
          (isDesktop && onOpenCalendar
            ? 'cursor-pointer hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)]'
            : '')
        }
      >
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-medium tracking-[-0.2px] text-[var(--ios-label)] leading-none">
            {isEn ? 'Tests & Deadlines' : 'Sprawdziany i terminy'}
          </span>
          {isLoading ? (
            <div className="w-6 h-[18px] rounded-full ios-skeleton" />
          ) : (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--ios-element)] text-[var(--ios-secondary)] tabular-nums">
              {upcomingEvents.length}
            </span>
          )}
        </div>

        <svg width="16" height="16" className="w-4 h-4 text-[var(--ios-tertiary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      <div className="h-[1px] bg-[var(--ios-separator)] mx-4" />

      {isLoading ? (
        <div className="divide-y divide-[var(--ios-separator)]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-[44px] h-[36px] shrink-0 rounded-[10px] ios-skeleton" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="w-28 h-[13px] rounded-full ios-skeleton" />
                  <div className="w-40 h-[11px] rounded-full ios-skeleton" />
                </div>
              </div>
              <div className="w-16 h-[20px] rounded-full ios-skeleton shrink-0" />
            </div>
          ))}
        </div>
      ) : previewList.length > 0 ? (
        <div className="divide-y divide-[var(--ios-separator)]">
          {previewList.map((ev, idx) => {
            const dateInfo = formatPolishDayDate(ev.isoDate, lang)
            const isToday = ev.isoDate === todayIso
            const subjLabel = ev.subjectName
              ? formatSubjectName(ev.subjectName, showFullSubjectNames)
              : ev.eventType || (isEn ? 'Event' : 'Wydarzenie')

            return (
              <div
                key={(ev.id || idx) + '-' + ev.isoDate}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectEvent(ev)
                }}
                className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-[44px] shrink-0 flex flex-col items-center justify-center py-1 rounded-[10px] bg-[var(--ios-element)]/55">
                    <span className="text-[13px] font-semibold text-[var(--ios-label)] leading-none tabular-nums">
                      {dateInfo.dayNum} {dateInfo.monthName}
                    </span>
                    <span className="text-[10px] font-normal text-[var(--ios-secondary)] mt-0.5 leading-none">
                      {isToday ? (isEn ? 'Today' : 'Dziś') : dateInfo.weekday}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col">
                    <span className="text-[14px] font-medium text-[var(--ios-label)] tracking-[-0.15px] truncate leading-snug">
                      {subjLabel}
                    </span>
                    <span className="text-[12px] font-normal text-[var(--ios-secondary)] truncate leading-tight mt-0.5">
                      {ev.title}
                    </span>
                  </div>
                </div>

                <span
                  className={
                    'text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ' +
                    getBadgeStyle(ev.category)
                  }
                >
                  {ev.eventType || (ev.category === 'exam' ? 'Sprawdzian' : ev.category === 'quiz' ? 'Kartkówka' : ev.category === 'homework' ? 'Zadanie' : 'Info')}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="px-4 py-5 text-center text-[13px] font-normal text-[var(--ios-secondary)]">
          {isEn ? 'No upcoming tests or deadlines' : 'Brak nadchodzących sprawdzianów i terminów'}
        </div>
      )}
    </IosCard>
  )
}
