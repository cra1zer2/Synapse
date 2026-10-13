'use client'

import { useState } from 'react'
import { IosListGroup, IosListCell } from '@/components/ios/ios-list'
import { IosSwitch } from '@/components/ios/ios-switch'

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
        description: 'Trzy lekcje: przeszła, aktualna i kolejna z przerwami',
        icon: '⏱️'
    },
    {
        id: 'next_lesson',
        title: 'Następna lekcja',
        description: 'Bieżący przedmiot, gabinet i czas trwania',
        icon: '⏱️'
    },
    {
        id: 'attendance',
        title: 'Frekwencja ogólna',
        description: 'Procent obecności z alertem progu 50%',
        icon: '🩺'
    },
    {
        id: 'gpa',
        title: 'Średnia ocen (GPA)',
        description: 'Aktualna średnia ważona wszystkich przedmiotów',
        icon: '📊'
    },
    {
        id: 'messages',
        title: 'Wiadomości',
        description: 'Licznik nieprzeczytanych wiadomości i ogłoszeń',
        icon: '💬'
    },
    {
        id: 'lucky_number',
        title: 'Szczęśliwy numerek',
        description: 'Numer zwalniający z pytania na dany день',
        icon: '🍀'
    },
    {
        id: 'changes',
        title: 'Zastępstwa i zmiany',
        description: 'Liczba odwołanych lekcji i zastępstw na dziś',
        icon: '🔄'
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

    if (!isOpen) return null

    const toggleWidget = (id: DashboardWidgetId, checked: boolean) => {
        setLocalActive((prev) => ({
            ...prev,
            [id]: checked
        }))
    }

    const moveWidget = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= localOrder.length) return

        const updated = [...localOrder]
        const temp = updated[index]
        updated[index] = updated[targetIndex]
        updated[targetIndex] = temp
        setLocalOrder(updated)
    }

    const handleConfirm = () => {
        onSave(localOrder, localActive)
        onClose()
    }

    const enabledIds = localOrder.filter((id) => localActive[id])
    const disabledIds = localOrder.filter((id) => !localActive[id])

    return (
        <div className="fixed inset-0 z-50 bg-[var(--ios-bg)] flex flex-col animate-in fade-in duration-200">
            <header className="sticky top-0 z-10 w-full pt-12 pb-3 px-4 bg-[var(--ios-bg)]/85 backdrop-blur-xl border-b border-[var(--ios-separator)] flex items-center justify-between">
                <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-[var(--ios-element)] text-[var(--ios-label)] flex items-center justify-center active:scale-95 transition-transform"
                    aria-label="Close"
                >
                    ✕
                </button>

                <h2 className="text-sm font-semibold text-[var(--ios-label)] tracking-tight">
                    Dostosuj pulpit
                </h2>

                <button
                    type="button"
                    onClick={handleConfirm}
                    className="text-xs font-semibold text-[var(--ios-blue)] active:opacity-70 px-2 py-1"
                >
                    Gotowe
                </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5 max-w-lg mx-auto w-full pb-10">
                <IosListGroup
                    header="Widżety na pulpicie"
                    footer="Użyj strzałek, aby zmienić kolejność wyświetlania modułów."
                >
                    {enabledIds.map((id, index) => {
                        const meta = DEFAULT_WIDGET_CONFIGS.find((w) => w.id === id)
                        if (!meta) return null

                        return (
                            <IosListCell
                                key={id}
                                leading={
                                    <div className="w-8 h-8 rounded-[10px] bg-[var(--ios-element)]/60 flex items-center justify-center text-sm">
                                        {meta.icon}
                                    </div>
                                }
                                title={meta.title}
                                subtitle={meta.description}
                                trailing={
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-0.5">
                                            <button
                                                type="button"
                                                disabled={index === 0}
                                                onClick={() => moveWidget(index, 'up')}
                                                className="w-7 h-7 rounded-[8px] bg-[var(--ios-element)]/60 text-[var(--ios-label)] flex items-center justify-center disabled:opacity-25 active:scale-90 transition-all text-xs font-bold"
                                                aria-label="Move up"
                                            >
                                                ▲
                                            </button>
                                            <button
                                                type="button"
                                                disabled={index === enabledIds.length - 1}
                                                onClick={() => moveWidget(index, 'down')}
                                                className="w-7 h-7 rounded-[8px] bg-[var(--ios-element)]/60 text-[var(--ios-label)] flex items-center justify-center disabled:opacity-25 active:scale-90 transition-all text-xs font-bold"
                                                aria-label="Move down"
                                            >
                                                ▼
                                            </button>
                                        </div>

                                        <IosSwitch
                                            checked={true}
                                            onChange={(val) => toggleWidget(id, val)}
                                        />
                                    </div>
                                }
                            />
                        )
                    })}
                </IosListGroup>

                {disabledIds.length > 0 && (
                    <IosListGroup header="Ukryte widżety">
                        {disabledIds.map((id) => {
                            const meta = DEFAULT_WIDGET_CONFIGS.find((w) => w.id === id)
                            if (!meta) return null

                            return (
                                <IosListCell
                                    key={id}
                                    leading={
                                        <div className="w-8 h-8 rounded-[10px] bg-[var(--ios-element)]/60 opacity-60 flex items-center justify-center text-sm">
                                            {meta.icon}
                                        </div>
                                    }
                                    title={meta.title}
                                    subtitle={meta.description}
                                    trailing={
                                        <IosSwitch
                                            checked={false}
                                            onChange={(val) => toggleWidget(id, val)}
                                        />
                                    }
                                />
                            )
                        })}
                    </IosListGroup>
                )}
            </div>
        </div>
    )
}