'use client'

import { useMemo } from 'react'
import { AttendanceResult, SubjectAttendance } from '@/models/attendance.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { formatSubjectName } from '@/utils/text.util'
import { IosListSection, IosCell } from '@/components/ios/ios-list'
import { IosCard } from '@/components/ios/ios-ui'
import { getPendingJustifications, isLessonJustificationPending } from '@/utils/justification.util'

interface AttendanceWidgetProps {
  attendanceData: AttendanceResult
  showFullSubjectNames?: boolean
  isStudent?: boolean
  onSelectSubject: (sub: SubjectAttendance) => void
  onOpenManualExcuse?: () => void
  onOpenQuickNb?: () => void
  onOpenLiveJustifications?: () => void
  lang?: AppLanguage
  t: AppDictionary
}

export function AttendanceWidget({
  attendanceData,
  showFullSubjectNames = false,
  isStudent = false,
  onSelectSubject,
  onOpenManualExcuse,
  onOpenQuickNb,
  onOpenLiveJustifications,
  lang = 'pl',
  t
}: AttendanceWidgetProps) {
  const isDanger = attendanceData.overallStatus === 'danger'
  const isWarning = attendanceData.overallStatus === 'warning'

  const statusColor = isDanger
    ? 'text-[var(--ios-red)]'
    : isWarning
      ? 'text-[var(--ios-orange)]'
      : 'text-[var(--ios-label)]'

  const barBg = isDanger
    ? 'bg-[var(--ios-red)]'
    : isWarning
      ? 'bg-[var(--ios-orange)]'
      : 'bg-[var(--ios-green)]'

  const sortedSubjects = useMemo(() => {
    return [...attendanceData.subjects].sort((a, b) => {
      if (a.unexcusedCount > 0 && b.unexcusedCount === 0) return -1
      if (b.unexcusedCount > 0 && a.unexcusedCount === 0) return 1
      if (a.percentage !== b.percentage) return a.percentage - b.percentage
      if (a.absentLessons > 0 && b.absentLessons === 0) return -1
      if (b.absentLessons > 0 && a.absentLessons === 0) return 1
      return a.subject.localeCompare(b.subject)
    })
  }, [attendanceData.subjects])

  const pendingList = useMemo(() => {
    return getPendingJustifications()
  }, [])

  const nbCount = useMemo(() => {
    return attendanceData.unexcusedAbsences.filter((abs) => {
      const iso = abs.date.includes('.') ? abs.date.split('.').reverse().join('-') : abs.date
      return !isLessonJustificationPending(pendingList, iso, abs.date, abs.lessonNumber)
    }).length
  }, [attendanceData.unexcusedAbsences, pendingList])

  return (
    <div className="w-full flex flex-col gap-3.5 pb-12">
      <IosCard className="p-4 flex flex-col gap-2.5 select-none">
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <p className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] leading-tight">
              {t.attendanceRate}
            </p>
            <h2 className={"text-[34px] font-semibold tracking-[-0.8px] leading-none mt-1 tabular-nums " + statusColor}>
              {attendanceData.overallPercentage}%
            </h2>
          </div>

          <div className="text-right">
            <span className="text-[13px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] tabular-nums">
              {attendanceData.totalAbsent} / {attendanceData.totalScheduled} {lang === 'en' ? 'missed' : 'opuszczonych'}
            </span>
          </div>
        </div>

        <div className="w-full bg-[var(--ios-element)]/75 h-2 rounded-full overflow-hidden">
          <div
            className={"h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] " + barBg}
            style={{ width: Math.min(Math.max(attendanceData.overallPercentage, 0), 100) + "%" }}
          />
        </div>
      </IosCard>

      {!isStudent && (
        <div className="flex flex-col gap-3 select-none">
          <div className="grid grid-cols-2 gap-3">
            <IosCard
              onClick={onOpenManualExcuse}
              className="p-3.5 rounded-[22px] flex flex-col justify-between min-h-[86px]"
            >
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-[10px] bg-[var(--ios-element)] text-[var(--ios-secondary)] flex items-center justify-center border border-[var(--ios-border)]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                    <path d="m15 5 4 4"/>
                  </svg>
                </span>
                <svg width="16" height="16" className="w-4 h-4 text-[var(--ios-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
              <div className="mt-2.5">
                <h4 className="text-[15px] font-medium text-[var(--ios-label)] tracking-[-0.2px] leading-snug">
                  {lang === 'en' ? 'Manual' : 'Ręczne'}
                </h4>
                <p className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] leading-[16px] mt-0.5">
                  {lang === 'en' ? 'Date range or hours' : 'Zakres lub godziny'}
                </p>
              </div>
            </IosCard>

            <IosCard
              onClick={onOpenQuickNb}
              className="p-3.5 rounded-[22px] flex flex-col justify-between min-h-[86px]"
            >
              <div className="flex items-center justify-between">
                <span className="w-8 h-8 rounded-[10px] bg-[var(--ios-element)] text-[var(--ios-secondary)] flex items-center justify-center border border-[var(--ios-border)]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                <span className={"text-[12px] font-medium px-2 py-0.5 rounded-full border tabular-nums " + (
                  nbCount > 0
                    ? "bg-[var(--ios-red-subtle)] text-[var(--ios-red)] border-[var(--ios-red)]/20"
                    : "bg-[var(--ios-element)] text-[var(--ios-secondary)] border-transparent"
                )}>
                  {nbCount} nb
                </span>
              </div>
              <div className="mt-2.5">
                <h4 className="text-[15px] font-medium text-[var(--ios-label)] tracking-[-0.2px] leading-snug">
                  {lang === 'en' ? 'Unexcused nb' : 'Zaległe nb'}
                </h4>
                <p className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] leading-[16px] mt-0.5 truncate">
                  {nbCount > 0
                    ? (lang === 'en' ? 'Quick justification' : 'Szybkie usprawiedliwienie')
                    : (lang === 'en' ? 'All excused' : 'Wszystko usprawiedliwione')}
                </p>
              </div>
            </IosCard>
          </div>

          <IosCard
            onClick={onOpenLiveJustifications}
            className="p-3.5 px-4 rounded-[26px] flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="w-8 h-8 rounded-[10px] bg-[var(--ios-element)] text-[var(--ios-secondary)] flex items-center justify-center border border-[var(--ios-border)] shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </span>

              <div className="flex flex-col min-w-0 flex-1">
                <h4 className="text-[15px] font-medium text-[var(--ios-label)] tracking-[-0.2px] leading-snug truncate">
                  {lang === 'en' ? 'Justification statuses' : 'Statusy usprawiedliwień'}
                </h4>
                <p className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] leading-[16px] mt-0.5 truncate">
                  {lang === 'en' ? 'Sent, accepted and rejected' : 'Wysłane, przyjęte i odrzucone'}
                </p>
              </div>
            </div>

            <svg width="16" height="16" className="w-4 h-4 text-[var(--ios-tertiary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </IosCard>
        </div>
      )}

      <IosListSection header={t.subjectsSection}>
        {sortedSubjects.map((sub) => {
          const formattedTitle = formatSubjectName(sub.subject, showFullSubjectNames)
          const activeUnexcusedCount = sub.absences.filter((a) => {
            const aIso = a.date.includes('.') ? a.date.split('.').reverse().join('-') : a.date
            return a.isUnexcused && !isLessonJustificationPending(pendingList, aIso, a.date, a.lessonNumber)
          }).length

          const isBelowHalf = sub.percentage < 50.0

          return (
            <IosCell
              key={sub.subject}
              onClick={() => onSelectSubject(sub)}
              chevron={true}
              size="tall"
              title={
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[15px] font-medium leading-snug tracking-[-0.2px] truncate text-[var(--ios-label)]">
                    {formattedTitle}
                  </span>
                  {activeUnexcusedCount > 0 && (
                    <span className="text-[13px] font-medium text-[var(--ios-red)] shrink-0 tabular-nums">{activeUnexcusedCount} nb</span>
                  )}
                </div>
              }
              subtitle={t.missedLessonsCount(sub.absentLessons) + " " + t.ofScheduled(sub.totalLessons)}
              trailing={
                <span
                  className={
                    "text-[16px] tabular-nums tracking-[-0.2px] " +
                    (isBelowHalf ? "text-[var(--ios-red)] font-semibold" : "text-[var(--ios-label)] font-medium")
                  }
                >
                  {sub.percentage}%
                </span>
              }
            />
          )
        })}
      </IosListSection>
    </div>
  )
}
