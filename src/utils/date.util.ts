/**
 * Utils: Date & Calendar Math
 * Timezone-safe Europe/Warsaw date helpers, school-week calculators, and locale-driven formatters.
 * Uses LANGUAGE_REGISTRY locales so adding new languages automatically supports localized months and weekdays.
 */

import { AppLanguage, getLanguageMeta } from '@/config/dictionary.config'

const WARSAW_TZ = 'Europe/Warsaw'
const MONTHS_PL = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS_PL = ['Niedz.', 'Pon.', 'Wt.', 'Śr.', 'Czw.', 'Pt.', 'Sob.']
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const WEEKDAY_INDEX_MAP: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6
}

function parseIsoParts(isoDate: string): [number, number, number] | null {
  const parts = isoDate.split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null
  return [parts[0], parts[1], parts[2]]
}

function formatUtcIso(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getShortMonthLabel(monthIdx: number, lang: AppLanguage): string {
  if (lang === 'pl') return MONTHS_PL[monthIdx] || ''
  if (lang === 'en') return MONTHS_EN[monthIdx] || ''
  try {
    const dt = new Date(Date.UTC(2026, monthIdx, 15))
    return new Intl.DateTimeFormat(getLanguageMeta(lang).intlLocale, {
      month: 'short',
      timeZone: 'UTC'
    }).format(dt)
  } catch {
    return MONTHS_EN[monthIdx] || ''
  }
}

export function getMonthNames(lang: AppLanguage): string[] {
  const locale = getLanguageMeta(lang).intlLocale
  return Array.from({ length: 12 }, (_, idx) => {
    try {
      const raw = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(
        new Date(Date.UTC(2026, idx, 15))
      )
      return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : MONTHS_EN[idx]
    } catch {
      return MONTHS_EN[idx]
    }
  })
}

export function getWeekdayHeaders(lang: AppLanguage): string[] {
  const locale = getLanguageMeta(lang).intlLocale
  return Array.from({ length: 7 }, (_, idx) => {
    try {
      const dt = new Date(Date.UTC(2026, 0, 5 + idx))
      const raw = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
        .format(dt)
        .replace(/\.$/, '')
      return raw ? raw.charAt(0).toUpperCase() + raw.slice(1, 2) : ''
    } catch {
      return ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'][idx]
    }
  })
}

function getShortWeekdayLabel(utcDayIdx: number, lang: AppLanguage): string {
  if (lang === 'pl') return DAYS_PL[utcDayIdx] || ''
  if (lang === 'en') return DAYS_EN[utcDayIdx] || ''
  try {
    const dt = new Date(Date.UTC(2026, 0, 4 + utcDayIdx))
    return new Intl.DateTimeFormat(getLanguageMeta(lang).intlLocale, {
      weekday: 'short',
      timeZone: 'UTC'
    }).format(dt)
  } catch {
    return DAYS_EN[utcDayIdx] || ''
  }
}

export function getTodayIsoString(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: WARSAW_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date())
  } catch {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
}

export function getTodayDayName(): string {
  try {
    const name = new Intl.DateTimeFormat('en-US', {
      timeZone: WARSAW_TZ,
      weekday: 'long'
    }).format(new Date())
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(name) ? name : 'Monday'
  } catch {
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const name = dayMap[new Date().getDay()]
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(name) ? name : 'Monday'
  }
}

export function isWarsawWeekend(): boolean {
  try {
    const shortName = new Intl.DateTimeFormat('en-US', {
      timeZone: WARSAW_TZ,
      weekday: 'short'
    }).format(new Date())
    return shortName === 'Sat' || shortName === 'Sun'
  } catch {
    const day = new Date().getDay()
    return day === 0 || day === 6
  }
}

export function getSchoolDayName(isoDate: string): string {
  const parts = parseIsoParts(isoDate)
  if (!parts) return 'Monday'
  const utcDay = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay()
  const schoolDays: Record<number, string> = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday'
  }
  return schoolDays[utcDay] || 'Monday'
}

export function normalizeToMondayIso(dateStr: string): string {
  const parts = parseIsoParts(dateStr)
  if (!parts) return dateStr
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
  const day = date.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setUTCDate(date.getUTCDate() + diff)
  return formatUtcIso(date)
}

export function getSchoolWeekMondayIso(dateStr?: string): string {
  const parts = parseIsoParts(dateStr || getTodayIsoString())
  if (!parts) return getTodayIsoString()
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
  const day = date.getUTCDay()
  if (day === 0) {
    date.setUTCDate(date.getUTCDate() + 1)
  } else if (day === 6) {
    date.setUTCDate(date.getUTCDate() + 2)
  } else {
    date.setUTCDate(date.getUTCDate() + (1 - day))
  }
  return formatUtcIso(date)
}

export function getDatesList(startIso: string, endIso: string): string[] {
  const sp = parseIsoParts(startIso)
  const ep = parseIsoParts(endIso)
  if (!sp || !ep) return [startIso]
  const start = new Date(Date.UTC(sp[0], sp[1] - 1, sp[2]))
  const end = new Date(Date.UTC(ep[0], ep[1] - 1, ep[2]))
  if (start > end) return [startIso]

  const result: string[] = []
  const cur = new Date(start)
  while (cur <= end) {
    result.push(formatUtcIso(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return result
}

export function formatDayDate(isoDate: string, lang: AppLanguage = 'pl') {
  if (!isoDate) return { dayNum: '', monthName: '', weekday: '' }
  const parts = parseIsoParts(isoDate)
  if (!parts) return { dayNum: isoDate, monthName: '', weekday: '' }
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))

  return {
    dayNum: String(parts[2]),
    monthName: getShortMonthLabel(parts[1] - 1, lang),
    weekday: getShortWeekdayLabel(d.getUTCDay(), lang)
  }
}

export function getDayAbbr(dayName: string, lang: AppLanguage = 'pl'): string {
  const mapPl: Record<string, string> = {
    Monday: 'Pn',
    Tuesday: 'Wt',
    Wednesday: 'Śr',
    Thursday: 'Cz',
    Friday: 'Pt',
    Saturday: 'So',
    Sunday: 'Nd'
  }
  if (lang === 'pl' && mapPl[dayName]) return mapPl[dayName]
  const idx = WEEKDAY_INDEX_MAP[dayName]
  if (idx !== undefined) {
    try {
      const dt = new Date(Date.UTC(2026, 0, 4 + idx))
      const raw = new Intl.DateTimeFormat(getLanguageMeta(lang).intlLocale, {
        weekday: 'short',
        timeZone: 'UTC'
      })
        .format(dt)
        .replace(/\.$/, '')
      if (raw) return raw.charAt(0).toUpperCase() + raw.slice(1, 2)
    } catch {}
  }
  return dayName.slice(0, 2)
}

export function getWeekdayLongLabel(dayName: string, lang: AppLanguage = 'pl'): string {
  const idx = WEEKDAY_INDEX_MAP[dayName]
  if (idx === undefined) return dayName
  try {
    const dt = new Date(Date.UTC(2026, 0, 4 + idx))
    const raw = new Intl.DateTimeFormat(getLanguageMeta(lang).intlLocale, {
      weekday: 'long',
      timeZone: 'UTC'
    }).format(dt)
    return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : dayName
  } catch {
    return dayName
  }
}

export function computeLiveWeekDays(pivotIso: string) {
  const parts = parseIsoParts(pivotIso) || parseIsoParts(getTodayIsoString())!
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() + diff)

  const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const days: Array<{ dayName: string; dateNum: string; isoDate: string; dateDot: string }> = []

  for (let i = 0; i < 5; i++) {
    const cur = new Date(monday)
    cur.setUTCDate(monday.getUTCDate() + i)
    const y = cur.getUTCFullYear()
    const m = String(cur.getUTCMonth() + 1).padStart(2, '0')
    const dn = String(cur.getUTCDate()).padStart(2, '0')
    days.push({
      dayName: fullDayNames[i],
      dateNum: dn,
      isoDate: `${y}-${m}-${dn}`,
      dateDot: `${dn}.${m}.${y}`
    })
  }

  const friday = new Date(monday)
  friday.setUTCDate(monday.getUTCDate() + 4)

  const mD = String(monday.getUTCDate()).padStart(2, '0')
  const mM = String(monday.getUTCMonth() + 1).padStart(2, '0')
  const fD = String(friday.getUTCDate()).padStart(2, '0')
  const fM = String(friday.getUTCMonth() + 1).padStart(2, '0')

  return {
    days,
    rangeLabel: `${mD}.${mM} — ${fD}.${fM}`
  }
}

export function formatHumanDate(
  raw: string | number | Date | undefined,
  includeTime: boolean = false,
  lang: AppLanguage = 'pl'
): string {
  if (!raw) return ''

  let year = 0
  let monthIdx = -1
  let day = 0
  let hours = 0
  let mins = 0

  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return ''
    year = raw.getFullYear()
    monthIdx = raw.getMonth()
    day = raw.getDate()
    hours = raw.getHours()
    mins = raw.getMinutes()
  } else if (typeof raw === 'number') {
    const dt = new Date(raw > 1e11 ? raw : raw * 1000)
    if (isNaN(dt.getTime())) return String(raw)
    year = dt.getFullYear()
    monthIdx = dt.getMonth()
    day = dt.getDate()
    hours = dt.getHours()
    mins = dt.getMinutes()
  } else if (typeof raw === 'string') {
    const str = raw.trim()
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ ,T]+(\d{1,2}):(\d{2})(?::\d{2})?)?$/)
    const dotMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::\d{2})?)?/)
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10)
      monthIdx = parseInt(isoMatch[2], 10) - 1
      day = parseInt(isoMatch[3], 10)
      hours = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0
      mins = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0
    } else if (dotMatch) {
      day = parseInt(dotMatch[1], 10)
      monthIdx = parseInt(dotMatch[2], 10) - 1
      year = parseInt(dotMatch[3], 10)
      hours = dotMatch[4] ? parseInt(dotMatch[4], 10) : 0
      mins = dotMatch[5] ? parseInt(dotMatch[5], 10) : 0
    } else {
      const parsed = new Date(str)
      if (isNaN(parsed.getTime())) return str
      year = parsed.getFullYear()
      monthIdx = parsed.getMonth()
      day = parsed.getDate()
      hours = parsed.getHours()
      mins = parsed.getMinutes()
    }
  }

  if (!year || monthIdx < 0 || monthIdx > 11 || !day) {
    return String(raw)
  }

  const month = getShortMonthLabel(monthIdx, lang)
  const currentYear = parseInt(getTodayIsoString().slice(0, 4), 10) || new Date().getFullYear()
  const yearPart = year !== currentYear ? ` ${year}` : ''
  const dateStr = `${day} ${month}${yearPart}`

  if (includeTime) {
    return `${dateStr}, ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  }

  return dateStr
}
