'use client'

import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { LessonItem } from '@/models/timetable.model'
import { AppDictionary } from '@/config/dictionary.config'
import { parseLessonTimeRange, getCurrentTimeMinutes } from '@/utils/time.util'
import { cn } from '@/utils/cn.util'

interface LessonDetailModalProps {
  lesson: LessonItem | null
  onClose: () => void
  isToday: boolean
  t: AppDictionary
}

export function LessonDetailModal({
  lesson,
  onClose,
  isToday,
  t
}: LessonDetailModalProps) {
  const [isRendered, setIsRendered] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [cachedLesson, setCachedLesson] = useState<LessonItem | null>(lesson)
  const sheetRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef(0)
  const isDragging = useRef(false)
  const [currentMinutes, setCurrentMinutes] = useState(getCurrentTimeMinutes)

  useEffect(() => {
    if (lesson) {
      setCachedLesson(lesson)
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
  }, [lesson])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMinutes(getCurrentTimeMinutes())
    }, 15000)
    return () => clearInterval(interval)
  }, [])

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
  if (!isRendered && !lesson) return null

  const activeData = lesson || cachedLesson
  if (!activeData) return null

  const range = parseLessonTimeRange(activeData.time)
  const isActive = isToday && range.isValid && currentMinutes >= range.startMinutes && currentMinutes <= range.endMinutes
  const minutesLeft = isActive && range.isValid ? range.endMinutes - currentMinutes : null

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
          "w-full max-w-[402px] md:max-w-[420px] bg-[var(--ios-card-solid)] rounded-t-[34px] md:rounded-[34px] p-5 md:p-6 pb-[max(env(safe-area-inset-bottom,0px),1.5rem)] md:pb-6 border-none flex flex-col gap-4 max-h-[85vh] overflow-y-auto transition-all duration-300",
          isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-12 md:translate-y-0"
        )}
      >
        <div className="w-[36px] h-[5px] rounded-full bg-[rgba(60,60,67,0.3)] dark:bg-[rgba(255,255,255,0.28)] mx-auto mb-2 shrink-0 md:hidden" />

        <div className="flex items-start justify-between gap-3 pb-1">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ios-blue)] shrink-0 animate-pulse" />
              )}
              <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-tight tabular-nums">
                {activeData.number >= 0 ? `${t.lessonNumberLabel(activeData.number)} • ` : ''}{activeData.time || activeData.flag || ''}
              </span>
            </div>

            <h3 className="text-[20px] font-semibold text-[var(--ios-label)] tracking-[-0.2px] leading-snug break-words">
              {activeData.subject}
            </h3>
          </div>

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

        <div className="bg-[var(--bg-card-secondary)] rounded-[18px] p-4 flex flex-col gap-1 border-none">
          <span className="text-[11px] font-medium text-[var(--ios-secondary)] uppercase tracking-wider block">
            {t.lessonTopic}
          </span>
          <p className="text-[15px] font-normal text-[var(--ios-label)] leading-relaxed whitespace-pre-wrap select-text">
            {activeData.topic || t.noTopicRecorded}
          </p>
        </div>

        <div className="bg-[var(--bg-card-secondary)] rounded-[18px] overflow-hidden divide-y divide-[var(--ios-separator)] border-none">
          <div className="p-3.5 px-4 flex items-center justify-between text-[15px]">
            <span className="text-[var(--ios-secondary)] font-normal text-[13px]">{t.teacherLabel}</span>
            <span className="text-[var(--ios-label)] font-medium text-[15px] text-right truncate max-w-[200px]">
              {activeData.teacher || t.notSpecified}
            </span>
          </div>

          {activeData.room && (
            <div className="p-3.5 px-4 flex items-center justify-between text-[15px]">
              <span className="text-[var(--ios-secondary)] font-normal text-[13px]">{t.roomLabel}</span>
              <span className={cn('font-semibold text-[13px]', activeData.isSubstitution ? 'text-[var(--ios-purple)]' : 'text-[var(--ios-label)]')}>
                {activeData.room}
              </span>
            </div>
          )}

          {activeData.durationMinutes > 0 && (
            <div className="p-3.5 px-4 flex items-center justify-between text-[15px]">
              <span className="text-[var(--ios-secondary)] font-normal text-[13px]">{t.durationLabel}</span>
              <span className="text-[var(--ios-label)] font-medium text-[15px]">
                {activeData.durationMinutes} min {isActive && minutesLeft !== null ? `(pozostało ${minutesLeft} min)` : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalDom, document.body)
}
