'use client'

import { ReactNode, useRef, useState, useEffect } from 'react'
import { IosBackButton } from '@/components/ios/ios-buttons'

interface IosSubViewProps {
    isOpen: boolean
    onClose: () => void
    title: string
    backLabel?: string
    trailing?: ReactNode
    children: ReactNode
}

export function IosSubView({
    isOpen,
    onClose,
    title,
    backLabel = 'Wróć',
    trailing,
    children
}: IosSubViewProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const touchStartX = useRef(0)
    const isSwiping = useRef(false)
    const [swipeOffset, setSwipeOffset] = useState(0)

    useEffect(() => {
        if (!isOpen) {
            setSwipeOffset(0)
            isSwiping.current = false
        }
    }, [isOpen])

    const handleTouchStart = (e: React.TouchEvent) => {
        const clientX = e.touches[0].clientX
        touchStartX.current = clientX
        if (clientX < 60) {
            isSwiping.current = true
            setSwipeOffset(0)
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isSwiping.current) return
        const delta = e.touches[0].clientX - touchStartX.current
        if (delta > 0) {
            setSwipeOffset(delta)
        }
    }

    const handleTouchEnd = () => {
        if (!isSwiping.current) return
        isSwiping.current = false
        if (swipeOffset > 85) {
            onClose()
        }
        setSwipeOffset(0)
    }

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                transform: !isOpen
                    ? 'translateX(calc(100% + 48px))'
                    : isSwiping.current
                        ? `translateX(${swipeOffset}px)`
                        : 'translateX(0)',
                transition: isSwiping.current ? 'none' : 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)'
            }}
            className="fixed inset-0 z-40 bg-[var(--ios-bg)] flex flex-col shadow-[-8px_0_24px_rgba(0,0,0,0.18)] dark:shadow-[-8px_0_24px_rgba(0,0,0,0.38)] will-change-transform"
        >
            <header className="sticky top-0 z-10 w-full pt-[max(calc(env(safe-area-inset-top,0px)+0.75rem),1.75rem)] pb-2.5 px-4 bg-[var(--ios-bg)]/85 backdrop-blur-xl border-b border-[var(--ios-separator)] flex items-center justify-between">
                <IosBackButton
                    onClick={onClose}
                    label={backLabel}
                />

                <h2 className="text-sm font-semibold text-[var(--ios-label)] tracking-tight text-center flex-1 truncate px-2">
                    {title}
                </h2>

                <div className="w-20 shrink-0 flex items-center justify-end">
                    {trailing}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 max-w-md mx-auto w-full pb-12">
                {children}
            </div>
        </div>
    )
}