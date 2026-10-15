'use client'

export type IosBadgeVariant =
    | 'room'
    | 'shortened'
    | 'cancelled'
    | 'substitution'
    | 'nb'
    | 'usp'
    | 'neutral'

interface IosBadgeProps {
    variant: IosBadgeVariant
    text: string
    className?: string
}

export function IosBadge({
    variant,
    text,
    className = ''
}: IosBadgeProps) {
    const variantMap: Record<IosBadgeVariant, string> = {
        room: 'bg-[var(--ios-room-bg)] text-[var(--ios-room-text)] text-[11px] font-medium rounded-[6px] px-2 py-0.5',
        shortened: 'bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)] text-[10px] font-semibold rounded-full px-2 py-0.5',
        cancelled: 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)] text-[10px] font-semibold rounded-full px-2 py-0.5',
        substitution: 'bg-[var(--ios-purple-subtle)] text-[var(--ios-purple)] text-[10px] font-semibold rounded-full px-2 py-0.5',
        nb: 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)] text-[10px] font-semibold rounded-full px-2 py-0.5',
        usp: 'bg-[var(--ios-green-subtle)] text-[var(--ios-green)] text-[10px] font-semibold rounded-full px-2 py-0.5',
        neutral: 'bg-[var(--ios-element)] text-[var(--ios-secondary)] text-[11px] font-normal rounded-[6px] px-2 py-0.5'
    }

    return (
        <span className={`whitespace-nowrap shrink-0 inline-flex items-center justify-center ${variantMap[variant] || variantMap.neutral} ${className}`}>
            {text}
        </span>
    )
}