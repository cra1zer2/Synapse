'use client'

import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { GradeItem } from '@/models/grade.model'
import { AppDictionary } from '@/config/dictionary.config'
import { cn } from '@/utils/cn.util'

interface GradeDetailModalProps {
  gradeDetail: { grade: GradeItem; subject: string } | null
  isOpen: boolean
  onClose: () => void
  t: AppDictionary
}

function getGradeBadgeStyle(gradeStr: string): string {
  const g = gradeStr.trim().toLowerCase()
  if (g.startsWith('0') || g.startsWith('1') || g === 'nb') {
    return 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)] font-semibold'
  }
  return 'bg-[var(--ios-element)]/65 text-[var(--ios-label)]'
}

export function GradeDetailModal({
  gradeDetail,
  isOpen,
  onClose,
  t
}: GradeDetailModalProps) {
  const [isRendered, setIsRendered] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [cachedDetail, setCachedDetail] = useState<{ grade: GradeItem; subject: string } | null>(gradeDetail)
  const sheetRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef(0)
  const isDragging = useRef(false)

  useEffect(() => {
    if (isOpen && gradeDetail) {
      setCachedDetail(gradeDetail)
      setIsRendered(true)
      let raf1 = 0
      let raf2 = 0
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setIsVisible(true)
        })
      })
      return () => {
        cancelAnimationFrame(raf1)
        cancelAnimationFrame(raf2)
      }
    } else {
      setIsVisible(false)
      const timer = setTimeout(() => {
        setIsRendered(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, gradeDetail])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose()
    }, 280)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    isDragging.current = true
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none'
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return
    const deltaY = e.touches[0].clientY - touchStartY.current
    if (deltaY > 0) {
      sheetRef.current.style.transform = `translate3d(0, ${deltaY}px, 0)`
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return
    isDragging.current = false
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    const sheet = sheetRef.current

    if (deltaY > 80 && sheet) {
      sheet.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)'
      sheet.style.transform = 'translate3d(0, 100%, 0)'
      handleDismiss()
    } else if (sheet) {
      sheet.style.transition = 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)'
      sheet.style.transform = 'translate3d(0, 0, 0)'
    }
  }

  if (typeof document === 'undefined') return null
  if (!isRendered && !gradeDetail) return null

  const activeData = gradeDetail || cachedDetail
  if (!activeData) return null

  const modalDom = (
    <div
      onClick={handleDismiss}
      style={{
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        transition: 'opacity 0.25s cubic-bezier(0.32, 0.72, 0, 1)'
      }}
      className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6 select-none"
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "w-full max-w-[402px] md:max-w-[460px] bg-[var(--ios-card-solid)] rounded-t-[34px] md:rounded-[26px] p-5 md:p-6 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] md:pb-6 border-t md:border border-[var(--ios-border)] flex flex-col gap-4 max-h-[85vh] overflow-y-auto transition-all duration-300",
          isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-12 md:translate-y-0"
        )}
      >
        <div className="w-[36px] h-[5px] rounded-[2.5px] bg-[var(--ios-element)] mx-auto mb-1 shrink-0 opacity-60 md:hidden" />

        <div className="flex items-center justify-between pb-1">
          <span className="text-[14px] font-semibold text-[var(--ios-secondary)] tracking-tight truncate pr-2">
            {activeData.subject}
          </span>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full bg-[var(--ios-element)] hover:bg-[var(--ios-element)]/80 text-[var(--ios-secondary)] hover:text-[var(--ios-label)] cursor-pointer active:scale-95 transition-all flex items-center justify-center shrink-0 -mr-1 -mt-1 select-none"
            title="Zamknij"
            aria-label="Zamknij"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between pb-1">
          <span className={`min-w-[48px] h-[48px] px-3.5 rounded-[14px] flex items-center justify-center text-[26px] font-semibold tabular-nums ${getGradeBadgeStyle(activeData.grade.grade)}`}>
            {activeData.grade.grade}
          </span>

          <div className="flex flex-col items-end">
            <span className="text-[11px] font-medium text-[var(--ios-secondary)] uppercase tracking-wider">
              {t.weight}
            </span>
            <span className="text-[18px] font-semibold text-[var(--ios-label)] tabular-nums">
              {activeData.grade.weight}
            </span>
          </div>
        </div>

        {activeData.grade.description ? (
          <div className="bg-[var(--ios-element)]/30 rounded-[16px] p-4 flex flex-col gap-1">
            <span className="text-[11px] font-medium text-[var(--ios-secondary)] uppercase tracking-wider block">
              Temat / Komentarz
            </span>
            <p className="text-[15px] font-normal text-[var(--ios-label)] leading-relaxed whitespace-pre-wrap select-text">
              {activeData.grade.description}
            </p>
          </div>
        ) : null}

        <div className="bg-[var(--ios-element)]/30 rounded-[16px] p-4 flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-[var(--ios-secondary)] uppercase tracking-wider block">
            {t.partialGradesTitle}
          </span>
          <p className="text-[15px] font-normal text-[var(--ios-label)] leading-snug">
            {activeData.grade.category || 'Ocena'}
          </p>
        </div>

        <div className="flex flex-col gap-2 text-[13px] text-[var(--ios-secondary)] px-1">
          {activeData.grade.date && (
            <div className="flex items-center justify-between">
              <span>{t.dateLabel}</span>
              <span className="text-[var(--ios-label)] tabular-nums">{activeData.grade.date}</span>
            </div>
          )}
          {activeData.grade.teacher && (
            <div className="flex items-center justify-between">
              <span>{t.teacherLabel}</span>
              <span className="text-[var(--ios-label)]">{activeData.grade.teacher}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalDom, document.body)
}
