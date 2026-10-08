'use client'

import { useRef } from 'react'
import { SubjectAttendance, AbsenceDetail } from '@/models/attendance.model'
import { AppDictionary } from '@/config/dictionary.config'

interface AttendanceDetailModalProps {
    subjectDetail: SubjectAttendance
    onClose: () => void
    onSelectAbsenceForExcuse: (absence: AbsenceDetail) => void
    t: AppDictionary
}

export function AttendanceDetailModal({
    subjectDetail,
    onClose,
    t
}: AttendanceDetailModalProps) {
    const modalRef = useRef<HTMLDivElement>(null)
    const touchStartX = useRef(0)
    const isSwiping = useRef(false)
    const currentDelta = useRef(0)

    const handleTouchStart = (e: React.TouchEvent) => {
        const clientX = e.touches[0].clientX
        touchStartX.current = clientX
        if (clientX < 60) {
            isSwiping.current = true
            currentDelta.current = 0
            if (modalRef.current) {
                modalRef.current.style.transition = 'none'
            }
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isSwiping.current || !modalRef.current) return
        const delta = e.touches[0].clientX - touchStartX.current
        if (delta > 0) {
            currentDelta.current = delta
            modalRef.current.style.transform = `translateX(${delta}px)`
        }
    }

    const handleTouchEnd = () => {
        if (!isSwiping.current || !modalRef.current) return
        isSwiping.current = false
        modalRef.current.style.transition = 'transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)'
        if (currentDelta.current > 85) {
            modalRef.current.style.transform = 'translateX(100%)'
            setTimeout(onClose, 280)
        } else {
            modalRef.current.style.transform = 'translateX(0)'
        }
        currentDelta.current = 0
    }

    const absences = subjectDetail.absences || []

    return (
        <div
            ref={modalRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="fixed inset-0 z-50 bg-[var(--ios-bg)] flex flex-col animate-in fade-in slide-in-from-right duration-250 will-change-transform"
        >
            <header className="sticky top-0 z-10 w-full pt-[max(calc(env(safe-area-inset-top,0px)+0.75rem),1.75rem)] pb-2.5 px-4 bg-[var(--ios-bg)]/85 backdrop-blur-xl border-b border-[var(--ios-separator)] flex items-center justify-between">
                <button
                    onClick={onClose}
                    className="flex items-center gap-1 text-[var(--ios-blue)] text-xs font-medium active:opacity-70 -ml-1 py-1 pr-2"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <span>{t.attendance}</span>
                </button>

                <h2 className="text-sm font-semibold text-[var(--ios-label)] tracking-tight max-w-[200px] truncate text-center">
                    {subjectDetail.subject}
                </h2>

                <button
                    onClick={onClose}
                    className="text-xs font-semibold text-[var(--ios-blue)] active:opacity-70 py-1 pl-2"
                >
                    {t.done}
                </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 max-w-lg mx-auto w-full pb-[calc(env(safe-area-inset-bottom,0px)+2rem)]">
                <div className="bg-[var(--ios-card)] rounded-[18px] p-4 flex items-center justify-between shadow-xs">
                    <div>
                        <span className="text-[11px] font-semibold text-[var(--ios-secondary)] uppercase tracking-wider block">
                            {t.subjectAttendance}
                        </span>
                        <h3 className="text-2xl font-semibold tracking-tight text-[var(--ios-label)] mt-0.5">
                            {subjectDetail.percentage}%
                        </h3>
                    </div>

                    <div className="text-right">
                        <span className="text-xs font-semibold text-[var(--ios-secondary)] block">
                            {t.missedLessonsCount(subjectDetail.absentLessons)}
                        </span>
                        <span className="text-[11px] font-normal text-[var(--ios-secondary)]/80 mt-0.5 block">
                            {t.ofScheduled(subjectDetail.totalLessons)}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-[var(--ios-secondary)] uppercase tracking-wider px-1">
                        {t.recordedAbsencesTitle}
                    </span>

                    {absences.length > 0 ? (
                        <div className="bg-[var(--ios-card)] rounded-[18px] overflow-hidden shadow-xs divide-y divide-[var(--ios-separator)]">
                            {absences.map((item, idx) => (
                                <article key={`${item.date}-${item.lessonNumber}-${idx}`} className="p-3.5 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-[var(--ios-label)]">{item.date}</span>
                                            <span className="text-[11px] font-medium text-[var(--ios-secondary)]">
                                                {t.lessonNumberLabel(item.lessonNumber)} {item.time ? `(${item.time})` : ''}
                                            </span>
                                        </div>

                                        <span
                                            className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${item.isUnexcused
                                                ? 'bg-[#ff3b30]/15 text-[#ff3b30]'
                                                : 'bg-[#34c759]/15 text-[#34c759]'
                                                }`}
                                        >
                                            {item.type.toUpperCase()}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-[var(--ios-secondary)]">
                                        <span className="truncate pr-2">{item.typeName}</span>
                                        {item.teacher && <span className="shrink-0 text-[11px]">{item.teacher}</span>}
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-[var(--ios-card)] rounded-[18px] p-8 text-center text-xs font-medium text-[var(--ios-secondary)]">
                            {t.noAbsencesRecorded}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}