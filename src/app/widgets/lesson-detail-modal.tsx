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
    const [isEntered, setIsEntered] = useState(false)
    const [isDismissing, setIsDismissing] = useState(false)
    const [dragOffsetY, setDragOffsetY] = useState(0)

    const touchStartY = useRef(0)
    const isDragging = useRef(false)
    const [currentMinutes, setCurrentMinutes] = useState(getCurrentTimeMinutes)

    useEffect(() => {
        const frame = requestAnimationFrame(() => setIsEntered(true))
        return () => cancelAnimationFrame(frame)
    }, [])

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentMinutes(getCurrentTimeMinutes())
        }, 15000)
        return () => clearInterval(interval)
    }, [])

    const handleDismiss = () => {
        if (isDismissing) return
        setIsDismissing(true)
        setTimeout(() => {
            onClose()
        }, 300)
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY
        isDragging.current = true
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging.current) return
        const delta = e.touches[0].clientY - touchStartY.current
        if (delta > 0) {
            setDragOffsetY(delta)
        }
    }

    const handleTouchEnd = () => {
        if (!isDragging.current) return
        isDragging.current = false
        if (dragOffsetY > 80) {
            handleDismiss()
        } else {
            setDragOffsetY(0)
        }
    }

    const range = parseLessonTimeRange(lesson.time)
    const isActive = isToday && range.isValid && currentMinutes >= range.startMinutes && currentMinutes <= range.endMinutes
    const minutesLeft = isActive && range.isValid ? range.endMinutes - currentMinutes : null

    return (
        <div
            onClick={handleDismiss}
            style={{
                opacity: isEntered && !isDismissing ? 1 : 0,
                transition: 'opacity 0.28s cubic-bezier(0.32, 0.72, 0, 1)'
            }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 will-change-[opacity]"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    transform: isDismissing
                        ? 'translateY(100%)'
                        : !isEntered
                            ? 'translateY(100%)'
                            : `translateY(${dragOffsetY}px)`,
                    transition: isDragging.current ? 'none' : 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)'
                }}
                className="bg-[var(--ios-card)] rounded-t-[28px] sm:rounded-[28px] w-full max-w-sm p-5 shadow-2xl border border-[var(--ios-separator)]/60 flex flex-col gap-3.5 max-h-[85vh] overflow-y-auto will-change-transform"
            >
                <div className="w-9 h-1 rounded-full bg-[var(--ios-element)] mx-auto -mt-1 mb-1 sm:hidden shrink-0 opacity-60" />

                <div className="flex flex-col gap-0.5 pb-1">
                    <div className="flex items-center gap-1.5">
                        {isActive && (
                            <span className="w-2 h-2 rounded-full bg-[var(--ios-blue)] shadow-[0_0_8px_rgba(10,132,255,0.8)] shrink-0" />
                        )}
                        <span className="text-[11px] font-normal text-[var(--ios-secondary)] tracking-tight">
                            {t.lessonNumberLabel(lesson.number)} • {lesson.time}
                        </span>
                    </div>

                    <h3 className="text-[17px] font-semibold text-[var(--ios-label)] leading-snug break-words mt-0.5 tracking-tight">
                        {lesson.subject}
                    </h3>
                </div>

                <div className="bg-[var(--ios-element)]/35 rounded-[16px] p-3.5 flex flex-col gap-1 border border-[var(--ios-separator)]/40">
                    <span className="text-[10px] font-medium text-[var(--ios-secondary)] uppercase tracking-wider block">
                        {t.lessonTopic}
                    </span>
                    <p className="text-xs font-normal text-[var(--ios-label)] leading-relaxed whitespace-pre-wrap select-text">
                        {lesson.topic || t.noTopicRecorded}
                    </p>
                </div>

                <div className="bg-[var(--ios-element)]/35 rounded-[16px] overflow-hidden divide-y divide-[var(--ios-separator)] border border-[var(--ios-separator)]/40">
                    <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-[var(--ios-secondary)] font-normal">{t.teacherLabel}</span>
                        <span className="text-[var(--ios-label)] font-medium text-right truncate max-w-[200px]">
                            {lesson.teacher || t.notSpecified}
                        </span>
                    </div>

                    {lesson.room && (
                        <div className="p-3.5 flex items-center justify-between text-xs">
                            <span className="text-[var(--ios-secondary)] font-normal">{t.roomLabel}</span>
                            <span className="bg-[var(--ios-room-bg)] text-[var(--ios-room-text)] px-2 py-0.5 rounded-[6px] font-medium text-[11px]">
                                {lesson.room}
                            </span>
                        </div>
                    )}

                    <div className="p-3.5 flex items-center justify-between text-xs">
                        <span className="text-[var(--ios-secondary)] font-normal">{t.durationLabel}</span>
                        <span className="text-[var(--ios-label)] font-medium">
                            {lesson.durationMinutes} min {isActive && minutesLeft !== null ? `(pozostało ${minutesLeft} min)` : ''}
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleDismiss}
                    className="h-11 w-full bg-[var(--ios-element)] text-[var(--ios-label)] text-xs font-medium rounded-[14px] active:scale-[0.98] transition-all mt-0.5 flex items-center justify-center cursor-pointer"
                >
                    {t.close}
                </button>
            </div>
        </div>
    )
}