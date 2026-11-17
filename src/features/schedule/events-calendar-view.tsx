/**
 * Feature View: Monthly Events Calendar Grid
 * Renders an interactive monthly grid with event category indicator dots and daily agenda inspection.
 * Derives localized weekday column headers automatically from `getWeekdayHeaders(lang)`.
 */

'use client'

import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { TimetableEvent } from '@/models/timetable.model'
import { AppLanguage, pickText } from '@/config/dictionary.config'
import { UiCard } from '@/components/ui/ui-controls'
import { UiEmptyState } from '@/components/ui/ui-empty-state'
import { formatHumanDate, getWeekdayHeaders } from '@/utils/date.util'
import { getEventCategoryStyle } from '@/utils/badge.util'
import { cn } from '@/utils/cn.util'
import { EventRow } from './event-row'

interface CalendarCell {
  dayNum: number | null
  iso: string | null
}

interface EventsCalendarViewProps {
  calMonthTitle: string
  isCurrentCalMonth: boolean
  calendarGrid: CalendarCell[]
  selectedDateIso: string
  todayIso: string
  eventsByDate: Record<string, TimetableEvent[]>
  selectedDayEvents: TimetableEvent[]
  showFullSubjectNames: boolean
  hideDayAgenda?: boolean
  lang: AppLanguage
  onPrevMonth: () => void
  onNextMonth: () => void
  onJumpToToday: () => void
  onSelectDate: (iso: string) => void
  onSelectEvent: (ev: TimetableEvent) => void
}

export function EventsCalendarView({
  calMonthTitle,
  isCurrentCalMonth,
  calendarGrid,
  selectedDateIso,
  todayIso,
  eventsByDate,
  selectedDayEvents,
  showFullSubjectNames,
  hideDayAgenda = false,
  lang,
  onPrevMonth,
  onNextMonth,
  onJumpToToday,
  onSelectDate,
  onSelectEvent
}: EventsCalendarViewProps) {
  const weekdayHeaders = getWeekdayHeaders(lang)

  return (
    <div className="flex flex-col gap-3">
      <UiCard className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[17px] font-semibold text-[var(--ios-label)] tracking-tight truncate">
            {calMonthTitle}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isCurrentCalMonth && (
              <button
                type="button"
                onClick={onJumpToToday}
                className="px-3 py-1 rounded-full text-[12px] font-semibold bg-[var(--ios-blue-subtle)] ios-tile text-[var(--ios-blue)] active:scale-95 transition-all cursor-pointer mr-0.5"
              >
                {pickText(lang, { pl: 'Dzisiaj', en: 'Today' })}
              </button>
            )}

            <button
              type="button"
              onClick={onPrevMonth}
              className="w-8 h-8 rounded-full ios-element-pill text-[var(--ios-label)] flex items-center justify-center active:scale-90 transition-all cursor-pointer"
              aria-label={pickText(lang, { pl: 'Poprzedni miesiąc', en: 'Previous month' })}
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            </button>

            <button
              type="button"
              onClick={onNextMonth}
              className="w-8 h-8 rounded-full ios-element-pill text-[var(--ios-label)] flex items-center justify-center active:scale-90 transition-all cursor-pointer"
              aria-label={pickText(lang, { pl: 'Następny miesiąc', en: 'Next month' })}
            >
              <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-[var(--ios-tertiary)] tracking-wider pt-0.5">
          {weekdayHeaders.map((label, idx) => (
            <span key={idx}>{label}</span>
          ))}
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
                onClick={() => onSelectDate(cell.iso!)}
                className={cn(
                  'h-11 rounded-[12px] flex flex-col items-center justify-center relative transition-all duration-150 cursor-pointer select-none',
                  isSelected
                    ? 'bg-[var(--ios-blue)] text-white shadow-[var(--ios-primary-pill-shadow)] font-semibold'
                    : isToday
                      ? 'bg-[var(--ios-blue-subtle)] ios-tile text-[var(--ios-blue)] font-semibold'
                      : 'text-[var(--ios-label)] hover:bg-[var(--bg-card-secondary)] font-normal active:scale-95'
                )}
              >
                <span className="text-[14px] tabular-nums leading-none">{cell.dayNum}</span>

                {hasEvents && (
                  <div className="flex items-center gap-0.5 mt-1 h-1.5">
                    {dayEvs.slice(0, 3).map((ev, dIdx) => {
                      const style = getEventCategoryStyle(ev.category)
                      return (
                        <div
                          key={dIdx}
                          className={cn(
                            'w-1.5 h-1.5 rounded-full shrink-0',
                            isSelected ? 'bg-white' : style.dotClass
                          )}
                        />
                      )
                    })}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </UiCard>

      {!hideDayAgenda && (
        <div className="flex flex-col">
          <div className="px-4 pt-3 pb-1.5">
            <span className="text-[12px] font-medium uppercase text-[var(--ios-secondary)] tracking-[0.02em]">
              {pickText(lang, { pl: 'Wydarzenia w dniu ', en: 'Events on ' }) +
                formatHumanDate(selectedDateIso, false, lang)}
            </span>
          </div>

          {selectedDayEvents.length > 0 ? (
            <UiCard className="overflow-hidden flex flex-col divide-y divide-[var(--ios-separator)]">
              {selectedDayEvents.map((ev) => (
                <EventRow
                  key={(ev.id || '') + '-' + ev.isoDate + '-' + (ev.lessonNumber || '') + '-' + ev.title}
                  event={ev}
                  showFullSubjectNames={showFullSubjectNames}
                  lang={lang}
                  onSelect={onSelectEvent}
                />
              ))}
            </UiCard>
          ) : (
            <UiEmptyState
              inCard
              compact
              iconTone="neutral"
              icon={<Calendar className="w-[20px] h-[20px]" strokeWidth={1.9} />}
              title={pickText(lang, { pl: 'Brak wydarzeń w tym dniu', en: 'No events for this day' })}
            />
          )}
        </div>
      )}
    </div>
  )
}
