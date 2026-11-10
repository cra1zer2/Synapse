'use client'

import { useState, useEffect } from 'react'
import { LessonItem } from '@/models/timetable.model'
import { AppDictionary } from '@/config/dictionary.config'
import { parseLessonTimeRange, getCurrentTimeMinutes } from '@/utils/time.util'
import { cn } from '@/utils/cn.util'
import { IosSheet } from '@/components/ios/ios-sheet'

interface LessonDetailModalProps {
  lesson: LessonItem | null
  onClose: () => void
  isToday: boolean
  t: AppDictionary
}

export function LessonDetailModal({
  lesson,
  onClose,
  isToday,
  t
}: LessonDetailModalProps) {
  const [cached, setCached] = useState<LessonItem | null>(lesson)
  const [currentMinutes, setCurrentMinutes] = useState(getCurrentTimeMinutes)

  useEffect(() => {
    if (lesson) {
      setCached(lesson)
    }
  }, [lesson])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMinutes(getCurrentTimeMinutes())
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  const activeData = lesson || cached
  const range = activeData ? parseLessonTimeRange(activeData.time) : { startMinutes: 0, endMinutes: 0, isValid: false }
  const isActive = Boolean(activeData && isToday && range.isValid && currentMinutes >= range.startMinutes && currentMinutes <= range.endMinutes)
  const minutesLeft = isActive && range.isValid ? range.endMinutes - currentMinutes : null

  return (
    <IosSheet
      isOpen={Boolean(lesson)}
      onClose={onClose}
      title={activeData ? t.lessonNumberLabel(activeData.number) : t.lessonDetails}
      maxWidthClass="md:max-w-[380px]"
    >
      {activeData && (
        <div className="flex flex-col gap-3.5">
          <div className="px-1 flex flex-col gap-1">
            <h3 className="text-[20px] font-semibold text-[var(--ios-label)] tracking-[-0.35px] leading-snug break-words">
              {activeData.subject}
            </h3>
            <span className="text-[14px] font-normal text-[var(--ios-secondary)] tabular-nums">
              {activeData.time || activeData.flag || ''}
            </span>
          </div>

          <div className="bg-[var(--bg-card-secondary)] rounded-[20px] p-3.5 px-4 flex flex-col gap-1">
            <span className="text-[12px] font-medium text-[var(--ios-secondary)]">
              {t.lessonTopic}
            </span>
            <p className="text-[15px] font-normal text-[var(--ios-label)] leading-relaxed whitespace-pre-wrap select-text">
              {activeData.topic || t.noTopicRecorded}
            </p>
          </div>

          <div className="bg-[var(--bg-card-secondary)] rounded-[20px] overflow-hidden divide-y">
            <div className="p-3 px-4 flex items-center justify-between text-[14px]">
              <span className="text-[var(--ios-secondary)]">{t.teacherLabel}</span>
              <span className="text-[var(--ios-label)] font-medium text-right truncate max-w-[200px]">
                {activeData.teacher || t.notSpecified}
              </span>
            </div>

            {activeData.room && (
              <div className="p-3 px-4 flex items-center justify-between text-[14px]">
                <span className="text-[var(--ios-secondary)]">{t.roomLabel}</span>
                <span className={cn('font-semibold', activeData.isSubstitution ? 'text-[var(--ios-purple)]' : 'text-[var(--ios-label)]')}>
                  {activeData.room}
                </span>
              </div>
            )}

            {activeData.durationMinutes > 0 && (
              <div className="p-3 px-4 flex items-center justify-between text-[14px]">
                <span className="text-[var(--ios-secondary)]">{t.durationLabel}</span>
                <span className="text-[var(--ios-label)] font-medium tabular-nums">
                  {activeData.durationMinutes} min {isActive && minutesLeft !== null ? '(pozostało ' + minutesLeft + ' min)' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </IosSheet>
  )
}
