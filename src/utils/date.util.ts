export function formatDisplayDate(raw: string | number | undefined, defaultYear: number, defaultMonth: number): string {
    if (!raw) {
        return `${String(defaultMonth).padStart(2, '0')}.${defaultYear}`
    }

    const str = String(raw).trim()

    const isoMatch = str.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (isoMatch) {
        const year = isoMatch[1]
        const month = isoMatch[2].padStart(2, '0')
        const day = isoMatch[3].padStart(2, '0')
        return `${day}.${month}.${year}`
    }

    const dotMatch = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
    if (dotMatch) {
        const day = dotMatch[1].padStart(2, '0')
        const month = dotMatch[2].padStart(2, '0')
        const year = dotMatch[3]
        return `${day}.${month}.${year}`
    }

    const numeric = parseInt(str, 10)
    if (!isNaN(numeric) && numeric >= 1 && numeric <= 31) {
        const day = String(numeric).padStart(2, '0')
        const month = String(defaultMonth).padStart(2, '0')
        return `${day}.${month}.${defaultYear}`
    }

    return str
}

export function extractTimeInterval(text: string): { cleanText: string; timeBadge: string | null } {
    if (!text) {
        return { cleanText: '', timeBadge: null }
    }

    const hoursMatch = text.match(/Godziny:\s*(\d{1,2}:\d{2})\s*do\s*(\d{1,2}:\d{2})/i)
    if (hoursMatch) {
        const timeBadge = `${hoursMatch[1]} - ${hoursMatch[2]}`
        const cleanText = text.replace(/Godziny:\s*\d{1,2}:\d{2}\s*do\s*\d{1,2}:\d{2}/gi, '').trim()
        return { cleanText, timeBadge }
    }

    return { cleanText: text, timeBadge: null }
}

const WARSAW_TZ = 'Europe/Warsaw'

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

export function normalizeToMondayIso(dateStr: string): string {
    const parts = dateStr.split('-').map(Number)
    const date = new Date(parts[0], parts[1] - 1, parts[2])
    const day = date.getDay()
    const diff = day === 0 ? -6 : 1 - day
    date.setDate(date.getDate() + diff)
    const ny = date.getFullYear()
    const nm = String(date.getMonth() + 1).padStart(2, '0')
    const nd = String(date.getDate()).padStart(2, '0')
    return `${ny}-${nm}-${nd}`
}

export function getSchoolWeekMondayIso(dateStr?: string): string {
    const parts = (dateStr || getTodayIsoString()).split('-').map(Number)
    const date = new Date(parts[0], parts[1] - 1, parts[2])
    const day = date.getDay()
    if (day === 0) {
        date.setDate(date.getDate() + 1)
    } else if (day === 6) {
        date.setDate(date.getDate() + 2)
    } else {
        const diff = 1 - day
        date.setDate(date.getDate() + diff)
    }
    const ny = date.getFullYear()
    const nm = String(date.getMonth() + 1).padStart(2, '0')
    const nd = String(date.getDate()).padStart(2, '0')
    return `${ny}-${nm}-${nd}`
}

export function getDatesList(startIso: string, endIso: string): string[] {
    const sp = startIso.split('-').map(Number)
    const ep = endIso.split('-').map(Number)
    if (sp.length !== 3 || ep.length !== 3) return [startIso]
    const start = new Date(sp[0], sp[1] - 1, sp[2])
    const end = new Date(ep[0], ep[1] - 1, ep[2])
    if (start > end) return [startIso]

    const result: string[] = []
    const cur = new Date(start)
    while (cur <= end) {
        const y = cur.getFullYear()
        const m = String(cur.getMonth() + 1).padStart(2, '0')
        const d = String(cur.getDate()).padStart(2, '0')
        result.push(`${y}-${m}-${d}`)
        cur.setDate(cur.getDate() + 1)
    }
    return result
}

export function formatPolishDayDate(isoDate: string, lang: 'pl' | 'en' = 'pl') {
    if (!isoDate) return { dayNum: '', monthName: '', weekday: '' }
    const parts = isoDate.split('-').map(Number)
    if (parts.length !== 3) return { dayNum: isoDate, monthName: '', weekday: '' }
    const d = new Date(parts[0], parts[1] - 1, parts[2])

    const monthsPl = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const daysPl = ['Niedz.', 'Pon.', 'Wt.', 'Śr.', 'Czw.', 'Pt.', 'Sob.']
    const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const mArr = lang === 'en' ? monthsEn : monthsPl
    const dArr = lang === 'en' ? daysEn : daysPl

    return {
        dayNum: String(parts[2]),
        monthName: mArr[parts[1] - 1] || '',
        weekday: dArr[d.getDay()] || ''
    }
}

export function getDayAbbr(dayName: string, lang: 'pl' | 'en' = 'pl'): string {
    const mapPl: Record<string, string> = {
        Monday: 'Pn',
        Tuesday: 'Wt',
        Wednesday: 'Śr',
        Thursday: 'Cz',
        Friday: 'Pt',
        Saturday: 'So',
        Sunday: 'Nd'
    }
    const mapEn: Record<string, string> = {
        Monday: 'Mo',
        Tuesday: 'Tu',
        Wednesday: 'We',
        Thursday: 'Th',
        Friday: 'Fr',
        Saturday: 'Sa',
        Sunday: 'Su'
    }
    return (lang === 'en' ? mapEn[dayName] : mapPl[dayName]) || dayName.slice(0, 2)
}

export function computeLiveWeekDays(pivotIso: string) {
    const parts = pivotIso.split('-').map(Number)
    const d = new Date(parts[0], parts[1] - 1, parts[2])
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(d)
    monday.setDate(d.getDate() + diff)

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const days: Array<{ dayName: string; dateNum: string; isoDate: string; dateDot: string }> = []

    for (let i = 0; i < 5; i++) {
        const cur = new Date(monday)
        cur.setDate(monday.getDate() + i)
        const y = cur.getFullYear()
        const m = String(cur.getMonth() + 1).padStart(2, '0')
        const dn = String(cur.getDate()).padStart(2, '0')
        days.push({
            dayName: dayNames[i],
            dateNum: dn,
            isoDate: `${y}-${m}-${dn}`,
            dateDot: `${dn}.${m}.${y}`
        })
    }

    const friday = new Date(monday)
    friday.setDate(monday.getDate() + 4)

    const mD = String(monday.getDate()).padStart(2, '0')
    const mM = String(monday.getMonth() + 1).padStart(2, '0')
    const fD = String(friday.getDate()).padStart(2, '0')
    const fM = String(friday.getMonth() + 1).padStart(2, '0')

    return {
        days,
        rangeLabel: `${mD}.${mM} — ${fD}.${fM}`
    }
}

export function formatHumanPolishDate(
    raw: string | number | Date | undefined,
    includeTime: boolean = false,
    lang: 'pl' | 'en' = 'pl'
): string {
    if (!raw) return ''

    let date: Date | null = null

    if (raw instanceof Date) {
        date = raw
    } else if (typeof raw === 'number') {
        date = new Date(raw > 1e11 ? raw : raw * 1000)
    } else if (typeof raw === 'string') {
        const str = raw.trim()
        const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
        const dotMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ ,T]+(\d{1,2}):(\d{2}))?/)
        if (isoMatch) {
            date = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10))
        } else if (dotMatch) {
            const d = parseInt(dotMatch[1], 10)
            const m = parseInt(dotMatch[2], 10) - 1
            const y = parseInt(dotMatch[3], 10)
            const hh = dotMatch[4] ? parseInt(dotMatch[4], 10) : 0
            const mm = dotMatch[5] ? parseInt(dotMatch[5], 10) : 0
            date = new Date(y, m, d, hh, mm)
        } else {
            const parsed = new Date(str)
            if (!isNaN(parsed.getTime())) {
                date = parsed
            }
        }
    }

    if (!date || isNaN(date.getTime())) {
        return String(raw)
    }

    const monthsPl = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const mArr = lang === 'en' ? monthsEn : monthsPl

    const day = date.getDate()
    const month = mArr[date.getMonth()]
    const year = date.getFullYear()
    const currentYear = new Date().getFullYear()

    const yearPart = year !== currentYear ? ` ${year}` : ''
    const dateStr = `${day} ${month}${yearPart}`

    if (includeTime) {
        const hours = String(date.getHours()).padStart(2, '0')
        const mins = String(date.getMinutes()).padStart(2, '0')
        return `${dateStr}, ${hours}:${mins}`
    }

    return dateStr
}

export const formatHumanDate = formatHumanPolishDate

