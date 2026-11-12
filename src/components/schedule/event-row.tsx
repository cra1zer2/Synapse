'use client'

import { TimetableEvent } from '@/models/timetable.model'
import { AppLanguage } from '@/config/dictionary.config'
import { formatSubjectName } from '@/utils/text.util'
import { formatPolishDayDate } from '@/utils/date.util'
import { getEventCategoryStyle } from '@/utils/badge.util'
import { cn } from '@/utils/cn.util'

export function getEventCategoryShortLabel(category: TimetableEvent['category'], isEn: boolean): string {
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

interface EventRowProps {
  event: TimetableEvent
  showFullSubjectNames: boolean
  lang: AppLanguage
  onSelect: (ev: TimetableEvent) => void
}

export function EventRow({ event, showFullSubjectNames, lang, onSelect }: EventRowProps) {
  const isEn = lang === 'en'
  const dateInfo = formatPolishDayDate(event.isoDate, lang)
  const subjLabel = event.subjectName
    ? formatSubjectName(event.subjectName, showFullSubjectNames)
    : event.eventType || (isEn ? 'Event' : 'Wydarzenie')

  const metaParts: string[] = []
  if (event.lessonNumber !== undefined) {
    metaParts.push(isEn ? 'Period ' + event.lessonNumber : 'Lekcja ' + event.lessonNumber)
  }
  if (event.time) {
    metaParts.push(event.time)
  }
  if (event.teacher) {
    metaParts.push(event.teacher)
  }

  const badgeStyle = getEventCategoryStyle(event.category)

  return (
    <div
      onClick={() => onSelect(event)}
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
          <span className="text-[15px] font-semibold text-[var(--ios-label)] tracking-[-0.2px] leading-snug break-words min-w-0">
            {subjLabel}
          </span>

          <span
            className={cn(
              'text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 leading-tight mt-0.5',
              badgeStyle.bgClass,
              badgeStyle.textClass
            )}
          >
            {event.eventType || getEventCategoryShortLabel(event.category, isEn)}
          </span>
        </div>

        {event.title && event.title !== subjLabel && (
          <p className="text-[13px] font-normal text-[var(--ios-secondary)] line-clamp-2 mt-0.5 leading-snug">
            {event.title}
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
