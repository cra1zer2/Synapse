import {
    LessonItem,
    DaySchedule,
    AbsentTeacherItem,
    TimetableEvent,
    SmartTimetableResult
} from '@/models/timetable.model'
import { getAuthenticatedClient } from '@/services/librus.service'
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

async function fetchRealizedLessonTopics(client: any): Promise<Record<string, Record<string, string>>> {
    const topicsMap: Record<string, Record<string, string>> = {}
    try {
        const caller = client._caller || client.caller
        if (!caller) return topicsMap

        const res = await caller.get('https://synergia.librus.pl/zrealizowane_lekcje').catch(() => null)
        const html = typeof res === 'string' ? res : res?.body || res?.text || ''
        if (!html) return topicsMap

        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
        let rowMatch: RegExpExecArray | null

        while ((rowMatch = rowRegex.exec(html)) !== null) {
            const rowContent = rowMatch[1]
            if (!rowContent.includes('<td')) continue

            const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
            const cells: string[] = []
            let tdMatch: RegExpExecArray | null

            while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
                const cellText = tdMatch[1].replace(/<[^>]+>/g, '').trim()
                cells.push(cellText)
            }

            if (cells.length >= 5) {
                const rawDate = cells[0].replace(/[^\d.-]/g, '').trim()
                const rawHour = cells[1].trim()
                const rawSubject = cells[2].toLowerCase().trim()
                const rawTopic = cells[4].trim()

                if (rawTopic && rawTopic !== '-' && rawTopic.length > 1) {
                    if (!topicsMap[rawDate]) {
                        topicsMap[rawDate] = {}
                    }
                    topicsMap[rawDate][rawHour] = rawTopic
                    topicsMap[rawDate][rawSubject] = rawTopic
                }
            }
        }
    } catch { }
    return topicsMap
}

export async function fetchSmartTimetable(
    username: string,
    pass: string,
    translate: boolean = false,
    targetDateIso?: string
): Promise<{ success: boolean; data?: SmartTimetableResult; error?: string }> {
    try {
        const client = await getAuthenticatedClient(username, pass)

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

        const [rawTimetable, rawCalendar, realizedTopicsMap] = await Promise.all([
            client.calendar.getTimetable(mondayIso, fridayIso),
            client.calendar.getCalendar(currentMonth, currentYear).catch(() => []),
            fetchRealizedLessonTopics(client).catch((): Record<string, Record<string, string>> => ({}))
        ])

        const topicsRecord: Record<string, Record<string, string>> = realizedTopicsMap || {}

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

            const dayRealized: Record<string, string> = topicsRecord[dateStr] || topicsRecord[isoStr] || {}

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

                    const rawSubject = (slot.subject || '').trim()
                    const slotTopic = (slot.topic || slot.theme || slot.subjectTopic || slot.description || '').trim()
                    const realizedTopic = dayRealized[slot.time] || dayRealized[String(index + 1)] || dayRealized[String(index)] || dayRealized[rawSubject.toLowerCase()] || ''

                    const finalTopic = realizedTopic || slotTopic || undefined

                    lessons.push({
                        number: index,
                        subject: rawSubject,
                        teacher: cleanedTeacher,
                        room: slot.room || '',
                        time: slot.time || '',
                        durationMinutes,
                        isShortened,
                        isCancelled,
                        isSubstitution,
                        flag: slot.flag || null,
                        teacherAbsent: isAbsent || isCancelled,
                        teacherAbsenceReason: isAbsent || isCancelled ? 'Nauczyciel nieobecny' : undefined,
                        topic: finalTopic
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
                    if (lesson.topic) reasonsToTranslate.add(lesson.topic)
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
                    if (lesson.topic && translatedMap[lesson.topic]) {
                        lesson.topic = translatedMap[lesson.topic]
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