/**
 * Utility: Teacher Absence Helpers
 * Matches Librus Calendar TeacherFreeDays entries against dates, weeks, and lesson time intervals.
 */

import { TeacherAbsenceItem } from '@/models/timetable.model'
import { AppLanguage, pickText } from '@/config/dictionary.config'
import { parseLessonTimeRange } from '@/utils/time.util'

function parseClockMinutes(clock?: string): number | null {
  if (!clock) return null
  const match = String(clock).trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (isNaN(h) || isNaN(m)) return null
  return h * 60 + m
}

function normalizeName(name?: string): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function getTeacherAbsencesForDate(
  absences: TeacherAbsenceItem[] | undefined,
  isoDate: string
): TeacherAbsenceItem[] {
  if (!absences || !absences.length || !isoDate) return []
  return absences.filter((a) => a.dateFrom <= isoDate && a.dateTo >= isoDate)
}

export function getTeacherAbsencesForWeek(
  absences: TeacherAbsenceItem[] | undefined,
  weekStart?: string,
  weekEnd?: string
): TeacherAbsenceItem[] {
  if (!absences || !absences.length) return []
  if (!weekStart || !weekEnd) return absences
  return absences.filter((a) => a.dateFrom <= weekEnd && a.dateTo >= weekStart)
}

export function doesAbsenceCoverLesson(
  absence: TeacherAbsenceItem,
  isoDate: string,
  lessonTime: string,
  teacherName: string,
  teacherId?: number
): boolean {
  if (absence.dateFrom > isoDate || absence.dateTo < isoDate) return false

  const idMatch =
    teacherId !== undefined &&
    absence.teacherId !== undefined &&
    Number(teacherId) === Number(absence.teacherId)
  const nameMatch =
    Boolean(teacherName) &&
    Boolean(absence.teacherName) &&
    normalizeName(teacherName) === normalizeName(absence.teacherName)

  if (!idMatch && !nameMatch) return false

  const absStart = parseClockMinutes(absence.timeFrom)
  const absEnd = parseClockMinutes(absence.timeTo)
  if (absStart === null || absEnd === null) return true

  const range = parseLessonTimeRange(lessonTime)
  if (!range.isValid) return true

  return range.startMinutes < absEnd && range.endMinutes > absStart
}

function shortDotDate(iso: string): string {
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  return `${parts[2]}.${parts[1]}`
}

export function formatTeacherAbsenceSpan(
  absence: TeacherAbsenceItem,
  lang: AppLanguage,
  options?: { includeDate?: boolean }
): string {
  const includeDate = options?.includeDate ?? true
  const hasTime = Boolean(absence.timeFrom && absence.timeTo)
  const timePart = hasTime
    ? `${absence.timeFrom!.slice(0, 5)}–${absence.timeTo!.slice(0, 5)}`
    : pickText(lang, { pl: 'Cały dzień', en: 'All day' })

  if (!includeDate) return timePart

  const datePart =
    absence.dateFrom === absence.dateTo
      ? shortDotDate(absence.dateFrom)
      : `${shortDotDate(absence.dateFrom)}–${shortDotDate(absence.dateTo)}`

  return hasTime ? `${datePart} · ${timePart}` : `${datePart} · ${timePart}`
}
