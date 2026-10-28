'use client'

import React, { ReactNode, ReactElement, isValidElement } from 'react'
import { cn } from '@/utils/cn.util'

export interface IosListSectionProps {
  children: ReactNode
  header?: ReactNode
  footer?: ReactNode
  className?: string
  cardClassName?: string
}

export interface IosCellProps {
  title: ReactNode
  subtitle?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
  detail?: ReactNode
  onClick?: () => void
  chevron?: boolean
  size?: 'compact' | 'standard' | 'tall'
  tall?: boolean
  compact?: boolean
  isLast?: boolean
  hideSeparator?: boolean
  disabled?: boolean
  className?: string
}

export function IosCell({
  title,
  subtitle,
  leading,
  trailing,
  detail,
  onClick,
  chevron = false,
  size = 'standard',
  tall = false,
  compact = false,
  isLast = false,
  hideSeparator = false,
  disabled = false,
  className = ''
}: IosCellProps) {
  const isInteractive = Boolean(onClick) && !disabled
  const resolvedSize = tall ? 'tall' : compact ? 'compact' : size

  const heightClasses = {
    compact: 'min-h-[44px] py-1.5',
    standard: 'min-h-[52px] py-2.5',
    tall: 'min-h-[68px] py-3'
  }[resolvedSize]

  const separatorLeft = leading ? 'left-[56px]' : 'left-4'

  return (
    <div
      onClick={isInteractive ? onClick : undefined}
      className={cn(
        'relative px-4 flex items-center justify-between gap-3 select-none transition-colors duration-100',
        heightClasses,
        isInteractive && 'cursor-pointer active:bg-[var(--ios-element)]/55',
        disabled && 'opacity-40 pointer-events-none',
        className
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {leading && (
          <div className="w-[28px] h-[28px] shrink-0 flex items-center justify-center">
            {leading}
          </div>
        )}

        <div className="flex flex-col justify-center min-w-0 flex-1">
          <div className="text-[15px] font-medium text-[var(--ios-label)] leading-snug tracking-[-0.2px] truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-[12px] font-normal text-[var(--ios-secondary)] leading-[16px] tracking-[-0.1px] truncate mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {detail && (
          <span className="text-[15px] font-normal text-[var(--ios-secondary)] tracking-[-0.24px]">
            {detail}
          </span>
        )}

        {trailing}

        {chevron && (
          <svg
            className="w-4 h-4 text-[var(--ios-tertiary)] shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </div>

      {!isLast && !hideSeparator && (
        <div className={cn('absolute bottom-0 right-0 h-[0.5px] bg-[var(--ios-separator)] pointer-events-none', separatorLeft)} />
      )}
    </div>
  )
}

export function IosListSection({
  children,
  header,
  footer,
  className = '',
  cardClassName = ''
}: IosListSectionProps) {
  const childArray = React.Children.toArray(children).filter(isValidElement)
  const totalChildren = childArray.length

  return (
    <section className={cn('flex flex-col w-full', className)}>
      {header && (
        <div className="text-[13px] font-normal uppercase text-[var(--ios-secondary)] tracking-[-0.08px] px-4 pt-4 pb-1.5 select-none">
          {header}
        </div>
      )}

      <div className={cn('ios-card rounded-[26px] overflow-hidden', cardClassName)}>
        {childArray.map((child, index) => {
          const isLastItem = index === totalChildren - 1
          return React.cloneElement(child as ReactElement<IosCellProps>, {
            isLast: isLastItem
          })
        })}
      </div>

      {footer && (
        <div className="text-[13px] font-normal text-[var(--ios-secondary)] px-4 pt-1.5 pb-2 leading-[18px] select-none">
          {footer}
        </div>
      )}
    </section>
  )
}

export const IosListGroup = IosListSection
export const IosListRow = IosCell
export const IosListCell = IosCell
