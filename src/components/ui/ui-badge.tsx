/**
 * UI Primitive: Semantic Status Badge
 * Compact pill/tag badge for rooms, lesson flags, attendance types, and calendar categories.
 * Exported variant type is shared with `badge.util.ts`.
 */

'use client'

import { cn } from '@/utils/cn.util'

export type UiBadgeVariant =
  | 'room'
  | 'shortened'
  | 'cancelled'
  | 'substitution'
  | 'nb'
  | 'usp'
  | 'neutral'
  | 'blue'
  | 'green'
  | 'orange'
  | 'red'
  | 'purple'
  | 'teal'
  | 'yellow'

interface UiBadgeProps {
  variant: UiBadgeVariant
  text: string
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

const VARIANT_CLASSES: Record<UiBadgeVariant, string> = {
  room: 'bg-[var(--ios-room-bg)] text-[var(--ios-room-text)] rounded-[8px]',
  shortened: 'bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)] rounded-full',
  cancelled: 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)] rounded-full',
  substitution: 'bg-[var(--ios-purple-subtle)] text-[var(--ios-purple)] rounded-full',
  nb: 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)] rounded-full',
  usp: 'bg-[var(--ios-green-subtle)] text-[var(--ios-green)] rounded-full',
  neutral: 'bg-[var(--ios-element)] text-[var(--ios-secondary)] rounded-full',
  blue: 'bg-[var(--ios-blue-subtle)] text-[var(--ios-blue)] rounded-full',
  green: 'bg-[var(--ios-green-subtle)] text-[var(--ios-green)] rounded-full',
  orange: 'bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)] rounded-full',
  red: 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)] rounded-full',
  purple: 'bg-[var(--ios-purple-subtle)] text-[var(--ios-purple)] rounded-full',
  teal: 'bg-[rgba(0,200,179,0.14)] text-[var(--ios-teal)] rounded-full',
  yellow: 'bg-[rgba(255,204,0,0.16)] text-[var(--ios-orange)] rounded-full'
}

const SIZE_CLASSES: Record<'xs' | 'sm' | 'md', string> = {
  xs: 'text-[10px] font-semibold px-1.5 py-[1px]',
  sm: 'text-[11px] font-semibold px-2 py-0.5',
  md: 'text-[12px] font-semibold px-2.5 py-[3px]'
}

export function UiBadge({
  variant,
  text,
  size = 'xs',
  className = ''
}: UiBadgeProps) {
  return (
    <span
      className={cn(
        'whitespace-nowrap shrink-0 inline-flex items-center justify-center leading-tight ios-tile',
        VARIANT_CLASSES[variant] || VARIANT_CLASSES.neutral,
        SIZE_CLASSES[size],
        className
      )}
    >
      {text}
    </span>
  )
}
