'use client'

import { ReactNode, useRef, useEffect } from 'react'

interface IosSubViewProps {
    isOpen: boolean
    onClose: () => void
    title: string
    backLabel?: string
    children: ReactNode
}

export function IosSubView({
    isOpen,
    onClose,
    title,
    backLabel = 'Wróć',
    children
}: IosSubViewProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const touchStartX = useRef(0)
    const isSwiping = useRef(false)
    const currentDelta = useRef(0)

    useEffect(() => {
        if (!containerRef.current) return
        if (isOpen) {
            containerRef.current.style.transition = 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)'
            containerRef.current.style.transform = 'translate3d(0, 0, 0)'
        } else {
            containerRef.current.style.transition = 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)'
            containerRef.current.style.transform = 'translate3d(calc(100% + 48px), 0, 0)'
        }
    }, [isOpen])

    const handleTouchStart = (e: React.TouchEvent) => {
        const clientX = e.touches[0].clientX
        touchStartX.current = clientX
        if (clientX < 60) {
            isSwiping.current = true
            currentDelta.current = 0
            if (containerRef.current) {
                containerRef.current.style.transition = 'none'
            }
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isSwiping.current || !containerRef.current) return
        const delta = e.touches[0].clientX - touchStartX.current
        if (delta > 0) {
            currentDelta.current = delta
            containerRef.current.style.transform = `translate3d(${delta}px, 0, 0)`
        }
    }

    const handleTouchEnd = () => {
        if (!isSwiping.current || !containerRef.current) return
        isSwiping.current = false
        containerRef.current.style.transition = 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)'
        if (currentDelta.current > 85) {
            containerRef.current.style.transform = 'translate3d(calc(100% + 48px), 0, 0)'
            setTimeout(onClose, 300)
        } else {
            containerRef.current.style.transform = 'translate3d(0, 0, 0)'
        }
        currentDelta.current = 0
    }

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                transform: 'translate3d(calc(100% + 48px), 0, 0)'
            }}
            className="fixed inset-0 z-40 bg-[var(--ios-bg)] flex flex-col shadow-[-8px_0_24px_rgba(0,0,0,0.18)] dark:shadow-[-8px_0_24px_rgba(0,0,0,0.38)] will-change-transform"
        >
            <header className="sticky top-0 z-10 w-full pt-[max(calc(env(safe-area-inset-top,0px)+0.75rem),1.75rem)] pb-2.5 px-4 bg-[var(--ios-bg)]/85 backdrop-blur-xl border-b border-[var(--ios-separator)] flex items-center justify-between">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center gap-1 text-[var(--ios-blue)] text-[17px] font-normal active:opacity-60 -ml-1 py-1 w-[70px] shrink-0"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <span>{backLabel}</span>
                </button>

                <h2 className="text-[17px] font-semibold text-[var(--ios-label)] tracking-tight text-center flex-1 truncate px-1">
                    {title}
                </h2>

                <div className="w-[70px] shrink-0" />
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 max-w-md mx-auto w-full pb-12">
                {children}
            </div>
        </div>
    )
}