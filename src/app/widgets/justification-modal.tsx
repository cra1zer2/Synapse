'use client'

import { useState } from 'react'
import { AttendanceResult, SubjectAttendance } from '@/models/attendance.model'
import { SmartTimetableResult } from '@/models/timetable.model'
import { DayMatrixGroup } from '@/models/notification.model'
import { PendingJustificationRecord } from '@/models/justification.model'
import { AppDictionary } from '@/config/dictionary.config'

const STORAGE_KEY = 'synapse_pending_justifications'

function getPendingJustifications(): PendingJustificationRecord[] {
    if (typeof window === 'undefined') return []
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

function savePendingJustification(
    entry: Omit<PendingJustificationRecord, 'id' | 'submittedAt' | 'status'>
): PendingJustificationRecord {
    const current = getPendingJustifications()
    const newRecord: PendingJustificationRecord = {
        id: `${entry.dateIso}-${entry.lessons.slice().sort((a, b) => a - b).join('_')}-${Date.now()}`,
        dateIso: entry.dateIso,
        dateDisplay: entry.dateDisplay,
        lessons: [...entry.lessons],
        message: entry.message,
        submittedAt: new Date().toISOString(),
        status: 'pending'
    }
    const updated = [...current, newRecord]
    if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }
    return newRecord
}

function reconcilePendingJustifications(
    subjects: SubjectAttendance[]
): PendingJustificationRecord[] {
    if (typeof window === 'undefined') return []
    const current = getPendingJustifications()
    if (current.length === 0) return []

    const excusedKeys = new Set<string>()
    for (const sub of subjects) {
        if (!Array.isArray(sub.absences)) continue
        for (const abs of sub.absences) {
            if (abs.type === 'u' || abs.type === 'zw') {
                excusedKeys.add(`${abs.date}_${abs.lessonNumber}`)
                const iso = abs.date.includes('.') ? abs.date.split('.').reverse().join('-') : abs.date
                excusedKeys.add(`${iso}_${abs.lessonNumber}`)
            }
        }
    }

    const reconciled: PendingJustificationRecord[] = []
    for (const rec of current) {
        const remainingLessons = rec.lessons.filter((num) => {
            const key1 = `${rec.dateIso}_${num}`
            const key2 = `${rec.dateDisplay || ''}_${num}`
            return !excusedKeys.has(key1) && !excusedKeys.has(key2)
        })
        if (remainingLessons.length > 0) {
            reconciled.push({
                ...rec,
                lessons: remainingLessons
            })
        }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(reconciled))
    return reconciled
}

function isLessonJustificationPending(
    pendingList: PendingJustificationRecord[],
    dateIso: string,
    dateDisplay: string,
    lessonNumber: number
): boolean {
    if (!Array.isArray(pendingList)) return false
    return pendingList.some((rec) => {
        const matchesDate = rec.dateIso === dateIso || rec.dateIso === dateDisplay || rec.dateDisplay === dateDisplay
        return matchesDate && Array.isArray(rec.lessons) && rec.lessons.includes(lessonNumber)
    })
}

interface JustificationModalProps {
    attendanceData: AttendanceResult
    timetableData: SmartTimetableResult | null
    canSubmitExcuse?: boolean
    onClose: () => void
    onSubmitMultiple: (payload: { dateIso: string; lessons: number[]; message: string }) => Promise<boolean>
    t: AppDictionary
}

export function JustificationModal({
    attendanceData,
    canSubmitExcuse = true,
    onClose,
    onSubmitMultiple,
    t
}: JustificationModalProps) {
    const [parentMessage, setParentMessage] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)

    const [pendingList, setPendingList] = useState<PendingJustificationRecord[]>(() => {
        return reconcilePendingJustifications(attendanceData.subjects)
    })

    const buildMatrix = (currentPending: PendingJustificationRecord[]): DayMatrixGroup[] => {
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

                const isoDateVal = daysMap[dateKey].isoDate
                const isPending = isLessonJustificationPending(currentPending, isoDateVal, dateKey, abs.lessonNumber)

                const exists = daysMap[dateKey].lessons.some((l) => l.lessonNumber === abs.lessonNumber)
                if (!exists) {
                    const isSelectable = isUnexcused && !isPending && canSubmitExcuse
                    daysMap[dateKey].lessons.push({
                        lessonNumber: abs.lessonNumber,
                        time: abs.time,
                        subject: abs.subject,
                        status: isPending ? 'pending' : abs.type,
                        statusLabel: isPending ? t.pendingJustification : abs.typeName,
                        isSelectable,
                        isSelected: isSelectable,
                        isPending
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

    const [matrix, setMatrix] = useState<DayMatrixGroup[]>(() => buildMatrix(pendingList))

    const toggleLesson = (dateKey: string, lessonNumber: number) => {
        setMatrix((prev) =>
            prev.map((group) => {
                if (group.date !== dateKey) return group
                return {
                    ...group,
                    lessons: group.lessons.map((l) => {
                        if (l.lessonNumber === lessonNumber && l.isSelectable && !l.isPending) {
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
                    lessons: group.lessons.map((l) => (l.isSelectable && !l.isPending ? { ...l, isSelected: true } : l))
                }
            })
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSubmitExcuse) return
        setIsSubmitting(true)

        let allSucceeded = true
        const newlyPending: Array<{ dateIso: string; dateDisplay: string; lessons: number[]; message: string }> = []

        for (const group of matrix) {
            const selectedLessonNumbers = group.lessons
                .filter((l) => l.isSelected && l.isSelectable && !l.isPending)
                .map((l) => l.lessonNumber)

            if (selectedLessonNumbers.length > 0) {
                const ok = await onSubmitMultiple({
                    dateIso: group.isoDate,
                    lessons: selectedLessonNumbers,
                    message: parentMessage
                })
                if (ok) {
                    savePendingJustification({
                        dateIso: group.isoDate,
                        dateDisplay: group.date,
                        lessons: selectedLessonNumbers,
                        message: parentMessage
                    })
                    newlyPending.push({
                        dateIso: group.isoDate,
                        dateDisplay: group.date,
                        lessons: selectedLessonNumbers,
                        message: parentMessage
                    })
                } else {
                    allSucceeded = false
                }
            }
        }

        const refreshedPending = getPendingJustifications()
        setPendingList(refreshedPending)
        setMatrix(buildMatrix(refreshedPending))
        setIsSubmitting(false)

        if (allSucceeded && newlyPending.length > 0) {
            setSuccess(true)
            setTimeout(() => {
                onClose()
            }, 1400)
        }
    }

    const selectedCount = matrix.reduce(
        (acc, g) => acc + g.lessons.filter((l) => l.isSelected && l.isSelectable && !l.isPending).length,
        0
    )

    const totalSelectableInMatrix = matrix.reduce(
        (acc, g) => acc + g.lessons.filter((l) => l.isSelectable && !l.isPending).length,
        0
    )

    const hasAnyPendingInMatrix = matrix.some((g) => g.lessons.some((l) => l.isPending))

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-[3px] flex items-end sm:items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--ios-card)] text-[var(--ios-label)] rounded-t-[26px] sm:rounded-[26px] p-5 w-full max-w-lg shadow-2xl flex flex-col gap-4 max-h-[88vh] overflow-y-auto"
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

                {!canSubmitExcuse && (
                    <div className="bg-[var(--ios-orange-subtle)] text-[var(--ios-orange)] p-3 rounded-[16px] text-xs font-normal flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{t.onlyParentCanExcuse}</span>
                    </div>
                )}

                {success ? (
                    <div className="bg-[var(--ios-green-subtle)] text-[var(--ios-green)] p-5 rounded-[20px] text-center text-xs font-semibold">
                        ✓ {t.justificationSent}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {matrix.length > 0 ? (
                            <div className="flex flex-col gap-3">
                                {totalSelectableInMatrix === 0 && hasAnyPendingInMatrix && (
                                    <div className="bg-[var(--ios-yellow)]/15 text-[var(--ios-yellow)] dark:text-[#ffd60a] p-3 rounded-[16px] text-xs font-normal text-center">
                                        {t.allPendingNotice}
                                    </div>
                                )}

                                {matrix.map((group) => (
                                    <div key={group.date} className="bg-[var(--ios-element)]/35 rounded-[18px] p-3.5 flex flex-col gap-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-[var(--ios-label)]">{group.date}</span>
                                            {canSubmitExcuse && (
                                                <button
                                                    type="button"
                                                    onClick={() => selectAllNbInDay(group.date)}
                                                    className="text-[11px] font-medium text-[var(--ios-blue)] bg-[var(--ios-card)] px-2.5 py-1 rounded-[8px] shadow-xs active:scale-95 transition-all"
                                                >
                                                    Zaznacz NB
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            {group.lessons.map((lesson) => {
                                                const isLocked = !lesson.isSelectable
                                                const isPending = Boolean(lesson.isPending)

                                                return (
                                                    <div
                                                        key={lesson.lessonNumber}
                                                        onClick={() => !isLocked && !isPending && toggleLesson(group.date, lesson.lessonNumber)}
                                                        className={`p-2.5 rounded-[16px] flex items-center justify-between transition-all ${isPending
                                                            ? 'bg-[var(--ios-card)]/50 opacity-75 cursor-not-allowed'
                                                            : isLocked
                                                                ? 'bg-[var(--ios-card)]/50 opacity-60 cursor-not-allowed'
                                                                : lesson.isSelected
                                                                    ? 'bg-[var(--ios-card)] shadow-xs cursor-pointer ring-1 ring-[var(--ios-blue)]'
                                                                    : 'bg-[var(--ios-card)] cursor-pointer hover:bg-[var(--ios-card)]/80'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <input
                                                                type="checkbox"
                                                                checked={lesson.isSelected}
                                                                disabled={isLocked || isPending}
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

                                                        {isPending ? (
                                                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 bg-[var(--ios-yellow)]/15 text-[var(--ios-yellow)] dark:text-[#ffd60a]">
                                                                ⏳ {t.pendingJustification}
                                                            </span>
                                                        ) : isLocked ? (
                                                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 bg-[var(--ios-green-subtle)] text-[var(--ios-green)]">
                                                                🔒 Usprawiedliwione
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 bg-[var(--ios-red-subtle)] text-[var(--ios-red)]">
                                                                NB
                                                            </span>
                                                        )}
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
                            disabled={!canSubmitExcuse}
                            onChange={(e) => setParentMessage(e.target.value)}
                            className="w-full bg-[var(--ios-input)] text-[var(--ios-label)] placeholder-[var(--ios-secondary)] text-xs rounded-[14px] p-3 outline-none focus:ring-1 focus:ring-[var(--ios-blue)] transition-all resize-none h-20 disabled:opacity-50"
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
                                disabled={isSubmitting || selectedCount === 0 || !canSubmitExcuse}
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