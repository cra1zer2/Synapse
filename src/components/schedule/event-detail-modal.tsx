'use client'

import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { TimetableEvent } from '@/models/timetable.model'
import { AppDictionary } from '@/config/dictionary.config'
import { cn } from '@/utils/cn.util'
import { formatHumanPolishDate } from '@/utils/date.util'

interface EventDetailModalProps {
  event: TimetableEvent | null
  isOpen: boolean
  onClose: () => void
  t: AppDictionary
}

export function EventDetailModal({
  event,
  isOpen,
  onClose,
  t
}: EventDetailModalProps) {
  const [isRendered, setIsRendered] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [cachedEvent, setCachedEvent] = useState<TimetableEvent | null>(event)
  const sheetRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef(0)
  const isDragging = useRef(false)

  useEffect(() => {
    if (isOpen && event) {
      setCachedEvent(event)
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
      const timer = setTimeout(() => setIsRendered(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, event])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => onClose(), 280)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    isDragging.current = true
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return
    const deltaY = e.touches[0].clientY - touchStartY.current
    if (deltaY > 0) sheetRef.current.style.transform = `translate3d(0, ${deltaY}px, 0)`
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
  if (!isRendered && !event) return null

  const activeData = event || cachedEvent
  if (!activeData) return null

  const isHoliday = activeData.category === 'holiday'
  const isQuiz = activeData.category === 'quiz'

  const modalDom = (
    <div
      onClick={handleDismiss}
      style={{
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        transition: 'opacity 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
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
          "w-full max-w-[402px] md:max-w-[420px] bg-[var(--ios-card-solid)] rounded-t-[34px] md:rounded-[34px] p-5 md:p-6 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] md:pb-6 border-none flex flex-col gap-4 max-h-[85vh] overflow-y-auto transition-all duration-300",
          isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-12 md:translate-y-0"
        )}
      >
        <div className="w-[36px] h-[5px] rounded-full bg-[rgba(60,60,67,0.3)] dark:bg-[rgba(255,255,255,0.28)] mx-auto mb-2 shrink-0 md:hidden" />

        <div className="flex flex-col gap-1 pb-1">
          <div className="flex items-center justify-between">
            <span className={cn(
              'text-[11px] font-semibold tracking-wider px-2.5 py-0.5 rounded-full uppercase',
              isHoliday
                ? 'bg-[var(--ios-teal)] text-white'
                : isQuiz
                ? 'bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)]'
                : 'bg-[var(--ios-purple-subtle)] text-[var(--ios-purple)]'
            )}>
              {activeData.eventType || (isHoliday ? 'Dzień wolny' : isQuiz ? 'Kartkówka' : 'Sprawdzian')}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-tight tabular-nums">
                {formatHumanPolishDate(activeData.date)}
              </span>
              <button
                type="button"
                onClick={handleDismiss}
                className="w-7 h-7 rounded-full bg-[var(--ios-element)] hover:bg-[var(--ios-element)]/80 text-[var(--ios-secondary)] hover:text-[var(--ios-label)] cursor-pointer active:scale-95 transition-all flex items-center justify-center shrink-0 -mr-1 select-none"
                title="Zamknij"
                aria-label="Zamknij"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <h3 className="text-[20px] font-semibold text-[var(--ios-label)] tracking-[-0.2px] leading-snug break-words mt-1">
            {activeData.subjectName || activeData.eventType || 'Wydarzenie'}
          </h3>
        </div>

        <div className="bg-[var(--bg-card-secondary)] rounded-[18px] overflow-hidden divide-y divide-[var(--ios-separator)] border-none">
          <div className="p-3.5 px-4 flex items-center justify-between text-[15px]">
            <span className="text-[var(--ios-secondary)] font-normal text-[13px]">Typ</span>
            <span className="text-[var(--ios-label)] font-medium text-[15px]">
              {activeData.eventType || (isHoliday ? 'Dzień wolny' : isQuiz ? 'Kartkówka' : 'Sprawdzian')}
            </span>
          </div>
          {activeData.lessonNumber !== undefined && (
            <div className="p-3.5 px-4 flex items-center justify-between text-[15px]">
              <span className="text-[var(--ios-secondary)] font-normal text-[13px]">Godzina lekcyjna</span>
              <span className="text-[var(--ios-label)] font-medium text-[15px]">
                {t.lessonNumberLabel(activeData.lessonNumber)}
              </span>
            </div>
          )}
          {activeData.time && (
            <div className="p-3.5 px-4 flex items-center justify-between text-[15px]">
              <span className="text-[var(--ios-secondary)] font-normal text-[13px]">Godziny</span>
              <span className="text-[var(--ios-label)] font-medium text-[15px]">{activeData.time}</span>
            </div>
          )}
          {activeData.teacher && (
            <div className="p-3.5 px-4 flex items-center justify-between text-[15px]">
              <span className="text-[var(--ios-secondary)] font-normal text-[13px]">Nauczyciel</span>
              <span className="text-[var(--ios-label)] font-medium text-[15px] truncate max-w-[200px] text-right">{activeData.teacher}</span>
            </div>
          )}
        </div>

        {activeData.description && (
          <div className="bg-[var(--bg-card-secondary)] rounded-[18px] p-4 flex flex-col gap-1 border-none">
            <span className="text-[11px] font-medium text-[var(--ios-secondary)] uppercase tracking-wider block">
              Zakres materiału
            </span>
            <p className="text-[15px] font-normal text-[var(--ios-label)] leading-relaxed whitespace-pre-wrap select-text">
              {activeData.description}
            </p>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalDom, document.body)
}