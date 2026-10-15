'use client'

import { ReactNode } from 'react'

interface IosListGroupProps {
    children: ReactNode
    header?: string
    footer?: string
    className?: string
}

export function IosListGroup({
    children,
    header,
    footer,
    className = ''
}: IosListGroupProps) {
    return (
        <div className={`flex flex-col gap-1.5 w-full ${className}`}>
            {header && (
                <span className="text-[11px] font-normal uppercase text-[var(--ios-secondary)] px-4 tracking-wider select-none">
                    {header}
                </span>
            )}

            <div className="bg-[var(--ios-card)] rounded-[20px] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                {children}
            </div>

            {footer && (
                <p className="text-[12px] font-normal text-[var(--ios-secondary)] px-4 leading-normal select-none">
                    {footer}
                </p>
            )}
        </div>
    )
}

interface IosListCellProps {
    title: ReactNode
    subtitle?: ReactNode
    leading?: ReactNode
    trailing?: ReactNode
    onClick?: () => void
    chevron?: boolean
    className?: string
}

export function IosListCell({
    title,
    subtitle,
    leading,
    trailing,
    onClick,
    chevron = false,
    className = ''
}: IosListCellProps) {
    const isInteractive = Boolean(onClick)

    return (
        <div
            onClick={onClick}
            className={`min-h-[48px] px-4 py-3 flex items-center justify-between gap-3 transition-colors ${isInteractive ? 'cursor-pointer active:bg-[var(--ios-element)]/30' : ''
                } ${className}`}
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                {leading && (
                    <div className="shrink-0 flex items-center justify-center">
                        {leading}
                    </div>
                )}

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
            </div>

            <div className="flex items-center gap-2 shrink-0">
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
        </div>
    )
}