'use client'

import { ReactNode, useRef, useEffect } from 'react'

interface IosScreenProps {
    isOpen?: boolean
    onClose?: () => void
    title: string
    backLabel?: string
    isSubView?: boolean
    children: ReactNode
}

export function IosScreen({
    isOpen = true,
    onClose,
    title,
    backLabel = 'Wróć',
    isSubView = false,
    children
}: IosScreenProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const touchStartX = useRef(0)
    const isSwiping = useRef(false)
    const currentDelta = useRef(0)

    useEffect(() => {
        if (!isSubView || !containerRef.current) return
        if (isOpen) {
            containerRef.current.style.transition = 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)'
            containerRef.current.style.transform = 'translate3d(0, 0, 0)'
        } else {
            containerRef.current.style.transition = 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)'
            containerRef.current.style.transform = 'translate3d(calc(100% + 48px), 0, 0)'
        }
    }, [isOpen, isSubView])

    const handleTouchStart = (e: React.TouchEvent) => {
        if (!isSubView || !onClose) return
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
        if (currentDelta.current > 85 && onClose) {
            onClose()
        } else {
            containerRef.current.style.transition = 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)'
            containerRef.current.style.transform = 'translate3d(0, 0, 0)'
        }
        currentDelta.current = 0
    }

    if (!isSubView) {
        return (
            <div className="w-full min-h-screen bg-[var(--ios-bg)] flex flex-col">
                <header className="ios-header">
                    <div className="w-[70px] shrink-0" />
                    <h2 className="ios-title-nav flex-1 px-1">{title}</h2>
                    <div className="w-[70px] shrink-0" />
                </header>
                <div className="flex-1 overflow-y-auto px-4 py-4 max-w-md mx-auto w-full pb-12">
                    {children}
                </div>
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                transform: 'translate3d(calc(100% + 48px), 0, 0)',
                pointerEvents: isOpen ? 'auto' : 'none'
            }}
            className="ios-subview-panel"
        >
            <header className="ios-header">
                {onClose ? (
                    <button
                        type="button"
                        onClick={onClose}
                        className="ios-back-btn"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                        <span>{backLabel}</span>
                    </button>
                ) : (
                    <div className="w-[70px] shrink-0" />
                )}

                <h2 className="ios-title-nav flex-1 px-1">{title}</h2>

                <div className="w-[70px] shrink-0" />
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 max-w-md mx-auto w-full pb-12">
                {children}
            </div>
        </div>
    )
}