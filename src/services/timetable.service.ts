import Librus from 'librus-api'
import { LessonItem, DaySchedule, AbsentTeacherItem, SmartTimetableResult } from '@/models/timetable.model'
import { translateBatch } from '@/services/translation.service'
import { formatDisplayDate, extractTimeInterval } from '@/utils/date.util'

function cleanTeacherName(rawTeacher: string): string {
    if (!rawTeacher) {
        return ''
    }
    return rawTeacher
        .replace(/^(nauczyciel|nieobecność|nieobecnosc|zastępstwo|zastepstwo)\s*[:\-]?\s*/i, '')
        .replace(/\s*\(.*?\)\s*/g, '')
        .trim()
}

function calculateDuration(timeRange: string): { durationMinutes: number; isShortened: boolean } {
    const match = timeRange.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/)
    if (!match) {
        return { durationMinutes: 45, isShortened: false }
    }

    const startMinutes = parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
    const endMinutes = parseInt(match[3], 10) * 60 + parseInt(match[4], 10)
    const duration = endMinutes - startMinutes

    return {
        durationMinutes: duration,
        isShortened: duration > 0 && duration !== 45
    }
}

function flattenCalendarEvents(raw: any): any[] {
    if (!raw) {
        return []
    }
    if (Array.isArray(raw)) {
        return raw.flatMap((item) => (Array.isArray(item) ? flattenCalendarEvents(item) : [item]))
    }
    if (typeof raw === 'object') {
        return Object.values(raw).flatMap((val) => flattenCalendarEvents(val))
    }
    return []
}

function extractTeacherFromEvent(event: any, defaultYear: number, defaultMonth: number): AbsentTeacherItem | null {
    if (!event || typeof event !== 'object') {
        return null
    }

    const title = (event.title || '').trim()
    const desc = (event.description || '').trim()
    const isAbsence = Boolean(
        event.isAbsence ||
        title.toLowerCase().includes('nieobecn') ||
        desc.toLowerCase().includes('nieobecn')
    )

    if (!isAbsence) {
        return null
    }

    let teacher = event.teacher || ''
    if (!teacher) {
        teacher = title
            .replace(/^(nieobecność|nieobecnosc|zastępstwo|zastepstwo|odwołane|odwolane)\s*[:\-]?\s*/i, '')
            .replace(/^nauczyciel\s*[:\-]?\s*/i, '')
            .replace(/godziny:.*$/i, '')
            .trim()
    }

    if (!teacher && desc) {
        teacher = desc
            .replace(/^(nieobecność|nieobecnosc)\s*[:\-]?\s*/i, '')
            .replace(/^nauczyciel\s*[:\-]?\s*/i, '')
            .replace(/godziny:.*$/i, '')
            .trim()
    }

    const cleanedTeacher = cleanTeacherName(teacher)
    if (!cleanedTeacher) {
        return null
    }

    const rawDate = event.date || event.day
    const formattedDate = formatDisplayDate(rawDate, defaultYear, defaultMonth)
    const fullText = `${title} ${desc}`
    const { timeBadge } = extractTimeInterval(fullText)

    return {
        teacher: cleanedTeacher,
        date: formattedDate,
        reason: timeBadge || 'Nieobecność',
        isRelevantToStudent: false
    }
}

function groupConsecutiveLessons(lessons: LessonItem[]): LessonItem[] {
    if (lessons.length <= 1) {
        return lessons
    }

    const grouped: LessonItem[] = []
    let current = { ...lessons[0] }
    let rooms: string[] = current.room ? [current.room] : []
    let count = 1
    let totalMinutes = current.durationMinutes

    for (let i = 1; i < lessons.length; i++) {
        const next = lessons[i]
        const canGroup =
            next.subject === current.subject &&
            next.teacher === current.teacher &&
            next.isCancelled === current.isCancelled &&
            next.isSubstitution === current.isSubstitution &&
            next.teacherAbsent === current.teacherAbsent

        if (canGroup) {
            count++
            totalMinutes += next.durationMinutes
            if (next.room && !rooms.includes(next.room)) {
                rooms.push(next.room)
            }

            const currentStart = current.time.split('-')[0]?.trim() || ''
            const nextEnd = next.time.split('-')[1]?.trim() || ''
            if (currentStart && nextEnd) {
                current.time = `${currentStart} - ${nextEnd}`
            }
            current.durationMinutes = totalMinutes
            current.isShortened = totalMinutes !== count * 45
            current.room = rooms.join(' / ')
            current.lessonCount = count
        } else {
            current.lessonCount = count
            current.room = rooms.join(' / ')
            grouped.push(current)

            current = { ...next }
            rooms = current.room ? [current.room] : []
            count = 1
            totalMinutes = current.durationMinutes
        }
    }

    current.lessonCount = count
    current.room = rooms.join(' / ')
    grouped.push(current)

    return grouped
}

export async function fetchSmartTimetable(
    username: string,
    pass: string,
    translate: boolean = false
): Promise<{ success: boolean; data?: SmartTimetableResult; error?: string }> {
    try {
        const client = new Librus()
        await client.authorize(username, pass)

        const now = new Date()
        const currentMonth = now.getMonth() + 1
        const currentYear = now.getFullYear()

        const [rawTimetable, rawCalendar] = await Promise.all([
            client.calendar.getTimetable(),
            client.calendar.getCalendar(currentMonth, currentYear).catch(() => [])
        ])

        const allAbsentTeachers: AbsentTeacherItem[] = []
        const absentTeacherSet = new Set<string>()

        const flatEvents = flattenCalendarEvents(rawCalendar)
        for (const ev of flatEvents) {
            const parsed = extractTeacherFromEvent(ev, currentYear, currentMonth)
            if (parsed && parsed.teacher) {
                const key = `${parsed.teacher.toLowerCase()}-${parsed.date}`
                if (!absentTeacherSet.has(key)) {
                    absentTeacherSet.add(key)
                    allAbsentTeachers.push(parsed)
                }
            }
        }

        const studentTeacherSet = new Set<string>()
        const targetDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        const tableData = rawTimetable?.table || {}

        const schedule: DaySchedule[] = []

        for (const day of targetDays) {
            const daySlots = tableData[day]
            const lessons: LessonItem[] = []

            if (Array.isArray(daySlots)) {
                daySlots.forEach((slot, index) => {
                    if (!slot) {
                        return
                    }

                    const cleanedTeacher = cleanTeacherName(slot.teacher || '')
                    if (cleanedTeacher) {
                        studentTeacherSet.add(cleanedTeacher.toLowerCase())
                    }

                    const { durationMinutes, isShortened } = calculateDuration(slot.time || '')
                    const flagStr = (slot.flag || '').toLowerCase()
                    const isCancelled = slot.cancelled === true || flagStr.includes('odwołane') || flagStr.includes('odwolane')
                    const isSubstitution = flagStr.includes('zastępstwo') || flagStr.includes('zastepstwo')

                    let isAbsent = false
                    for (const key of absentTeacherSet) {
                        if (cleanedTeacher && key.startsWith(cleanedTeacher.toLowerCase())) {
                            isAbsent = true
                            break
                        }
                    }

                    if (isCancelled && cleanedTeacher) {
                        const dateStr = formatDisplayDate(day, currentYear, currentMonth)
                        const key = `${cleanedTeacher.toLowerCase()}-${dateStr}`
                        if (!absentTeacherSet.has(key)) {
                            absentTeacherSet.add(key)
                            allAbsentTeachers.push({
                                teacher: cleanedTeacher,
                                date: dateStr,
                                reason: slot.flag || 'Odwołane zajęcia',
                                isRelevantToStudent: true
                            })
                        }
                    }

                    lessons.push({
                        number: index,
                        subject: slot.subject || '',
                        teacher: cleanedTeacher,
                        room: slot.room || '',
                        time: slot.time || '',
                        durationMinutes,
                        isShortened,
                        isCancelled,
                        isSubstitution,
                        flag: slot.flag || null,
                        teacherAbsent: isAbsent || isCancelled,
                        teacherAbsenceReason: isAbsent || isCancelled ? 'Teacher absent or lesson cancelled' : undefined
                    })
                })
            }

            schedule.push({
                dayName: day,
                lessons: groupConsecutiveLessons(lessons)
            })
        }

        for (const item of allAbsentTeachers) {
            if (studentTeacherSet.has(item.teacher.toLowerCase())) {
                item.isRelevantToStudent = true
            }
        }

        if (translate) {
            const subjectsToTranslate = new Set<string>()
            const reasonsToTranslate = new Set<string>()

            schedule.forEach((day) => {
                day.lessons.forEach((lesson) => {
                    if (lesson.subject) {
                        subjectsToTranslate.add(lesson.subject)
                    }
                })
            })

            allAbsentTeachers.forEach((item) => {
                if (item.reason) {
                    reasonsToTranslate.add(item.reason)
                }
            })

            const translatedMap = await translateBatch(
                Array.from(subjectsToTranslate).concat(Array.from(reasonsToTranslate))
            )

            schedule.forEach((day) => {
                day.lessons.forEach((lesson) => {
                    if (translatedMap[lesson.subject]) {
                        lesson.subject = translatedMap[lesson.subject]
                    }
                })
            })

            allAbsentTeachers.forEach((item) => {
                if (item.reason && translatedMap[item.reason]) {
                    item.reason = translatedMap[item.reason]
                }
            })
        }

        return {
            success: true,
            data: {
                schedule,
                allAbsentTeachers
            }
        }
    } catch (error) {
        return {
            success: false,
            error: String(error)
        }
    }
}