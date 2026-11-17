/**
 * Feature Screen: School Staff Recipient Picker
 * Searchable and role-grouped contact selector used inside the message composer.
 * Highlights homeroom teachers and school administration first.
 */

'use client'

import { useState, useMemo } from 'react'
import { Check, ChevronRight, Users } from 'lucide-react'
import { ReceiverItem } from '@/models/message.model'
import { AppDictionary, AppLanguage, pickText } from '@/config/dictionary.config'
import { UiCard, UiSearchBar } from '@/components/ui/ui-controls'
import { UiEmptyState } from '@/components/ui/ui-empty-state'
import { UiScreen } from '@/components/ui/ui-screen'
import { cn } from '@/utils/cn.util'

interface RecipientPickerScreenProps {
  isOpen: boolean
  receivers: ReceiverItem[]
  selectedRecipients: ReceiverItem[]
  onToggleRecipient: (receiver: ReceiverItem) => void
  onClose: () => void
  lang?: AppLanguage
  t: AppDictionary
}

function getRolePriority(group: string): number {
  const g = (group || '').toLowerCase()
  if (g.includes('wychowaw')) return 100
  if (g.includes('dyrekc') || g.includes('dyrektor')) return 90
  if (g.includes('pedagog') || g.includes('psycholog')) return 80
  if (g.includes('nauczyciel')) return 70
  if (g.includes('sekretar')) return 60
  if (g.includes('admin')) return 50
  return 10
}

export function RecipientPickerScreen({
  isOpen,
  receivers,
  selectedRecipients,
  onToggleRecipient,
  onClose,
  lang = 'pl',
  t
}: RecipientPickerScreenProps) {
  const [search, setSearch] = useState('')
  const [openCategory, setOpenCategory] = useState<string | null>(null)

  const capitalize = (str: string) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '')

  const grouped = useMemo(() => {
    const map: Record<string, ReceiverItem[]> = {}
    const fallbackGroup = pickText(lang, { pl: 'Pracownicy', en: 'Staff' })
    receivers.forEach((r) => {
      const g = capitalize(r.group || fallbackGroup)
      if (!map[g]) map[g] = []
      map[g].push(r)
    })
    return map
  }, [receivers, lang])

  const categories = useMemo(() => {
    return Object.keys(grouped).sort((a, b) => getRolePriority(b) - getRolePriority(a))
  }, [grouped])

  const filtered = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return receivers.filter((r) => r.name.toLowerCase().includes(q))
  }, [receivers, search])

  return (
    <UiScreen
      isOpen={isOpen}
      onClose={onClose}
      title={pickText(lang, { pl: 'Wybierz odbiorców', en: 'Select Recipients' })}
      backLabel={t.backAction}
      isSubView={true}
      className="z-[80]"
      trailing={
        <button
          type="button"
          onClick={onClose}
          className="text-[17px] font-semibold text-[var(--ios-blue)] leading-none active:opacity-60 select-none h-full flex items-center cursor-pointer"
        >
          {t.done}
        </button>
      }
    >
      <div className="flex flex-col gap-3.5 pb-16 select-none">
        <UiSearchBar
          value={search}
          onChange={setSearch}
          placeholder={pickText(lang, { pl: 'Szukaj pracownika...', en: 'Search staff by name...' })}
        />

        {search.trim() !== '' ? (
          <UiCard className="divide-y divide-[var(--ios-separator)] overflow-hidden">
            {filtered.length > 0 ? (
              filtered.map((r) => {
                const isSelected = selectedRecipients.some((x) => x.id === r.id)
                return (
                  <div
                    key={r.id}
                    onClick={() => onToggleRecipient(r)}
                    className="p-3.5 px-4 flex items-center justify-between gap-3 hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)] transition-colors duration-150 cursor-pointer"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[15px] font-medium text-[var(--ios-label)] truncate">{r.name}</span>
                      <span className="text-[12px] text-[var(--ios-secondary)]">{capitalize(r.group)}</span>
                    </div>
                    <div
                      className={cn(
                        'w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all shrink-0',
                        'border-[0.5px]',
                        isSelected
                          ? 'bg-[var(--ios-blue)] border-[var(--ios-blue)] text-white shadow-[var(--ios-primary-pill-shadow)]'
                          : 'border-[var(--ios-separator)] ios-well'
                      )}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                    </div>
                  </div>
                )
              })
            ) : (
              <UiEmptyState
                compact
                iconTone="neutral"
                icon={<Users className="w-[20px] h-[20px]" strokeWidth={1.9} />}
                title={pickText(lang, { pl: 'Brak wyników', en: 'No matches found' })}
              />
            )}
          </UiCard>
        ) : (
          <UiCard className="overflow-hidden divide-y divide-[var(--ios-separator)]">
            {categories.map((cat) => {
              const items = grouped[cat] || []
              const isCategoryOpen = openCategory === cat
              const selectedCount = items.filter((r) => selectedRecipients.some((x) => x.id === r.id)).length

              return (
                <div key={cat} className="flex flex-col">
                  <div
                    onClick={() => setOpenCategory(isCategoryOpen ? null : cat)}
                    className="p-3.5 px-4 flex items-center justify-between gap-3 hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)] cursor-pointer transition-colors duration-150"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[15px] font-semibold text-[var(--ios-label)] truncate">{cat}</span>
                      <span className="text-[12px] text-[var(--ios-secondary)] tabular-nums shrink-0">
                        ({items.length})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {selectedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--ios-blue)] text-white shadow-[var(--ios-primary-pill-shadow)] text-[11px] font-bold tabular-nums">
                          {selectedCount}
                        </span>
                      )}
                      <ChevronRight
                        className={cn(
                          'w-3.5 h-3.5 text-[var(--ios-secondary)] transition-transform duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]',
                          isCategoryOpen && 'rotate-90'
                        )}
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>

                  {isCategoryOpen && (
                    <div
                      className={cn(
                        'divide-y divide-[var(--ios-separator)] border-t [border-top-width:0.5px] border-[var(--ios-separator)]',
                        'bg-[var(--bg-card-secondary)] ios-well'
                      )}
                    >
                      {items.map((r) => {
                        const isSelected = selectedRecipients.some((x) => x.id === r.id)
                        return (
                          <div
                            key={r.id}
                            onClick={() => onToggleRecipient(r)}
                            className="py-2.5 px-4 pl-6 flex items-center justify-between gap-3 hover:bg-[var(--ios-row-hover)] active:bg-[var(--ios-row-active)] transition-colors duration-150 cursor-pointer"
                          >
                            <span className="text-[15px] font-normal text-[var(--ios-label)] truncate">{r.name}</span>
                            <div
                              className={cn(
                                'w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all shrink-0',
                                'border-[0.5px]',
                                isSelected
                                  ? 'bg-[var(--ios-blue)] border-[var(--ios-blue)] text-white shadow-[var(--ios-primary-pill-shadow)]'
                                  : 'border-[var(--ios-separator)] bg-[var(--ios-card-solid)] ios-tile'
                              )}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </UiCard>
        )}
      </div>
    </UiScreen>
  )
}
