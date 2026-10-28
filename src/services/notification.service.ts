import { SmartTimetableResult } from '@/models/timetable.model'
import { PushNotificationPayload } from '@/models/notification.model'
import { AppLanguage } from '@/config/dictionary.config'

export function calculateScheduleSensitiveTimings(timetable: SmartTimetableResult, currentDate: Date = new Date()): {
    firstLessonCheckTime: Date | null
    bellCheckTimes: Date[]
} {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const todayName = dayNames[currentDate.getDay()]

    const todaySchedule = timetable.schedule.find((d) => d.dayName === todayName)
    if (!todaySchedule || todaySchedule.lessons.length === 0) {
        return { firstLessonCheckTime: null, bellCheckTimes: [] }
    }

    const activeLessons = todaySchedule.lessons.filter((l) => !l.isCancelled)
    if (activeLessons.length === 0) {
        return { firstLessonCheckTime: null, bellCheckTimes: [] }
    }

    const firstLesson = activeLessons[0]
    const firstMatch = firstLesson.time.match(/(\d{1,2}):(\d{2})/)

    let firstLessonCheckTime: Date | null = null
    if (firstMatch) {
        const startHour = parseInt(firstMatch[1], 10)
        const startMinute = parseInt(firstMatch[2], 10)

        firstLessonCheckTime = new Date(currentDate)
        firstLessonCheckTime.setHours(startHour, startMinute - 45, 0, 0)
    }

    const bellCheckTimes: Date[] = []

    activeLessons.forEach((lesson) => {
        const endMatch = lesson.time.match(/-\s*(\d{1,2}):(\d{2})/)
        if (endMatch) {
            const endHour = parseInt(endMatch[1], 10)
            const endMinute = parseInt(endMatch[2], 10)

            const bellTime = new Date(currentDate)
            bellTime.setHours(endHour, endMinute + 2, 0, 0)
            bellCheckTimes.push(bellTime)
        }
    })

    return { firstLessonCheckTime, bellCheckTimes }
}

export function createGradeNotification(
    grade: string,
    subject: string,
    weight: number,
    teacher: string,
    lang: AppLanguage
): PushNotificationPayload {
    const titles: Record<AppLanguage, string> = {
        pl: `${grade} • ${subject}`,
        en: `${grade} • ${subject}`
    }

    const bodies: Record<AppLanguage, string> = {
        pl: `Waga ${weight} • ${teacher || 'Nauczyciel'}`,
        en: `Weight ${weight} • ${teacher || 'Teacher'}`
    }

    return {
        title: titles[lang],
        body: bodies[lang],
        tag: `grade-${subject}-${Date.now()}`,
        data: {
            url: '/?tab=grades',
            type: 'grade'
        }
    }
}

export function createAbsenceNotification(
    subject: string,
    lessonNumber: number,
    time: string,
    dateIso: string,
    lang: AppLanguage
): PushNotificationPayload {
    const titles: Record<AppLanguage, string> = {
        pl: `NB • ${subject}`,
        en: `NB • ${subject}`
    }

    const bodies: Record<AppLanguage, string> = {
        pl: `Lekcja ${lessonNumber} (${time})`,
        en: `Lesson ${lessonNumber} (${time})`
    }

    return {
        title: titles[lang],
        body: bodies[lang],
        tag: `absence-${dateIso}-${lessonNumber}`,
        data: {
            url: `/?tab=attendance&excuse=1&date=${dateIso}`,
            type: 'absence'
        }
    }
}

export function createTimetableChangeNotification(
    type: 'cancelled' | 'substitution' | 'shortened',
    subject: string,
    lessonNumber: number,
    dayName: string,
    detail: string,
    lang: AppLanguage
): PushNotificationPayload {
    const typeLabels: Record<'cancelled' | 'substitution' | 'shortened', Record<AppLanguage, string>> = {
        cancelled: {
            pl: 'Odwołane',
            en: 'Cancelled'
        },
        substitution: {
            pl: 'Zastępstwo',
            en: 'Substitution'
        },
        shortened: {
            pl: 'Skrócona',
            en: 'Shortened'
        }
    }

    const lessonPrefix: Record<AppLanguage, string> = {
        pl: 'Lekcja',
        en: 'Lesson'
    }

    const title = `${typeLabels[type][lang]} • ${subject}`
    const body = `${lessonPrefix[lang]} ${lessonNumber} • ${detail}`

    return {
        title,
        body,
        tag: `timetable-${dayName}-${lessonNumber}-${Date.now()}`,
        data: {
            url: `/?tab=schedule&day=${dayName}`,
            type: 'substitution'
        }
    }
}

export async function requestPushPermission(): Promise<'granted' | 'denied' | 'default'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'denied'
    }

    try {
        const permission = await Notification.requestPermission()
        if (permission === 'granted' && 'serviceWorker' in navigator) {
            await navigator.serviceWorker.register('/sw.js')
        }
        return permission
    } catch {
        return 'denied'
    }
}

export function getNotificationPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'unsupported'
    }
    return Notification.permission
}