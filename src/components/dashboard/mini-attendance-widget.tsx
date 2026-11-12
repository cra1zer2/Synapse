'use client'

import { useMemo } from 'react'
import { AttendanceResult } from '@/models/attendance.model'
import { SmartTimetableResult } from '@/models/timetable.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosCard } from '@/components/ios/ios-ui'
import { getAttendanceTypeStyle } from '@/utils/badge.util'
import { cn } from '@/utils/cn.util'
import { formatHumanPolishDate, getTodayIsoString } from '@/utils/date.util'

interface MiniAttendanceWidgetProps {
  attendanceData: AttendanceResult | null
  timetableData?: SmartTimetableResult | null
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  lang?: AppLanguage
  t: AppDictionary
  onOpenAttendance: () => void
  onOpenLegacyAttendance?: (dateIso?: string) => void
  isDesktop?: boolean
  showTodayLine?: boolean
}

export function MiniAttendanceWidget({
  attendanceData,
  timetableData = null,
  isLoading = false,
  error = null,
  onRetry,
  lang = 'pl',
  t,
  onOpenAttendance,
  onOpenLegacyAttendance,
  isDesktop = false,
  showTodayLine
}: MiniAttendanceWidgetProps) {
  const shouldShowTodayLine = showTodayLine ?? isDesktop
  const isPending = isLoading || (!attendanceData && !error)
  const isDanger = attendanceData?.overallStatus === 'danger'
  const isWarning = attendanceData?.overallStatus === 'warning'

  const todayIso = useMemo(() => getTodayIsoString(), [])

  const todayDotDate = useMemo(() => {
    const parts = todayIso.split('-')
    if (parts.length === 3) {
      return parts[2] + '.' + parts[1] + '.' + parts[0]
    }
    return todayIso
  }, [todayIso])

  const isWeekend = useMemo(() => {
    const day = new Date().getDay()
    return day === 0 || day === 6
  }, [])

  const todayLegacyDay = useMemo(() => {
    if (!attendanceData?.legacyTable?.days) return null
    return (
      attendanceData.legacyTable.days.find(
        (d) => d.isoDate === todayIso || d.date === todayIso || d.date === todayDotDate
      ) || null
    )
  }, [attendanceData, todayIso, todayDotDate])

  const relevantSchedule = useMemo(() => {
    if (!timetableData?.schedule || timetableData.schedule.length === 0) return null

    const byIso = timetableData.schedule.find((d) => d.isoDate === todayIso)
    if (byIso && byIso.lessons && byIso.lessons.length > 0) return byIso

    const byDate = timetableData.schedule.find((d) => d.date === todayDotDate || d.date === todayIso)
    if (byDate && byDate.lessons && byDate.lessons.length > 0) return byDate

    const currentToday = timetableData.schedule.find((d) => d.isToday)
    if (currentToday && currentToday.lessons && currentToday.lessons.length > 0) return currentToday

    return null
  }, [timetableData, todayIso, todayDotDate])

  const scheduledLessonRange = useMemo(() => {
    if (isWeekend) return []

    if (relevantSchedule?.lessons && relevantSchedule.lessons.length > 0) {
      const numbers = relevantSchedule.lessons
        .map((l) => l.number)
        .filter((n): n is number => typeof n === 'number' && !isNaN(n))

      if (numbers.length > 0) {
        const minNum = Math.min(...numbers)
        const maxNum = Math.max(...numbers)
        const range: number[] = []
        for (let i = minNum; i <= maxNum; i++) {
          range.push(i)
        }
        return range
      }
    }

    if (todayLegacyDay?.lessons) {
      const recorded = Object.keys(todayLegacyDay.lessons).map(Number).filter((n) => !isNaN(n))
      if (recorded.length > 0) {
        const minNum = Math.min(1, Math.min(...recorded))
        const maxNum = Math.max(7, Math.max(...recorded))
        const range: number[] = []
        for (let i = minNum; i <= maxNum; i++) {
          range.push(i)
        }
        return range
      }
    }

    return [1, 2, 3, 4, 5, 6, 7]
  }, [relevantSchedule, todayLegacyDay, isWeekend])

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

  const canOpenAttendance = Boolean(attendanceData && !isPending && !error)

  return (
    <IosCard
      onClick={canOpenAttendance ? onOpenAttendance : undefined}
      className={cn(
        'overflow-hidden flex flex-col select-none',
        canOpenAttendance && !isDesktop && 'active:bg-[var(--ios-row-active)]'
      )}
    >
      <div
        className={cn(
          'px-4 h-[46px] flex items-center justify-between border-b border-[var(--ios-separator)] transition-colors duration-150',
          canOpenAttendance && 'hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)]'
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-[var(--ios-label)] tracking-[-0.2px]">
            {t.attendance}
          </span>
          {!isPending && attendanceData && attendanceData.unexcusedAbsences.length > 0 && (
            <span className="text-[11px] font-semibold text-[var(--ios-red)] bg-[var(--ios-red-subtle)] px-2 py-0.5 rounded-full tabular-nums ios-reveal">
              {attendanceData.unexcusedAbsences.length} nb
            </span>
          )}
        </div>

        <svg width="16" height="16" className="w-4 h-4 text-[var(--ios-tertiary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {error && !attendanceData ? (
        <div className="px-4 py-5 flex flex-col items-center justify-center gap-2 text-center" onClick={(e) => e.stopPropagation()}>
          <span className="text-[13px] font-normal text-[var(--ios-label)] px-2">{error}</span>
          {onRetry && (
            <button type="button" onClick={onRetry} className="text-[13px] font-medium text-[var(--ios-blue)] active:opacity-60 cursor-pointer">
              {t.refresh || 'Spróbuj ponownie'}
            </button>
          )}
        </div>
      ) : !attendanceData || isPending ? (
        <div className="flex flex-col">
          <div className="px-4 py-3.5 flex flex-col gap-2.5">
            <div className="flex items-end justify-between min-h-[52px]">
              <div className="flex flex-col">
                <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-tight leading-tight">
                  {t.attendanceRate}
                </span>
                <div className="w-[88px] h-[34px] rounded-[8px] ios-skeleton mt-1" />
              </div>
              <div className="w-[104px] h-[16px] rounded-full ios-skeleton mb-0.5" />
            </div>
            <div className="w-full h-[6px] rounded-full ios-skeleton" />
          </div>

          {shouldShowTodayLine && (
            <div className="flex flex-col gap-2 px-4 py-3 border-t border-[var(--ios-separator)]">
              <div className="flex items-center justify-between">
                <div className="w-28 h-[12px] rounded-full ios-skeleton" />
                <div className="w-16 h-[11px] rounded-full ios-skeleton" />
              </div>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <div key={num} className="w-[26px] sm:w-[28px] h-[26px] sm:h-[28px] rounded-[8px] ios-skeleton" />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col ios-reveal">
          <div className={cn(
            'px-4 py-3.5 flex flex-col gap-2.5 transition-colors duration-150',
            canOpenAttendance && 'hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)]'
          )}>
            <div className="flex items-end justify-between gap-2 flex-wrap min-h-[52px]">
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] leading-tight">
                  {t.attendanceRate}
                </span>
                <span className={cn('text-[32px] sm:text-[34px] font-semibold tracking-[-0.8px] leading-none mt-1 tabular-nums', statusColor)}>
                  {attendanceData.overallPercentage}%
                </span>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[12px] sm:text-[13px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] tabular-nums">
                  {attendanceData.totalAbsent} / {attendanceData.totalScheduled} {lang === 'en' ? 'missed' : 'opuszczonych'}
                </span>
              </div>
            </div>

            <div className="w-full bg-[var(--ios-element)] h-[6px] rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]', barBg)}
                style={{ width: Math.min(Math.max(attendanceData.overallPercentage, 0), 100) + '%' }}
              />
            </div>
          </div>

          {shouldShowTodayLine && (
            <div
              onClick={(e) => {
                e.stopPropagation()
                if (onOpenLegacyAttendance) onOpenLegacyAttendance(todayIso)
                else onOpenAttendance()
              }}
              className="flex flex-col gap-2 px-4 py-3 border-t border-[var(--ios-separator)] hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)] transition-colors duration-150 cursor-pointer select-none"
            >
              <div className="flex items-center justify-between text-[12px] font-normal text-[var(--ios-secondary)]">
                <span>{lang === 'en' ? "Today's Attendance" : 'Dzisiejsza obecność'}</span>
                <span className="text-[11px] tabular-nums text-[var(--ios-tertiary)]">
                  {formatHumanPolishDate(todayIso, false, lang)}
                </span>
              </div>

              {isWeekend ? (
                <div className="text-[12px] text-[var(--ios-tertiary)] py-0.5">
                  {lang === 'en' ? 'Weekend — no classes' : 'Weekend — brak zajęć'}
                </div>
              ) : (
                <div className="flex items-center justify-start flex-wrap gap-1.5">
                  {scheduledLessonRange.map((num) => {
                    const record = todayLegacyDay?.lessons?.[num]
                    if (!record) {
                      return (
                        <div
                          key={num}
                          className="min-w-[26px] sm:min-w-[28px] h-[26px] sm:h-[28px] px-1.5 shrink-0 rounded-[8px] bg-[var(--ios-element)] flex items-center justify-center text-[11px] text-[var(--ios-tertiary)] font-medium tabular-nums select-none"
                        >
                          {num}
                        </div>
                      )
                    }

                    const typeStyle = getAttendanceTypeStyle(record.type)
                    const badgeClass =
                      record.type === 'other'
                        ? 'bg-[var(--ios-element)] text-[var(--ios-label)] font-medium'
                        : `${typeStyle.bgClass} ${typeStyle.textClass} font-semibold`

                    return (
                      <div
                        key={num}
                        className={cn(
                          'min-w-[26px] sm:min-w-[28px] h-[26px] sm:h-[28px] px-1.5 shrink-0 rounded-[8px] flex items-center justify-center text-[11px] leading-none select-none',
                          badgeClass
                        )}
                      >
                        {record.symbol}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </IosCard>
  )
}
