'use client'

import { useMemo } from 'react'
import { AttendanceResult, LegacyAttendanceDay } from '@/models/attendance.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosCard } from '@/components/ios/ios-ui'

interface MiniAttendanceWidgetProps {
  attendanceData: AttendanceResult | null
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  lang?: AppLanguage
  t: AppDictionary
  onOpenAttendance: () => void
  onOpenLegacyAttendance?: (dateIso?: string) => void
  isDesktop?: boolean
}

const lessonCols = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

export function MiniAttendanceWidget({
  attendanceData,
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

  const todayLegacyDay = useMemo(() => {
    if (!attendanceData?.legacyTable?.days) return null
    return (
      attendanceData.legacyTable.days.find((d) => d.isoDate === todayIso) ||
      attendanceData.legacyTable.days[0] ||
      null
    )
  }, [attendanceData, todayIso])

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

  return (
    <IosCard
      onClick={!attendanceData && (isPending || error) ? undefined : onOpenAttendance}
      className="p-4 flex flex-col gap-3 select-none"
    >
      <div className="flex items-center justify-between pb-2.5 border-b border-[var(--ios-separator)]">
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

          {/* Desktop-only Today Attendance Detail */}
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
              className="p-2.5 rounded-[12px] bg-[var(--ios-element)]/30 hover:bg-[var(--ios-element)]/50 active:bg-[var(--ios-element)]/70 transition-colors cursor-pointer select-none flex flex-col gap-1.5"
              title={lang === 'en' ? 'Click to open attendance history for today' : 'Kliknij, aby otworzyć historię obecności z tego dnia'}
            >
              {todayLegacyDay && Object.keys(todayLegacyDay.lessons || {}).length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {Object.entries(todayLegacyDay.lessons)
                    .map(([num, val]) => ({ lessonNumber: Number(num), ...val }))
                    .sort((a, b) => a.lessonNumber - b.lessonNumber)
                    .map((l) => {
                      const isNu = l.type === 'nb'
                      const isU = l.type === 'u'
                      const isSp = l.type === 'sp'
                      const isZw = l.type === 'zw'
                      const isSl = l.type === 'sl'

                      const badgeClass = isNu
                        ? 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)] border-[var(--ios-red)]/30 font-semibold'
                        : isU
                        ? 'bg-[var(--ios-green-subtle)] text-[var(--ios-green)] border-[var(--ios-green)]/30 font-semibold'
                        : isSp
                        ? 'bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)] border-[var(--ios-orange)]/30 font-semibold'
                        : isZw
                        ? 'bg-[var(--ios-purple-subtle)] text-[var(--ios-purple)] border-[var(--ios-purple)]/30 font-semibold'
                        : isSl
                        ? 'bg-[var(--ios-yellow)]/20 text-[var(--ios-yellow)] dark:text-[#ffd60a] border-[var(--ios-yellow)]/40 font-semibold'
                        : 'bg-[var(--ios-element)] text-[var(--ios-label)] border-[var(--ios-border)]'

                      return (
                        <span
                          key={l.lessonNumber}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[12px] border ${badgeClass}`}
                        >
                          <span className="opacity-75">#{l.lessonNumber}</span>
                          <span>{l.symbol}</span>
                        </span>
                      )
                    })}
                  <span className="ml-auto text-[11px] font-medium text-[var(--ios-blue)]">
                    {lang === 'en' ? 'Details ›' : 'Szczegóły ›'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[12px] text-[var(--ios-secondary)] py-0.5">
                  <span className="flex items-center gap-1.5 text-[var(--ios-green)] font-medium">
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{lang === 'en' ? 'All lessons attended / no absences' : 'Brak nieobecności dzisiaj'}</span>
                  </span>
                  <span className="text-[11px] font-medium text-[var(--ios-blue)]">
                    {lang === 'en' ? 'History ›' : 'Historia ›'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </IosCard>
  )
}
