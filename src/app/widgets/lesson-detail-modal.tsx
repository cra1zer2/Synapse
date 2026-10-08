'use client'

import { useRef, useState, useEffect } from 'react'
import { LessonItem } from '@/models/timetable.model'
import { AppDictionary } from '@/config/dictionary.config'
import { parseLessonTimeRange, getCurrentTimeMinutes } from '@/utils/time.util'

interface LessonDetailModalProps {
    lesson: LessonItem
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
    const sheetRef = useRef<HTMLDivElement>(null)
    const touchStartY = useRef(0)
    const isDragging = useRef(false)
    const currentDeltaY = useRef(0)

    const [currentMinutes, setCurrentMinutes] = useState(getCurrentTimeMinutes)

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentMinutes(getCurrentTimeMinutes())
        }, 15000)
        return () => clearInterval(interval)
    }, [])

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY
        isDragging.current = true
        currentDeltaY.current = 0
        if (sheetRef.current) {
            sheetRef.current.style.transition = 'none'
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging.current || !sheetRef.current) return
        const delta = e.touches[0].clientY - touchStartY.current
        if (delta > 0) {
            currentDeltaY.current = delta
            sheetRef.current.style.transform = `translateY(${delta}px)`
        }
    }

    const handleTouchEnd = () => {
        if (!isDragging.current || !sheetRef.current) return
        isDragging.current = false
        sheetRef.current.style.transition = 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)'
        if (currentDeltaY.current > 85) {
            sheetRef.current.style.transform = 'translateY(100%)'
            setTimeout(onClose, 320)
        } else {
            sheetRef.current.style.transform = 'translateY(0)'
        }
        currentDeltaY.current = 0
    }

    const range = parseLessonTimeRange(lesson.time)
    const isActive = isToday && range.isValid && currentMinutes >= range.startMinutes && currentMinutes <= range.endMinutes
    const minutesLeft = isActive && range.isValid ? range.endMinutes - currentMinutes : null

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-250"
        >
            <div
                ref={sheetRef}
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="bg-[var(--ios-card-solid)] rounded-t-[26px] sm:rounded-[26px] w-full max-w-sm p-5 shadow-[0_-12px_40px_rgba(0,0,0,0.4)] flex flex-col gap-4 max-h-[85vh] overflow-y-auto will-change-transform animate-in slide-in-from-bottom-8 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] border-t border-[var(--ios-separator)] sm:border-t-0"
            >
                <div className="w-9 h-1 rounded-full bg-[var(--ios-element)] mx-auto -mt-1 sm:hidden shrink-0 opacity-80" />

                <div className="flex flex-col gap-1 border-b border-[var(--ios-separator)] pb-3">
                    <div className="flex items-center gap-1.5">
                        {isActive && (
                            <span className="w-2 h-2 rounded-full bg-[#007aff] dark:bg-[#0a84ff] shadow-[0_0_8px_rgba(10,132,255,0.8)] shrink-0" />
                        )}
                        <span className="text-[11px] font-normal text-[var(--ios-secondary)] tracking-tight">
                            {t.lessonNumberLabel(lesson.number)} • {lesson.time}
                        </span>
                    </div>

                    <h3 className="text-base font-medium text-[var(--ios-label)] leading-snug break-words">
                        {lesson.subject}
                    </h3>
                </div>

                <div className="bg-[var(--ios-card)] rounded-[18px] p-3.5 flex flex-col gap-1 shadow-xs border border-[var(--ios-separator)]/40">
                    <span className="text-[10px] font-normal text-[var(--ios-secondary)] uppercase tracking-wider block">
                        {t.lessonTopic}
                    </span>
                    <p className="text-xs font-normal text-[var(--ios-label)] leading-relaxed whitespace-pre-wrap select-text">
                        {lesson.topic || t.noTopicRecorded}
                    </p>
                </div>

                <div className="bg-[var(--ios-card)] rounded-[18px] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)] border border-[var(--ios-separator)]/40">
                    <div className="p-3 flex items-center justify-between text-xs">
                        <span className="text-[var(--ios-secondary)] font-normal">{t.teacherLabel}</span>
                        <span className="text-[var(--ios-label)] font-medium text-right truncate max-w-[200px]">
                            {lesson.teacher || t.notSpecified}
                        </span>
                    </div>

                    {lesson.room && (
                        <div className="p-3 flex items-center justify-between text-xs">
                            <span className="text-[var(--ios-secondary)] font-normal">{t.roomLabel}</span>
                            <span className="bg-[var(--ios-room-bg)] text-[var(--ios-room-text)] px-2 py-0.5 rounded-[6px] font-medium text-[11px]">
                                {lesson.room}
                            </span>
                        </div>
                    )}

                    <div className="p-3 flex items-center justify-between text-xs">
                        <span className="text-[var(--ios-secondary)] font-normal">{t.durationLabel}</span>
                        <span className="text-[var(--ios-label)] font-normal">
                            {lesson.durationMinutes} min {isActive && minutesLeft !== null ? `(pozostało ${minutesLeft} min)` : ''}
                        </span>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="h-11 w-full bg-[var(--ios-element)] text-[var(--ios-label)] text-xs font-medium rounded-xl active:opacity-75 transition-opacity mt-0.5 flex items-center justify-center cursor-pointer"
                >
                    {t.close}
                </button>
            </div>
        </div>
    )
}