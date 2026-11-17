/**
 * Feature Widget: Mini Grades Summary Card
 * Displays overall weighted GPA and up to five recent grades on the home dashboard.
 * Computes averages using standard Polish modifiers and links directly to grade details.
 */

'use client'

import { useMemo } from 'react'
import { GradesResult, GradeItem } from '@/models/grade.model'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { UiCard } from '@/components/ui/ui-controls'
import { calculateSubjectWeightedAverage } from '@/utils/grade.util'
import { getGradeBadgeStyle } from '@/utils/badge.util'
import { cn } from '@/utils/cn.util'

interface MiniGradesWidgetProps {
  gradesData: GradesResult | null
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  lang?: AppLanguage
  t: AppDictionary
  onOpenGrades: () => void
  onSelectGrade?: (grade: GradeItem) => void
}

export function MiniGradesWidget({
  gradesData,
  isLoading = false,
  error = null,
  onRetry,
  lang = 'pl',
  t,
  onOpenGrades,
  onSelectGrade
}: MiniGradesWidgetProps) {
  const isPending = isLoading || (!gradesData && !error)

  const avg = useMemo(() => {
    if (!gradesData) return null
    if (!gradesData.subjects || gradesData.subjects.length === 0) {
      return gradesData.overallAverage
    }

    let sum = 0
    let count = 0

    for (const sub of gradesData.subjects) {
      const allGrades = [...(sub.semester1 || []), ...(sub.semester2 || [])].map((g) => ({
        value: g.grade,
        weight: g.weight,
        countsToAverage: g.numericValue !== null
      }))
      const subAvg = calculateSubjectWeightedAverage(allGrades)
      if (subAvg !== null) {
        sum += subAvg
        count++
      }
    }

    if (count === 0) return gradesData.overallAverage
    return Math.round((sum / count) * 100) / 100
  }, [gradesData])

  const formattedAvg = avg !== null && avg !== undefined ? avg.toFixed(2) : '—'
  const isDanger = typeof avg === 'number' && avg < 2.0
  const recentGrades: GradeItem[] = gradesData?.recentGrades?.slice(0, 5) || []
  const canOpenGrades = Boolean(gradesData && !isPending)

  return (
    <UiCard
      onClick={canOpenGrades ? onOpenGrades : undefined}
      className={cn(
        'overflow-hidden flex flex-col select-none',
        canOpenGrades && 'hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)] transition-colors duration-150'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between',
          'px-4 h-[46px] [border-bottom-width:0.5px] border-b border-[var(--ios-separator)]'
        )}
      >
        <span
          className={cn(
            'text-[var(--ios-label)]',
            'text-[15px] font-semibold tracking-[-0.2px]'
          )}
        >
          {t.grades}
        </span>

        <svg width="16" height="16" className="w-4 h-4 text-[var(--ios-tertiary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {error && !gradesData ? (
        <div className="px-4 py-5 flex flex-col items-center justify-center gap-2 text-center" onClick={(e) => e.stopPropagation()}>
          <span className="text-[13px] font-normal text-[var(--ios-label)] px-2">{error}</span>
          {onRetry && (
            <button type="button" onClick={onRetry} className="text-[13px] font-medium text-[var(--ios-blue)] active:opacity-60 cursor-pointer">
              {t.refresh || pickText(lang, { pl: 'Spróbuj ponownie', en: 'Try again' })}
            </button>
          )}
        </div>
      ) : isPending ? (
        <div className={cn('flex items-start justify-between gap-3 min-h-[76px]', 'px-4 py-3.5')}>
          <div className="flex flex-col shrink-0">
            <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-tight leading-tight">
              {t.gpaTitle}
            </span>
            <div className="w-[74px] h-[34px] rounded-[12px] ios-skeleton mt-1.5" />
          </div>
          <div className="flex flex-col items-end min-w-0">
            <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-tight leading-tight mb-1.5 text-right">
              {pickText(lang, { pl: 'Ostatnie', en: 'Recent' })}
            </span>
            <div className="flex items-center gap-1.5">
              <div className="w-[30px] h-[30px] rounded-[10px] ios-skeleton" />
              <div className="w-[30px] h-[30px] rounded-[10px] ios-skeleton" />
              <div className="w-[30px] h-[30px] rounded-[10px] ios-skeleton" />
              <div className="w-[30px] h-[30px] rounded-[10px] ios-skeleton" />
            </div>
          </div>
        </div>
      ) : (
        <div className={cn('flex items-start justify-between gap-3 min-h-[76px] ios-reveal', 'px-4 py-3.5')}>
          <div className="flex flex-col shrink-0">
            <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] leading-tight">
              {t.gpaTitle}
            </span>
            <span
              className={cn(
                'leading-none mt-1.5 tabular-nums',
                'text-[32px] sm:text-[34px] font-semibold tracking-[-0.8px]',
                isDanger ? 'text-[var(--ios-red)]' : 'text-[var(--ios-label)]'
              )}
            >
              {formattedAvg}
            </span>
          </div>

          {recentGrades.length > 0 && (
            <div className="flex flex-col items-end min-w-0">
              <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-[-0.1px] leading-tight mb-1.5 text-right">
                {pickText(lang, { pl: 'Ostatnie', en: 'Recent' })}
              </span>
              <div className="flex items-center justify-end flex-wrap gap-1.5">
                {recentGrades.map((g, idx) => {
                  const style = getGradeBadgeStyle(g.grade)
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectGrade?.(g)
                      }}
                      title={(g.subject || '') + ': ' + g.grade + (g.category ? ' (' + g.category + ')' : '')}
                      className={cn(
                        'flex items-center justify-center text-[13px] font-semibold tabular-nums cursor-pointer hover:opacity-80 active:scale-[0.92] transition-all select-none',
                        'min-w-[26px] sm:min-w-[28px] h-[26px] sm:h-[28px] px-1.5 rounded-[8px] ios-tile',
                        idx === 4 && 'hidden sm:flex',
                        style.bg,
                        style.text
                      )}
                    >
                      {g.grade}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </UiCard>
  )
}
