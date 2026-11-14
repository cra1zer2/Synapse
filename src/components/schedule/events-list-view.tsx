'use client'

import { Calendar } from 'lucide-react'
import { TimetableEvent } from '@/models/timetable.model'
import { AppLanguage } from '@/config/dictionary.config'
import { IosCard, IosEmptyState } from '@/components/ios/ios-ui'
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
  const isEn = lang === 'en'

  if (filteredEvents.length === 0) {
    return (
      <IosEmptyState
        inCard
        className="mt-1"
        iconTone="blue"
        icon={<Calendar className="w-[22px] h-[22px]" strokeWidth={1.9} />}
        title={
          hasSearchOrFilter
            ? isEn
              ? 'No matching events'
              : 'Brak pasujących terminów'
            : isEn
              ? 'No upcoming deadlines'
              : 'Brak nadchodzących terminów'
        }
        subtitle={
          hasSearchOrFilter
            ? isEn
              ? 'Try changing your search query or active category filter.'
              : 'Zmień kryteria wyszukiwania lub wybrany filtr kategorii.'
            : isEn
              ? 'No scheduled tests, quizzes, or assignments recorded.'
              : 'W terminarzu nie ma zaplanowanych sprawdzianów ani kartkówek.'
        }
        action={
          hasSearchOrFilter
            ? {
                label: isEn ? 'Reset filters' : 'Wyczyść filtry',
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
        <IosCard className={faded ? 'overflow-hidden flex flex-col divide-y divide-[var(--ios-separator)] opacity-80' : 'overflow-hidden flex flex-col divide-y divide-[var(--ios-separator)]'}>
          {events.map((ev) => (
            <EventRow
              key={(ev.id || '') + '-' + ev.isoDate + '-' + (ev.lessonNumber || '') + '-' + ev.title}
              event={ev}
              showFullSubjectNames={showFullSubjectNames}
              lang={lang}
              onSelect={onSelectEvent}
            />
          ))}
        </IosCard>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {renderGroup(isEn ? 'Today' : 'Dzisiaj', layeredGroups.today)}
      {renderGroup(isEn ? 'Tomorrow' : 'Jutro', layeredGroups.tomorrow)}
      {renderGroup(isEn ? 'This Week' : 'W tym tygodniu', layeredGroups.thisWeek)}
      {renderGroup(isEn ? 'Next Week' : 'W przyszłym tygodniu', layeredGroups.nextWeek)}
      {layeredGroups.laterMonths.map((mGroup) => (
        <div key={mGroup.key}>{renderGroup(mGroup.label, mGroup.events)}</div>
      ))}
      {showArchived && renderGroup(isEn ? 'Past Events' : 'Przeszłe terminy', layeredGroups.past, true)}
    </div>
  )
}
