'use client'

import { Calendar } from 'lucide-react'
import { AppLanguage } from '@/config/dictionary.config'
import { IosCard } from '@/components/ios/ios-ui'
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
    <IosCard className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[15px] font-normal text-[var(--ios-label)]">
          {lang === 'en' ? 'From' : 'Od dnia'}
        </span>
        <label className="relative inline-flex items-center gap-1.5 bg-[var(--ios-input)] text-[var(--ios-label)] text-[13px] font-medium px-3 py-1.5 rounded-full">
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

      <div className="h-[1px] bg-[var(--ios-separator)]" />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[15px] font-normal text-[var(--ios-label)]">
          {lang === 'en' ? 'To' : 'Do dnia'}
        </span>
        <label className="relative inline-flex items-center gap-1.5 bg-[var(--ios-input)] text-[var(--ios-label)] text-[13px] font-medium px-3 py-1.5 rounded-full">
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
          {lang === 'en'
            ? daysCount === 1
              ? 'day'
              : 'days'
            : formatPolishPlural(daysCount, 'dzień', 'dni', 'dni') + ' w wybranym okresie'}
        </span>
        <span className="font-medium text-[var(--ios-label)] tabular-nums">
          {totalLessons}{' '}
          {lang === 'en'
            ? totalLessons === 1
              ? 'period'
              : 'periods'
            : formatPolishPlural(totalLessons, 'lekcja', 'lekcje', 'lekcji') + ' do wysłania'}
        </span>
      </div>
    </IosCard>
  )
}
