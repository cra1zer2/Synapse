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

    const registerTopic = (
        dateKey: string,
        timeKey: string,
        subjectKey: string,
        topicText: string,
        lessonNr?: number
    ) => {
        if (!topicText || topicText === '-' || topicText.trim().length <= 1) return
        const cleanTopic = topicText.trim()
        if (!topicsMap[dateKey]) {
            topicsMap[dateKey] = {}
        }
        if (lessonNr !== undefined && !isNaN(lessonNr)) {
            topicsMap[dateKey][`nr_${lessonNr}`] = cleanTopic
            topicsMap[dateKey][String(lessonNr)] = cleanTopic
        }
        if (timeKey) {
            const cleanTime = timeKey.replace(/\s+/g, '')
            topicsMap[dateKey][`time_${cleanTime}`] = cleanTopic
            topicsMap[dateKey][cleanTime] = cleanTopic
        }
        if (subjectKey) {
            const norm = subjectKey.toLowerCase().trim()
            topicsMap[dateKey][`sub_${norm}`] = cleanTopic
            topicsMap[dateKey][norm] = cleanTopic
        }
    }

    const parseRealizedHtml = (html: string, fallbackDateIso?: string) => {
        if (!html) return

        let pageDateIso = fallbackDateIso || null
        const headerDateMatch = html.match(/lekcje\s+zrealizowane\s*:\s*[^<]*?(\d{1,2}\s+[a-ząćęłńóśźż]{3,}\s+\d{4})/i)
        if (headerDateMatch) {
            pageDateIso = normalizePolishDateToIso(headerDateMatch[1])
        }

        const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi
        let tableMatch: RegExpExecArray | null

        while ((tableMatch = tableRegex.exec(html)) !== null) {
            const tableContent = tableMatch[1]
            const rows = tableContent.split(/<\/tr>/i)

            let colIndexNr = -1
            let colIndexDate = -1
            let colIndexTime = -1
            let colIndexSubject = -1
            let colIndexTopic = -1

            for (const row of rows) {
                if (!row.includes('<td') && !row.includes('<th')) continue

                if (row.includes('<th')) {
                    const thCells = Array.from(row.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)).map((m) =>
                        m[1].replace(/<[^>]+>/g, '').trim().toLowerCase()
                    )
                    thCells.forEach((text, idx) => {
                        if (text.includes('nr') || text.includes('lp') || text.includes('lekcja')) colIndexNr = idx
                        else if (text.includes('data')) colIndexDate = idx
                        else if (text.includes('godz') || text.includes('czas')) colIndexTime = idx
                        else if (text.includes('przedmiot')) colIndexSubject = idx
                        else if (text.includes('temat') || text.includes('treść') || text.includes('tresc')) colIndexTopic = idx
                    })
                    continue
                }

                const tdCells = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((m) =>
                    m[1].replace(/<[^>]+>/g, '').trim()
                )
                if (tdCells.length === 0) continue

                let rowDateIso = pageDateIso
                let rowNr: number | undefined
                let rowTime = ''
                let rowSubject = ''
                let rowTopic = ''

                if (colIndexTopic !== -1 && tdCells[colIndexTopic]) {
                    rowTopic = tdCells[colIndexTopic]
                    if (colIndexNr !== -1 && tdCells[colIndexNr]) {
                        const num = parseInt(tdCells[colIndexNr], 10)
                        if (!isNaN(num)) rowNr = num
                    }
                    if (colIndexDate !== -1 && tdCells[colIndexDate]) {
                        const parsed = normalizePolishDateToIso(tdCells[colIndexDate])
                        if (parsed) rowDateIso = parsed
                    }
                    if (colIndexTime !== -1 && tdCells[colIndexTime]) {
                        rowTime = tdCells[colIndexTime]
                    }
                    if (colIndexSubject !== -1 && tdCells[colIndexSubject]) {
                        rowSubject = tdCells[colIndexSubject]
                    }
                } else {
                    for (let i = 0; i < tdCells.length; i++) {
                        const cell = tdCells[i]
                        if (!rowDateIso) {
                            const d = normalizePolishDateToIso(cell)
                            if (d) {
                                rowDateIso = d
                                continue
                            }
                        }
                        if (rowNr === undefined && /^\d+$/.test(cell) && parseInt(cell, 10) <= 20) {
                            rowNr = parseInt(cell, 10)
                            continue
                        }
                        if (!rowTime && /\d{1,2}:\d{2}/.test(cell)) {
                            rowTime = cell
                            continue
                        }
                        if (!rowSubject && cell.length > 2 && !cell.includes('-') && i < tdCells.length - 1) {
                            rowSubject = cell
                            continue
                        }
                    }
                    rowTopic = tdCells[tdCells.length - 1]
                }

                if (rowDateIso && rowTopic) {
                    registerTopic(rowDateIso, rowTime, rowSubject, rowTopic, rowNr)
                    const parts = rowDateIso.split('-')
                    if (parts.length === 3) {
                        registerTopic(`${parts[2]}.${parts[1]}.${parts[0]}`, rowTime, rowSubject, rowTopic, rowNr)
                    }
                }
            }
        }
    }

    const parseRealizedJson = (data: any) => {
        if (!data) return
        const list = Array.isArray(data)
            ? data
            : Array.isArray(data.Realizations)
                ? data.Realizations
                : Array.isArray(data.entries)
                    ? data.entries
                    : Array.isArray(data.data)
                        ? data.data
                        : Array.isArray(data.lessons)
                            ? data.lessons
                            : Array.isArray(data.realizedLessons)
                                ? data.realizedLessons
                                : []

        for (const item of list) {
            if (!item || typeof item !== 'object') continue
            const rawDate = item.LessonDate || item.lessonDate || item.date || item.day || ''
            const parsedDate = normalizePolishDateToIso(String(rawDate))
            const rawTime = item.Time || item.lessonTime || item.hour || item.time || ''
            const rawSubject = typeof item.Subject === 'string'
                ? item.Subject
                : item.Subject?.Name || item.subjectName || item.subject || ''
            const rawTopic = item.Topic || item.topic || item.Theme || item.theme || item.Note || item.title || ''
            const rawNr = item.LessonNumber || item.LessonNo || item.lessonNumber || item.nr || item.lessonNo

            if (parsedDate && rawTopic) {
                registerTopic(parsedDate, String(rawTime), String(rawSubject), String(rawTopic), rawNr ? Number(rawNr) : undefined)
                const parts = parsedDate.split('-')
                if (parts.length === 3) {
                    registerTopic(`${parts[2]}.${parts[1]}.${parts[0]}`, String(rawTime), String(rawSubject), String(rawTopic), rawNr ? Number(rawNr) : undefined)
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
            const gwRealizationsUrl = `https://synergia.librus.pl/gateway/api/2.0/Realizations?dateFrom=${mondayIso}&dateTo=${fridayIso}`
            const gwRealizationsRes = await fetch(gwRealizationsUrl, {
                headers: {
                    'Cookie': cookieHeader,
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
                }
            })
            if (gwRealizationsRes.ok) {
                const json = await gwRealizationsRes.json()
                parseRealizedJson(json)
            }
        } catch { }

        try {
            const gwLessonsUrl = `https://synergia.librus.pl/gateway/api/2.0/RealizedLessons?dateFrom=${mondayIso}&dateTo=${fridayIso}`
            const gwLessonsRes = await fetch(gwLessonsUrl, {
                headers: {
                    'Cookie': cookieHeader,
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
                }
            })
            if (gwLessonsRes.ok) {
                const json = await gwLessonsRes.json()
                parseRealizedJson(json)
            }
        } catch { }

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
                    const lessonNum = index + 1
                    const normSubject = rawSubject.toLowerCase().trim()

                    const realizedTopic =
                        dayRealized[`nr_${lessonNum}`] ||
                        dayRealized[`nr_${index}`] ||
                        dayRealized[`time_${normalizedTime}`] ||
                        dayRealized[normalizedTime] ||
                        dayRealized[`sub_${normSubject}`] ||
                        dayRealized[normSubject] ||
                        dayRealized[rawSubject.toLowerCase()] ||
                        dayRealized[String(lessonNum)] ||
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