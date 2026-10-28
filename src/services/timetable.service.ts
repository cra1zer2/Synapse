'use server'

import {
    LessonItem,
    DaySchedule,
    SmartTimetableResult,
    TimetableEvent
} from '@/models/timetable.model'
import { translateBatch } from '@/services/translation.service'
import { fetchGatewayEndpoint } from '@/services/gateway.service'
import { parseLessonTimeRange } from '@/utils/time.util'

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

function getWeekDates(pivotDate: Date): { monday: Date; friday: Date; weekDates: Record<string, { dateStr: string; isoStr: string }> } {
    const current = new Date(pivotDate.getFullYear(), pivotDate.getMonth(), pivotDate.getDate())
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
        let pivotDate: Date
        if (targetDateIso) {
            const p = targetDateIso.split('-').map(Number)
            pivotDate = new Date(p[0], p[1] - 1, p[2])
        } else {
            pivotDate = new Date()
        }
        const { monday, friday, weekDates } = getWeekDates(pivotDate)

        const formatIso = (d: Date) => {
            const y = d.getFullYear()
            const m = String(d.getMonth() + 1).padStart(2, '0')
            const dayNum = String(d.getDate()).padStart(2, '0')
            return `${y}-${m}-${dayNum}`
        }

        const mondayIso = formatIso(monday)
        const fridayIso = formatIso(friday)
        const daysIso = Object.values(weekDates).map((w) => w.isoStr)

        const [gatewayTimetableRes, usersRes, meRes, subjectsRes, ...realizationsList] = await Promise.all([
            fetchGatewayEndpoint(username, pass, `gateway/api/2.0/Timetables?weekStart=${mondayIso}`).catch((err) => {
                console.error('[Timetable] API error:', err?.message || err)
                return null
            }),
            fetchGatewayEndpoint(username, pass, 'gateway/api/2.0/Users').catch(() => null),
            fetchGatewayEndpoint(username, pass, 'gateway/api/2.0/Me').catch(() => null),
            fetchGatewayEndpoint(username, pass, 'gateway/api/2.0/Subjects').catch(() => null),
            ...daysIso.map((iso) =>
                fetchGatewayEndpoint(username, pass, `gateway/api/2.0/Realizations?date=${iso}`)
                    .then((res) => ({ iso, data: res }))
                    .catch(() => ({ iso, data: null }))
            )
        ])

        if (!gatewayTimetableRes || typeof gatewayTimetableRes === 'string') {
            return { success: false, error: 'Nie udało się pobrać planu lekcji z serwera Librus' }
        }

        const userNames = new Map<number, string>()
        const rawUsers = Array.isArray(usersRes?.Users) ? usersRes.Users : []
        for (const u of rawUsers) {
            const uId = Number(u.Id)
            const first = String(u.FirstName || '').trim()
            const last = String(u.LastName || '').trim()
            const full = [first, last].filter(Boolean).join(' ')
            if (full) {
                userNames.set(uId, full)
            }
        }

        const subjectNames = new Map<number, string>()
        const rawSubjects = Array.isArray(subjectsRes?.Subjects) ? subjectsRes.Subjects : []
        for (const s of rawSubjects) {
            const sId = Number(s.Id)
            const name = String(s.Name || s.Short || '').trim()
            if (!isNaN(sId) && name) {
                subjectNames.set(sId, name)
            }
        }

        const topicsMap: Record<string, Record<number, string>> = {}
        for (const item of realizationsList) {
            if (!item || !item.iso) continue
            const list = Array.isArray(item.data?.Realizations) ? item.data.Realizations : []
            topicsMap[item.iso] = {}
            for (const r of list) {
                const lNum = Number(r.LessonNumber ?? r.LessonNo)
                if (!isNaN(lNum) && r.Topic) {
                    topicsMap[item.iso][lNum] = String(r.Topic).trim()
                }
            }
        }

        const classroomIds = new Set<number>()
        const rawWeekTimetable = (gatewayTimetableRes?.Timetable && typeof gatewayTimetableRes.Timetable === 'object') ? gatewayTimetableRes.Timetable : {}

        for (const iso of daysIso) {
            const periodsRaw = rawWeekTimetable[iso]
            const periods = Array.isArray(periodsRaw) ? periodsRaw : (periodsRaw && typeof periodsRaw === 'object' ? Object.values(periodsRaw) : [])
            for (const period of periods) {
                const slots = Array.isArray(period) ? period : (period && typeof period === 'object' ? [period] : [])
                for (const slot of slots) {
                    if (!slot) continue
                    const sId = Number(slot.Subject?.Id)
                    const sName = String(slot.Subject?.Name || slot.Subject?.Short || '').trim()
                    if (sId && sName && !subjectNames.has(sId)) {
                        subjectNames.set(sId, sName)
                    }

                    const tId = Number(slot.Teacher?.Id)
                    const tFirst = String(slot.Teacher?.FirstName || '').trim()
                    const tLast = String(slot.Teacher?.LastName || '').trim()
                    const tFull = [tFirst, tLast].filter(Boolean).join(' ')
                    if (tId && tFull && !userNames.has(tId)) {
                        userNames.set(tId, tFull)
                    }

                    const cId = Number(slot.Classroom?.Id)
                    if (!isNaN(cId) && cId > 0) {
                        classroomIds.add(cId)
                    }
                    const orgCId = Number(slot.OrgClassroom?.Id)
                    if (!isNaN(orgCId) && orgCId > 0) {
                        classroomIds.add(orgCId)
                    }
                }
            }
        }

        const classroomMap = new Map<number, string>()
        if (classroomIds.size > 0) {
            const idsList = Array.from(classroomIds).join(',')
            const classroomsRes = await fetchGatewayEndpoint(username, pass, `gateway/api/2.0/Classrooms/${idsList}`).catch(() => null)
            const rawClassrooms = Array.isArray(classroomsRes?.Classrooms) 
                ? classroomsRes.Classrooms 
                : (classroomsRes?.Classroom ? [classroomsRes.Classroom] : [])
            for (const c of rawClassrooms) {
                const id = Number(c.Id)
                const name = String(c.Symbol || c.Name || '').trim()
                if (!isNaN(id) && name) {
                    classroomMap.set(id, name)
                }
            }
        }

        const rawClassId = meRes?.Me?.Class?.Id ?? meRes?.data?.Me?.Class?.Id
        const classId = Number(rawClassId)
        const pivotMonth = pivotDate.getMonth() + 1
        const pivotYear = pivotDate.getFullYear()

        const calendarRes = !isNaN(classId) && classId > 0
            ? await fetchGatewayEndpoint(username, pass, `gateway/api/2.0/Calendars/${classId}?month=${pivotMonth}&year=${pivotYear}`).catch(() => null)
            : null
        const rawHomeWorks = Array.isArray(calendarRes?.Calendar?.HomeWorks) ? calendarRes.Calendar.HomeWorks : []
        const homeworkIds = rawHomeWorks.map((hw: any) => Number(hw.Id)).filter((id: number) => !isNaN(id) && id > 0)

        const eventsByDate: Record<string, TimetableEvent[]> = {}

        if (homeworkIds.length > 0) {
            const chunks: number[][] = []
            for (let i = 0; i < homeworkIds.length; i += 25) {
                chunks.push(homeworkIds.slice(i, i + 25))
            }
            const hwResponses = await Promise.all(
                chunks.map((chunk) =>
                    fetchGatewayEndpoint(username, pass, `gateway/api/2.0/HomeWorks/${chunk.join(',')}`).catch(() => null)
                )
            )
            const items = hwResponses.flatMap((res) => Array.isArray(res?.HomeWorks) ? res.HomeWorks : (res?.HomeWork ? [res.HomeWork] : []))

            const missingSubjectIds = new Set<number>()
            const missingUserIds = new Set<number>()
            for (const hw of items) {
                const sId = Number(hw.Subject?.Id)
                if (sId && !subjectNames.has(sId)) missingSubjectIds.add(sId)
                const uId = Number(hw.CreatedBy?.Id)
                if (uId && !userNames.has(uId)) missingUserIds.add(uId)
            }

            if (missingSubjectIds.size > 0) {
                const missingSubjRes = await fetchGatewayEndpoint(
                    username,
                    pass,
                    `gateway/api/2.0/Subjects/${Array.from(missingSubjectIds).join(',')}`
                ).catch(() => null)
                const extraSubjs = Array.isArray(missingSubjRes?.Subjects) ? missingSubjRes.Subjects : (missingSubjRes?.Subject ? [missingSubjRes.Subject] : [])
                for (const s of extraSubjs) {
                    const sId = Number(s.Id)
                    const name = String(s.Name || s.Short || '').trim()
                    if (sId && name) subjectNames.set(sId, name)
                }
            }

            if (missingUserIds.size > 0) {
                const missingUserRes = await fetchGatewayEndpoint(
                    username,
                    pass,
                    `gateway/api/2.0/Users/${Array.from(missingUserIds).join(',')}`
                ).catch(() => null)
                const extraUsers = Array.isArray(missingUserRes?.Users) ? missingUserRes.Users : (missingUserRes?.User ? [missingUserRes.User] : [])
                for (const u of extraUsers) {
                    const uId = Number(u.Id)
                    const first = String(u.FirstName || '').trim()
                    const last = String(u.LastName || '').trim()
                    const full = [first, last].filter(Boolean).join(' ')
                    if (uId && full) userNames.set(uId, full)
                }
            }

            for (const hw of items) {
                const hwDate = String(hw.Date || '').trim()
                if (!hwDate) continue
                if (!eventsByDate[hwDate]) {
                    eventsByDate[hwDate] = []
                }
                const catId = Number(hw.Category?.Id)
                const content = String(hw.Content || '').trim()
                const lower = content.toLowerCase()
                let category: 'holiday' | 'exam' | 'quiz' | 'homework' | 'info' = 'info'
                let eventType = 'Wydarzenie'

                if (catId === 11857 || /wolny|święto|ferie|przerwa/i.test(lower)) {
                    category = 'holiday'
                    eventType = 'Dzień wolny'
                } else if (/konsultacj/i.test(lower)) {
                    category = 'info'
                    eventType = 'Konsultacje'
                } else if (/zebrani|wywiadówk|spotkanie z rodzic/i.test(lower)) {
                    category = 'info'
                    eventType = 'Zebranie'
                } else if (catId === 7672 || /kartkówk/i.test(lower)) {
                    category = 'quiz'
                    eventType = 'Kartkówka'
                } else if (catId === 7187 || /sprawdzian|praca klasowa|test|diagnoz|egzamin/i.test(lower)) {
                    category = 'exam'
                    eventType = 'Sprawdzian'
                } else if (/zadanie|praca domowa|projekt/i.test(lower)) {
                    category = 'homework'
                    eventType = 'Zadanie domowe'
                } else if (/apel|wycieczk|uroczyst/i.test(lower)) {
                    category = 'info'
                    eventType = 'Wydarzenie'
                } else if (hw.Category?.Name) {
                    eventType = String(hw.Category.Name).trim()
                }

                const sId = Number(hw.Subject?.Id)
                const resolvedSubject = (sId && subjectNames.get(sId)) || (hw.Subject?.Name ? String(hw.Subject.Name).trim() : '')

                const uId = Number(hw.CreatedBy?.Id)
                const resolvedTeacher = (uId && userNames.get(uId)) || (hw.CreatedBy ? `${hw.CreatedBy.FirstName || ''} ${hw.CreatedBy.LastName || ''}`.trim() : undefined)

                let timeStr: string | undefined = undefined
                if (hw.TimeFrom && hw.TimeTo) {
                    const from = String(hw.TimeFrom).slice(0, 5)
                    const to = String(hw.TimeTo).slice(0, 5)
                    if (from && to) {
                        timeStr = `${from} - ${to}`
                    }
                }

                const lessonNum = hw.LessonNo != null && hw.LessonNo !== '' ? Number(hw.LessonNo) : undefined

                eventsByDate[hwDate].push({
                    id: hw.Id,
                    title: content,
                    date: hwDate.split('-').reverse().join('.'),
                    isoDate: hwDate,
                    isAbsence: false,
                    category,
                    eventType,
                    lessonNumber: lessonNum != null && !isNaN(lessonNum) ? lessonNum : undefined,
                    subjectName: resolvedSubject,
                    teacher: resolvedTeacher || undefined,
                    time: timeStr,
                    description: content
                })
            }
        }

        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        const todayIso = formatIso(new Date())
        const schedule: DaySchedule[] = []

        dayNames.forEach((dName) => {
            const { dateStr, isoStr } = weekDates[dName]
            const dayLessons: LessonItem[] = []
            const dayRealized = topicsMap[isoStr] || {}
            const periodsRaw = rawWeekTimetable[isoStr]
            const periods = Array.isArray(periodsRaw) ? periodsRaw : (periodsRaw && typeof periodsRaw === 'object' ? Object.values(periodsRaw) : [])

            periods.forEach((period: any, pIdx: number) => {
                const slots = Array.isArray(period) ? period : (period && typeof period === 'object' ? [period] : [])
                slots.forEach((slot: any) => {
                    if (!slot) return

                    const subjectName = String(slot.Subject?.Name || slot.Subject?.Short || 'Zajęcia szkolne').trim()
                    
                    const newFirst = String(slot.Teacher?.FirstName || '').trim()
                    const newLast = String(slot.Teacher?.LastName || '').trim()
                    const newTeacher = [newFirst, newLast].filter(Boolean).join(' ')

                    const isCancelled = Boolean(slot.IsCanceled)
                    const isSubstitution = Boolean(slot.IsSubstitutionClass)

                    let finalTeacherName = newTeacher
                    let teacherAbsenceReason: string | undefined = undefined

                    if (isSubstitution) {
                        const orgTeacherId = slot.OrgTeacher?.Id ? Number(slot.OrgTeacher.Id) : undefined
                        const orgTeacherName = orgTeacherId && userNames.has(orgTeacherId) ? userNames.get(orgTeacherId) : undefined

                        finalTeacherName = newTeacher || orgTeacherName || ''
                        if (orgTeacherName && newTeacher && newTeacher !== orgTeacherName) {
                            teacherAbsenceReason = `Zastępstwo za: ${orgTeacherName}`
                        } else {
                            teacherAbsenceReason = 'Zastępstwo'
                        }
                    }

                    const hourFrom = String(slot.HourFrom || '').trim()
                    const hourTo = String(slot.HourTo || '').trim()
                    const timeStr = hourFrom && hourTo ? `${hourFrom} - ${hourTo}` : ''

                    const lessonNum = Number(slot.LessonNo ?? (pIdx + 1))
                    const { durationMinutes, isShortened } = calculateDuration(timeStr)

                    const classroomId = slot.Classroom ? Number(slot.Classroom.Id) : undefined
                    const resolvedRoom = (classroomId && classroomMap.get(classroomId)) || slot.Classroom?.Symbol || ''

                    const realizedTopic = dayRealized[lessonNum] || ''

                    dayLessons.push({
                        number: lessonNum,
                        subject: subjectName,
                        teacher: finalTeacherName,
                        room: resolvedRoom,
                        time: timeStr,
                        durationMinutes,
                        isShortened,
                        isCancelled,
                        isSubstitution,
                        flag: isCancelled ? 'Odwołane' : isSubstitution ? 'Zastępstwo' : null,
                        teacherAbsent: isCancelled,
                        teacherAbsenceReason,
                        topic: realizedTopic || undefined
                    })
                })
            })

            dayLessons.sort((a, b) => a.number - b.number)

            const dayEvents = (eventsByDate[isoStr] || []).map((ev) => {
                if (ev.lessonNumber !== undefined && ev.lessonNumber !== null) {
                    const matched = dayLessons.find((l) => l.number === ev.lessonNumber)
                    if (matched) {
                        return {
                            ...ev,
                            subjectName: matched.subject || ev.subjectName,
                            teacher: ev.teacher || matched.teacher,
                            time: ev.time || matched.time
                        }
                    }
                }
                const firstLine = (ev.title || '').split('\n')[0].split(' - ')[0].trim()
                return {
                    ...ev,
                    subjectName: ev.subjectName || (firstLine.length > 0 && firstLine.length < 40 ? firstLine : ev.eventType)
                }
            })

            schedule.push({
                dayName: dName,
                date: dateStr,
                isoDate: isoStr,
                isToday: isoStr === todayIso,
                events: dayEvents,
                lessons: dayLessons
            })
        })

        if (translate) {
            const textsToTranslate = new Set<string>()
            schedule.forEach((day) => {
                day.lessons.forEach((l) => {
                    if (l.subject) textsToTranslate.add(l.subject)
                    if (l.topic) textsToTranslate.add(l.topic)
                })
                day.events.forEach((e) => {
                    if (e.title) textsToTranslate.add(e.title)
                    if (e.subjectName) textsToTranslate.add(e.subjectName)
                })
            })
            const translatedMap = await translateBatch(Array.from(textsToTranslate))
            schedule.forEach((day) => {
                day.lessons.forEach((l) => {
                    if (translatedMap[l.subject]) l.subject = translatedMap[l.subject]
                    if (l.topic && translatedMap[l.topic]) l.topic = translatedMap[l.topic]
                })
                day.events.forEach((e) => {
                    if (translatedMap[e.title]) e.title = translatedMap[e.title]
                    if (e.subjectName && translatedMap[e.subjectName]) e.subjectName = translatedMap[e.subjectName]
                })
            })
        }

        return {
            success: true,
            data: {
                weekStart: mondayIso,
                weekEnd: fridayIso,
                schedule,
                allAbsentTeachers: [],
                calendarEvents: schedule.flatMap((d) => d.events)
            }
        }
    } catch (error: any) {
        return {
            success: false,
            error: String(error?.message || error)
        }
    }
}
