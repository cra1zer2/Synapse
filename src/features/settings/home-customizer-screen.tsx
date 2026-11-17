/**
 * Feature Screen: Home Dashboard Customizer
 * Controls navigation mode (`widgets` vs `tabs`) and animated widget ordering/visibility.
 * Sources widget labels and icons directly from `getDashboardWidgetMeta` in `widget-registry.tsx`.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowUpToLine, ChevronUp, ChevronDown } from 'lucide-react'
import { AppDictionary, AppLanguage, NavMode, pickText } from '@/config/dictionary.config'
import { DashboardWidgetId, DEFAULT_DASHBOARD_ORDER } from '@/hooks/settings.hook'
import { getDashboardWidgetMeta } from '@/features/dashboard/widget-registry'
import { UiScreen } from '@/components/ui/ui-screen'
import { UiSwitch } from '@/components/ui/ui-switch'
import { UiCard, UiSegmentedControl } from '@/components/ui/ui-controls'
import { cn } from '@/utils/cn.util'

interface HomeCustomizerScreenProps {
  isOpen: boolean
  onClose: () => void
  navMode?: NavMode
  onSelectNavMode?: (mode: NavMode) => void
  dashboardOrder: DashboardWidgetId[]
  onChangeDashboardOrder?: (newOrder: DashboardWidgetId[]) => void
  dashboardVisible: Record<DashboardWidgetId, boolean>
  onToggleDashboardWidget?: (id: DashboardWidgetId, val: boolean) => void
  currentLang: AppLanguage
  t: AppDictionary
}

export function HomeCustomizerScreen({
  isOpen,
  onClose,
  navMode = 'widgets',
  onSelectNavMode,
  dashboardOrder,
  onChangeDashboardOrder,
  dashboardVisible,
  onToggleDashboardWidget,
  currentLang,
  t
}: HomeCustomizerScreenProps) {
  const [movingWidgetId, setMovingWidgetId] = useState<DashboardWidgetId | null>(null)
  const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current)
    }
  }, [])

  const enabledList = dashboardOrder.filter((id) => dashboardVisible[id])
  const disabledList = dashboardOrder.filter((id) => !dashboardVisible[id])

  const ROW_HEIGHT = 64
  const GAP = 10
  const STEP = ROW_HEIGHT + GAP
  const HIDDEN_HEADER_OFFSET = enabledList.length > 0 ? 44 : 28

  const totalHeight =
    enabledList.length * STEP +
    (disabledList.length > 0 ? HIDDEN_HEADER_OFFSET + disabledList.length * STEP : 0)

  const triggerMoveAnimation = (id: DashboardWidgetId) => {
    setMovingWidgetId(id)
    if (moveTimerRef.current) clearTimeout(moveTimerRef.current)
    moveTimerRef.current = setTimeout(() => {
      setMovingWidgetId((curr) => (curr === id ? null : curr))
    }, 520)
  }

  const handleMoveWidget = (id: DashboardWidgetId, direction: -1 | 1) => {
    if (!onChangeDashboardOrder) return
    const activeIds = dashboardOrder.filter((item) => dashboardVisible[item])
    const inactiveIds = dashboardOrder.filter((item) => !dashboardVisible[item])
    const idx = activeIds.indexOf(id)
    const targetIdx = idx + direction
    if (idx < 0 || targetIdx < 0 || targetIdx >= activeIds.length) return

    triggerMoveAnimation(id)
    const nextActive = [...activeIds]
    const temp = nextActive[idx]
    nextActive[idx] = nextActive[targetIdx]
    nextActive[targetIdx] = temp
    onChangeDashboardOrder([...nextActive, ...inactiveIds])
  }

  const handleMoveToTop = (id: DashboardWidgetId) => {
    if (!onChangeDashboardOrder) return
    const activeIds = dashboardOrder.filter((item) => dashboardVisible[item])
    const inactiveIds = dashboardOrder.filter((item) => !dashboardVisible[item])
    const idx = activeIds.indexOf(id)
    if (idx <= 0) return

    triggerMoveAnimation(id)
    const nextActive = [id, ...activeIds.filter((item) => item !== id)]
    onChangeDashboardOrder([...nextActive, ...inactiveIds])
  }

  const handleToggleWidget = (id: DashboardWidgetId) => {
    if (!onToggleDashboardWidget || !onChangeDashboardOrder) return
    const currentlyVisible = Boolean(dashboardVisible[id])
    const nextVisible = !currentlyVisible

    triggerMoveAnimation(id)
    const activeIds = dashboardOrder.filter((item) => item !== id && dashboardVisible[item])
    const inactiveIds = dashboardOrder.filter((item) => item !== id && !dashboardVisible[item])

    if (nextVisible) {
      onChangeDashboardOrder([...activeIds, id, ...inactiveIds])
    } else {
      onChangeDashboardOrder([...activeIds, ...inactiveIds, id])
    }
    onToggleDashboardWidget(id, nextVisible)
  }

  return (
    <UiScreen
      isOpen={isOpen}
      onClose={onClose}
      title={pickText(currentLang, { pl: 'Ekran główny', en: 'Home Screen' })}
      backLabel={t.settingsTitle || t.backAction}
      isSubView={true}
      zIndex={60}
    >
      <div className="flex flex-col gap-4 pb-16 select-none max-w-xl mx-auto w-full">
        {onSelectNavMode && (
          <div className="flex flex-col gap-2">
            <UiSegmentedControl<NavMode>
              value={navMode}
              onChange={onSelectNavMode}
              options={[
                { id: 'widgets', label: t.navModeWidgets },
                { id: 'tabs', label: t.navModeTabs }
              ]}
              className="w-full"
            />
            {navMode === 'tabs' && (
              <UiCard className="px-4 py-3 text-[13px] text-[var(--ios-secondary)] leading-snug">
                {t.navModeDesc}
              </UiCard>
            )}
          </div>
        )}

        <div className={cn('flex flex-col gap-4 transition-opacity duration-200', navMode === 'tabs' && 'opacity-45 pointer-events-none')}>
          <div className="px-1 flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase text-[var(--ios-secondary)] tracking-[0.03em]">
              {pickText(currentLang, {
                pl: 'Aktywne widżety na ekranie głównym',
                en: 'Active widgets on home screen'
              })}
            </span>
          </div>

          <div
            style={{
              height: Math.max(totalHeight, 64) + 'px',
              transition: 'height 520ms cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="relative w-full"
          >
            <div
              style={{
                transform: 'translate3d(0, ' + (enabledList.length * STEP + (enabledList.length > 0 ? 14 : 0)) + 'px, 0)',
                opacity: disabledList.length > 0 ? 1 : 0,
                transition:
                  'transform 520ms cubic-bezier(0.16, 1, 0.3, 1), opacity 380ms cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              className="absolute top-0 left-1 right-1 pointer-events-none z-0 flex items-center justify-between"
            >
              <span className="text-[12px] font-semibold uppercase text-[var(--ios-secondary)] tracking-[0.03em]">
                {pickText(currentLang, { pl: 'Wyłączone widżety', en: 'Hidden widgets' })}
              </span>
            </div>

            {DEFAULT_DASHBOARD_ORDER.map((id) => {
              const meta = getDashboardWidgetMeta(id, currentLang, t)
              const isVisible = Boolean(dashboardVisible[id])
              const activeIdx = enabledList.indexOf(id)
              const hiddenIdx = disabledList.indexOf(id)

              const yPos = isVisible
                ? activeIdx * STEP
                : enabledList.length * STEP + HIDDEN_HEADER_OFFSET + Math.max(0, hiddenIdx) * STEP

              const isMoving = movingWidgetId === id
              const canMoveUp = isVisible && activeIdx > 0
              const canMoveDown = isVisible && activeIdx < enabledList.length - 1

              return (
                <div
                  key={id}
                  style={{
                    height: ROW_HEIGHT + 'px',
                    transform: 'translate3d(0, ' + yPos + 'px, 0) scale(' + (isMoving ? 1.02 : 1) + ')',
                    transition:
                      'transform 520ms cubic-bezier(0.16, 1, 0.3, 1), opacity 380ms cubic-bezier(0.16, 1, 0.3, 1)',
                    zIndex: isMoving ? 30 : isVisible ? 15 : 10
                  }}
                  className={cn(
                    'ios-card absolute top-0 left-0 right-0 rounded-[24px] px-2.5 sm:px-3.5 flex items-center justify-between gap-2 sm:gap-3',
                    !isVisible ? 'opacity-65' : 'opacity-100'
                  )}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div
                      className={cn(
                        'w-[30px] h-[30px] sm:w-[32px] sm:h-[32px] rounded-[8px] text-white flex items-center justify-center shrink-0 ios-pill-raised',
                        meta.color
                      )}
                    >
                      {meta.icon}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[14px] sm:text-[15px] font-medium text-[var(--ios-label)] truncate leading-snug">
                        {meta.title}
                      </span>
                      <span className="text-[11px] sm:text-[12px] font-normal text-[var(--ios-secondary)] truncate leading-snug mt-0.5">
                        {meta.subtitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    {isVisible && (
                      <div className="flex items-center gap-0.5 mr-0.5">
                        <button
                          type="button"
                          disabled={!canMoveUp}
                          onClick={() => handleMoveToTop(id)}
                          title={pickText(currentLang, { pl: 'Na samą górę', en: 'Move to top' })}
                          className={cn(
                            'flex w-6 h-6 items-center justify-center transition-all cursor-pointer',
                            canMoveUp
                              ? 'text-[var(--ios-secondary)] hover:text-[var(--ios-blue)] active:scale-90'
                              : 'text-[var(--ios-tertiary)] opacity-25 cursor-not-allowed'
                          )}
                          aria-label={pickText(currentLang, { pl: 'Na samą górę', en: 'Move to top' })}
                        >
                          <ArrowUpToLine className="w-[13px] h-[13px]" strokeWidth={2.4} />
                        </button>
                        <button
                          type="button"
                          disabled={!canMoveUp}
                          onClick={() => handleMoveWidget(id, -1)}
                          title={pickText(currentLang, { pl: 'Wyżej', en: 'Move up' })}
                          className={cn(
                            'w-[22px] sm:w-6 h-6 flex items-center justify-center transition-all cursor-pointer',
                            canMoveUp
                              ? 'text-[var(--ios-secondary)] hover:text-[var(--ios-blue)] active:scale-90'
                              : 'text-[var(--ios-tertiary)] opacity-25 cursor-not-allowed'
                          )}
                          aria-label={pickText(currentLang, { pl: 'Wyżej', en: 'Move up' })}
                        >
                          <ChevronUp className="w-[15px] h-[15px]" strokeWidth={2.5} />
                        </button>
                        <button
                          type="button"
                          disabled={!canMoveDown}
                          onClick={() => handleMoveWidget(id, 1)}
                          title={pickText(currentLang, { pl: 'Niżej', en: 'Move down' })}
                          className={cn(
                            'w-[22px] sm:w-6 h-6 flex items-center justify-center transition-all cursor-pointer',
                            canMoveDown
                              ? 'text-[var(--ios-secondary)] hover:text-[var(--ios-blue)] active:scale-90'
                              : 'text-[var(--ios-tertiary)] opacity-25 cursor-not-allowed'
                          )}
                          aria-label={pickText(currentLang, { pl: 'Niżej', en: 'Move down' })}
                        >
                          <ChevronDown className="w-[15px] h-[15px]" strokeWidth={2.5} />
                        </button>
                      </div>
                    )}

                    <UiSwitch checked={isVisible} onChange={() => handleToggleWidget(id)} ariaLabel={meta.title} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </UiScreen>
  )
}
