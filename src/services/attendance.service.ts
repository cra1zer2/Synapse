import Librus from 'librus-api'
import { AbsenceDetail, SubjectAttendance, AttendanceResult } from '@/models/attendance.model'
import { translateBatch } from '@/services/translation.service'
import { formatDisplayDate } from '@/utils/date.util'

function mapDayStringToWeekDay(dayStr: string): string {
    const lower = dayStr.toLowerCase()
    if (lower.includes('czw') || lower.includes('czwartek')) return 'Thursday'
    if (lower.includes('pt') || lower.includes('piątek') || lower.includes('piatek')) return 'Friday'
    if (lower.includes('śr') || lower.includes('środa') || lower.includes('sroda')) return 'Wednesday'
    if (lower.includes('wt') || lower.includes('wtorek')) return 'Tuesday'
    if (lower.includes('pn') || lower.includes('poniedziałek') || lower.includes('poniedzialek')) return 'Monday'
    return ''
}

export async function fetchAttendanceMetrics(
    username: string,
    pass: string,
    translate: boolean = false
): Promise<{ success: boolean; data?: AttendanceResult; error?: string }> {
    try {
        const client = new Librus()
        await client.authorize(username, pass)

        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1

        const [rawAbsences, rawTimetable] = await Promise.all([
            client.absence.getAbsences(),
            client.calendar.getTimetable()
        ])

        const timetableData = rawTimetable?.table || {}
        const subjectBaselineLessons: Record<string, number> = {}

        for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
            const slots = timetableData[day]
            if (Array.isArray(slots)) {
                for (const slot of slots) {
                    if (slot && slot.subject) {
                        const cleanSub = slot.subject.trim()
                        subjectBaselineLessons[cleanSub] = (subjectBaselineLessons[cleanSub] || 0) + 1
                    }
                }
            }
        }

        const absencesList: AbsenceDetail[] = []
        const subjectsMap: Record<string, { absent: number; excused: number; unexcused: number; items: AbsenceDetail[] }> = {}

        for (const sub of Object.keys(subjectBaselineLessons)) {
            subjectsMap[sub] = { absent: 0, excused: 0, unexcused: 0, items: [] }
        }

        const daysArray = rawAbsences && rawAbsences['0'] && Array.isArray(rawAbsences['0'])
            ? rawAbsences['0']
            : Array.isArray(rawAbsences)
                ? rawAbsences
                : []

        for (const dayEntry of daysArray) {
            if (!dayEntry || !dayEntry.date || !Array.isArray(dayEntry.table)) {
                continue
            }

            const rawDateStr = String(dayEntry.date)
            const formattedDate = formatDisplayDate(rawDateStr, currentYear, currentMonth)
            const mappedWeekday = mapDayStringToWeekDay(rawDateStr)
            const daySlots = mappedWeekday ? timetableData[mappedWeekday] : []

            dayEntry.table.forEach((slotData: any, lessonIdx: number) => {
                if (!slotData || typeof slotData !== 'object') {
                    return
                }

                const symbol = String(slotData.type || slotData.symbol || '').trim().toLowerCase()
                if (!symbol) {
                    return
                }

                const matchedLesson = Array.isArray(daySlots) ? daySlots[lessonIdx] : null
                const subjectName = (matchedLesson?.subject || `Lekcja ${lessonIdx}`).trim()
                const teacherName = matchedLesson?.teacher || ''
                const timeRange = matchedLesson?.time || ''

                const isUnexcused = symbol === 'nb' || symbol === 'sl'
                const isExcused = symbol === 'u'

                const typeMap: Record<string, { type: 'nb' | 'u' | 'sl' | 'sp' | 'zw'; label: string }> = {
                    nb: { type: 'nb', label: 'Nieobecność nieusprawiedliwiona' },
                    u: { type: 'u', label: 'Nieobecność usprawiedliwiona' },
                    sl: { type: 'sl', label: 'Spóźnienie > limit' },
                    sp: { type: 'sp', label: 'Spóźnienie' },
                    zw: { type: 'zw', label: 'Zwolnienie' }
                }

                const mappedType = typeMap[symbol] || { type: 'nb', label: symbol.toUpperCase() }

                const detail: AbsenceDetail = {
                    id: slotData.id,
                    date: formattedDate,
                    lessonNumber: lessonIdx,
                    time: timeRange,
                    subject: subjectName,
                    teacher: teacherName,
                    type: mappedType.type,
                    typeName: mappedType.label,
                    isUnexcused
                }

                absencesList.push(detail)

                if (!subjectsMap[subjectName]) {
                    subjectsMap[subjectName] = { absent: 0, excused: 0, unexcused: 0, items: [] }
                }

                if (symbol === 'nb' || symbol === 'u' || symbol === 'sl') {
                    subjectsMap[subjectName].absent++
                    if (isUnexcused) {
                        subjectsMap[subjectName].unexcused++
                    } else if (isExcused) {
                        subjectsMap[subjectName].excused++
                    }
                }

                subjectsMap[subjectName].items.push(detail)
            })
        }

        let grandTotalScheduled = 0
        let grandTotalAbsent = 0

        const subjectsResult: SubjectAttendance[] = Object.keys(subjectsMap).map((subName) => {
            const data = subjectsMap[subName]
            const scheduled = Math.max(subjectBaselineLessons[subName] || 0, data.absent)
            grandTotalScheduled += scheduled
            grandTotalAbsent += data.absent

            const present = Math.max(0, scheduled - data.absent)
            const percentage = scheduled > 0 ? Math.round((present / scheduled) * 1000) / 10 : 100

            let status: 'danger' | 'warning' | 'safe' = 'safe'
            if (percentage < 50.0) {
                status = 'danger'
            } else if (percentage < 75.0) {
                status = 'warning'
            }

            return {
                subject: subName,
                totalLessons: scheduled,
                absentLessons: data.absent,
                excusedCount: data.excused,
                unexcusedCount: data.unexcused,
                percentage,
                status,
                absences: data.items
            }
        })

        const grandPresent = Math.max(0, grandTotalScheduled - grandTotalAbsent)
        const overallPercentage =
            grandTotalScheduled > 0
                ? Math.round((grandPresent / grandTotalScheduled) * 1000) / 10
                : 100

        let overallStatus: 'danger' | 'warning' | 'safe' = 'safe'
        if (overallPercentage < 50.0) {
            overallStatus = 'danger'
        } else if (overallPercentage < 75.0) {
            overallStatus = 'warning'
        }

        const safeAbsencesRemaining = Math.max(0, Math.floor(grandPresent - grandTotalScheduled * 0.5))
        const lessonsToRecover =
            overallPercentage < 50.0
                ? Math.max(0, Math.ceil(grandTotalAbsent * 2 - grandTotalScheduled))
                : 0

        const unexcusedAbsences = absencesList.filter((a) => a.isUnexcused)

        if (translate) {
            const textsToTranslate = new Set<string>()
            subjectsResult.forEach((s) => textsToTranslate.add(s.subject))
            absencesList.forEach((a) => {
                textsToTranslate.add(a.subject)
                textsToTranslate.add(a.typeName)
            })

            const translatedMap = await translateBatch(Array.from(textsToTranslate))

            subjectsResult.forEach((s) => {
                if (translatedMap[s.subject]) {
                    s.subject = translatedMap[s.subject]
                }
                s.absences.forEach((a) => {
                    if (translatedMap[a.subject]) {
                        a.subject = translatedMap[a.subject]
                    }
                    if (translatedMap[a.typeName]) {
                        a.typeName = translatedMap[a.typeName]
                    }
                })
            })

            unexcusedAbsences.forEach((a) => {
                if (translatedMap[a.subject]) {
                    a.subject = translatedMap[a.subject]
                }
                if (translatedMap[a.typeName]) {
                    a.typeName = translatedMap[a.typeName]
                }
            })
        }

        return {
            success: true,
            data: {
                overallPercentage,
                overallStatus,
                totalScheduled: grandTotalScheduled,
                totalAbsent: grandTotalAbsent,
                safeAbsencesRemaining,
                lessonsToRecover,
                subjects: subjectsResult,
                unexcusedAbsences
            }
        }
    } catch (error) {
        return {
            success: false,
            error: String(error)
        }
    }
}