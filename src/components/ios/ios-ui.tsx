'use client'

import { ReactNode } from 'react'
import { cn } from '@/utils/cn.util'

export { IosCell } from './ios-list'
export { IosBadge } from './ios-badge'

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
        'ios-card',
        onClick && 'cursor-pointer active:scale-[0.985] active:opacity-90 transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.32,0.72,0,1)]',
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
  size?: 'compact' | 'regular'
  className?: string
}) {
  const activeIndex = Math.max(0, options.findIndex((o) => o.id === value))
  const count = Math.max(options.length, 1)

  const heightClass = size === 'compact' ? 'h-[32px]' : 'h-[36px]'

  return (
    <div
      className={cn(
        'relative bg-[var(--ios-segmented-track)] p-[3px] rounded-full flex items-center select-none',
        heightClass,
        className
      )}
    >
      <div
        className="pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] rounded-full bg-[var(--ios-segmented-thumb)] shadow-[var(--ios-segmented-shadow)] transition-transform duration-250 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform"
        style={{
          width: `calc((100% - 6px) / ${count})`,
          transform: `translate3d(${activeIndex * 100}%, 0, 0)`
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
              'relative z-10 flex-1 h-full rounded-full text-[13px] tracking-[-0.15px] text-center flex items-center justify-center px-2 truncate cursor-pointer select-none transition-[color,transform] duration-150 active:scale-[0.96]',
              isActive
                ? 'text-[var(--ios-label)] font-semibold'
                : 'text-[var(--ios-secondary)] font-medium hover:text-[var(--ios-label)]/80'
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
  placeholder = 'Szukaj...',
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
        'w-full h-[42px] bg-[var(--ios-card-solid)] rounded-full px-3.5 flex items-center gap-2.5 select-none border border-[var(--ios-glass-border)] shadow-[var(--ios-card-shadow)] focus-within:border-[var(--ios-blue)]/45 transition-colors duration-150',
        className
      )}
    >
      <svg
        width="16"
        height="16"
        className="text-[var(--ios-secondary)] shrink-0 ml-0.5"
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
        className="w-full bg-transparent text-[15px] text-[var(--ios-label)] outline-none placeholder-[var(--ios-secondary)] font-normal tracking-[-0.24px] leading-tight"
      />

      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="w-[19px] h-[19px] rounded-full bg-[var(--ios-secondary)]/75 text-[var(--ios-card-solid)] flex items-center justify-center shrink-0 active:scale-90 active:opacity-75 transition-all cursor-pointer mr-0.5"
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

export function IosBreakDivider({ minutes }: { minutes: number }) {
  return (
    <div className="w-full flex items-center gap-3 px-2 py-0.5">
      <div className="h-[0.5px] flex-1 bg-[var(--ios-separator)]/70" />
      <div className="flex items-center gap-1 text-[11px] font-medium shrink-0 px-2.5 py-0.5 rounded-full text-[var(--ios-secondary)] bg-[var(--ios-element)]/75">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="tabular-nums">{minutes > 0 ? minutes + ' min' : 'Przerwa'}</span>
      </div>
      <div className="h-[0.5px] flex-1 bg-[var(--ios-separator)]/70" />
    </div>
  )
}
