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