'use client'
import React from 'react'
import { cn } from '@/utils/cn.util'
import { UiButton } from './ui-button'
import { UiCard } from './ui-controls'

interface UiEmptyStateProps {
  icon?: React.ReactNode
  iconTone?: 'blue' | 'green' | 'orange' | 'red' | 'neutral'
  title: string
  subtitle?: string
  action?: { label: string; onClick: () => void; icon?: React.ReactNode }
  compact?: boolean
  inCard?: boolean
  className?: string
}

const TONE_MAP: Record<NonNullable<UiEmptyStateProps['iconTone']>, string> = {
  blue: 'bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)]',
  green: 'bg-[var(--ios-green-subtle)] text-[var(--ios-green)]',
  orange: 'bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)]',
  red: 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)]',
  neutral: 'bg-[var(--ios-element)] text-[var(--ios-secondary)]',
}

export function UiEmptyState({
  icon,
  iconTone = 'neutral',
  title,
  subtitle,
  action,
  compact = false,
  inCard = false,
  className = '',
}: UiEmptyStateProps) {
  const inner = (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-6 px-4' : 'py-10 px-6', className)}>
      {icon && (
        <div
          className={cn(
            'flex items-center justify-center shrink-0 mb-3 rounded-full ios-tile',
            compact ? 'w-11 h-11' : 'w-[52px] h-[52px]',
            TONE_MAP[iconTone]
          )}
        >
          {icon}
        </div>
      )}
      <h4 className={cn('font-bold tracking-[-0.02em] text-[var(--ios-label)] leading-snug', compact ? 'text-[16px]' : 'text-[19px]')}>
        {title}
      </h4>
      {subtitle && (
        <p className="text-[14px] font-medium text-[var(--ios-secondary)] max-w-[270px] leading-snug mt-1">
          {subtitle}
        </p>
      )}
      {action && (
        <div className="mt-4">
          <UiButton variant="primary" size="sm" onClick={action.onClick} icon={action.icon}>
            {action.label}
          </UiButton>
        </div>
      )}
    </div>
  )
  if (inCard) return <UiCard className="w-full">{inner}</UiCard>
  return inner
}
