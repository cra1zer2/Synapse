'use client'

import { Calendar, Check } from 'lucide-react'
import { LessonItem } from '@/models/timetable.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosCard } from '@/components/ios/ios-ui'
import { formatSubjectName, formatPolishPlural } from '@/utils/text.util'
import { isLessonJustificationPending, PendingJustificationRecord } from '@/utils/justification.util'
import { cn } from '@/utils/cn.util'

interface ExcuseHoursTabProps {
  selectedDayIso: string
  dayLessons: LessonItem[]
  selectedHoursMap: Record<number, boolean>
  selectedCount: number
  excusedLessonNumbers: Set<number>
  pendingList: PendingJustificationRecord[]
  canSubmitExcuse: boolean
  showFullSubjectNames: boolean
  onChangeDayIso: (val: string) => void
  onToggleHour: (lessonNum: number) => void
  lang: AppLanguage
  t: AppDictionary
}

export function ExcuseHoursTab({
  selectedDayIso,
  dayLessons,
  selectedHoursMap,
  selectedCount,
  excusedLessonNumbers,
  pendingList,
  canSubmitExcuse,
  showFullSubjectNames,
  onChangeDayIso,
  onToggleHour,
  lang,
  t
}: ExcuseHoursTabProps) {
  return (
    <div className="flex flex-col gap-3">
      <IosCard className="p-3.5 px-4 flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[15px] font-normal text-[var(--ios-label)]">
          {lang === 'en' ? 'Day' : 'Wybierz dzień'}
        </span>
        <label className="relative inline-flex items-center gap-1.5 bg-[var(--ios-input)] text-[var(--ios-label)] text-[13px] font-medium px-3 py-1.5 rounded-full">
          <Calendar className="w-3.5 h-3.5 text-[var(--ios-blue)] shrink-0 pointer-events-none" strokeWidth={2} />
          <input
            type="date"
            value={selectedDayIso}
            onChange={(e) => onChangeDayIso(e.target.value)}
            className="bg-transparent text-[var(--ios-label)] outline-none tabular-nums min-w-[116px]"
            required
          />
        </label>
      </IosCard>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-4 pb-1.5 text-[12px] font-semibold uppercase tracking-[0.03em] text-[var(--ios-secondary)]">
          <span>{lang === 'en' ? 'Select lesson periods' : 'Wybierz godziny lekcyjne'}</span>
          <span className="tabular-nums normal-case">
            {selectedCount}{' '}
            {lang === 'en'
              ? 'selected'
              : formatPolishPlural(selectedCount, 'zaznaczona', 'zaznaczone', 'zaznaczonych')}
          </span>
        </div>

        <IosCard className="overflow-hidden divide-y divide-[var(--ios-separator)]">
          {dayLessons.map((lesson) => {
            const isExcused = excusedLessonNumbers.has(lesson.number)
            const isPending = isLessonJustificationPending(
              pendingList,
              selectedDayIso,
              selectedDayIso,
              lesson.number
            )
            const isChecked = Boolean(selectedHoursMap[lesson.number]) && !isExcused && !isPending
            const isBlocked = isExcused || isPending

            return (
              <div
                key={lesson.number}
                onClick={() => !isBlocked && canSubmitExcuse && onToggleHour(lesson.number)}
                className={cn(
                  'px-4 py-3 flex items-center justify-between gap-3 transition-colors duration-100',
                  isBlocked
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)]'
                )}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {isPending ? (
                    <div className="w-[22px] h-[22px] rounded-full bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)] flex items-center justify-center shrink-0 text-[11px] font-bold">
                      •
                    </div>
                  ) : isExcused ? (
                    <div className="w-[22px] h-[22px] rounded-full bg-[var(--ios-green-subtle)] text-[var(--ios-green)] flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'w-[22px] h-[22px] rounded-full flex items-center justify-center transition-colors shrink-0',
                        isChecked
                          ? 'bg-[var(--ios-blue)] text-white'
                          : 'border border-[var(--ios-separator)] bg-[var(--bg-card-secondary)]'
                      )}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h4 className="text-[15px] font-medium text-[var(--ios-label)] tracking-[-0.2px] truncate leading-snug">
                      {formatSubjectName(lesson.subject, showFullSubjectNames)}
                    </h4>
                    <p className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] leading-[16px] tabular-nums mt-0.5">
                      {t.lessonNumberLabel(lesson.number)} {lesson.time ? '• ' + lesson.time : ''}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  {isPending ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)] tabular-nums">
                      {t.pendingJustification}
                    </span>
                  ) : isExcused ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--ios-green-subtle)] text-[var(--ios-green)] tabular-nums">
                      {lang === 'en' ? 'excused' : 'usprawiedliwione'}
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </IosCard>
      </div>
    </div>
  )
}
