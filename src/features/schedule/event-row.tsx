/**
 * Feature Component: Calendar Event Row
 * Renders a single test, quiz, homework, or school notice row with a non-wrapping centered date box.
 * Adapts date and badge labels dynamically via `formatDayDate` and `pickText`.
 */

'use client'

import { TimetableEvent } from '@/models/timetable.model'
import { AppLanguage, pickText } from '@/config/dictionary.config'
import { formatDayDate } from '@/utils/date.util'
import {
  getEventCategoryStyle,
  getEventPrimaryTitle,
  resolveEventBadgeLabel
} from '@/utils/badge.util'
import { cn } from '@/utils/cn.util'

const LONG_EVENT_BADGE_THRESHOLD = 20

interface EventRowProps {
  event: TimetableEvent
  showFullSubjectNames: boolean
  lang: AppLanguage
  onSelect: (ev: TimetableEvent) => void
}

export function EventRow({ event, showFullSubjectNames, lang, onSelect }: EventRowProps) {
  const isNonPolish = lang !== 'pl'
  const dateInfo = formatDayDate(event.isoDate, lang)
  const primaryTitle = getEventPrimaryTitle(event, showFullSubjectNames, isNonPolish)
  const secondaryText =
    event.title && event.title !== primaryTitle
      ? event.title
      : event.description && event.description !== primaryTitle
        ? event.description
        : ''

  const metaParts: string[] = []
  if (event.lessonNumber !== undefined) {
    metaParts.push(`${pickText(lang, { pl: 'Lekcja', en: 'Period' })} ${event.lessonNumber}`)
  }
  if (event.time) {
    metaParts.push(event.time)
  }
  if (event.teacher) {
    metaParts.push(event.teacher)
  }

  const badgeStyle = getEventCategoryStyle(event.category, event.eventType)
  const badgeLabel = resolveEventBadgeLabel(event, isNonPolish)
  const isLongBadge = badgeLabel.length > LONG_EVENT_BADGE_THRESHOLD

  return (
    <div
      onClick={() => onSelect(event)}
      className="w-full px-4 py-3.5 flex items-start gap-3.5 hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)] transition-colors duration-150 cursor-pointer select-none"
    >
      <div className="min-w-[54px] px-1.5 h-[46px] shrink-0 rounded-[12px] ios-well flex flex-col items-center justify-center text-center mt-0.5 whitespace-nowrap">
        <span className="text-[16px] font-semibold text-[var(--ios-label)] leading-none tabular-nums whitespace-nowrap">
          {dateInfo.dayNum}
        </span>
        <span className="text-[10px] font-medium text-[var(--ios-secondary)] mt-1 leading-none whitespace-nowrap">
          {dateInfo.monthName}
        </span>
      </div>

      <div className="min-w-0 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2.5">
          <span className="text-[15px] font-semibold text-[var(--ios-label)] tracking-[-0.2px] leading-snug min-w-0 flex-1">
            {primaryTitle}
          </span>

          {!isLongBadge && (
            <span
              className={cn(
                'text-[11px] font-semibold px-2.5 py-0.5 rounded-full ios-tile shrink-0 max-w-[46%] truncate leading-tight mt-0.5',
                badgeStyle.bgClass,
                badgeStyle.textClass
              )}
              title={badgeLabel}
            >
              {badgeLabel}
            </span>
          )}
        </div>

        {isLongBadge && (
          <span
            className={cn(
              'self-start max-w-full text-[11px] font-semibold px-2.5 py-0.5 rounded-[10px] ios-tile leading-snug mt-1',
              badgeStyle.bgClass,
              badgeStyle.textClass
            )}
          >
            {badgeLabel}
          </span>
        )}

        {secondaryText && (
          <p className="text-[13px] font-normal text-[var(--ios-secondary)] line-clamp-2 mt-0.5 leading-snug">
            {secondaryText}
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
