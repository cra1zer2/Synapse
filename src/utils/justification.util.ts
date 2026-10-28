import { SubjectAttendance } from '@/models/attendance.model'
import { PendingJustificationRecord } from '@/models/justification.model'

export type { PendingJustificationRecord }

const STORAGE_KEY = 'synapse_pending_justifications'

export function normalizeDate(str: string): { iso: string; display: string } {
  if (!str) return { iso: '', display: '' }
  const clean = str.trim()
  if (clean.includes('.')) {
    const parts = clean.split('.')
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0')
      const m = parts[1].padStart(2, '0')
      const y = parts[2]
      return { iso: `${y}-${m}-${d}`, display: `${d}.${m}.${y}` }
    }
  }
  if (clean.includes('-')) {
    const parts = clean.split('-')
    if (parts.length === 3) {
      const y = parts[0]
      const m = parts[1].padStart(2, '0')
      const d = parts[2].padStart(2, '0')
      return { iso: `${y}-${m}-${d}`, display: `${d}.${m}.${y}` }
    }
  }
  return { iso: clean, display: clean }
}

const OPTIMISTIC_PENDING_TTL_MS = 2 * 60 * 1000

export function getPendingJustifications(): PendingJustificationRecord[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const now = Date.now()
    const fresh = parsed.filter((rec: PendingJustificationRecord) => {
      const ts = rec?.submittedAt ? Date.parse(rec.submittedAt) : 0
      return ts > 0 && now - ts < OPTIMISTIC_PENDING_TTL_MS
    })
    if (fresh.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
    }
    return fresh
  } catch {
    return []
  }
}

export function savePendingJustification(
  entry: Omit<PendingJustificationRecord, 'id' | 'submittedAt' | 'status'>
): PendingJustificationRecord {
  const current = getPendingJustifications()
  const { iso, display } = normalizeDate(entry.dateIso || entry.dateDisplay || '')
  const lessonsToAdd = entry.lessons.map(Number).filter((n) => !isNaN(n))

  const existingIndex = current.findIndex((r) => {
    const rNorm = normalizeDate(r.dateIso || r.dateDisplay || '')
    return rNorm.iso === iso
  })

  let updated: PendingJustificationRecord[]
  let savedRecord: PendingJustificationRecord

  if (existingIndex >= 0) {
    const existing = current[existingIndex]
    const mergedLessons = Array.from(new Set([...existing.lessons.map(Number), ...lessonsToAdd])).sort((a, b) => a - b)
    savedRecord = {
      ...existing,
      dateIso: iso,
      dateDisplay: display,
      lessons: mergedLessons,
      message: entry.message || existing.message,
      submittedAt: new Date().toISOString()
    }
    updated = [...current]
    updated[existingIndex] = savedRecord
  } else {
    savedRecord = {
      id: `${iso}-${lessonsToAdd.slice().sort((a, b) => a - b).join('_')}-${Date.now()}`,
      dateIso: iso,
      dateDisplay: display,
      lessons: lessonsToAdd.sort((a, b) => a - b),
      message: entry.message || '',
      submittedAt: new Date().toISOString(),
      status: 'pending'
    }
    updated = [...current, savedRecord]
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }
  return savedRecord
}

export function reconcilePendingJustifications(
  subjects: SubjectAttendance[]
): PendingJustificationRecord[] {
  if (typeof window === 'undefined') return []
  const current = getPendingJustifications()
  if (current.length === 0) return []

  const excusedKeys = new Set<string>()
  for (const sub of subjects || []) {
    if (!Array.isArray(sub.absences)) continue
    for (const abs of sub.absences) {
      if (abs.type === 'u' || abs.type === 'zw') {
        const { iso, display } = normalizeDate(abs.date)
        const lessonNum = Number(abs.lessonNumber)
        excusedKeys.add(`${iso}_${lessonNum}`)
        excusedKeys.add(`${display}_${lessonNum}`)
        excusedKeys.add(`${abs.date}_${lessonNum}`)
      }
    }
  }

  const reconciled: PendingJustificationRecord[] = []
  for (const rec of current) {
    const { iso, display } = normalizeDate(rec.dateIso || rec.dateDisplay || '')
    const remainingLessons = rec.lessons.map(Number).filter((num) => {
      return (
        !excusedKeys.has(`${iso}_${num}`) &&
        !excusedKeys.has(`${display}_${num}`) &&
        !excusedKeys.has(`${rec.dateIso}_${num}`) &&
        !excusedKeys.has(`${rec.dateDisplay || ''}_${num}`)
      )
    })
    if (remainingLessons.length > 0) {
      reconciled.push({
        ...rec,
        dateIso: iso,
        dateDisplay: display,
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
  if (!Array.isArray(pendingList) || pendingList.length === 0) return false
  const target1 = normalizeDate(dateIso)
  const target2 = normalizeDate(dateDisplay)
  const num = Number(lessonNumber)

  return pendingList.some((rec) => {
    const recNorm = normalizeDate(rec.dateIso || rec.dateDisplay || '')
    const matchesDate =
      recNorm.iso === target1.iso ||
      recNorm.iso === target2.iso ||
      recNorm.display === target1.display ||
      recNorm.display === target2.display ||
      rec.dateIso === dateIso ||
      rec.dateDisplay === dateDisplay
    if (!matchesDate) return false
    if (!Array.isArray(rec.lessons) || rec.lessons.length === 0) return true
    return rec.lessons.map(Number).includes(num)
  })
}