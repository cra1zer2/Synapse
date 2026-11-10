'use client'

import { useState, useEffect } from 'react'
import { TimetableEvent } from '@/models/timetable.model'
import { AppDictionary } from '@/config/dictionary.config'
import { formatHumanPolishDate } from '@/utils/date.util'
import { IosSheet } from '@/components/ios/ios-sheet'

interface EventDetailModalProps {
  event: TimetableEvent | null
  isOpen: boolean
  onClose: () => void
  t: AppDictionary
}

export function EventDetailModal({
  event,
  isOpen,
  onClose,
  t
}: EventDetailModalProps) {
  const [cached, setCached] = useState<TimetableEvent | null>(event)

  useEffect(() => {
    if (event) {
      setCached(event)
    }
  }, [event])

  const activeData = event || cached
  const isHoliday = activeData?.category === 'holiday'
  const isQuiz = activeData?.category === 'quiz'
  const badgeLabel = activeData?.eventType || (isHoliday ? 'Dzień wolny' : isQuiz ? 'Kartkówka' : 'Sprawdzian')

  return (
    <IosSheet
      isOpen={isOpen && Boolean(activeData)}
      onClose={onClose}
      title={badgeLabel}
      maxWidthClass="md:max-w-[380px]"
    >
      {activeData && (
        <div className="flex flex-col gap-3.5">
          <div className="px-1 flex flex-col gap-1">
            <h3 className="text-[20px] font-semibold text-[var(--ios-label)] tracking-[-0.35px] leading-snug break-words">
              {activeData.subjectName || activeData.eventType || 'Wydarzenie'}
            </h3>
            <span className="text-[14px] font-normal text-[var(--ios-secondary)] tabular-nums">
              {formatHumanPolishDate(activeData.date)}
            </span>
          </div>

          {activeData.description && (
            <div className="bg-[var(--bg-card-secondary)] rounded-[20px] p-3.5 px-4 flex flex-col gap-1">
              <span className="text-[12px] font-medium text-[var(--ios-secondary)]">
                Opis / Zakres materiału
              </span>
              <p className="text-[15px] font-normal text-[var(--ios-label)] leading-relaxed whitespace-pre-wrap select-text">
                {activeData.description}
              </p>
            </div>
          )}

          <div className="bg-[var(--bg-card-secondary)] rounded-[20px] overflow-hidden divide-y">
            {activeData.lessonNumber !== undefined && (
              <div className="p-3 px-4 flex items-center justify-between text-[14px]">
                <span className="text-[var(--ios-secondary)]">Godzina lekcyjna</span>
                <span className="text-[var(--ios-label)] font-medium">
                  {t.lessonNumberLabel(activeData.lessonNumber)}
                </span>
              </div>
            )}
            {activeData.time && (
              <div className="p-3 px-4 flex items-center justify-between text-[14px]">
                <span className="text-[var(--ios-secondary)]">Godziny</span>
                <span className="text-[var(--ios-label)] font-medium tabular-nums">{activeData.time}</span>
              </div>
            )}
            {activeData.teacher && (
              <div className="p-3 px-4 flex items-center justify-between text-[14px]">
                <span className="text-[var(--ios-secondary)]">{t.teacherLabel}</span>
                <span className="text-[var(--ios-label)] font-medium truncate max-w-[200px] text-right">{activeData.teacher}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </IosSheet>
  )
}
