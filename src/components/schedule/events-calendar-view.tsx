'use client'

import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { TimetableEvent } from '@/models/timetable.model'
import { AppLanguage } from '@/config/dictionary.config'
import { IosCard, IosEmptyState } from '@/components/ios/ios-ui'
import { formatHumanPolishDate } from '@/utils/date.util'
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
  lang,
  onPrevMonth,
  onNextMonth,
  onJumpToToday,
  onSelectDate,
  onSelectEvent
}: EventsCalendarViewProps) {
  const isEn = lang === 'en'

  return (
    <div className="flex flex-col gap-3">
      <IosCard className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[17px] font-semibold text-[var(--ios-label)] tracking-tight truncate">
            {calMonthTitle}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isCurrentCalMonth && (
              <button
                type="button"
                onClick={onJumpToToday}
                className="px-3 py-1 rounded-full text-[12px] font-semibold bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] active:scale-95 transition-all cursor-pointer mr-0.5"
              >
                {isEn ? 'Today' : 'Dzisiaj'}
              </button>
            )}

            <button
              type="button"
              onClick={onPrevMonth}
              className="w-8 h-8 rounded-full bg-[var(--ios-element)] text-[var(--ios-label)] flex items-center justify-center active:scale-90 transition-all cursor-pointer"
              aria-label={isEn ? 'Previous month' : 'Poprzedni miesiąc'}
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            </button>

            <button
              type="button"
              onClick={onNextMonth}
              className="w-8 h-8 rounded-full bg-[var(--ios-element)] text-[var(--ios-label)] flex items-center justify-center active:scale-90 transition-all cursor-pointer"
              aria-label={isEn ? 'Next month' : 'Następny miesiąc'}
            >
              <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
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
                onClick={() => onSelectDate(cell.iso!)}
                className={cn(
                  'h-11 rounded-[12px] flex flex-col items-center justify-center relative transition-all duration-150 cursor-pointer select-none',
                  isSelected
                    ? 'bg-[var(--ios-blue)] text-white font-semibold'
                    : isToday
                      ? 'bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] font-semibold'
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
      </IosCard>

      <div className="flex flex-col">
        <div className="px-4 pt-3 pb-1.5">
          <span className="text-[12px] font-medium uppercase text-[var(--ios-secondary)] tracking-[0.02em]">
            {(isEn ? 'Events on ' : 'Wydarzenia w dniu ') + formatHumanPolishDate(selectedDateIso, false, lang)}
          </span>
        </div>

        {selectedDayEvents.length > 0 ? (
          <IosCard className="overflow-hidden flex flex-col divide-y divide-[var(--ios-separator)]">
            {selectedDayEvents.map((ev) => (
              <EventRow
                key={(ev.id || '') + '-' + ev.isoDate + '-' + (ev.lessonNumber || '') + '-' + ev.title}
                event={ev}
                showFullSubjectNames={showFullSubjectNames}
                lang={lang}
                onSelect={onSelectEvent}
              />
            ))}
          </IosCard>
        ) : (
          <IosEmptyState
            inCard
            compact
            iconTone="neutral"
            icon={<Calendar className="w-[20px] h-[20px]" strokeWidth={1.9} />}
            title={isEn ? 'No events for this day' : 'Brak wydarzeń w tym dniu'}
          />
        )}
      </div>
    </div>
  )
}
