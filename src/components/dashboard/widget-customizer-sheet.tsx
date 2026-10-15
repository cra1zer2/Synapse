'use client'

import { useState } from 'react'
import { IosListGroup, IosListCell } from '@/components/ios/ios-list'
import { IosSwitch } from '@/components/ios/ios-switch'
import { IosSubView } from '@/components/ios/ios-subview'

export type DashboardWidgetId =
    | 'mini_schedule'
    | 'next_lesson'
    | 'attendance'
    | 'gpa'
    | 'messages'
    | 'lucky_number'
    | 'changes'

export interface WidgetMeta {
    id: DashboardWidgetId
    title: string
    description: string
    icon: string
}

export const DEFAULT_WIDGET_CONFIGS: WidgetMeta[] = [
    {
        id: 'mini_schedule',
        title: 'Podgląd planu lekcji',
        description: 'Dwie lekcje: aktualna i kolejna z przerwą między nimi',
        icon: '⏱️'
    }
]

interface WidgetCustomizerSheetProps {
    isOpen: boolean
    onClose: () => void
    currentOrder: DashboardWidgetId[]
    activeMap: Record<DashboardWidgetId, boolean>
    onSave: (order: DashboardWidgetId[], active: Record<DashboardWidgetId, boolean>) => void
}

export function WidgetCustomizerSheet({
    isOpen,
    onClose,
    currentOrder,
    activeMap,
    onSave
}: WidgetCustomizerSheetProps) {
    const [localOrder, setLocalOrder] = useState<DashboardWidgetId[]>(currentOrder)
    const [localActive, setLocalActive] = useState<Record<DashboardWidgetId, boolean>>(activeMap)

    const toggleWidget = (id: DashboardWidgetId, checked: boolean) => {
        const updatedActive = {
            ...localActive,
            [id]: checked
        }
        setLocalActive(updatedActive)
        onSave(localOrder, updatedActive)
    }

    const moveWidget = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= localOrder.length) return

        const updated = [...localOrder]
        const temp = updated[index]
        updated[index] = updated[targetIndex]
        updated[targetIndex] = temp
        setLocalOrder(updated)
        onSave(updated, localActive)
    }

    return (
        <IosSubView
            isOpen={isOpen}
            onClose={onClose}
            title="Dostosuj pulpit"
            backLabel="Wróć"
        >
            <IosListGroup
                header="Widżety na pulpicie"
                footer="Wyłączaj lub zmieniaj kolejność modułów wyświetlanych na głównym pulpicie."
            >
                {localOrder.map((id, index) => {
                    const meta = DEFAULT_WIDGET_CONFIGS.find((w) => w.id === id)
                    if (!meta) return null
                    const isEnabled = Boolean(localActive[id])

                    return (
                        <IosListCell
                            key={id}
                            leading={
                                <div className={`w-8 h-8 rounded-[10px] bg-[var(--ios-element)]/60 flex items-center justify-center text-sm transition-opacity ${isEnabled ? 'opacity-100' : 'opacity-40'}`}>
                                    {meta.icon}
                                </div>
                            }
                            title={
                                <span className={isEnabled ? 'opacity-100' : 'opacity-50'}>
                                    {meta.title}
                                </span>
                            }
                            subtitle={meta.description}
                            trailing={
                                <div className="flex items-center gap-2">
                                    {localOrder.length > 1 && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                disabled={index === 0}
                                                onClick={() => moveWidget(index, 'up')}
                                                className="w-6 h-6 flex items-center justify-center text-[var(--ios-secondary)] hover:text-[var(--ios-label)] disabled:opacity-20 active:scale-90 transition-all"
                                                aria-label="Move up"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="18 15 12 9 6 15" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                disabled={index === localOrder.length - 1}
                                                onClick={() => moveWidget(index, 'down')}
                                                className="w-6 h-6 flex items-center justify-center text-[var(--ios-secondary)] hover:text-[var(--ios-label)] disabled:opacity-20 active:scale-90 transition-all"
                                                aria-label="Move down"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}

                                    <IosSwitch
                                        checked={isEnabled}
                                        onChange={(val) => toggleWidget(id, val)}
                                    />
                                </div>
                            }
                        />
                    )
                })}
            </IosListGroup>
        </IosSubView>
    )
}