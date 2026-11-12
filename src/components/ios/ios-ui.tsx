'use client'

import { ReactNode } from 'react'
import { cn } from '@/utils/cn.util'

export { IosCell } from './ios-list'
export { IosBadge } from './ios-badge'
export { IosButton, IosIconButton, IosBackButton } from './ios-button'
export { IosAlert } from './ios-alert'
export { IosEmptyState } from './ios-empty-state'

export function IosCard({
  children,
  onClick,
  className = ''
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'ios-card rounded-[26px]',
        onClick && 'cursor-pointer [&:not(:has(button:active))]:active:scale-[0.985] transition-transform duration-150 ease-[cubic-bezier(0.32,0.72,0,1)]',
        className
      )}
    >
      {children}
    </div>
  )
}

export interface IosSegmentOption<T extends string | number> {
  id: T
  label: string
}

export function IosSegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  size = 'regular',
  className = ''
}: {
  options: IosSegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'compact' | 'regular' | 'large'
  className?: string
}) {
  const activeIndex = Math.max(0, options.findIndex((o) => o.id === value))
  const count = Math.max(options.length, 1)
  const heightClass =
    size === 'compact'
      ? 'h-[32px] p-[3px]'
      : size === 'large'
        ? 'h-[46px] p-[4px]'
        : 'h-[36px] p-[3px]'

  return (
    <div
      className={cn(
        'relative bg-[var(--ios-segmented-track)] rounded-full flex items-center select-none',
        heightClass,
        className
      )}
    >
      <div
        className="pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] rounded-full bg-[var(--ios-segmented-thumb)] transition-transform duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform"
        style={{
          width: 'calc((100% - 6px) / ' + count + ')',
          transform: 'translate3d(' + (activeIndex * 100) + '%, 0, 0)',
          boxShadow: 'var(--ios-segmented-shadow)'
        }}
      />
      {options.map((opt) => {
        const isActive = opt.id === value
        return (
          <button
            key={String(opt.id)}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              'relative z-10 flex-1 h-full rounded-full text-[13px] tracking-[-0.15px] text-center flex items-center justify-center px-2 truncate cursor-pointer select-none transition-colors duration-150',
              isActive
                ? 'text-[var(--ios-label)] font-semibold'
                : 'text-[var(--ios-secondary)] font-medium hover:text-[var(--ios-label)]'
            )}
          >
            <span className="truncate">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function IosSearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  className = ''
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'w-full h-[42px] bg-[var(--ios-element)] border border-[var(--ios-card-border)] rounded-full px-4 flex items-center gap-2.5 select-none',
        className
      )}
    >
      <svg
        width="16"
        height="16"
        className="text-[var(--ios-secondary)] shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="7.5" />
        <line x1="21" y1="21" x2="16.4" y2="16.4" />
      </svg>

      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-[15px] text-[var(--ios-label)] outline-none placeholder-[var(--ios-secondary)] font-normal tracking-[-0.2px] leading-tight"
      />

      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="w-[18px] h-[18px] rounded-full bg-[var(--ios-tertiary)] text-[var(--ios-card-solid)] flex items-center justify-center shrink-0 active:scale-90 transition-transform cursor-pointer"
          aria-label="Clear search"
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}

export function IosBreakDivider({
  minutes,
  isCountdown = false,
  countdownText,
  label = 'Przerwa'
}: {
  minutes: number
  isCountdown?: boolean
  countdownText?: string
  label?: string
}) {
  return (
    <div className="w-full flex items-center gap-3 px-4 py-1">
      <div className="h-[0.5px] flex-1 bg-[var(--ios-separator)]" />
      <span
        className={cn(
          'text-[11px] font-medium shrink-0 tabular-nums',
          isCountdown
            ? 'text-[var(--ios-blue)] bg-[var(--ios-blue-subtle)] px-2.5 py-0.5 rounded-full font-semibold'
            : 'text-[var(--ios-tertiary)] px-1'
        )}
      >
        {isCountdown && countdownText
          ? countdownText
          : minutes > 0
            ? label + ' ' + minutes + ' min'
            : label}
      </span>
      <div className="h-[0.5px] flex-1 bg-[var(--ios-separator)]" />
    </div>
  )
}
