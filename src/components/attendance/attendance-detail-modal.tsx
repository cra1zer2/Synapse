'use client'

import { useState, useEffect } from 'react'
import { SubjectAttendance, AbsenceDetail } from '@/models/attendance.model'
import { AppDictionary } from '@/config/dictionary.config'
import { IosScreen } from '@/components/ios/ios-screen'
import { IosCard } from '@/components/ios/ios-ui'
import { formatSubjectName } from '@/utils/text.util'
import { getPendingJustifications, isLessonJustificationPending } from '@/utils/justification.util'
import { cn } from '@/utils/cn.util'

interface AttendanceDetailModalProps {
  subjectDetail: SubjectAttendance | null
  isOpen: boolean
  onClose: () => void
  showFullSubjectNames?: boolean
  onSelectAbsenceForExcuse?: (absence: AbsenceDetail) => void
  t: AppDictionary
}

export function AttendanceDetailModal({
  subjectDetail,
  isOpen,
  onClose,
  showFullSubjectNames = false,
  t
}: AttendanceDetailModalProps) {
  const [cached, setCached] = useState<SubjectAttendance | null>(subjectDetail)

  useEffect(() => {
    if (subjectDetail) {
      setCached(subjectDetail)
    }
  }, [subjectDetail])

  const activeData = subjectDetail || cached
  const shortTitle = formatSubjectName(activeData?.subject || '', showFullSubjectNames)
  const isDanger = (activeData?.percentage ?? 100) < 50.0
  const isWarning = (activeData?.percentage ?? 100) >= 50.0 && (activeData?.percentage ?? 100) < 75.0

  const statusColor = isDanger
    ? 'text-[var(--ios-red)]'
    : isWarning
      ? 'text-[var(--ios-orange)]'
      : 'text-[var(--ios-label)]'

  const absences = activeData?.absences || []
  const pendingList = getPendingJustifications()

  return (
    <IosScreen
      isOpen={isOpen}
      onClose={onClose}
      title={shortTitle}
      backLabel={t.backAction}
      showBackButton={true}
      isSubView={true}
      className="z-[60]"
    >
      <div className="flex flex-col gap-3.5 pb-16 select-none">
        <IosCard className="p-4 flex items-end justify-between">
          <div className="flex flex-col">
            <p className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] leading-tight">
              {t.subjectAttendance}
            </p>
            <h2 className={cn('text-[34px] font-semibold tracking-[-0.8px] leading-none mt-1 tabular-nums', statusColor)}>
              {activeData?.percentage ?? 0}%
            </h2>
          </div>

          <div className="text-right">
            <span className="text-[13px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] tabular-nums">
              {activeData?.absentLessons ?? 0} / {activeData?.totalLessons ?? 0} opuszczonych
            </span>
          </div>
        </IosCard>

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold uppercase text-[var(--ios-secondary)] tracking-[0.03em] px-4 select-none">
            {t.recordedAbsencesTitle}
          </span>

          {absences.length > 0 ? (
            <IosCard className="divide-y divide-[var(--ios-separator)]">
              {absences.map((item, idx) => {
                const itemIso = item.date.includes('.') ? item.date.split('.').reverse().join('-') : item.date
                const isPending = isLessonJustificationPending(pendingList, itemIso, item.date, item.lessonNumber)
                const itemKey = item.date + '-' + item.lessonNumber + '-' + idx

                return (
                  <div key={itemKey} className="p-3.5 px-4 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-medium text-[var(--ios-label)] tracking-[-0.2px] leading-snug tabular-nums">{item.date}</span>
                        <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] leading-[16px] tabular-nums">
                          {t.lessonNumberLabel(item.lessonNumber)} {item.time ? '(' + item.time + ')' : ''}
                        </span>
                      </div>

                      {isPending ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)] tabular-nums">
                          {t.pendingJustification}
                        </span>
                      ) : (
                        <span
                          className={cn(
                            'text-[12px] font-semibold px-2 py-0.5 rounded-full tabular-nums',
                            item.isUnexcused
                              ? 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)]'
                              : 'bg-[var(--ios-green-subtle)] text-[var(--ios-green)]'
                          )}
                        >
                          {item.type.toLowerCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[12px] leading-[16px] tracking-[-0.1px] text-[var(--ios-secondary)]">
                      <span className="truncate pr-2 font-normal">{item.typeName}</span>
                      {item.teacher && <span className="shrink-0 font-normal">{item.teacher}</span>}
                    </div>
                  </div>
                )
              })}
            </IosCard>
          ) : (
            <IosCard className="p-8 text-center text-[15px] font-normal text-[var(--ios-secondary)]">
              {t.noAbsencesRecorded}
            </IosCard>
          )}
        </div>
      </div>
    </IosScreen>
  )
}
