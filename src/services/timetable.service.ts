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
import { extractCookieHeader } from '@/utils/cookie.util'

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

function normalizePolishDateToIso(rawDateStr: string): string | null {
    if (!rawDateStr) return null
    const clean = rawDateStr.toLowerCase().trim()

    const isoMatch = clean.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
    }

    const dotMatch = clean.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
    if (dotMatch) {
        return `${dotMatch[3]}-${dotMatch[2].padStart(2, '0')}-${dotMatch[1].padStart(2, '0')}`
    }

    const monthMap: Record<string, string> = {
        'sty': '01',
        'lut': '02',
        'mar': '03',
        'kwi': '04',
        'maj': '05',
        'cze': '06',
        'lip': '07',
        'sie': '08',
        'wrz': '09',
        'paź': '10',
        'paz': '10',
        'lis': '11',
        'gru': '12'
    }

    const textMatch = clean.match(/(\d{1,2})\s*([a-ząćęłńóśźż]{3,})\s*(\d{4})/)
    if (textMatch) {
        const day = textMatch[1].padStart(2, '0')
        const monthKey = textMatch[2].slice(0, 3)
        const month = monthMap[monthKey] || '10'
        const year = textMatch[3]
        return `${year}-${month}-${day}`
    }

    return null
}

async function fetchRealizedLessonTopics(
    client: any,
    mondayIso: string,
    fridayIso: string,
    weekDates: Record<string, { dateStr: string; isoStr: string }>
): Promise<Record<string, Record<string, string>>> {
    const topicsMap: Record<string, Record<string, string>> = {}
    const cookieHeader = extractCookieHeader(client)

    const registerTopic = (dateKey: string, timeKey: string, subjectKey: string, topicText: string) => {
        if (!topicText || topicText === '-' || topicText.trim().length <= 1) return
        const cleanTopic = topicText.trim()
        if (!topicsMap[dateKey]) {
            topicsMap[dateKey] = {}
        }
        if (timeKey) {
            topicsMap[dateKey][timeKey.replace(/\s+/g, '')] = cleanTopic
        }
        if (subjectKey) {
            topicsMap[dateKey][subjectKey.toLowerCase().trim()] = cleanTopic
        }
    }

    const parseRealizedHtml = (html: string, fallbackDateIso?: string) => {
        if (!html) return

        let pageDateIso = fallbackDateIso || null
        const headerDateMatch = html.match(/lekcje\s+zrealizowane\s*:\s*[^<]*?(\d{1,2}\s+[a-ząćęłńóśźż]{3,}\s+\d{4})/i)
        if (headerDateMatch) {
            pageDateIso = normalizePolishDateToIso(headerDateMatch[1])
        }

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

            if (cells.length >= 4) {
                const hasTimeInCol0 = /\d{1,2}:\d{2}/.test(cells[0])
                if (hasTimeInCol0) {
                    const rawTime = cells[0]
                    const rawSubject = cells[1]
                    const rawTopic = cells[3]
                    const effectiveDate = pageDateIso || ''
                    if (effectiveDate) {
                        registerTopic(effectiveDate, rawTime, rawSubject, rawTopic)
                        const parts = effectiveDate.split('-')
                        if (parts.length === 3) {
                            registerTopic(`${parts[2]}.${parts[1]}.${parts[0]}`, rawTime, rawSubject, rawTopic)
                        }
                    }
                } else if (cells.length >= 5) {
                    const parsedDate = normalizePolishDateToIso(cells[0])
                    const rawTime = cells[1]
                    const rawSubject = cells[2]
                    const rawTopic = cells[4]
                    if (parsedDate) {
                        registerTopic(parsedDate, rawTime, rawSubject, rawTopic)
                        const parts = parsedDate.split('-')
                        if (parts.length === 3) {
                            registerTopic(`${parts[2]}.${parts[1]}.${parts[0]}`, rawTime, rawSubject, rawTopic)
                        }
                    }
                }
            }
        }
    }

    const parseRealizedJson = (data: any) => {
        if (!data) return
        const list = Array.isArray(data)
            ? data
            : Array.isArray(data.entries)
                ? data.entries
                : Array.isArray(data.data)
                    ? data.data
                    : Array.isArray(data.lessons)
                        ? data.lessons
                        : []

        for (const item of list) {
            if (!item || typeof item !== 'object') continue
            const dateStr = item.date || item.lessonDate || item.day || ''
            const parsedDate = normalizePolishDateToIso(dateStr)
            const timeStr = item.time || item.lessonTime || item.hour || ''
            const subjectStr = item.subject || item.subjectName || (item.subject && item.subject.name) || ''
            const topicStr = item.topic || item.theme || item.subjectTopic || item.title || ''

            if (parsedDate && topicStr) {
                registerTopic(parsedDate, timeStr, subjectStr, topicStr)
                const parts = parsedDate.split('-')
                if (parts.length === 3) {
                    registerTopic(`${parts[2]}.${parts[1]}.${parts[0]}`, timeStr, subjectStr, topicStr)
                }
            }
        }
    }

    if (cookieHeader) {
        const daysIso = Object.values(weekDates).map((w) => w.isoStr)
        for (const dateIso of daysIso) {
            try {
                const panelUiUrl = `https://synergia.librus.pl/gateway/ms/studentdatapanel/ui/lekcje/zrealizowane?date=${dateIso}`
                const uiRes = await fetch(panelUiUrl, {
                    headers: {
                        'Cookie': cookieHeader,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
                    }
                })
                if (uiRes.ok) {
                    const text = await uiRes.text()
                    parseRealizedHtml(text, dateIso)
                }
            } catch { }

            try {
                const panelApiUrl = `https://synergia.librus.pl/gateway/ms/studentdatapanel/api/lessons/realized?date=${dateIso}`
                const apiRes = await fetch(panelApiUrl, {
                    headers: {
                        'Cookie': cookieHeader,
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
                    }
                })
                if (apiRes.ok) {
                    const json = await apiRes.json()
                    parseRealizedJson(json)
                }
            } catch { }
        }

        try {
            const classicRes = await fetch('https://synergia.librus.pl/zrealizowane_lekcje', {
                headers: {
                    'Cookie': cookieHeader,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
                }
            })
            if (classicRes.ok) {
                const text = await classicRes.text()
                parseRealizedHtml(text)
            }
        } catch { }

        try {
            const gwUrl = `https://synergia.librus.pl/gateway/api/2.0/RealizedLessons?dateFrom=${mondayIso}&dateTo=${fridayIso}`
            const gwRes = await fetch(gwUrl, {
                headers: {
                    'Cookie': cookieHeader,
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
                }
            })
            if (gwRes.ok) {
                const json = await gwRes.json()
                parseRealizedJson(json)
            }
        } catch { }
    }

    try {
        const caller = client._caller || client.caller
        if (caller) {
            const raw = await caller.get('https://synergia.librus.pl/zrealizowane_lekcje').catch(() => null)
            let htmlText = ''
            if (typeof raw === 'function') {
                htmlText = raw.html ? raw.html() : ''
            } else if (typeof raw === 'string') {
                htmlText = raw
            } else if (raw?.body) {
                htmlText = typeof raw.body === 'string' ? raw.body : (raw.body.html ? raw.body.html() : '')
            }
            if (htmlText) {
                parseRealizedHtml(htmlText)
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
            fetchRealizedLessonTopics(client, mondayIso, fridayIso, weekDates).catch((): Record<string, Record<string, string>> => ({}))
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
                    const normalizedTime = (slot.time || '').replace(/\s+/g, '')
                    const slotTopic = (slot.topic || slot.theme || slot.subjectTopic || slot.description || '').trim()

                    const realizedTopic =
                        dayRealized[normalizedTime] ||
                        dayRealized[slot.time] ||
                        dayRealized[rawSubject.toLowerCase()] ||
                        dayRealized[String(index + 1)] ||
                        dayRealized[String(index)] ||
                        ''

                    const finalTopic = (realizedTopic && realizedTopic !== '-') ? realizedTopic : (slotTopic && slotTopic !== '-' ? slotTopic : undefined)

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
            const textsToTranslate = new Set<string>()

            schedule.forEach((day) => {
                day.lessons.forEach((lesson) => {
                    if (lesson.subject) textsToTranslate.add(lesson.subject)
                    if (lesson.topic) textsToTranslate.add(lesson.topic)
                })
                day.events.forEach((ev) => {
                    if (ev.title) textsToTranslate.add(ev.title)
                })
            })

            allAbsentTeachers.forEach((item) => {
                if (item.reason) textsToTranslate.add(item.reason)
            })

            const translatedMap = await translateBatch(Array.from(textsToTranslate))

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