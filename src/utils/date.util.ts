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

export function getTodayIsoString(): string {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

export function getTodayDayName(): string {
    const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const name = dayMap[new Date().getDay()]
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(name) ? name : 'Monday'
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
    const result: string[] = []
    const start = new Date(startIso)
    const end = new Date(endIso)
    if (start > end) return [startIso]

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
