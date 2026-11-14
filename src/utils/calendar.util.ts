import { TimetableEvent } from '@/models/timetable.model'

function escapeIcsText(val: string): string {
  return (val || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function addOneDayIso(isoDate: string): string {
  const parts = isoDate.split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return isoDate
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1))
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function buildEventIcsContent(ev: TimetableEvent): string {
  const iso = ev.isoDate || ''
  const compactDate = iso.replace(/-/g, '')
  const nextDate = addOneDayIso(iso).replace(/-/g, '')
  const uid = `synapse-${compactDate}-${ev.id || ev.lessonNumber || 'ev'}@synapse.app`

  const summary = [ev.eventType, ev.subjectName || ev.title].filter(Boolean).join(': ') || 'Synapse Event'
  const descParts = [ev.description, ev.teacher ? `Teacher: ${ev.teacher}` : ''].filter(Boolean)
  const description = descParts.join('\n')

  const timeMatch = (ev.time || '').match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/)
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Synapse//Librus Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`
  ]

  if (compactDate.length === 8 && timeMatch) {
    const startH = timeMatch[1].padStart(2, '0')
    const startM = timeMatch[2].padStart(2, '0')
    const endH = timeMatch[3].padStart(2, '0')
    const endM = timeMatch[4].padStart(2, '0')
    lines.push(`DTSTART;TZID=Europe/Warsaw:${compactDate}T${startH}${startM}00`)
    lines.push(`DTEND;TZID=Europe/Warsaw:${compactDate}T${endH}${endM}00`)
  } else if (compactDate.length === 8) {
    lines.push(`DTSTART;VALUE=DATE:${compactDate}`)
    lines.push(`DTEND;VALUE=DATE:${nextDate.length === 8 ? nextDate : compactDate}`)
  }

  lines.push(`SUMMARY:${escapeIcsText(summary)}`)
  if (description) {
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`)
  }
  if (ev.eventType) {
    lines.push(`CATEGORIES:${escapeIcsText(ev.eventType)}`)
  }
  lines.push('END:VEVENT', 'END:VCALENDAR')

  return lines.join('\r\n')
}

export function downloadEventIcs(ev: TimetableEvent): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const content = buildEventIcsContent(ev)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const slug = (ev.subjectName || ev.eventType || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
  a.href = url
  a.download = `${ev.isoDate || 'event'}-${slug || 'synapse'}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}
