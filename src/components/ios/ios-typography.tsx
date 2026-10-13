'use client'

import { ReactNode } from 'react'

interface TypographyProps {
    children: ReactNode
    className?: string
}

export function IosLargeTitle({ children, className = '' }: TypographyProps) {
    return (
        <h1 className={`text-[34px] font-bold text-[var(--ios-label)] tracking-tight leading-tight ${className}`}>
            {children}
        </h1>
    )
}

export function IosTitle({ children, className = '' }: TypographyProps) {
    return (
        <h2 className={`text-[20px] font-semibold text-[var(--ios-label)] tracking-tight leading-snug ${className}`}>
            {children}
        </h2>
    )
}

export function IosHeadline({ children, className = '' }: TypographyProps) {
    return (
        <h3 className={`text-[17px] font-semibold text-[var(--ios-label)] tracking-tight leading-snug ${className}`}>
            {children}
        </h3>
    )
}

export function IosBody({ children, className = '' }: TypographyProps) {
    return (
        <p className={`text-[17px] font-normal text-[var(--ios-label)] leading-relaxed ${className}`}>
            {children}
        </p>
    )
}

export function IosSubheadline({ children, className = '' }: TypographyProps) {
    return (
        <p className={`text-[15px] font-normal text-[var(--ios-secondary)] leading-normal ${className}`}>
            {children}
        </p>
    )
}

export function IosFootnote({ children, className = '' }: TypographyProps) {
    return (
        <p className={`text-[13px] font-normal text-[var(--ios-secondary)] leading-normal ${className}`}>
            {children}
        </p>
    )
}

export function IosCaption({ children, className = '' }: TypographyProps) {
    return (
        <span className={`text-[11px] font-normal uppercase text-[var(--ios-secondary)] tracking-wider ${className}`}>
            {children}
        </span>
    )
}