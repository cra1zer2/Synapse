'use client'

import { useState } from 'react'
import { AttendanceResult } from '@/models/attendance.model'
import { SmartTimetableResult } from '@/models/timetable.model'
import { DayMatrixGroup } from '@/models/notification.model'
import { AppDictionary } from '@/config/dictionary.config'

interface JustificationModalProps {
    attendanceData: AttendanceResult
    timetableData: SmartTimetableResult | null
    onClose: () => void
    onSubmitMultiple: (payload: { dateIso: string; lessons: number[]; message: string }) => Promise<boolean>
    t: AppDictionary
}

export function JustificationModal({
    attendanceData,
    onClose,
    onSubmitMultiple,
    t
}: JustificationModalProps) {
    const [parentMessage, setParentMessage] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)

    const buildMatrix = (): DayMatrixGroup[] => {
        const daysMap: Record<string, DayMatrixGroup> = {}

        attendanceData.subjects.forEach((sub) => {
            sub.absences.forEach((abs) => {
                const dateKey = abs.date
                if (!daysMap[dateKey]) {
                    const iso = dateKey.includes('.') ? dateKey.split('.').reverse().join('-') : dateKey
                    daysMap[dateKey] = {
                        date: dateKey,
                        isoDate: iso,
                        dayName: '',
                        lessons: [],
                        hasUnexcused: false
                    }
                }

                const isUnexcused = abs.type === 'nb' || abs.type === 'sl'
                if (isUnexcused) {
                    daysMap[dateKey].hasUnexcused = true
                }

                const exists = daysMap[dateKey].lessons.some((l) => l.lessonNumber === abs.lessonNumber)
                if (!exists) {
                    daysMap[dateKey].lessons.push({
                        lessonNumber: abs.lessonNumber,
                        time: abs.time,
                        subject: abs.subject,
                        status: abs.type,
                        statusLabel: abs.typeName,
                        isSelectable: isUnexcused,
                        isSelected: isUnexcused
                    })
                }
            })
        })

        const result = Object.values(daysMap)
        result.forEach((g) => {
            g.lessons.sort((a, b) => a.lessonNumber - b.lessonNumber)
        })

        return result.filter((g) => g.hasUnexcused)
    }

    const [matrix, setMatrix] = useState<DayMatrixGroup[]>(buildMatrix)

    const toggleLesson = (dateKey: string, lessonNumber: number) => {
        setMatrix((prev) =>
            prev.map((group) => {
                if (group.date !== dateKey) return group
                return {
                    ...group,
                    lessons: group.lessons.map((l) => {
                        if (l.lessonNumber === lessonNumber && l.isSelectable) {
                            return { ...l, isSelected: !l.isSelected }
                        }
                        return l
                    })
                }
            })
        )
    }

    const selectAllNbInDay = (dateKey: string) => {
        setMatrix((prev) =>
            prev.map((group) => {
                if (group.date !== dateKey) return group
                return {
                    ...group,
                    lessons: group.lessons.map((l) => (l.isSelectable ? { ...l, isSelected: true } : l))
                }
            })
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        let allSucceeded = true

        for (const group of matrix) {
            const selectedLessonNumbers = group.lessons
                .filter((l) => l.isSelected && l.isSelectable)
                .map((l) => l.lessonNumber)

            if (selectedLessonNumbers.length > 0) {
                const ok = await onSubmitMultiple({
                    dateIso: group.isoDate,
                    lessons: selectedLessonNumbers,
                    message: parentMessage
                })
                if (!ok) allSucceeded = false
            }
        }

        setIsSubmitting(false)
        if (allSucceeded) {
            setSuccess(true)
            setTimeout(() => {
                onClose()
            }, 1400)
        }
    }

    const selectedCount = matrix.reduce(
        (acc, g) => acc + g.lessons.filter((l) => l.isSelected && l.isSelectable).length,
        0
    )

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--ios-card)] text-[var(--ios-label)] rounded-t-[28px] sm:rounded-[28px] p-5 w-full max-w-lg border border-[var(--ios-separator)]/60 shadow-2xl flex flex-col gap-4 max-h-[88vh] overflow-y-auto"
            >
                <div className="w-9 h-1 rounded-full bg-[var(--ios-element)] mx-auto -mt-1 mb-0.5 sm:hidden opacity-60 shrink-0" />

                <div className="flex items-center justify-between border-b border-[var(--ios-separator)] pb-3">
                    <div>
                        <h3 className="text-base font-semibold text-[var(--ios-label)] tracking-tight">e-Usprawiedliwienia</h3>
                        <p className="text-xs font-normal text-[var(--ios-secondary)] mt-0.5">Wybierz godziny nieobecności</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-full bg-[var(--ios-element)] text-[var(--ios-secondary)] hover:text-[var(--ios-label)] text-xs font-medium flex items-center justify-center active:scale-95 transition-all"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {success ? (
                    <div className="bg-[var(--ios-green-subtle)] border border-[var(--ios-green)]/20 text-[var(--ios-green)] p-5 rounded-[20px] text-center text-xs font-semibold">
                        ✓ {t.justificationSent}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {matrix.length > 0 ? (
                            <div className="flex flex-col gap-3">
                                {matrix.map((group) => (
                                    <div key={group.date} className="bg-[var(--ios-element)]/35 rounded-[20px] p-3.5 flex flex-col gap-2.5 border border-[var(--ios-separator)]/30">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-[var(--ios-label)]">{group.date}</span>
                                            <button
                                                type="button"
                                                onClick={() => selectAllNbInDay(group.date)}
                                                className="text-[11px] font-medium text-[var(--ios-blue)] bg-[var(--ios-card)] px-2.5 py-1 rounded-[8px] shadow-xs active:scale-95 transition-all"
                                            >
                                                Zaznacz NB
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            {group.lessons.map((lesson) => {
                                                const isLocked = !lesson.isSelectable

                                                return (
                                                    <div
                                                        key={lesson.lessonNumber}
                                                        onClick={() => !isLocked && toggleLesson(group.date, lesson.lessonNumber)}
                                                        className={`p-2.5 rounded-[14px] flex items-center justify-between border transition-all ${isLocked
                                                            ? 'bg-[var(--ios-card)]/50 border-transparent opacity-60 cursor-not-allowed'
                                                            : lesson.isSelected
                                                                ? 'bg-[var(--ios-card)] border-[var(--ios-blue)] shadow-xs cursor-pointer'
                                                                : 'bg-[var(--ios-card)] border-transparent cursor-pointer hover:border-[var(--ios-separator)]'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <input
                                                                type="checkbox"
                                                                checked={lesson.isSelected}
                                                                disabled={isLocked}
                                                                onChange={() => { }}
                                                                className="w-4 h-4 rounded text-[var(--ios-blue)] accent-[var(--ios-blue)] cursor-pointer pointer-events-none"
                                                            />
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-medium text-[var(--ios-label)] truncate">{lesson.subject}</p>
                                                                <p className="text-[10px] font-normal text-[var(--ios-secondary)]">
                                                                    Lekcja {lesson.lessonNumber} {lesson.time ? `• ${lesson.time}` : ''}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <span
                                                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${isLocked
                                                                ? 'bg-[var(--ios-green-subtle)] text-[var(--ios-green)]'
                                                                : 'bg-[var(--ios-red-subtle)] text-[var(--ios-red)]'
                                                                }`}
                                                        >
                                                            {isLocked ? '🔒 Usprawiedliwione' : 'NB'}
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-[var(--ios-element)]/30 p-8 rounded-[20px] text-center text-xs font-normal text-[var(--ios-secondary)]">
                                Brak nieobecności wymagających usprawiedliwienia
                            </div>
                        )}

                        <textarea
                            placeholder={t.commentPlaceholder}
                            value={parentMessage}
                            onChange={(e) => setParentMessage(e.target.value)}
                            className="w-full bg-[var(--ios-input)] text-[var(--ios-label)] placeholder-[var(--ios-secondary)] text-xs rounded-[14px] p-3 outline-none border border-transparent focus:border-[var(--ios-blue)] transition-all resize-none h-20"
                        />

                        <div className="flex gap-2.5">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-[var(--ios-element)] text-[var(--ios-label)] text-xs font-medium py-3 rounded-[14px] active:scale-[0.98] transition-all"
                            >
                                {t.cancel}
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || selectedCount === 0}
                                className="flex-1 bg-[var(--ios-blue)] text-white text-xs font-semibold py-3 rounded-[14px] active:scale-[0.98] disabled:opacity-40 transition-all shadow-xs"
                            >
                                {isSubmitting ? t.sending : `Usprawiedliw (${selectedCount})`}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}