'use client'

import { GradesResult, GradeItem } from '@/models/grade.model'
import { AppDictionary } from '@/config/dictionary.config'
import { IosCard } from '@/components/ios/ios-ui'

interface MiniGradesWidgetProps {
  gradesData: GradesResult | null
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  t: AppDictionary
  onOpenGrades: () => void
}

function getGradeBadgeStyle(gradeStr: string): string {
  const g = gradeStr.trim().toLowerCase()
  if (g.startsWith('1')) {
    return 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)] border border-[var(--ios-red)]/20'
  }
  return 'bg-[var(--ios-element)] text-[var(--ios-label)] border border-[var(--ios-separator)]/40'
}

export function MiniGradesWidget({
  gradesData,
  isLoading = false,
  error = null,
  onRetry,
  t,
  onOpenGrades
}: MiniGradesWidgetProps) {
  const isPending = isLoading || (!gradesData && !error)
  const avg = gradesData?.overallAverage
  const formattedAvg = avg !== null && avg !== undefined ? avg.toFixed(2) : '—'
  const isDanger = typeof avg === 'number' && avg < 2.0
  const recentGrades: GradeItem[] = gradesData?.recentGrades?.slice(0, 4) || []

  return (
    <IosCard
      onClick={!gradesData && (isPending || error) ? undefined : onOpenGrades}
      className="p-4 flex flex-col gap-3 select-none"
    >
      <div className="flex items-center justify-between pb-2.5 border-b border-[var(--ios-separator)]">
        <span className="text-[16px] font-semibold text-[var(--ios-label)] tracking-[-0.2px]">
          {t.grades}
        </span>

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

      {error && !gradesData ? (
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
      ) : isPending ? (
        <div className="flex items-end justify-between pt-0.5 min-h-[53px]">
          <div className="flex flex-col">
            <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-tight leading-tight">
              {t.gpaTitle}
            </span>
            <div className="w-[74px] h-[34px] rounded-[10px] ios-skeleton mt-1" />
          </div>
          <div className="flex items-center gap-1.5 pb-0.5">
            <div className="w-[28px] h-[28px] rounded-[8px] ios-skeleton" />
            <div className="w-[28px] h-[28px] rounded-[8px] ios-skeleton" />
            <div className="w-[28px] h-[28px] rounded-[8px] ios-skeleton" />
            <div className="w-[28px] h-[28px] rounded-[8px] ios-skeleton" />
          </div>
        </div>
      ) : (
        <div className="flex items-end justify-between pt-0.5 min-h-[53px] ios-reveal">
          <div className="flex flex-col">
            <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] leading-tight">
              {t.gpaTitle}
            </span>
            <span className={`text-[34px] font-semibold tracking-[-0.8px] leading-none mt-1 tabular-nums ${isDanger ? 'text-[var(--ios-red)]' : 'text-[var(--ios-label)]'}`}>
              {formattedAvg}
            </span>
          </div>

          {recentGrades.length > 0 && (
            <div className="flex items-center gap-1.5 pb-0.5">
              {recentGrades.map((g, idx) => (
                <span
                  key={idx}
                  className={`min-w-[28px] h-[28px] px-1.5 rounded-[8px] flex items-center justify-center text-[13px] font-medium tabular-nums ${getGradeBadgeStyle(g.grade)}`}
                >
                  {g.grade}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </IosCard>
  )
}
