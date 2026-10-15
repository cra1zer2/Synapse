'use client'

import { ReactNode } from 'react'

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
            className={`ios-card ${className}`}
        >
            {children}
        </div>
    )
}

export function IosBadge({
    variant,
    text
}: {
    variant: 'room' | 'shortened' | 'cancelled' | 'substitution' | 'neutral'
    text: string
}) {
    const variantMap: Record<string, string> = {
        room: 'bg-[var(--ios-room-bg)] text-[var(--ios-room-text)] text-[11px] font-medium rounded-[6px] px-2 py-0.5',
        shortened: 'bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)] text-[10px] font-semibold rounded-full px-2 py-0.5',
        cancelled: 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)] text-[10px] font-semibold rounded-full px-2 py-0.5',
        substitution: 'bg-[var(--ios-purple-subtle)] text-[var(--ios-purple)] text-[10px] font-semibold rounded-full px-2 py-0.5',
        neutral: 'bg-[var(--ios-element)] text-[var(--ios-secondary)] text-[11px] font-normal rounded-[6px] px-2 py-0.5'
    }

    return (
        <span className={`whitespace-nowrap shrink-0 ${variantMap[variant] || variantMap.neutral}`}>
            {text}
        </span>
    )
}

export function IosBreakDivider({ minutes }: { minutes: number }) {
    return (
        <div className="w-full flex items-center gap-3 px-2 py-0.5">
            <div className="h-[1px] flex-1 bg-[var(--ios-separator)]/40" />
            <div className="flex items-center gap-1 text-[11px] font-medium shrink-0 px-2.5 py-0.5 rounded-full text-[var(--ios-secondary)] bg-[var(--ios-element)]/60">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="tabular-nums">{minutes > 0 ? `${minutes} min` : 'Przerwa'}</span>
            </div>
            <div className="h-[1px] flex-1 bg-[var(--ios-separator)]/40" />
        </div>
    )
}

export function IosCell({
    title,
    subtitle,
    trailing,
    onClick,
    className = ''
}: {
    title: ReactNode
    subtitle?: ReactNode
    trailing?: ReactNode
    onClick?: () => void
    className?: string
}) {
    return (
        <div
            onClick={onClick}
            className={`ios-cell ${onClick ? 'cursor-pointer active:bg-[var(--ios-element)]/30' : ''} ${className}`}
        >
            <div className="flex flex-col justify-center min-w-0 flex-1">
                <div className="text-[16px] font-normal text-[var(--ios-label)] leading-snug truncate">
                    {title}
                </div>
                {subtitle && (
                    <div className="text-[13px] font-normal text-[var(--ios-secondary)] leading-snug truncate mt-0.5">
                        {subtitle}
                    </div>
                )}
            </div>

            {trailing && (
                <div className="shrink-0 flex items-center gap-2">
                    {trailing}
                </div>
            )}
        </div>
    )
}