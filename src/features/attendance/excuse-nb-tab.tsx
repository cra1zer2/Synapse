/**
 * Feature Component: Unexcused Absences Quick-Select Tab
 * Groups unexcused absences (`nb`) by school date with batch selection and pending-justification locks.
 * Part of `ManualExcuseScreen`.
 */

'use client'

import { Check, CheckCircle2 } from 'lucide-react'
import { AbsenceDetail } from '@/models/attendance.model'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { UiCard } from '@/components/ui/ui-controls'
import { UiEmptyState } from '@/components/ui/ui-empty-state'
import { formatSubjectName, formatPolishPlural } from '@/utils/text.util'
import { isLessonJustificationPending, PendingJustificationRecord } from '@/utils/justification.util'
import { cn } from '@/utils/cn.util'

interface GroupedNbDay {
  date: string
  isoDate: string
  lessons: AbsenceDetail[]
  allPending: boolean
  hasSelectable: boolean
}

interface ExcuseNbTabProps {
  totalUnexcusedCount: number
  groupedNbDays: GroupedNbDay[]
  selectableNbCount: number
  isAllNbSelected: boolean
  selectedNbMap: Record<string, boolean>
  pendingList: PendingJustificationRecord[]
  canSubmitExcuse: boolean
  showFullSubjectNames: boolean
  onToggleSelectAll: () => void
  onToggleLesson: (date: string, lessonNumber: number) => void
  lang: AppLanguage
  t: AppDictionary
}

export function ExcuseNbTab({
  totalUnexcusedCount,
  groupedNbDays,
  selectableNbCount,
  isAllNbSelected,
  selectedNbMap,
  pendingList,
  canSubmitExcuse,
  showFullSubjectNames,
  onToggleSelectAll,
  onToggleLesson,
  lang,
  t
}: ExcuseNbTabProps) {
  return (
    <div className="flex flex-col gap-3.5">
      <UiCard className="p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-tight">
            {pickText(lang, { pl: 'Nieusprawiedliwione godziny', en: 'Unexcused Lessons' })}
          </span>
          <h2 className="text-[28px] font-semibold text-[var(--ios-red)] tracking-tight leading-none mt-0.5 tabular-nums">
            {totalUnexcusedCount} nb
          </h2>
        </div>

        {selectableNbCount > 0 ? (
          <button
            type="button"
            onClick={onToggleSelectAll}
            className="flex items-center gap-2 py-1.5 px-3 rounded-full ios-element-pill text-[var(--ios-label)] active:scale-[0.96] transition-transform cursor-pointer shrink-0"
          >
            <span className="text-[13px] font-medium tracking-tight">
              {pickText(lang, { pl: 'Zaznacz wszystkie', en: 'Select all' })}
            </span>
            <div
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center transition-colors shrink-0',
                isAllNbSelected
                  ? 'bg-[var(--ios-blue)] text-white shadow-[var(--ios-primary-pill-shadow)]'
                  : 'border-[0.5px] border-[var(--ios-separator)] bg-[var(--ios-card-solid)] ios-tile'
              )}
            >
              {isAllNbSelected && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
            </div>
          </button>
        ) : (
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full ios-tile bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)] shrink-0">
            {t.pendingJustification}
          </span>
        )}
      </UiCard>

      {groupedNbDays.length > 0 ? (
        groupedNbDays.map((group) => (
          <div key={group.date} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-4 text-[13px] text-[var(--ios-secondary)]">
              <span className="font-semibold tracking-tight text-[var(--ios-label)]">
                {group.date}
              </span>
              <span className="tabular-nums">
                {group.lessons.length}{' '}
                {pickText(lang, {
                  pl: formatPolishPlural(group.lessons.length, 'lekcja', 'lekcje', 'lekcji'),
                  en: group.lessons.length === 1 ? 'period' : 'periods'
                })}
              </span>
            </div>

            <UiCard className="overflow-hidden divide-y divide-[var(--ios-separator)]">
              {group.lessons.map((lesson) => {
                const isPending = isLessonJustificationPending(
                  pendingList,
                  group.isoDate,
                  group.date,
                  lesson.lessonNumber
                )
                const key = group.date + '_' + lesson.lessonNumber
                const isChecked = Boolean(selectedNbMap[key]) && !isPending

                return (
                  <div
                    key={lesson.lessonNumber}
                    onClick={() => !isPending && canSubmitExcuse && onToggleLesson(group.date, lesson.lessonNumber)}
                    className={cn(
                      'px-4 py-3 flex items-center justify-between gap-3 transition-colors duration-100',
                      isPending
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)]'
                    )}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {isPending ? (
                        <div className="w-[22px] h-[22px] rounded-full bg-[var(--ios-orange-subtle)] ios-tile text-[var(--ios-orange)] flex items-center justify-center shrink-0 text-[11px] font-bold">
                          •
                        </div>
                      ) : (
                        <div
                          className={cn(
                            'w-[22px] h-[22px] rounded-full flex items-center justify-center transition-colors shrink-0',
                            isChecked
                              ? 'bg-[var(--ios-blue)] text-white shadow-[var(--ios-primary-pill-shadow)]'
                              : 'border-[0.5px] border-[var(--ios-separator)] ios-well'
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
                          {t.lessonNumberLabel(lesson.lessonNumber)} {lesson.time ? '• ' + lesson.time : ''}
                        </p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        'text-[11px] font-semibold px-2 py-0.5 rounded-full ios-tile tabular-nums shrink-0',
                        isPending
                          ? 'bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)]'
                          : 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)]'
                      )}
                    >
                      {isPending ? t.pendingJustification : 'NB'}
                    </span>
                  </div>
                )
              })}
            </UiCard>
          </div>
        ))
      ) : (
        <UiEmptyState
          inCard
          iconTone="green"
          icon={<CheckCircle2 className="w-[22px] h-[22px]" strokeWidth={1.9} />}
          title={pickText(lang, {
            pl: 'Wszystkie nieobecności są usprawiedliwione',
            en: 'All absences are excused'
          })}
        />
      )}
    </div>
  )
}
