'use client'

import { useMemo } from 'react'
import { AttendanceResult } from '@/models/attendance.model'
import { SmartTimetableResult } from '@/models/timetable.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosCard } from '@/components/ios/ios-ui'
import { cn } from '@/utils/cn.util'

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
  isDesktop = false
}: MiniAttendanceWidgetProps) {
  const isPending = isLoading || (!attendanceData && !error)
  const isDanger = attendanceData?.overallStatus === 'danger'
  const isWarning = attendanceData?.overallStatus === 'warning'

  const todayIso = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [])

  const todayDayName = useMemo(() => {
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return dayMap[new Date().getDay()]
  }, [])

  const todayLegacyDay = useMemo(() => {
    if (!attendanceData?.legacyTable?.days) return null
    return (
      attendanceData.legacyTable.days.find((d) => d.isoDate === todayIso) ||
      attendanceData.legacyTable.days[0] ||
      null
    )
  }, [attendanceData, todayIso])

  const todaySchedule = useMemo(() => {
    if (!timetableData?.schedule) return null
    return (
      timetableData.schedule.find((d) => d.isoDate === todayIso) ||
      timetableData.schedule.find((d) => d.dayName === todayDayName) ||
      null
    )
  }, [timetableData, todayIso, todayDayName])

  // Desktop lesson line: exact range of today's lessons (e.g. from 3rd to 8th lesson)
  const scheduledLessonRange = useMemo(() => {
    const lessons = todaySchedule?.lessons?.filter((l) => !l.isCancelled) || []
    const numbers = lessons
      .map((l) => l.number)
      .filter((n): n is number => n !== undefined && n !== null && typeof n === 'number')

    if (numbers.length > 0) {
      const minNum = Math.min(...numbers)
      const maxNum = Math.max(...numbers)
      const range: number[] = []
      for (let i = minNum; i <= maxNum; i++) {
        range.push(i)
      }
      return range
    }

    if (todayLegacyDay?.lessons) {
      const recorded = Object.keys(todayLegacyDay.lessons).map(Number).filter((n) => !isNaN(n))
      if (recorded.length > 0) {
        const minNum = Math.min(...recorded)
        const maxNum = Math.max(...recorded)
        const range: number[] = []
        for (let i = minNum; i <= maxNum; i++) {
          range.push(i)
        }
        return range
      }
    }

    return [1, 2, 3, 4, 5, 6, 7]
  }, [todaySchedule, todayLegacyDay])

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
    <IosCard className="p-4 flex flex-col gap-3 select-none">
      <div
        onClick={canOpenAttendance ? onOpenAttendance : undefined}
        className={cn(
          "flex items-center justify-between pb-2.5 border-b border-[var(--ios-separator)] transition-opacity",
          canOpenAttendance && "cursor-pointer active:opacity-70"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-[16px] font-semibold text-[var(--ios-label)] tracking-[-0.2px]">
            {t.attendance}
          </span>
          {!isPending && attendanceData && attendanceData.unexcusedAbsences.length > 0 && (
            <span className="text-[13px] font-medium text-[var(--ios-red)] tracking-normal tabular-nums ios-reveal">
              {attendanceData.unexcusedAbsences.length} nb
            </span>
          )}
        </div>

        <svg
          width="16"
          height="16"
          className="w-4 h-4 text-[var(--ios-tertiary)] shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {error && !attendanceData ? (
        <div className="py-4 flex flex-col items-center justify-center gap-2 text-center" onClick={(e) => e.stopPropagation()}>
          <span className="text-[13px] font-normal text-[var(--ios-label)] px-2">
            {error}
          </span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-[13px] font-medium text-[var(--ios-blue)] active:opacity-60 cursor-pointer"
            >
              {t.refresh || 'Spróbuj ponownie'}
            </button>
          )}
        </div>
      ) : !attendanceData || isPending ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-end justify-between pt-0.5 min-h-[53px]">
            <div className="flex flex-col">
              <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-tight leading-tight">
                {t.attendanceRate}
              </span>
              <div className="w-[88px] h-[34px] rounded-[10px] ios-skeleton mt-1" />
            </div>
            <div className="w-[104px] h-[16px] rounded-full ios-skeleton mb-0.5" />
          </div>
          <div className="w-full h-[6px] rounded-full ios-skeleton" />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 ios-reveal">
          <div
            onClick={canOpenAttendance ? onOpenAttendance : undefined}
            className={cn(
              "flex flex-col gap-2.5 rounded-[8px] p-0.5 -m-0.5 transition-transform",
              canOpenAttendance && "cursor-pointer active:scale-[0.985]"
            )}
          >
            <div className="flex items-end justify-between pt-0.5 min-h-[53px]">
              <div className="flex flex-col">
                <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] leading-tight">
                  {t.attendanceRate}
                </span>
                <span className={`text-[34px] font-semibold tracking-[-0.8px] leading-none mt-1 tabular-nums ${statusColor}`}>
                  {attendanceData.overallPercentage}%
                </span>
              </div>

              <div className="text-right">
                <span className="text-[13px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] tabular-nums">
                  {attendanceData.totalAbsent} / {attendanceData.totalScheduled} {lang === 'en' ? 'missed' : 'opuszczonych'}
                </span>
              </div>
            </div>

            <div className="w-full bg-[var(--ios-element)]/75 h-[6px] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${barBg}`}
                style={{ width: `${Math.min(Math.max(attendanceData.overallPercentage, 0), 100)}%` }}
              />
            </div>
          </div>

          {/* Desktop-only Today Attendance Lesson Line */}
          <div className="hidden md:flex flex-col gap-2 pt-2.5 mt-1 border-t border-[var(--ios-separator)]">
            <div className="flex items-center justify-between text-[12px] font-medium text-[var(--ios-secondary)]">
              <span>{lang === 'en' ? "Today's Attendance" : 'Dzisiejsza obecność'}</span>
              <span className="text-[11px] font-medium text-[var(--ios-secondary)]">
                {todayLegacyDay?.date || todayIso}
              </span>
            </div>

            <div
              onClick={(e) => {
                e.stopPropagation()
                if (onOpenLegacyAttendance) {
                  onOpenLegacyAttendance(todayLegacyDay?.isoDate || todayIso)
                } else {
                  onOpenAttendance()
                }
              }}
              className="flex items-center gap-1.5 p-2 rounded-[12px] bg-[var(--ios-element)]/25 hover:bg-[var(--ios-element)]/45 active:bg-[var(--ios-element)]/65 active:scale-[0.985] transition-all cursor-pointer select-none"
              title={lang === 'en' ? 'Click to open attendance history for today' : 'Kliknij, aby otworzyć historię obecności z tego dnia'}
            >
              {scheduledLessonRange.map((num) => {
                const record = todayLegacyDay?.lessons?.[num]
                if (!record) {
                  return (
                    <div
                      key={num}
                      className="flex-1 h-[28px] rounded-[6px] bg-[var(--ios-element)]/25 border border-transparent flex items-center justify-center text-[10px] text-[var(--ios-secondary)]/50 font-normal select-none"
                      title={`Lekcja #${num}: obecny / brak wpisu`}
                    >
                      ·
                    </div>
                  )
                }

                const isNu = record.type === 'nb'
                const isSp = record.type === 'sp'
                const isU = record.type === 'u'
                const isZw = record.type === 'zw'
                const isSl = record.type === 'sl'

                const badgeClass = isNu
                  ? 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)] border border-[var(--ios-red)]/40 font-semibold'
                  : isSp
                  ? 'bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)] border border-[var(--ios-orange)]/40 font-semibold'
                  : isU
                  ? 'bg-[var(--ios-green-subtle)] text-[var(--ios-green)] border border-[var(--ios-green)]/40 font-semibold'
                  : isZw
                  ? 'bg-[var(--ios-purple-subtle)] text-[var(--ios-purple)] border border-[var(--ios-purple)]/40 font-semibold'
                  : isSl
                  ? 'bg-[var(--ios-yellow)]/20 text-[var(--ios-yellow)] dark:text-[#ffd60a] border border-[var(--ios-yellow)]/40 font-semibold'
                  : 'bg-[var(--ios-element)] text-[var(--ios-label)] border border-[var(--ios-border)] font-medium'

                return (
                  <div
                    key={num}
                    className={cn(
                      "flex-1 h-[28px] rounded-[6px] flex items-center justify-center text-[10px] leading-none select-none",
                      badgeClass
                    )}
                    title={`Lekcja #${num}: ${record.symbol}`}
                  >
                    {record.symbol}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </IosCard>
  )
}
