/**
 * Feature Screen: Submitted Justifications Status History
 * Displays filterable justification requests fetched live from Librus Synergia alongside teacher comments.
 * Adapts status badges and timestamps using the active language configuration.
 */

'use client'

import { CheckSquare } from 'lucide-react'
import { LiveJustificationItem } from '@/models/justification.model'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { UiScreen } from '@/components/ui/ui-screen'
import { UiBadge } from '@/components/ui/ui-badge'
import { UiCard, UiSegmentedControl } from '@/components/ui/ui-controls'
import { UiEmptyState } from '@/components/ui/ui-empty-state'
import { UiSpinner } from '@/components/ui/ui-spinner'
import { formatHumanDate } from '@/utils/date.util'
import { getJustificationStatusMeta } from '@/utils/badge.util'

interface LiveJustificationsScreenProps {
  isOpen: boolean
  onClose: () => void
  isLoading: boolean
  filter: '0' | '1' | '2' | '3'
  onChangeFilter: (status: '0' | '1' | '2' | '3') => void
  onRefresh: () => void
  items: LiveJustificationItem[]
  lang: AppLanguage
  t: AppDictionary
}

function mapStatusToCode(item: LiveJustificationItem): number | string {
  if (item.statusCode === 'accepted') return 1
  if (item.statusCode === 'rejected') return 2
  if (item.statusCode === 'pending') return 0
  return item.statusRaw || 0
}

export function LiveJustificationsScreen({
  isOpen,
  onClose,
  isLoading,
  filter,
  onChangeFilter,
  onRefresh,
  items,
  lang,
  t
}: LiveJustificationsScreenProps) {
  return (
    <UiScreen
      isOpen={isOpen}
      onClose={onClose}
      title={t.liveJustificationsTitle}
      backLabel={t.backAction}
      isSubView={true}
      className="z-[75]"
      trailing={
        <button
          type="button"
          onClick={onRefresh}
          className="text-[var(--ios-blue)] text-[16px] font-normal leading-none active:opacity-60 select-none h-full flex items-center cursor-pointer"
        >
          {t.refresh}
        </button>
      }
    >
      <div className="flex flex-col gap-3.5 pb-16 select-none w-full">
        <UiSegmentedControl<'0' | '1' | '2' | '3'>
          value={filter}
          onChange={onChangeFilter}
          options={[
            { id: '0', label: pickText(lang, { pl: 'Wszystkie', en: 'All' }) },
            { id: '1', label: pickText(lang, { pl: 'Wysłane', en: 'Sent' }) },
            { id: '2', label: pickText(lang, { pl: 'Przyjęte', en: 'Accepted' }) },
            { id: '3', label: pickText(lang, { pl: 'Odrzucone', en: 'Rejected' }) }
          ]}
        />

        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <UiSpinner size="large" className="text-[var(--ios-blue)]" />
            <span className="text-[13px] font-normal text-[var(--ios-secondary)]">
              {pickText(lang, { pl: 'Wczytywanie historii z Synergii...', en: 'Loading justification history...' })}
            </span>
          </div>
        ) : items.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {items.map((item) => {
              const meta = getJustificationStatusMeta(mapStatusToCode(item), t)
              const countWord = pickText(lang, {
                pl: item.count === 1 ? 'nieobecność' : 'nieobecności',
                en: item.count === 1 ? 'period' : 'periods'
              })

              return (
                <UiCard key={item.id} className="p-4 flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[15px] font-semibold text-[var(--ios-label)] leading-snug">
                        {item.periodStr}
                      </span>
                      <span className="text-[12px] font-normal text-[var(--ios-secondary)] mt-0.5 tabular-nums">
                        {item.count} {countWord} • {pickText(lang, { pl: 'Wysłano', en: 'Sent' })}:{' '}
                        {formatHumanDate(item.sentAt, true, lang)}
                      </span>
                    </div>

                    <UiBadge variant={meta.variant} size="sm" text={meta.label} />
                  </div>

                  {item.comment && (
                    <div className="ios-well p-3 rounded-[16px] text-[13px] text-[var(--ios-label)]">
                      <span className="text-[var(--ios-secondary)]">
                        {pickText(lang, { pl: 'Uzasadnienie: ', en: 'Note: ' })}
                      </span>
                      {item.comment}
                    </div>
                  )}

                  {item.teacher && (
                    <div className="text-[12px] text-[var(--ios-secondary)] flex items-center justify-between pt-1.5 [border-top-width:0.5px] border-t border-[var(--ios-separator)]">
                      <span>{t.teacherLabel}:</span>
                      <span className="text-[var(--ios-label)] font-medium">{item.teacher}</span>
                    </div>
                  )}
                </UiCard>
              )
            })}
          </div>
        ) : (
          <UiEmptyState
            inCard
            iconTone="neutral"
            icon={<CheckSquare className="w-[22px] h-[22px]" strokeWidth={1.9} />}
            title={t.liveJustificationsEmpty}
          />
        )}
      </div>
    </UiScreen>
  )
}
