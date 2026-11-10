'use client'

import { ReactNode, useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn.util'

export interface IosSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  maxWidthClass?: string
}

const SHEET_SPRING = 'cubic-bezier(0.32, 0.72, 0, 1)'

export function IosSheet({
  isOpen,
  onClose,
  title,
  children,
  maxWidthClass = 'md:max-w-[380px]'
}: IosSheetProps) {
  const [isRendered, setIsRendered] = useState(isOpen)
  const [isVisible, setIsVisible] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  const sheetRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef(0)
  const currentDeltaY = useRef(0)
  const isDragging = useRef(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }

    if (isOpen) {
      setIsRendered(true)
      let raf1 = 0
      let raf2 = 0
      raf1 = requestAnimationFrame(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transition = 'none'
          sheetRef.current.style.transform = isDesktop
            ? 'scale3d(0.95, 0.95, 1)'
            : 'translate3d(0, 100%, 0)'
          void sheetRef.current.offsetHeight
        }
        raf2 = requestAnimationFrame(() => {
          if (sheetRef.current) {
            sheetRef.current.style.transition = isDesktop
              ? 'transform 220ms ' + SHEET_SPRING + ', opacity 180ms ease'
              : 'transform 320ms ' + SHEET_SPRING
            sheetRef.current.style.transform = isDesktop
              ? 'scale3d(1, 1, 1)'
              : 'translate3d(0, 0, 0)'
          }
          setIsVisible(true)
        })
      })
      return () => {
        cancelAnimationFrame(raf1)
        cancelAnimationFrame(raf2)
      }
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transition = isDesktop
          ? 'transform 180ms ' + SHEET_SPRING + ', opacity 160ms ease'
          : 'transform 280ms ' + SHEET_SPRING
        sheetRef.current.style.transform = isDesktop
          ? 'scale3d(0.95, 0.95, 1)'
          : 'translate3d(0, 100%, 0)'
      }
      setIsVisible(false)
      closeTimerRef.current = setTimeout(() => {
        setIsRendered(false)
      }, isDesktop ? 190 : 290)
      return () => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      }
    }
  }, [isOpen, isDesktop])

  const handleDismiss = useCallback(() => {
    if (!isOpen) return
    if (sheetRef.current) {
      sheetRef.current.style.transition = isDesktop
        ? 'transform 180ms ' + SHEET_SPRING + ', opacity 160ms ease'
        : 'transform 280ms ' + SHEET_SPRING
      sheetRef.current.style.transform = isDesktop
        ? 'scale3d(0.95, 0.95, 1)'
        : 'translate3d(0, 100%, 0)'
    }
    setIsVisible(false)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      onClose()
    }, isDesktop ? 180 : 260)
  }, [isOpen, isDesktop, onClose])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, handleDismiss])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDesktop || !sheetRef.current) return
    if (sheetRef.current.scrollTop > 0) return
    touchStartY.current = e.touches[0].clientY
    currentDeltaY.current = 0
    isDragging.current = true
    sheetRef.current.style.transition = 'none'
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return
    const deltaY = Math.max(0, e.touches[0].clientY - touchStartY.current)
    currentDeltaY.current = deltaY
    sheetRef.current.style.transform = 'translate3d(0, ' + deltaY + 'px, 0)'
  }

  const handleTouchEnd = () => {
    if (!isDragging.current || !sheetRef.current) return
    isDragging.current = false
    const deltaY = currentDeltaY.current
    const sheet = sheetRef.current

    if (deltaY > 72) {
      sheet.style.transition = 'transform 250ms ' + SHEET_SPRING
      sheet.style.transform = 'translate3d(0, 100%, 0)'
      setIsVisible(false)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      closeTimerRef.current = setTimeout(() => {
        onClose()
      }, 240)
    } else {
      sheet.style.transition = 'transform 280ms ' + SHEET_SPRING
      sheet.style.transform = 'translate3d(0, 0, 0)'
    }
  }

  if (typeof document === 'undefined' || (!isRendered && !isOpen)) return null

  return createPortal(
    <div
      onClick={handleDismiss}
      style={{
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        transition: 'opacity 240ms ' + SHEET_SPRING
      }}
      className="fixed inset-0 z-[95] bg-black/45 flex items-end md:items-center justify-center p-0 md:p-6 select-none"
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          boxShadow: 'var(--ios-modal-shadow)',
          opacity: isDesktop ? (isVisible ? 1 : 0) : 1,
          willChange: 'transform, opacity'
        }}
        className={cn(
          'relative w-full max-w-[480px] bg-[var(--ios-card-solid)] rounded-t-[34px] md:rounded-[32px] p-4 pt-3 pb-[max(calc(env(safe-area-inset-bottom,0px)+16px),20px)] md:p-5 border-t md:border border-[var(--ios-border)] flex flex-col gap-4 max-h-[85dvh] overflow-y-auto',
          maxWidthClass
        )}
      >
        <div className="w-9 h-[5px] rounded-full bg-[var(--ios-tertiary)] opacity-45 mx-auto shrink-0 md:hidden" />

        <div className="flex items-center justify-between gap-3 min-h-[30px]">
          <div className="text-[15px] font-semibold text-[var(--ios-secondary)] tracking-[-0.2px] truncate pl-1">
            {title}
          </div>
          <IosSheetCloseButton onClick={handleDismiss} />
        </div>

        {children}
      </div>
    </div>,
    document.body
  )
}

export function IosSheetCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-[30px] h-[30px] rounded-full bg-[var(--ios-element)] text-[var(--ios-secondary)] hover:text-[var(--ios-label)] cursor-pointer active:scale-90 transition-all flex items-center justify-center shrink-0 select-none"
      aria-label="Zamknij"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  )
}
