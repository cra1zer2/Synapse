'use client'

import { useState, useMemo } from 'react'
import { ReceiverItem } from '@/models/message.model'
import { AppDictionary, AppLanguage } from '@/config/dictionary.config'
import { IosCard, IosSearchBar } from '@/components/ios/ios-ui'
import { IosScreen } from '@/components/ios/ios-screen'
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
  const isEn = lang === 'en'

  const capitalize = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1) : ''

  const grouped = useMemo(() => {
    const map: Record<string, ReceiverItem[]> = {}
    receivers.forEach((r) => {
      const g = capitalize(r.group || (isEn ? 'Staff' : 'Pracownicy'))
      if (!map[g]) map[g] = []
      map[g].push(r)
    })
    return map
  }, [receivers, isEn])

  const categories = useMemo(() => {
    return Object.keys(grouped).sort((a, b) => getRolePriority(b) - getRolePriority(a))
  }, [grouped])

  const filtered = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return receivers.filter((r) => r.name.toLowerCase().includes(q))
  }, [receivers, search])

  return (
    <IosScreen
      isOpen={isOpen}
      onClose={onClose}
      title={isEn ? 'Select Recipients' : 'Wybierz odbiorców'}
      backLabel={t.backAction}
      isSubView={true}
      className="z-[80]"
      trailing={
        <button
          type="button"
          onClick={onClose}
          className="text-[17px] font-semibold text-[var(--ios-blue)] active:opacity-60 select-none cursor-pointer"
        >
          {t.done}
        </button>
      }
    >
      <div className="flex flex-col gap-3.5 pb-16 select-none">
        <IosSearchBar
          value={search}
          onChange={setSearch}
          placeholder={isEn ? 'Search staff by name...' : 'Szukaj pracownika...'}
        />

        {search.trim() !== '' ? (
          <IosCard className="divide-y divide-[var(--ios-separator)] overflow-hidden">
            {filtered.length > 0 ? (
              filtered.map((r) => {
                const isSelected = selectedRecipients.some((x) => x.id === r.id)
                return (
                  <div
                    key={r.id}
                    onClick={() => onToggleRecipient(r)}
                    className="p-3.5 px-4 flex items-center justify-between gap-3 hover:bg-[var(--ios-element)]/25 active:bg-[var(--ios-element)]/55 transition-colors duration-100 cursor-pointer"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[15px] font-medium text-[var(--ios-label)] truncate">{r.name}</span>
                      <span className="text-[12px] text-[var(--ios-secondary)]">{capitalize(r.group)}</span>
                    </div>
                    <div className={cn(
                      'w-[22px] h-[22px] rounded-full flex items-center justify-center border-2 transition-all',
                      isSelected ? 'bg-[var(--ios-blue)] border-[var(--ios-blue)] text-white' : 'border-[var(--ios-tertiary)] bg-transparent'
                    )}>
                      {isSelected && (
                        <svg className="w-3.5 h-3.5 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-8 text-center text-[15px] font-normal text-[var(--ios-secondary)]">
                {isEn ? 'No matches found' : 'Brak wyników'}
              </div>
            )}
          </IosCard>
        ) : (
          <IosCard className="overflow-hidden divide-y divide-[var(--ios-separator)]">
            {categories.map((cat) => {
              const items = grouped[cat] || []
              const isCategoryOpen = openCategory === cat
              const selectedCount = items.filter((r) => selectedRecipients.some((x) => x.id === r.id)).length

              return (
                <div key={cat} className="flex flex-col">
                  <div
                    onClick={() => setOpenCategory(isCategoryOpen ? null : cat)}
                    className="p-3.5 px-4 flex items-center justify-between gap-3 hover:bg-[var(--ios-element)]/20 active:bg-[var(--ios-element)]/50 cursor-pointer transition-colors duration-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-[var(--ios-label)]">{cat}</span>
                      <span className="text-[12px] text-[var(--ios-secondary)] tabular-nums">({items.length})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--ios-blue)] text-white text-[11px] font-bold tabular-nums">
                          {selectedCount}
                        </span>
                      )}
                      <svg
                        width="14"
                        height="14"
                        className={cn('text-[var(--ios-secondary)] transition-transform duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]', isCategoryOpen && 'rotate-90')}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </div>

                  <div className={cn(
                    'grid transition-all duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]',
                    isCategoryOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                  )}>
                    <div className="overflow-hidden divide-y divide-[var(--ios-separator)] bg-[var(--ios-element)]/15 border-t border-[var(--ios-separator)]">
                      {items.map((r) => {
                        const isSelected = selectedRecipients.some((x) => x.id === r.id)
                        return (
                          <div
                            key={r.id}
                            onClick={() => onToggleRecipient(r)}
                            className="py-2.5 px-4 pl-6 flex items-center justify-between gap-3 hover:bg-[var(--ios-element)]/20 active:bg-[var(--ios-element)]/50 transition-colors duration-100 cursor-pointer"
                          >
                            <span className="text-[15px] font-normal text-[var(--ios-label)] truncate">{r.name}</span>
                            <div className={cn(
                              'w-[22px] h-[22px] rounded-full flex items-center justify-center border-2 transition-all',
                              isSelected ? 'bg-[var(--ios-blue)] border-[var(--ios-blue)] text-white' : 'border-[var(--ios-tertiary)] bg-transparent'
                            )}>
                              {isSelected && (
                                <svg className="w-3.5 h-3.5 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </IosCard>
        )}
      </div>
    </IosScreen>
  )
}
