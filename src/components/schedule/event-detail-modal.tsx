'use client'

import { useState, useEffect } from 'react'
import { CalendarPlus } from 'lucide-react'
import { TimetableEvent } from '@/models/timetable.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { formatHumanPolishDate } from '@/utils/date.util'
import { getEventCategoryStyle } from '@/utils/badge.util'
import { downloadEventIcs } from '@/utils/calendar.util'
import { IosButton } from '@/components/ios/ios-ui'
import { IosSheet } from '@/components/ios/ios-sheet'
import { cn } from '@/utils/cn.util'

interface EventDetailModalProps {
  event: TimetableEvent | null
  isOpen: boolean
  onClose: () => void
  lang?: AppLanguage
  t: AppDictionary
}

function getFallbackEventLabel(category: TimetableEvent['category'], lang: AppLanguage): string {
  const isEn = lang === 'en'
  switch (category) {
    case 'holiday':
      return isEn ? 'Holiday' : 'Dzień wolny'
    case 'quiz':
      return isEn ? 'Quiz' : 'Kartkówka'
    case 'homework':
      return isEn ? 'Homework' : 'Zadanie'
    case 'exam':
      return isEn ? 'Exam' : 'Sprawdzian'
    default:
      return isEn ? 'Event' : 'Wydarzenie'
  }
}

export function EventDetailModal({
  event,
  isOpen,
  onClose,
  lang = 'pl',
  t
}: EventDetailModalProps) {
  const [cached, setCached] = useState<TimetableEvent | null>(event)
  const isEn = lang === 'en'

  useEffect(() => {
    if (event) {
      setCached(event)
    }
  }, [event])

  const activeData = event || cached
  const categoryStyle = activeData ? getEventCategoryStyle(activeData.category) : null
  const badgeLabel = activeData
    ? activeData.eventType || getFallbackEventLabel(activeData.category, lang)
    : ''

  return (
    <IosSheet
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
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide',
                    categoryStyle.bgClass,
                    categoryStyle.textClass
                  )}
                >
                  {badgeLabel}
                </span>
              </div>
            )}
            <h3 className="text-[20px] font-semibold text-[var(--ios-label)] tracking-[-0.35px] leading-snug break-words">
              {activeData.subjectName || activeData.eventType || (isEn ? 'Event' : 'Wydarzenie')}
            </h3>
            <span className="text-[14px] font-normal text-[var(--ios-secondary)] tabular-nums">
              {formatHumanPolishDate(activeData.isoDate || activeData.date, false, lang)}
            </span>
          </div>

          {activeData.description && (
            <div className="bg-[var(--bg-card-secondary)] rounded-[20px] p-3.5 px-4 flex flex-col gap-1">
              <span className="text-[12px] font-medium text-[var(--ios-secondary)]">
                {isEn ? 'Description / Scope' : 'Opis / Zakres materiału'}
              </span>
              <p className="text-[15px] font-normal text-[var(--ios-label)] leading-relaxed whitespace-pre-wrap select-text">
                {activeData.description}
              </p>
            </div>
          )}

          {(activeData.lessonNumber !== undefined || activeData.time || activeData.teacher) && (
            <div className="bg-[var(--bg-card-secondary)] rounded-[20px] overflow-hidden divide-y divide-[var(--ios-separator)]">
              {activeData.lessonNumber !== undefined && (
                <div className="p-3 px-4 flex items-center justify-between text-[14px]">
                  <span className="text-[var(--ios-secondary)]">{isEn ? 'Period' : 'Godzina lekcyjna'}</span>
                  <span className="text-[var(--ios-label)] font-medium">
                    {t.lessonNumberLabel(activeData.lessonNumber)}
                  </span>
                </div>
              )}
              {activeData.time && (
                <div className="p-3 px-4 flex items-center justify-between text-[14px]">
                  <span className="text-[var(--ios-secondary)]">{isEn ? 'Time' : 'Godziny'}</span>
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
            <IosButton
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => downloadEventIcs(activeData)}
              icon={<CalendarPlus className="w-4 h-4 text-[var(--ios-blue)]" strokeWidth={2} />}
            >
              {t.exportCalendarIcs}
            </IosButton>
          )}
        </div>
      )}
    </IosSheet>
  )
}
