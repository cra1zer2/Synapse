import Librus from 'librus-api'
import {
    LessonItem,
    DaySchedule,
    AbsentTeacherItem,
    TimetableEvent,
    SmartTimetableResult
} from '@/models/timetable.model'
import { translateBatch } from '@/services/translation.service'
import { formatDisplayDate, extractTimeInterval } from '@/utils/date.util'
import { parseLessonTimeRange } from '@/utils/time.util'

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
    const parsed = parseLessonTimeRange(timeRange)
    if (!parsed.isValid) {
        return { durationMinutes: 45, isShortened: false }
    }

    const duration = parsed.endMinutes - parsed.startMinutes

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

function getWeekDates(pivotDate: Date): { monday: Date; friday: Date; weekDates: Record<string, { dateStr: string; isoStr: string }> } {
    const current = new Date(pivotDate)
    const day = current.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day

    const monday = new Date(current)
    monday.setDate(current.getDate() + diffToMonday)

    const friday = new Date(monday)
    friday.setDate(monday.getDate() + 4)

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const weekDates: Record<string, { dateStr: string; isoStr: string }> = {}

    dayNames.forEach((name, idx) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + idx)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const dayNum = String(d.getDate()).padStart(2, '0')
        weekDates[name] = {
            dateStr: `${dayNum}.${m}.${y}`,
            isoStr: `${y}-${m}-${dayNum}`
        }
    })

    return { monday, friday, weekDates }
}

export async function fetchSmartTimetable(
    username: string,
    pass: string,
    translate: boolean = false,
    targetDateIso?: string
): Promise<{ success: boolean; data?: SmartTimetableResult; error?: string }> {
    try {
        const client = new Librus()
        await client.authorize(username, pass)

        const pivotDate = targetDateIso ? new Date(targetDateIso) : new Date()
        const { monday, friday, weekDates } = getWeekDates(pivotDate)

        const formatIso = (d: Date) => {
            const y = d.getFullYear()
            const m = String(d.getMonth() + 1).padStart(2, '0')
            const dayNum = String(d.getDate()).padStart(2, '0')
            return `${y}-${m}-${dayNum}`
        }

        const mondayIso = formatIso(monday)
        const fridayIso = formatIso(friday)

        const currentYear = monday.getFullYear()
        const currentMonth = monday.getMonth() + 1

        const [rawTimetable, rawCalendar] = await Promise.all([
            client.calendar.getTimetable(mondayIso, fridayIso),
            client.calendar.getCalendar(currentMonth, currentYear).catch(() => [])
        ])

        const allAbsentTeachers: AbsentTeacherItem[] = []
        const calendarEvents: TimetableEvent[] = []
        const absentTeacherSet = new Set<string>()

        const flatEvents = flattenCalendarEvents(rawCalendar)
        for (const ev of flatEvents) {
            if (!ev || typeof ev !== 'object') continue

            const title = (ev.title || '').trim()
            const desc = (ev.description || '').trim()
            const fullText = `${title} ${desc}`.toLowerCase()

            const isAbsence = Boolean(ev.isAbsence || fullText.includes('nieobecn'))

            let category: 'holiday' | 'exam' | 'info' = 'info'
            if (fullText.includes('ferie') || fullText.includes('wolne') || fullText.includes('nowy rok') || fullText.includes('święto')) {
                category = 'holiday'
            } else if (fullText.includes('termin') || fullText.includes('ocen') || fullText.includes('egzamin') || fullText.includes('sprawdzian')) {
                category = 'exam'
            }

            const rawDate = ev.date || ev.day
            const displayDate = formatDisplayDate(rawDate, currentYear, currentMonth)

            const parts = displayDate.split('.')
            const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : mondayIso

            if (!isAbsence) {
                calendarEvents.push({
                    id: ev.id,
                    title: title || desc,
                    date: displayDate,
                    isoDate,
                    isAbsence: false,
                    category
                })
            } else {
                let teacher = ev.teacher || ''
                if (!teacher) {
                    teacher = title
                        .replace(/^(nieobecność|nieobecnosc|zastępstwo|zastepstwo|odwołane|odwolane)\s*[:\-]?\s*/i, '')
                        .replace(/^nauczyciel\s*[:\-]?\s*/i, '')
                        .replace(/godziny:.*$/i, '')
                        .trim()
                }

                const cleanedTeacher = cleanTeacherName(teacher)
                if (cleanedTeacher) {
                    const { timeBadge } = extractTimeInterval(`${title} ${desc}`)
                    const key = `${cleanedTeacher.toLowerCase()}-${displayDate}`
                    if (!absentTeacherSet.has(key)) {
                        absentTeacherSet.add(key)
                        allAbsentTeachers.push({
                            teacher: cleanedTeacher,
                            date: displayDate,
                            isoDate,
                            reason: timeBadge || 'Nieobecność',
                            isRelevantToStudent: false
                        })
                    }
                }
            }
        }

        const studentTeacherSet = new Set<string>()
        const targetDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        const tableData = rawTimetable?.table || {}
        const todayIso = formatIso(new Date())

        const schedule: DaySchedule[] = []

        for (const day of targetDays) {
            const daySlots = tableData[day]
            const lessons: LessonItem[] = []
            const { dateStr, isoStr } = weekDates[day]

            if (Array.isArray(daySlots)) {
                daySlots.forEach((slot, index) => {
                    if (!slot) return

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
                        if (cleanedTeacher && key.startsWith(cleanedTeacher.toLowerCase()) && key.includes(dateStr)) {
                            isAbsent = true
                            break
                        }
                    }

                    if (isCancelled && cleanedTeacher) {
                        const key = `${cleanedTeacher.toLowerCase()}-${dateStr}`
                        if (!absentTeacherSet.has(key)) {
                            absentTeacherSet.add(key)
                            allAbsentTeachers.push({
                                teacher: cleanedTeacher,
                                date: dateStr,
                                isoDate: isoStr,
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
                        teacherAbsenceReason: isAbsent || isCancelled ? 'Nauczyciel nieobecny' : undefined
                    })
                })
            }

            const dayEvents = calendarEvents.filter((e) => e.date === dateStr || e.isoDate === isoStr)

            schedule.push({
                dayName: day,
                date: dateStr,
                isoDate: isoStr,
                isToday: isoStr === todayIso,
                events: dayEvents,
                lessons
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
                    if (lesson.subject) subjectsToTranslate.add(lesson.subject)
                })
                day.events.forEach((ev) => {
                    if (ev.title) reasonsToTranslate.add(ev.title)
                })
            })

            allAbsentTeachers.forEach((item) => {
                if (item.reason) reasonsToTranslate.add(item.reason)
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
                day.events.forEach((ev) => {
                    if (translatedMap[ev.title]) {
                        ev.title = translatedMap[ev.title]
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
                weekStart: mondayIso,
                weekEnd: fridayIso,
                schedule,
                allAbsentTeachers,
                calendarEvents
            }
        }
    } catch (error) {
        return {
            success: false,
            error: String(error)
        }
    }
}