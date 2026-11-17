/**
 * Feature Component: Multi-Day Range Justification Tab
 * Allows picking a date range (`dateFrom` - `dateTo`) and summarizes eligible unexcused periods to submit.
 * Part of `ManualExcuseScreen`.
 */

'use client'

import { Calendar } from 'lucide-react'
import { AppLanguage, pickText } from '@/config/dictionary.config'
import { UiCard } from '@/components/ui/ui-controls'
import { formatPolishPlural } from '@/utils/text.util'

interface ExcuseRangeTabProps {
  dateFrom: string
  dateTo: string
  daysCount: number
  totalLessons: number
  onChangeDateFrom: (val: string) => void
  onChangeDateTo: (val: string) => void
  lang: AppLanguage
}

export function ExcuseRangeTab({
  dateFrom,
  dateTo,
  daysCount,
  totalLessons,
  onChangeDateFrom,
  onChangeDateTo,
  lang
}: ExcuseRangeTabProps) {
  return (
    <UiCard className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[15px] font-normal text-[var(--ios-label)]">
          {pickText(lang, { pl: 'Od dnia', en: 'From' })}
        </span>
        <label className="relative inline-flex items-center gap-1.5 bg-[var(--ios-input)] shadow-[var(--ios-well-shadow)] text-[var(--ios-label)] text-[13px] font-medium px-3 py-1.5 rounded-full">
          <Calendar className="w-3.5 h-3.5 text-[var(--ios-blue)] shrink-0 pointer-events-none" strokeWidth={2} />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onChangeDateFrom(e.target.value)}
            className="bg-transparent text-[var(--ios-label)] outline-none tabular-nums min-w-[116px]"
            required
          />
        </label>
      </div>

      <div className="h-[0.5px] bg-[var(--ios-separator)]" />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[15px] font-normal text-[var(--ios-label)]">
          {pickText(lang, { pl: 'Do dnia', en: 'To' })}
        </span>
        <label className="relative inline-flex items-center gap-1.5 bg-[var(--ios-input)] shadow-[var(--ios-well-shadow)] text-[var(--ios-label)] text-[13px] font-medium px-3 py-1.5 rounded-full">
          <Calendar className="w-3.5 h-3.5 text-[var(--ios-blue)] shrink-0 pointer-events-none" strokeWidth={2} />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onChangeDateTo(e.target.value)}
            className="bg-transparent text-[var(--ios-label)] outline-none tabular-nums min-w-[116px]"
            required
          />
        </label>
      </div>

      <div className="pt-1 flex items-center justify-between gap-2 text-[11px] text-[var(--ios-secondary)] flex-wrap">
        <span>
          {daysCount}{' '}
          {pickText(lang, {
            pl: `${formatPolishPlural(daysCount, 'dzień', 'dni', 'dni')} w wybranym okresie`,
            en: daysCount === 1 ? 'day' : 'days'
          })}
        </span>
        <span className="font-medium text-[var(--ios-label)] tabular-nums">
          {totalLessons}{' '}
          {pickText(lang, {
            pl: `${formatPolishPlural(totalLessons, 'lekcja', 'lekcje', 'lekcji')} do wysłania`,
            en: totalLessons === 1 ? 'period' : 'periods'
          })}
        </span>
      </div>
    </UiCard>
  )
}
