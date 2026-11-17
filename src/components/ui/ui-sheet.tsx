'use client'
import { ReactNode, useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn.util'

interface UiSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  closeLabel?: string
  children: ReactNode
  maxWidthClass?: string
}

const SHEET_SPRING = 'cubic-bezier(0.32, 0.72, 0, 1)'

function UiSheetCloseButton({ onClick, ariaLabel = 'Close' }: { onClick: () => void; ariaLabel?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-[32px] h-[32px] rounded-full cursor-pointer flex items-center justify-center shrink-0 select-none ios-glass-control text-[var(--ios-secondary)] hover:text-[var(--ios-label)] active:scale-90 transition-all"
      aria-label={ariaLabel}
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  )
}

export function UiSheet({ isOpen, onClose, title, closeLabel, children }: UiSheetProps) {
  const [isRendered, setIsRendered] = useState(isOpen)
  const [isVisible, setIsVisible] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef(0)
  const currentDeltaY = useRef(0)
  const isDragging = useRef(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
          sheetRef.current.style.transform = 'translate3d(0, 100%, 0)'
          void sheetRef.current.offsetHeight
        }
        raf2 = requestAnimationFrame(() => {
          if (sheetRef.current) {
            sheetRef.current.style.transition = 'transform 320ms ' + SHEET_SPRING
            sheetRef.current.style.transform = 'translate3d(0, 0, 0)'
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
        sheetRef.current.style.transition = 'transform 280ms ' + SHEET_SPRING
        sheetRef.current.style.transform = 'translate3d(0, 100%, 0)'
      }
      setIsVisible(false)
      closeTimerRef.current = setTimeout(() => setIsRendered(false), 290)
      return () => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      }
    }
  }, [isOpen])

  const handleDismiss = useCallback(() => {
    if (!isOpen) return
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 280ms ' + SHEET_SPRING
      sheetRef.current.style.transform = 'translate3d(0, 100%, 0)'
    }
    setIsVisible(false)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => onClose(), 260)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, handleDismiss])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!sheetRef.current || sheetRef.current.scrollTop > 0) return
    touchStartY.current = e.touches[0].clientY
    currentDeltaY.current = 0
    isDragging.current = true
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return
    const rawDeltaY = e.touches[0].clientY - touchStartY.current
    if (rawDeltaY <= 6 && currentDeltaY.current === 0) return
    if (sheetRef.current.scrollTop > 0 && currentDeltaY.current === 0) {
      isDragging.current = false
      return
    }
    const deltaY = Math.max(0, rawDeltaY - 6)
    currentDeltaY.current = deltaY
    sheetRef.current.style.transition = 'none'
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
      closeTimerRef.current = setTimeout(() => onClose(), 240)
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
        transition: 'opacity 240ms ' + SHEET_SPRING,
      }}
      className="fixed inset-0 z-[95] flex items-end justify-center p-0 select-none bg-black/55"
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{ boxShadow: 'var(--ios-modal-shadow)', opacity: 1, willChange: 'transform, opacity' }}
        className={cn(
          'relative w-full max-w-[480px] ios-glass-modal rounded-t-[34px] p-4 pt-3 pb-[max(calc(env(safe-area-inset-bottom,0px)+16px),22px)] flex flex-col gap-4 max-h-[86%] overflow-y-auto'
        )}
      >
        <div className="rounded-full mx-auto shrink-0 w-[60px] h-[4px] bg-[var(--ios-tertiary)] opacity-45 shadow-[inset_0_0.5px_0_rgba(255,255,255,0.4)]" />
        <div className="flex items-center justify-between gap-3 min-h-[30px]">
          <div className="truncate text-[15px] font-semibold text-[var(--ios-secondary)] tracking-[-0.2px] pl-1">
            {title}
          </div>
          <UiSheetCloseButton onClick={handleDismiss} ariaLabel={closeLabel} />
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}
