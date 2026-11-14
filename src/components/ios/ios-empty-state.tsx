'use client'

import React from 'react'
import { cn } from '@/utils/cn.util'
import { IosButton } from './ios-button'
import { IosCard } from './ios-ui'

export interface IosEmptyStateProps {
  icon?: React.ReactNode
  iconTone?: 'blue' | 'green' | 'orange' | 'red' | 'neutral'
  title: string
  subtitle?: string
  action?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
  compact?: boolean
  inCard?: boolean
  className?: string
}

const TONE_MAP: Record<NonNullable<IosEmptyStateProps['iconTone']>, string> = {
  blue: 'bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)]',
  green: 'bg-[var(--ios-green-subtle)] text-[var(--ios-green)]',
  orange: 'bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)]',
  red: 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)]',
  neutral: 'bg-[var(--ios-element)] text-[var(--ios-secondary)]'
}

export function IosEmptyState({
  icon,
  iconTone = 'neutral',
  title,
  subtitle,
  action,
  compact = false,
  inCard = false,
  className = ''
}: IosEmptyStateProps) {
  const inner = (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-6 px-4' : 'py-10 px-6',
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            'rounded-full flex items-center justify-center shrink-0 mb-3',
            compact ? 'w-11 h-11' : 'w-[50px] h-[50px]',
            TONE_MAP[iconTone]
          )}
        >
          {icon}
        </div>
      )}
      <h4
        className={cn(
          'font-bold tracking-[-0.02em] text-[var(--ios-label)] leading-snug',
          compact ? 'text-[16px]' : 'text-[19px]'
        )}
      >
        {title}
      </h4>
      {subtitle && (
        <p className="text-[14px] font-medium text-[var(--ios-secondary)] max-w-[270px] leading-snug mt-1">
          {subtitle}
        </p>
      )}
      {action && (
        <div className="mt-4">
          <IosButton variant="primary" size="sm" onClick={action.onClick} icon={action.icon}>
            {action.label}
          </IosButton>
        </div>
      )}
    </div>
  )

  if (inCard) {
    return <IosCard className="w-full">{inner}</IosCard>
  }

  return inner
}
