/**
 * Feature Widget: Mini Upcoming Tests & Deadlines Card
 * Preview card displaying up to four nearest tests, quizzes, or deadlines with non-wrapping centered date boxes.
 * Formats day, abbreviated month, and weekday via `formatDayDate` across all supported languages.
 */

'use client'

import { useMemo, Fragment } from 'react'
import { SmartTimetableResult, TimetableEvent } from '@/models/timetable.model'
import { AppLanguage, pickText } from '@/config/dictionary.config'
import { UiCard } from '@/components/ui/ui-controls'
import {
  getEventCategoryStyle,
  getEventPrimaryTitle,
  resolveEventBadgeLabel
} from '@/utils/badge.util'
import { formatDayDate, getTodayIsoString } from '@/utils/date.util'
import { cn } from '@/utils/cn.util'

interface MiniEventsWidgetProps {
  timetableData: SmartTimetableResult | null
  isLoading?: boolean
  showHomeworks?: boolean
  showFullSubjectNames?: boolean
  lang?: AppLanguage
  onSelectEvent: (ev: TimetableEvent) => void
  onOpenCalendar?: () => void
}

export function MiniEventsWidget({
  timetableData,
  isLoading = false,
  showHomeworks = false,
  showFullSubjectNames = false,
  lang = 'pl',
  onSelectEvent,
  onOpenCalendar,
  
}: MiniEventsWidgetProps) {
  const isNonPolish = lang !== 'pl'
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

      const key = ev.isoDate + '_' + (ev.lessonNumber || '') + '_' + ev.title + '_' + ev.category
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

  return (
    <UiCard
      onClick={onOpenCalendar}
      className={cn(
        'overflow-hidden flex flex-col select-none',
        onOpenCalendar && 'cursor-pointer active:bg-[var(--ios-row-active)]'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between transition-colors duration-150 px-4 h-[46px] [border-bottom-width:0.5px] border-b border-[var(--ios-separator)]',
          onOpenCalendar && 'cursor-pointer hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)]'
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-[var(--ios-label)] leading-none',
              'text-[15px] font-semibold tracking-[-0.2px]'
            )}
          >
            {pickText(lang, { pl: 'Sprawdziany i terminy', en: 'Tests & Deadlines' })}
          </span>
          {isLoading ? (
            <div className="w-6 h-[18px] rounded-full ios-skeleton" />
          ) : upcomingEvents.length > 0 ? (
            <span
              className={cn(
                'text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums',
                'bg-[var(--ios-element)] ios-tile text-[var(--ios-secondary)]'
              )}
            >
              {upcomingEvents.length}
            </span>
          ) : null}
        </div>

        <svg width="16" height="16" className="w-4 h-4 text-[var(--ios-tertiary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {isLoading ? (
        <div className={cn('flex flex-col', '')}>
          {[0, 1, 2].map((i) => (
            <Fragment key={i}>
              <div className={cn('flex items-center justify-between gap-3', 'px-4 py-2.5')}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-[68px] h-[36px] shrink-0 rounded-[12px] ios-skeleton" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="w-28 h-[13px] rounded-full ios-skeleton" />
                    <div className="w-40 h-[11px] rounded-full ios-skeleton" />
                  </div>
                </div>
                <div className="w-16 h-[20px] rounded-full ios-skeleton shrink-0" />
              </div>
              {i < 2 && <div className="h-[0.5px] bg-[var(--ios-separator)] ml-[96px] mr-4" />}
            </Fragment>
          ))}
        </div>
      ) : previewList.length > 0 ? (
        <div className={cn('flex flex-col', '')}>
          {previewList.map((ev, idx) => {
            const dateInfo = formatDayDate(ev.isoDate, lang)
            const isToday = ev.isoDate === todayIso
            const primaryTitle = getEventPrimaryTitle(ev, showFullSubjectNames, isNonPolish)
            const secondaryText =
              ev.title && ev.title !== primaryTitle
                ? ev.title
                : ev.description && ev.description !== primaryTitle
                  ? ev.description
                  : ''
            const badgeStyle = getEventCategoryStyle(ev.category, ev.eventType)
            const badgeLabel = resolveEventBadgeLabel(ev, isNonPolish)

            return (
              <Fragment key={(ev.id || idx) + '-' + ev.isoDate}>
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectEvent(ev)
                  }}
                  className={cn(
                    'flex items-center justify-between gap-3 transition-colors cursor-pointer',
                    'px-4 py-2.5 hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)]'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="min-w-[68px] px-2 shrink-0 flex flex-col items-center justify-center text-center py-1.5 whitespace-nowrap rounded-[8px] ios-well">
                      <span className="text-[12.5px] font-semibold leading-none tabular-nums whitespace-nowrap">
                        {dateInfo.dayNum} {dateInfo.monthName}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-normal mt-0.5 leading-none whitespace-nowrap',
                          isToday && 'text-[var(--ios-secondary)]'
                        )}
                      >
                        {isToday ? pickText(lang, { pl: 'Dziś', en: 'Today' }) : dateInfo.weekday}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 flex flex-col">
                      <span className="text-[14px] font-medium text-[var(--ios-label)] tracking-[-0.15px] truncate leading-snug">
                        {primaryTitle}
                      </span>
                      {secondaryText && (
                        <span className="text-[12px] font-normal text-[var(--ios-secondary)] truncate leading-tight mt-0.5">
                          {secondaryText}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={cn(
                      'text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 max-w-[42%] truncate',
                      'ios-tile',
                      badgeStyle.bgClass,
                      badgeStyle.textClass
                    )}
                    title={badgeLabel}
                  >
                    {badgeLabel}
                  </span>
                </div>
                {idx < previewList.length - 1 && (
                  <div className="h-[0.5px] bg-[var(--ios-separator)] ml-[96px] mr-4" />
                )}
              </Fragment>
            )
          })}
        </div>
      ) : (
        <div
          onClick={onOpenCalendar}
          className={cn(
            'px-4 py-5 text-center text-[13px] font-normal text-[var(--ios-secondary)]',
            onOpenCalendar && 'cursor-pointer hover:bg-[var(--ios-row-hover)]'
          )}
        >
          {pickText(lang, {
            pl: 'Brak nadchodzących sprawdzianów i terminów',
            en: 'No upcoming tests or deadlines'
          })}
        </div>
      )}
    </UiCard>
  )
}
