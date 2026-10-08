import { SubjectAttendance } from '@/models/attendance.model'
import { PendingJustificationRecord } from '@/models/justification.model'

export type { PendingJustificationRecord }

const STORAGE_KEY = 'synapse_pending_justifications'

export function getPendingJustifications(): PendingJustificationRecord[] {
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

export function savePendingJustification(
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

export function reconcilePendingJustifications(
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

export function isLessonJustificationPending(
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