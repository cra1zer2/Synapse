import { AbsenceDetail, SubjectAttendance, AttendanceResult } from '@/models/attendance.model'
import { getAuthenticatedClient } from '@/services/librus.service'
import { translateBatch } from '@/services/translation.service'
import { formatDisplayDate } from '@/utils/date.util'

function resolveWeekdayFromDateStr(dateStr: string): string {
    const lower = dateStr.toLowerCase()
    if (lower.includes('czw') || lower.includes('czwartek')) return 'Thursday'
    if (lower.includes('pt') || lower.includes('piątek') || lower.includes('piatek')) return 'Friday'
    if (lower.includes('śr') || lower.includes('środa') || lower.includes('sroda')) return 'Wednesday'
    if (lower.includes('wt') || lower.includes('wtorek')) return 'Tuesday'
    if (lower.includes('pn') || lower.includes('poniedziałek') || lower.includes('poniedzialek')) return 'Monday'

    const cleaned = dateStr.replace(/\(.*?\)/g, '').trim()
    const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (isoMatch) {
        const d = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10))
        const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        return dayMap[d.getDay()] || ''
    }

    const dotMatch = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
    if (dotMatch) {
        const d = new Date(parseInt(dotMatch[3], 10), parseInt(dotMatch[2], 10) - 1, parseInt(dotMatch[1], 10))
        const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        return dayMap[d.getDay()] || ''
    }

    return ''
}

function normalizeSubjectTitle(rawTitle: string): string {
    if (!rawTitle) return 'Zajęcia szkolne'
    let cleaned = rawTitle.trim()
    cleaned = cleaned.replace(/\s*\(\s*gr\.?\s*[\w\d]+.*?\)/gi, '')
    cleaned = cleaned.replace(/\s*\(\s*\d+\s*\/\s*\d+\s*\)/g, '')
    cleaned = cleaned.replace(/\s*-\s*[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+.*$/g, '')
    cleaned = cleaned.replace(/\s*\[.*?\]/g, '')
    cleaned = cleaned.trim()
    return cleaned.length > 0 ? cleaned : rawTitle.trim()
}

export async function fetchAttendanceMetrics(
    username: string,
    pass: string,
    translate: boolean = false
): Promise<{ success: boolean; data?: AttendanceResult; error?: string }> {
    try {
        const client = await getAuthenticatedClient(username, pass)

        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1

        const [rawAbsences, rawTimetable] = await Promise.all([
            client.absence.getAbsences(),
            client.calendar.getTimetable()
        ])

        const timetableData = rawTimetable?.table || {}
        const absencesList: AbsenceDetail[] = []
        const subjectsMap: Record<string, { realizedCount: number; absent: number; excused: number; unexcused: number; items: AbsenceDetail[] }> = {}

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
            const mappedWeekday = resolveWeekdayFromDateStr(rawDateStr)
            const daySlots = mappedWeekday ? timetableData[mappedWeekday] : []

            if (Array.isArray(daySlots)) {
                daySlots.forEach((slot) => {
                    if (slot && slot.subject) {
                        const normalizedSub = normalizeSubjectTitle(slot.subject)
                        if (!subjectsMap[normalizedSub]) {
                            subjectsMap[normalizedSub] = { realizedCount: 0, absent: 0, excused: 0, unexcused: 0, items: [] }
                        }
                        subjectsMap[normalizedSub].realizedCount++
                    }
                })
            }

            for (let lessonIdx = 0; lessonIdx < dayEntry.table.length; lessonIdx++) {
                const slotData = dayEntry.table[lessonIdx]
                if (!slotData || typeof slotData !== 'object') {
                    continue
                }

                const symbol = String(slotData.type || slotData.symbol || '').trim().toLowerCase()
                if (!symbol) {
                    continue
                }

                const matchedLesson = Array.isArray(daySlots) ? daySlots[lessonIdx] : null
                let rawSubjectName = matchedLesson?.subject || slotData.subject || slotData.name || slotData.title || ''
                let teacherName = matchedLesson?.teacher || slotData.teacher || ''
                const timeRange = matchedLesson?.time || slotData.time || ''

                if ((!rawSubjectName || rawSubjectName.toLowerCase().startsWith('lekcja')) && slotData.id) {
                    try {
                        const detail = await client.absence.getAbsence(slotData.id)
                        if (detail && detail.subject) {
                            rawSubjectName = detail.subject
                            if (detail.teacher) teacherName = detail.teacher
                        }
                    } catch { }
                }

                if (!rawSubjectName || rawSubjectName.toLowerCase().startsWith('lekcja')) {
                    const fallbackCandidate = Array.isArray(daySlots) && daySlots.find((s: any) => s && s.subject)
                    if (fallbackCandidate) {
                        rawSubjectName = fallbackCandidate.subject
                    }
                }

                const subjectName = normalizeSubjectTitle(rawSubjectName || `Zajęcia ${lessonIdx}`)

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
                    subjectsMap[subjectName] = { realizedCount: 1, absent: 0, excused: 0, unexcused: 0, items: [] }
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
            }
        }

        let grandTotalScheduled = 0
        let grandTotalAbsent = 0

        const subjectsResult: SubjectAttendance[] = Object.keys(subjectsMap)
            .filter((subName) => !subName.toLowerCase().startsWith('lekcja '))
            .map((subName) => {
                const data = subjectsMap[subName]
                const totalLessons = Math.max(data.realizedCount, data.absent, 1)
                grandTotalScheduled += totalLessons
                grandTotalAbsent += data.absent

                const present = Math.max(0, totalLessons - data.absent)
                const percentage = totalLessons > 0 ? Math.round((present / totalLessons) * 1000) / 10 : 100

                let status: 'danger' | 'warning' | 'safe' = 'safe'
                if (percentage < 50.0) {
                    status = 'danger'
                } else if (percentage < 75.0) {
                    status = 'warning'
                }

                return {
                    subject: subName,
                    totalLessons,
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