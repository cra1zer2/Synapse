'use client'

import { useState } from 'react'
import { AttendanceResult } from '@/models/attendance.model'
import { SmartTimetableResult } from '@/models/timetable.model'
import { DayMatrixGroup, DayMatrixLesson } from '@/models/notification.model'
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
    timetableData,
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
            const selectedLessonNumbers = group.lessons.filter((l) => l.isSelected && l.isSelectable).map((l) => l.lessonNumber)

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
            className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-5 w-full max-w-lg border border-[#e5e5ea] shadow-2xl flex flex-col gap-4 max-h-[88vh] overflow-y-auto"
            >
                <div className="flex items-center justify-between border-b border-[#e5e5ea] pb-3">
                    <div>
                        <h3 className="text-base font-black text-[#1c1c1e]">e-Usprawiedliwienia</h3>
                        <p className="text-xs text-[#8e8e93] mt-0.5">Wybierz lekcje z nieobecnością nieusprawiedliwioną</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-[#f2f2f7] text-[#8e8e93] font-bold text-xs flex items-center justify-center"
                    >
                        ✕
                    </button>
                </div>

                {success ? (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-3xl text-center text-xs font-bold">
                        ✓ {t.justificationSent}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {matrix.length > 0 ? (
                            <div className="flex flex-col gap-3">
                                {matrix.map((group) => (
                                    <div key={group.date} className="bg-[#f2f2f7] rounded-3xl p-3.5 flex flex-col gap-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-[#1c1c1e]">{group.date}</span>
                                            <button
                                                type="button"
                                                onClick={() => selectAllNbInDay(group.date)}
                                                className="text-[10px] font-bold text-[#007aff] bg-white px-2.5 py-1 rounded-xl shadow-xs"
                                            >
                                                Zaznacz wszystkie NB
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            {group.lessons.map((lesson) => {
                                                const isLocked = !lesson.isSelectable

                                                return (
                                                    <div
                                                        key={lesson.lessonNumber}
                                                        onClick={() => !isLocked && toggleLesson(group.date, lesson.lessonNumber)}
                                                        className={`p-2.5 rounded-2xl flex items-center justify-between border transition-all ${isLocked
                                                                ? 'bg-white/60 border-transparent opacity-60 cursor-not-allowed'
                                                                : lesson.isSelected
                                                                    ? 'bg-white border-[#007aff] shadow-xs cursor-pointer'
                                                                    : 'bg-white border-transparent cursor-pointer'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <input
                                                                type="checkbox"
                                                                checked={lesson.isSelected}
                                                                disabled={isLocked}
                                                                onChange={() => { }}
                                                                className="w-4 h-4 rounded text-[#007aff] cursor-pointer pointer-events-none"
                                                            />
                                                            <div>
                                                                <p className="text-xs font-bold text-[#1c1c1e]">{lesson.subject}</p>
                                                                <p className="text-[10px] text-[#8e8e93]">
                                                                    Lekcja {lesson.lessonNumber} {lesson.time ? `• ${lesson.time}` : ''}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <span
                                                            className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${isLocked
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                                                }`}
                                                        >
                                                            {isLocked ? '🔒 Usprawiedliwione' : 'NB Do usprawiedliwienia'}
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-[#f2f2f7] p-8 rounded-3xl text-center text-xs font-medium text-[#8e8e93]">
                                Brak nieobecności wymagających usprawiedliwienia
                            </div>
                        )}

                        <textarea
                            placeholder={t.commentPlaceholder}
                            value={parentMessage}
                            onChange={(e) => setParentMessage(e.target.value)}
                            className="w-full bg-[#f2f2f7] text-[#1c1c1e] text-xs rounded-2xl p-3 outline-none focus:ring-2 focus:ring-[#007aff] resize-none h-20"
                        />

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-[#f2f2f7] text-[#1c1c1e] text-xs font-bold py-3 rounded-2xl active:opacity-80"
                            >
                                {t.cancel}
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || selectedCount === 0}
                                className="flex-1 bg-[#007aff] text-white text-xs font-bold py-3 rounded-2xl active:opacity-80 disabled:opacity-40 transition-all shadow-xs"
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