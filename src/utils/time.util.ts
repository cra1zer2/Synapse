export interface ParsedTimeRange {
    startMinutes: number
    endMinutes: number
    isValid: boolean
}

export function parseLessonTimeRange(timeStr: string): ParsedTimeRange {
    const match = (timeStr || '').match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/)
    if (!match) {
        return { startMinutes: 0, endMinutes: 0, isValid: false }
    }

    const startMinutes = parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
    const endMinutes = parseInt(match[3], 10) * 60 + parseInt(match[4], 10)

    return { startMinutes, endMinutes, isValid: true }
}

export function getCurrentTimeMinutes(): number {
    try {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/Warsaw',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).formatToParts(new Date())
        const hourPart = parts.find((p) => p.type === 'hour')?.value
        const minutePart = parts.find((p) => p.type === 'minute')?.value
        const h = Number(hourPart)
        const m = Number(minutePart)
        if (Number.isFinite(h) && Number.isFinite(m)) {
            return (h === 24 ? 0 : h) * 60 + m
        }
    } catch {
    }
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
}

export function calculateBreakDuration(currentLessonTime: string, nextLessonTime: string): number {
    const current = parseLessonTimeRange(currentLessonTime)
    const next = parseLessonTimeRange(nextLessonTime)

    if (!current.isValid || !next.isValid) {
        return 0
    }

    return Math.max(0, next.startMinutes - current.endMinutes)
}

export function getBreakRemainingMinutes(nextLessonTime: string): number {
    const next = parseLessonTimeRange(nextLessonTime)
    if (!next.isValid) return 0

    const nowMinutes = getCurrentTimeMinutes()
    return Math.max(0, next.startMinutes - nowMinutes)
}