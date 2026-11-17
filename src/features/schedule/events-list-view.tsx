/**
 * Feature View: Grouped Upcoming Events List
 * Displays filtered school events grouped temporally into today, tomorrow, week, month, and past sections.
 * Shows an interactive reset-filters empty state when search or category criteria return no items.
 */

'use client'

import { Calendar } from 'lucide-react'
import { TimetableEvent } from '@/models/timetable.model'
import { AppLanguage, pickText } from '@/config/dictionary.config'
import { UiCard } from '@/components/ui/ui-controls'
import { UiEmptyState } from '@/components/ui/ui-empty-state'
import { EventRow } from './event-row'

export interface MonthEventGroup {
  key: string
  label: string
  events: TimetableEvent[]
}

export interface LayeredEventGroups {
  today: TimetableEvent[]
  tomorrow: TimetableEvent[]
  thisWeek: TimetableEvent[]
  nextWeek: TimetableEvent[]
  laterMonths: MonthEventGroup[]
  past: TimetableEvent[]
}

interface EventsListViewProps {
  filteredEvents: TimetableEvent[]
  layeredGroups: LayeredEventGroups
  showArchived: boolean
  hasSearchOrFilter: boolean
  showFullSubjectNames: boolean
  lang: AppLanguage
  onResetFilters: () => void
  onSelectEvent: (ev: TimetableEvent) => void
}

function SectionLabel({ title }: { title: string }) {
  return (
    <div className="px-4 pt-3 pb-1.5">
      <span className="text-[12px] font-medium uppercase text-[var(--ios-secondary)] tracking-[0.02em]">
        {title}
      </span>
    </div>
  )
}

export function EventsListView({
  filteredEvents,
  layeredGroups,
  showArchived,
  hasSearchOrFilter,
  showFullSubjectNames,
  lang,
  onResetFilters,
  onSelectEvent
}: EventsListViewProps) {
  if (filteredEvents.length === 0) {
    return (
      <UiEmptyState
        inCard
        className="mt-1"
        iconTone="blue"
        icon={<Calendar className="w-[22px] h-[22px]" strokeWidth={1.9} />}
        title={
          hasSearchOrFilter
            ? pickText(lang, { pl: 'Brak pasujących terminów', en: 'No matching events' })
            : pickText(lang, { pl: 'Brak nadchodzących terminów', en: 'No upcoming deadlines' })
        }
        subtitle={
          hasSearchOrFilter
            ? pickText(lang, {
                pl: 'Zmień kryteria wyszukiwania lub wybrany filtr kategorii.',
                en: 'Try changing your search query or active category filter.'
              })
            : pickText(lang, {
                pl: 'W terminarzu nie ma zaplanowanych sprawdzianów ani kartkówek.',
                en: 'No scheduled tests, quizzes, or assignments recorded.'
              })
        }
        action={
          hasSearchOrFilter
            ? {
                label: pickText(lang, { pl: 'Wyczyść filtry', en: 'Reset filters' }),
                onClick: onResetFilters
              }
            : undefined
        }
      />
    )
  }

  const renderGroup = (title: string, events: TimetableEvent[], faded = false) => {
    if (events.length === 0) return null
    return (
      <div className="flex flex-col">
        <SectionLabel title={title} />
        <UiCard
          className={
            faded
              ? 'overflow-hidden flex flex-col divide-y divide-[var(--ios-separator)] opacity-80'
              : 'overflow-hidden flex flex-col divide-y divide-[var(--ios-separator)]'
          }
        >
          {events.map((ev) => (
            <EventRow
              key={(ev.id || '') + '-' + ev.isoDate + '-' + (ev.lessonNumber || '') + '-' + ev.title}
              event={ev}
              showFullSubjectNames={showFullSubjectNames}
              lang={lang}
              onSelect={onSelectEvent}
            />
          ))}
        </UiCard>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {renderGroup(pickText(lang, { pl: 'Dzisiaj', en: 'Today' }), layeredGroups.today)}
      {renderGroup(pickText(lang, { pl: 'Jutro', en: 'Tomorrow' }), layeredGroups.tomorrow)}
      {renderGroup(pickText(lang, { pl: 'W tym tygodniu', en: 'This Week' }), layeredGroups.thisWeek)}
      {renderGroup(pickText(lang, { pl: 'W przyszłym tygodniu', en: 'Next Week' }), layeredGroups.nextWeek)}
      {layeredGroups.laterMonths.map((mGroup) => (
        <div key={mGroup.key}>{renderGroup(mGroup.label, mGroup.events)}</div>
      ))}
      {showArchived &&
        renderGroup(pickText(lang, { pl: 'Przeszłe terminy', en: 'Past Events' }), layeredGroups.past, true)}
    </div>
  )
}
