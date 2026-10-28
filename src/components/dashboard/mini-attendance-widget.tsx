'use client'

import { AttendanceResult } from '@/models/attendance.model'
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
}

export function MiniAttendanceWidget({
  attendanceData,
  isLoading = false,
  error = null,
  onRetry,
  lang = 'pl',
  t,
  onOpenAttendance
}: MiniAttendanceWidgetProps) {
  const isPending = isLoading || (!attendanceData && !error)
  const isDanger = attendanceData?.overallStatus === 'danger'
  const isWarning = attendanceData?.overallStatus === 'warning'

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
        </div>
      )}
    </IosCard>
  )
}
