/**
 * Hook: Local Diff Counters for Schedule, Grades & Attendance
 * Tracks unseen lesson substitutions/cancellations, new grades, and attendance deviations (`nb`, `sp`, etc.) per account.
 * Strictly ignores regular presence (`ob` / obecność), seeds an initial baseline per account, and preserves newly revealed grade keys for active inspection.
 */

'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { SmartTimetableResult } from '@/models/timetable.model'
import { GradeItem, GradesResult } from '@/models/grade.model'
import { AttendanceResult } from '@/models/attendance.model'

export type TrackedBadgeSection = 'schedule' | 'grades' | 'attendance'

interface StoredBadgesState {
  initialized: Partial<Record<TrackedBadgeSection, boolean>>
  seen: Partial<Record<TrackedBadgeSection, string[]>>
}

const STORAGE_PREFIX = 'synapse_seen_badges_v1_'
const DEVIATION_TYPES = new Set(['nb', 'sp', 'u', 'sl', 'zw'])

function extractScheduleAlertKeys(timetable: SmartTimetableResult | null): string[] {
  if (!timetable?.schedule) return []
  const keys: string[] = []
  const counts: Record<string, number> = {}

  for (const day of timetable.schedule) {
    for (const lesson of day.lessons || []) {
      if (!lesson.isCancelled && !lesson.isSubstitution && !lesson.teacherAbsent) continue
      const flags = `${lesson.isCancelled ? 'C' : ''}${lesson.isSubstitution ? 'S' : ''}${lesson.teacherAbsent ? 'A' : ''}`
      const raw = `${day.isoDate}|${lesson.number}|${flags}|${lesson.subject}|${lesson.room}`
      const n = (counts[raw] || 0) + 1
      counts[raw] = n
      keys.push(`${raw}#${n}`)
    }
  }
  return keys
}

function collectGradeKeyEntries(grades: GradesResult | null): Array<{ item: GradeItem; key: string }> {
  if (!grades?.subjects) return []
  const entries: Array<{ item: GradeItem; key: string }> = []
  const counts: Record<string, number> = {}

  for (const sub of grades.subjects) {
    for (const sem of [1, 2] as const) {
      const list = sem === 1 ? sub.semester1 : sub.semester2
      for (const g of list || []) {
        const raw = g.id
          ? `id:${String(g.id)}`
          : `${sub.subject}|${sem}|${g.date}|${g.grade}|${g.category}|${g.weight}`
        const n = (counts[raw] || 0) + 1
        counts[raw] = n
        entries.push({ item: g, key: `${raw}#${n}` })
      }
    }
  }
  return entries
}

export function buildGradeKeyMap(grades: GradesResult | null): WeakMap<GradeItem, string> {
  const map = new WeakMap<GradeItem, string>()
  for (const entry of collectGradeKeyEntries(grades)) {
    map.set(entry.item, entry.key)
  }
  return map
}

function extractAttendanceAlertKeys(attendance: AttendanceResult | null): string[] {
  if (!attendance?.subjects) return []
  const keys: string[] = []
  const counts: Record<string, number> = {}

  for (const sub of attendance.subjects) {
    for (const ab of sub.absences || []) {
      const normalizedType = String(ab.type || '').toLowerCase()
      const normalizedName = String(ab.typeName || '').toLowerCase()
      if (!DEVIATION_TYPES.has(normalizedType) || normalizedName.includes('obecno')) continue
      const raw = ab.id
        ? `id:${String(ab.id)}`
        : `${ab.date}|${ab.lessonNumber}|${normalizedType}|${sub.subject}`
      const n = (counts[raw] || 0) + 1
      counts[raw] = n
      keys.push(`${raw}#${n}`)
    }
  }
  return keys
}

function readStoredState(username: string): StoredBadgesState {
  if (typeof window === 'undefined' || !username) {
    return { initialized: {}, seen: {} }
  }
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + username.trim().toLowerCase())
    if (!raw) return { initialized: {}, seen: {} }
    const parsed = JSON.parse(raw) as Partial<StoredBadgesState>
    return {
      initialized: parsed?.initialized || {},
      seen: parsed?.seen || {}
    }
  } catch {
    return { initialized: {}, seen: {} }
  }
}

function writeStoredState(username: string, state: StoredBadgesState) {
  if (typeof window === 'undefined' || !username) return
  try {
    localStorage.setItem(STORAGE_PREFIX + username.trim().toLowerCase(), JSON.stringify(state))
  } catch {}
}

interface UseSectionBadgesOptions {
  username: string
  timetableData: SmartTimetableResult | null
  todayTimetableData: SmartTimetableResult | null
  gradesData: GradesResult | null
  attendanceData: AttendanceResult | null
  activeSection: TrackedBadgeSection | null
}

export function useSectionBadges({
  username,
  timetableData,
  todayTimetableData,
  gradesData,
  attendanceData,
  activeSection
}: UseSectionBadgesOptions) {
  const [stored, setStored] = useState<StoredBadgesState>(() => readStoredState(username))
  const [sessionUnseenGrades, setSessionUnseenGrades] = useState<string[]>([])
  const prevSectionRef = useRef<TrackedBadgeSection | null>(activeSection)

  useEffect(() => {
    setStored(readStoredState(username))
    setSessionUnseenGrades([])
  }, [username])

  useEffect(() => {
    if (prevSectionRef.current === 'grades' && activeSection !== 'grades') {
      setSessionUnseenGrades([])
    }
    prevSectionRef.current = activeSection
  }, [activeSection])

  const scheduleKeys = useMemo(
    () => extractScheduleAlertKeys(todayTimetableData || timetableData),
    [todayTimetableData, timetableData]
  )
  const gradeKeys = useMemo(
    () => collectGradeKeyEntries(gradesData).map((entry) => entry.key),
    [gradesData]
  )
  const attendanceKeys = useMemo(() => extractAttendanceAlertKeys(attendanceData), [attendanceData])

  const hasSchedulePayload = Boolean(todayTimetableData || timetableData)
  const hasGradesPayload = Boolean(gradesData)
  const hasAttendancePayload = Boolean(attendanceData)

  useEffect(() => {
    if (!username) return
    const nextUnseenGrades =
      hasGradesPayload && activeSection === 'grades' && stored.initialized.grades
        ? (() => {
            const seenSet = new Set(stored.seen.grades || [])
            return Array.from(new Set(gradeKeys)).filter((k) => !seenSet.has(k))
          })()
        : []

    if (nextUnseenGrades.length > 0) {
      setSessionUnseenGrades((prev) => Array.from(new Set([...prev, ...nextUnseenGrades])))
    }

    setStored((prev) => {
      let changed = false
      const next: StoredBadgesState = {
        initialized: { ...prev.initialized },
        seen: { ...prev.seen }
      }

      if (hasSchedulePayload && (!prev.initialized.schedule || activeSection === 'schedule')) {
        const nextArr = Array.from(new Set(scheduleKeys))
        const prevArr = prev.seen.schedule || []
        if (!prev.initialized.schedule || nextArr.length !== prevArr.length || nextArr.some((k, i) => k !== prevArr[i])) {
          next.initialized.schedule = true
          next.seen.schedule = nextArr
          changed = true
        }
      }

      if (hasGradesPayload && (!prev.initialized.grades || activeSection === 'grades')) {
        const nextArr = Array.from(new Set(gradeKeys))
        const prevArr = prev.seen.grades || []
        if (!prev.initialized.grades || nextArr.length !== prevArr.length || nextArr.some((k, i) => k !== prevArr[i])) {
          next.initialized.grades = true
          next.seen.grades = nextArr
          changed = true
        }
      }

      if (hasAttendancePayload && (!prev.initialized.attendance || activeSection === 'attendance')) {
        const nextArr = Array.from(new Set(attendanceKeys))
        const prevArr = prev.seen.attendance || []
        if (
          !prev.initialized.attendance ||
          nextArr.length !== prevArr.length ||
          nextArr.some((k, i) => k !== prevArr[i])
        ) {
          next.initialized.attendance = true
          next.seen.attendance = nextArr
          changed = true
        }
      }

      if (!changed) return prev
      writeStoredState(username, next)
      return next
    })
  }, [
    username,
    activeSection,
    stored.initialized.grades,
    stored.seen.grades,
    hasSchedulePayload,
    hasGradesPayload,
    hasAttendancePayload,
    scheduleKeys,
    gradeKeys,
    attendanceKeys
  ])

  const unseenGradeKeys = useMemo(() => {
    const out = new Set<string>(sessionUnseenGrades)
    if (stored.initialized.grades) {
      const seenSet = new Set(stored.seen.grades || [])
      for (const k of gradeKeys) {
        if (!seenSet.has(k)) out.add(k)
      }
    }
    return out
  }, [stored, gradeKeys, sessionUnseenGrades])

  const badges = useMemo(() => {
    const countNew = (section: TrackedBadgeSection, currentKeys: string[]) => {
      if (!stored.initialized[section] || activeSection === section) return 0
      const seenSet = new Set(stored.seen[section] || [])
      let unseen = 0
      for (const k of currentKeys) {
        if (!seenSet.has(k)) unseen++
      }
      return unseen
    }

    return {
      schedule: countNew('schedule', scheduleKeys),
      grades: countNew('grades', gradeKeys),
      attendance: countNew('attendance', attendanceKeys)
    }
  }, [stored, activeSection, scheduleKeys, gradeKeys, attendanceKeys])

  return { badges, unseenGradeKeys }
}
