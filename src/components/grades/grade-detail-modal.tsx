'use client'

import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { GradeItem } from '@/models/grade.model'
import { AppDictionary } from '@/config/dictionary.config'

interface GradeDetailModalProps {
  gradeDetail: { grade: GradeItem; subject: string } | null
  isOpen: boolean
  onClose: () => void
  t: AppDictionary
}

function getGradeBadgeStyle(gradeStr: string): string {
  const g = gradeStr.trim().toLowerCase()
  if (g.startsWith('1')) {
    return 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)] border border-[var(--ios-red)]/20'
  }
  return 'bg-[var(--ios-element)] text-[var(--ios-label)] border border-[var(--ios-separator)]/30'
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
        transition: 'opacity 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
      }}
      className="fixed inset-0 z-[80] bg-black/40 flex items-end justify-center select-none"
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: isVisible ? 'translate3d(0, 0, 0)' : 'translate3d(0, 100%, 0)',
          transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
          willChange: 'transform'
        }}
        className="w-full max-w-[402px] bg-[var(--ios-card-solid)] rounded-t-[34px] px-5 pt-3 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] shadow-2xl border-t border-[var(--ios-border)] flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
      >
        <div className="w-[36px] h-[5px] rounded-[2.5px] bg-[var(--ios-element)] mx-auto mb-1 shrink-0 opacity-60" />

        <div className="flex flex-col gap-1 pb-1">
          <span className="text-[13px] font-normal text-[var(--ios-secondary)] tracking-tight">
            {activeData.subject}
          </span>

          <div className="flex items-center justify-between mt-1">
            <span className={`min-w-[44px] h-[44px] px-3 rounded-[14px] flex items-center justify-center text-[24px] font-semibold tabular-nums ${getGradeBadgeStyle(activeData.grade.grade)}`}>
              {activeData.grade.grade}
            </span>

            <div className="flex flex-col items-end">
              <span className="text-[11px] font-normal text-[var(--ios-secondary)] uppercase tracking-wider">
                {t.weight}
              </span>
              <span className="text-[16px] font-medium text-[var(--ios-label)] tabular-nums">
                {activeData.grade.weight}
              </span>
            </div>
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

        <button
          type="button"
          onClick={handleDismiss}
          className="h-[50px] w-full bg-[var(--ios-element)] text-[var(--ios-label)] text-[15px] font-medium rounded-[16px] active:scale-[0.985] active:opacity-75 transition-all flex items-center justify-center cursor-pointer mt-1"
        >
          {t.close}
        </button>
      </div>
    </div>
  )

  return createPortal(modalDom, document.body)
}
