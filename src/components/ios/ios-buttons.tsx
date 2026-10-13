'use client'

import { ReactNode } from 'react'

interface IosCloseButtonProps {
    onClick: () => void
    className?: string
    ariaLabel?: string
}

export function IosCloseButton({
    onClick,
    className = '',
    ariaLabel = 'Close'
}: IosCloseButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={ariaLabel}
            className={`w-[30px] h-[30px] rounded-full bg-[var(--ios-element)] text-[var(--ios-secondary)] hover:text-[var(--ios-label)] flex items-center justify-center active:scale-90 transition-all shrink-0 ${className}`}
        >
            <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
        </button>
    )
}

interface IosBackButtonProps {
    onClick: () => void
    label: string
    className?: string
}

export function IosBackButton({
    onClick,
    label,
    className = ''
}: IosBackButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center gap-1 text-[var(--ios-blue)] text-xs font-normal active:opacity-70 -ml-1 py-1 pr-2 w-20 shrink-0 ${className}`}
        >
            <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>{label}</span>
        </button>
    )
}

interface IosIconButtonProps {
    onClick: () => void
    children: ReactNode
    ariaLabel?: string
    className?: string
}

export function IosIconButton({
    onClick,
    children,
    ariaLabel,
    className = ''
}: IosIconButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={ariaLabel}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-[var(--ios-secondary)] hover:text-[var(--ios-label)] active:scale-95 transition-transform ${className}`}
        >
            {children}
        </button>
    )
}