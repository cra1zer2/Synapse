'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, GraduationCap, UserCheck, Mail } from 'lucide-react'
import { AppDictionary } from '@/config/dictionary.config'
import { IOS_PANEL_TRANSITION, IOS_PARALLAX_PERCENT } from '@/components/ui/ui-screen'
import { cn } from '@/utils/cn.util'

export type PrimaryTabId = 'schedule' | 'grades' | 'attendance' | 'messages'
export const PRIMARY_TAB_ORDER: PrimaryTabId[] = ['schedule', 'grades', 'attendance', 'messages']

interface BottomNavBarProps {
  activeTab: PrimaryTabId
  onSelectTab: (tab: PrimaryTabId) => void
  unreadMessagesCount?: number
  badges?: Partial<Record<PrimaryTabId, number>>
  isReceded?: boolean
  t: AppDictionary
}

export function BottomNavBar({
  activeTab,
  onSelectTab,
  unreadMessagesCount = 0,
  badges,
  isReceded = false,
  t,
}: BottomNavBarProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted || typeof document === 'undefined') return null

  const items: Array<{
    id: PrimaryTabId
    label: string
    badge?: number
    renderIcon: (active: boolean) => React.ReactNode
  }> = [
    {
      id: 'schedule',
      label: t.schedule,
      badge: badges?.schedule || 0,
      renderIcon: (active) => <CalendarDays className="w-[20px] h-[20px]" strokeWidth={active ? 2.3 : 1.9} />,
    },
    {
      id: 'grades',
      label: t.grades,
      badge: badges?.grades || 0,
      renderIcon: (active) => <GraduationCap className="w-[21px] h-[21px]" strokeWidth={active ? 2.3 : 1.9} />,
    },
    {
      id: 'attendance',
      label: t.attendance,
      badge: badges?.attendance || 0,
      renderIcon: (active) => <UserCheck className="w-[20px] h-[20px]" strokeWidth={active ? 2.3 : 1.9} />,
    },
    {
      id: 'messages',
      label: t.messages,
      badge: badges?.messages ?? unreadMessagesCount,
      renderIcon: (active) => <Mail className="w-[20px] h-[20px]" strokeWidth={active ? 2.3 : 1.9} />,
    },
  ]

  const activeIndex = Math.max(0, items.findIndex((i) => i.id === activeTab))
  const mobileRecedeStyle = isReceded
    ? {
        transform: 'translate3d(-' + IOS_PARALLAX_PERCENT + '%, 0, 0)',
        pointerEvents: 'none' as const,
        transition: IOS_PANEL_TRANSITION,
      }
    : {
        transform: 'translate3d(0, 0, 0)',
        pointerEvents: 'auto' as const,
        transition: IOS_PANEL_TRANSITION,
      }

  return createPortal(
    <nav
      aria-label="Primary navigation"
      style={mobileRecedeStyle}
      className="fixed bottom-[max(calc(env(safe-area-inset-bottom,0px)+10px),14px)] left-3 right-3 max-w-[460px] mx-auto z-30 bg-[var(--ios-glass-surface-strong)] backdrop-blur-xl backdrop-saturate-150 border border-[var(--ios-glass-border)] rounded-full p-1.5 shadow-[var(--ios-modal-shadow)] select-none"
    >
      <div className="relative grid grid-cols-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-1/4 p-[1px] transition-transform duration-[340ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform"
          style={{ transform: 'translate3d(' + activeIndex * 100 + '%, 0, 0)' }}
        >
          <div className="w-full h-full rounded-full bg-[var(--ios-element)]" />
        </div>
        {items.map((item) => {
          const active = activeTab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={cn(
                'relative z-10 h-[50px] rounded-full flex flex-col items-center justify-center gap-0.5 px-1 transition-[color,transform] duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.92] cursor-pointer outline-none focus:outline-none',
                active
                  ? 'text-[var(--ios-blue)] font-semibold'
                  : 'text-[var(--ios-secondary)] hover:text-[var(--ios-label)] font-medium'
              )}
            >
              <div
                className={cn(
                  'relative flex items-center justify-center transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
                  active && 'scale-[1.06]'
                )}
              >
                {item.renderIcon(active)}
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--ios-red)] text-white text-[9.5px] font-bold flex items-center justify-center leading-none border-[1.5px] border-[var(--ios-bg)] tabular-nums">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10.5px] leading-tight truncate max-w-full px-1">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>,
    document.body
  )
}
