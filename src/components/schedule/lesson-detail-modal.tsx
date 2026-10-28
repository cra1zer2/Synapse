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
          <div className="flex items-center gap-1.5">
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ios-blue)] shadow-[0_0_6px_rgba(0,136,255,0.8)] shrink-0" />
            )}
            <span className="text-[12px] font-normal text-[var(--ios-secondary)] tracking-tight tabular-nums">
              {activeData.number >= 0 ? `${t.lessonNumberLabel(activeData.number)} • ` : ''}{activeData.time || activeData.flag || ''}
            </span>
          </div>

          <h3 className="text-[20px] font-semibold text-[var(--ios-label)] tracking-[-0.2px] leading-snug break-words">
            {activeData.subject}
          </h3>
        </div>

        <div className="bg-[var(--ios-element)]/30 rounded-[16px] p-4 flex flex-col gap-1">
          <span className="text-[11px] font-medium text-[var(--ios-secondary)] uppercase tracking-wider block">
            {t.lessonTopic}
          </span>
          <p className="text-[15px] font-normal text-[var(--ios-label)] leading-relaxed whitespace-pre-wrap select-text">
            {activeData.topic || t.noTopicRecorded}
          </p>
        </div>

        <div className="bg-[var(--ios-element)]/30 rounded-[16px] overflow-hidden divide-y divide-[var(--ios-separator)]">
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

        <button
          type="button"
          onClick={handleDismiss}
          className="h-[50px] w-full bg-[var(--ios-element)] text-[var(--ios-label)] text-[15px] font-medium rounded-[16px] active:scale-[0.985] active:opacity-75 transition-all flex items-center justify-center cursor-pointer select-none mt-1"
        >
          {t.close}
        </button>
      </div>
    </div>
  )

  return createPortal(modalDom, document.body)
}
