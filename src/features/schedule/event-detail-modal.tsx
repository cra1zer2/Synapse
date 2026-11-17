/**
 * Feature Modal: Calendar Event Details
 * Bottom sheet displaying full scope, lesson period, time, teacher, and `.ics` calendar export for an event.
 * Caches the previous event briefly during sheet exit transitions.
 */

'use client'

import { useState, useEffect } from 'react'
import { CalendarPlus } from 'lucide-react'
import { TimetableEvent } from '@/models/timetable.model'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { formatHumanDate } from '@/utils/date.util'
import {
  getEventCategoryStyle,
  getEventPrimaryTitle,
  resolveEventBadgeLabel
} from '@/utils/badge.util'
import { downloadEventIcs } from '@/utils/calendar.util'
import { UiButton } from '@/components/ui/ui-button'
import { UiSheet } from '@/components/ui/ui-sheet'
import { cn } from '@/utils/cn.util'

interface EventDetailModalProps {
  event: TimetableEvent | null
  isOpen: boolean
  onClose: () => void
  lang?: AppLanguage
  t: AppDictionary
}

export function EventDetailModal({
  event,
  isOpen,
  onClose,
  lang = 'pl',
  t
}: EventDetailModalProps) {
  const [cached, setCached] = useState<TimetableEvent | null>(event)
  const isNonPolish = lang !== 'pl'

  useEffect(() => {
    if (event) {
      setCached(event)
    }
  }, [event])

  const activeData = event || cached
  const categoryStyle = activeData
    ? getEventCategoryStyle(activeData.category, activeData.eventType)
    : null
  const badgeLabel = activeData ? resolveEventBadgeLabel(activeData, isNonPolish) : ''
  const modalTitle = activeData ? getEventPrimaryTitle(activeData, true, isNonPolish) : ''
  const detailDescription =
    activeData?.description && activeData.description !== modalTitle
      ? activeData.description
      : activeData?.title && activeData.title !== modalTitle
        ? activeData.title
        : ''

  return (
    <UiSheet
      isOpen={isOpen && Boolean(activeData)}
      onClose={onClose}
      title={badgeLabel}
      closeLabel={t.closeLabel}
      maxWidthClass="md:max-w-[380px]"
    >
      {activeData && (
        <div className="flex flex-col gap-3.5">
          <div className="px-1 flex flex-col gap-1.5">
            {categoryStyle && (
              <div>
                <span
                  className={cn(
                    'inline-flex items-center max-w-full px-2.5 py-0.5 rounded-[10px] ios-tile text-[11px] font-semibold uppercase tracking-wide leading-snug text-left',
                    categoryStyle.bgClass,
                    categoryStyle.textClass
                  )}
                >
                  {badgeLabel}
                </span>
              </div>
            )}
            <h3 className="text-[20px] font-semibold text-[var(--ios-label)] tracking-[-0.35px] leading-snug">
              {modalTitle}
            </h3>
            <span className="text-[14px] font-normal text-[var(--ios-secondary)] tabular-nums">
              {formatHumanDate(activeData.isoDate || activeData.date, false, lang)}
            </span>
          </div>

          {detailDescription && (
            <div className="ios-well rounded-[20px] p-3.5 px-4 flex flex-col gap-1">
              <span className="text-[12px] font-medium text-[var(--ios-secondary)]">
                {pickText(lang, { pl: 'Opis / Zakres materiału', en: 'Description / Scope' })}
              </span>
              <p className="text-[15px] font-normal text-[var(--ios-label)] leading-relaxed whitespace-pre-wrap select-text">
                {detailDescription}
              </p>
            </div>
          )}

          {(activeData.lessonNumber !== undefined || activeData.time || activeData.teacher) && (
            <div className="ios-well rounded-[20px] overflow-hidden divide-y divide-[var(--ios-separator)]">
              {activeData.lessonNumber !== undefined && (
                <div className="p-3 px-4 flex items-center justify-between text-[14px]">
                  <span className="text-[var(--ios-secondary)]">
                    {pickText(lang, { pl: 'Godzina lekcyjna', en: 'Period' })}
                  </span>
                  <span className="text-[var(--ios-label)] font-medium">
                    {t.lessonNumberLabel(activeData.lessonNumber)}
                  </span>
                </div>
              )}
              {activeData.time && (
                <div className="p-3 px-4 flex items-center justify-between text-[14px]">
                  <span className="text-[var(--ios-secondary)]">
                    {pickText(lang, { pl: 'Godziny', en: 'Time' })}
                  </span>
                  <span className="text-[var(--ios-label)] font-medium tabular-nums">{activeData.time}</span>
                </div>
              )}
              {activeData.teacher && (
                <div className="p-3 px-4 flex items-center justify-between gap-3 text-[14px]">
                  <span className="text-[var(--ios-secondary)] shrink-0">{t.teacherLabel}</span>
                  <span className="text-[var(--ios-label)] font-medium truncate text-right">{activeData.teacher}</span>
                </div>
              )}
            </div>
          )}

          {activeData.isoDate && (
            <UiButton
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => downloadEventIcs(activeData)}
              icon={<CalendarPlus className="w-4 h-4 text-[var(--ios-blue)]" strokeWidth={2} />}
            >
              {t.exportCalendarIcs}
            </UiButton>
          )}
        </div>
      )}
    </UiSheet>
  )
}
