import Librus from 'librus-api'
import { LessonItem, DaySchedule, AbsentTeacherItem, SmartTimetableResult } from '@/models/timetable.model'
import { translateBatch } from '@/services/translation.service'

function cleanTeacherName(rawTeacher: string): string {
    if (!rawTeacher) {
        return ''
    }
    return rawTeacher.replace(/\s*\(.*?\)\s*/g, '').trim()
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

export async function fetchSmartTimetable(
    username: string,
    pass: string,
    translate: boolean = false
): Promise<{ success: boolean; data?: SmartTimetableResult; error?: string }> {
    try {
        const client = new Librus()
        await client.authorize(username, pass)

        const [rawTimetable, rawCalendar] = await Promise.all([
            client.calendar.getTimetable(),
            client.calendar.getCalendar().catch(() => [])
        ])

        const allAbsentTeachers: AbsentTeacherItem[] = []
        const absentTeacherSet = new Set<string>()

        if (Array.isArray(rawCalendar)) {
            for (const event of rawCalendar) {
                const isAbsence = event.isAbsence || (event.title && event.title.toLowerCase().includes('nieobecn'))
                if (isAbsence && event.teacher) {
                    const cleanedName = cleanTeacherName(event.teacher)
                    absentTeacherSet.add(cleanedName.toLowerCase())
                    allAbsentTeachers.push({
                        teacher: cleanedName,
                        date: event.date || '',
                        reason: event.title || event.description || '',
                        isRelevantToStudent: false
                    })
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
                    const isAbsent = Boolean(cleanedTeacher && absentTeacherSet.has(cleanedTeacher.toLowerCase()))

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
                        teacherAbsent: isAbsent,
                        teacherAbsenceReason: isAbsent ? 'Absent according to calendar' : undefined
                    })
                })
            }

            schedule.push({
                dayName: day,
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

            const translatedMap = await translateBatch(Array.from(subjectsToTranslate).concat(Array.from(reasonsToTranslate)))

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