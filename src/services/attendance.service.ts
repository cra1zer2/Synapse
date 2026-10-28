'use server'

import { 
    AttendanceResult, 
    SubjectAttendance, 
    AbsenceDetail, 
    LegacyAttendanceDay, 
    LegacyAttendanceSummary 
} from '@/models/attendance.model'
import { fetchGatewayEndpoint } from '@/services/gateway.service'
import { fetchLiveJustificationsHistory } from '@/services/justification.service'
import { translateBatch } from '@/services/translation.service'

export async function fetchAttendanceMetrics(
    username: string,
    pass: string,
    translate: boolean = false
): Promise<{ success: boolean; data?: AttendanceResult; error?: string }> {
    try {
        const [
            allAttendancesRes,
            typesRes,
            lessonsRes,
            subjectsRes,
            usersRes,
            schoolsRes
        ] = await Promise.all([
            fetchGatewayEndpoint(username, pass, 'gateway/api/2.0/Attendances').catch(() => null),
            fetchGatewayEndpoint(username, pass, 'gateway/api/2.0/Attendances/Types').catch(() => null),
            fetchGatewayEndpoint(username, pass, 'gateway/api/2.0/Lessons').catch(() => null),
            fetchGatewayEndpoint(username, pass, 'gateway/api/2.0/Auth/Subjects').catch(() => null),
            fetchGatewayEndpoint(username, pass, 'gateway/api/2.0/Users').catch(() => null),
            fetchGatewayEndpoint(username, pass, 'gateway/api/2.0/Schools').catch(() => null)
        ])

        if (!allAttendancesRes || typeof allAttendancesRes === 'string') {
            return { success: false, error: 'Nie udało się pobrać frekwencji z serwera Librus' }
        }

        const rawAttendances = Array.isArray(allAttendancesRes?.Attendances) ? allAttendancesRes.Attendances : []
        const rawTypes = Array.isArray(typesRes?.Types) ? typesRes.Types : []
        const rawLessons = Array.isArray(lessonsRes?.Lessons) ? lessonsRes.Lessons : []
        const rawSubjects = Array.isArray(subjectsRes?.data) ? subjectsRes.data : Array.isArray(subjectsRes?.Subjects) ? subjectsRes.Subjects : []
        const rawUsers = Array.isArray(usersRes?.Users) ? usersRes.Users : []
        const lessonRanges = Array.isArray(schoolsRes?.School?.LessonsRange) ? schoolsRes.School.LessonsRange : []

        const typeMap = new Map<number, { type: 'nb' | 'u' | 'sl' | 'sp' | 'zw' | 'ob'; typeName: string; isUnexcused: boolean; isPresence: boolean }>()
        for (const t of rawTypes) {
            const id = Number(t.Id)
            const short = String(t.Short || '').trim().toLowerCase()
            const name = String(t.Name || '').trim().toLowerCase()

            const isPresence = Boolean(
                t.IsPresenceKind === true || 
                short === 'ob' || 
                short === 'o' || 
                name === 'obecność' || 
                name === 'obecnosc'
            )

            let normalizedType: 'nb' | 'u' | 'sl' | 'sp' | 'zw' | 'ob' = 'nb'
            let isUnexcused = false

            if (isPresence) {
                normalizedType = 'ob'
                isUnexcused = false
            } else if (short === 'u' || (name.includes('usprawiedliw') && !name.includes('nieusprawiedliw'))) {
                normalizedType = 'u'
                isUnexcused = false
            } else if (short === 'sp' || name.includes('spóźnienie') || name.includes('spoznienie')) {
                normalizedType = 'sp'
                isUnexcused = false
            } else if (short === 'zw' || name.includes('zwolnienie')) {
                normalizedType = 'zw'
                isUnexcused = false
            } else if (short === 'sl' || name.includes('limit') || name.includes('kwalifikowane')) {
                normalizedType = 'sl'
                isUnexcused = true
            } else {
                normalizedType = 'nb'
                isUnexcused = true
            }

            typeMap.set(id, { 
                type: normalizedType, 
                typeName: t.Name || (normalizedType === 'sl' ? 'sL' : short.toUpperCase()), 
                isUnexcused, 
                isPresence 
            })
        }

        const subjectNames = new Map<number, string>()
        for (const s of rawSubjects) {
            const sId = Number(s.numericIdentifier ?? s.Id)
            const sName = String(s.name ?? s.Name ?? '').trim()
            if (!isNaN(sId) && sName) {
                subjectNames.set(sId, sName)
            }
        }

        const lessonMap = new Map<number, { subjectId?: number; teacherId?: number }>()
        for (const l of rawLessons) {
            const lId = Number(l.Id)
            lessonMap.set(lId, {
                subjectId: l.Subject ? Number(l.Subject.Id) : undefined,
                teacherId: l.Teacher ? Number(l.Teacher.Id) : undefined
            })
        }

        const userNames = new Map<number, string>()
        for (const u of rawUsers) {
            const uId = Number(u.Id)
            const first = String(u.FirstName || '').trim()
            const last = String(u.LastName || '').trim()
            const full = [first, last].filter(Boolean).join(' ')
            if (full) {
                userNames.set(uId, full)
            }
        }

        const parsedAbsences: AbsenceDetail[] = []
        const subjectStats: Record<string, {
            presences: number
            justified: number
            unjustified: number
            lates: number
            earlyLeaves: number
            absences: AbsenceDetail[]
        }> = {}

        const dayMap: Record<string, LegacyAttendanceDay> = {}

        for (const item of rawAttendances) {
            const dateStr = String(item.Date || '').trim()
            if (!dateStr) continue

            const isoDate = dateStr.includes('.') ? dateStr.split('.').reverse().join('-') : dateStr
            const lessonNo = Number(item.LessonNo || 1)

            const lessonId = item.Lesson ? Number(item.Lesson.Id) : undefined
            const lessonInfo = lessonId ? lessonMap.get(lessonId) : undefined

            let subjectName = 'Zajęcia szkolne'
            if (lessonInfo?.subjectId && subjectNames.has(lessonInfo.subjectId)) {
                subjectName = subjectNames.get(lessonInfo.subjectId)!
            }

            let teacherName = ''
            const teacherId = lessonInfo?.teacherId || (item.AddedBy ? Number(item.AddedBy.Id) : undefined)
            if (teacherId && userNames.has(teacherId)) {
                teacherName = userNames.get(teacherId)!
            }

            let timeStr = ''
            const rangeIndex = lessonNo - 1
            if (rangeIndex >= 0 && rangeIndex < lessonRanges.length) {
                timeStr = `${lessonRanges[rangeIndex].From} - ${lessonRanges[rangeIndex].To}`
            }

            const typeId = item.Type ? Number(item.Type.Id) : 1
            const typeInfo = typeMap.get(typeId) || {
                type: 'nb' as const,
                typeName: 'Nieobecność nieusprawiedliwiona',
                isUnexcused: true,
                isPresence: false
            }

            if (!subjectStats[subjectName]) {
                subjectStats[subjectName] = {
                    presences: 0,
                    justified: 0,
                    unjustified: 0,
                    lates: 0,
                    earlyLeaves: 0,
                    absences: []
                }
            }

            if (typeInfo.isPresence) {
                subjectStats[subjectName].presences++
            } else {
                const detail: AbsenceDetail = {
                    id: item.Id || `${isoDate}-${lessonNo}`,
                    date: dateStr,
                    lessonNumber: lessonNo,
                    time: timeStr,
                    subject: subjectName,
                    teacher: teacherName,
                    type: typeInfo.type === 'ob' ? 'nb' : typeInfo.type,
                    typeName: typeInfo.typeName,
                    isUnexcused: typeInfo.isUnexcused
                }

                parsedAbsences.push(detail)
                subjectStats[subjectName].absences.push(detail)

                if (typeInfo.type === 'u' || typeInfo.type === 'zw') {
                    subjectStats[subjectName].justified++
                } else if (typeInfo.isUnexcused) {
                    subjectStats[subjectName].unjustified++
                } else if (typeInfo.type === 'sp') {
                    subjectStats[subjectName].lates++
                }

                if (!dayMap[dateStr]) {
                    dayMap[dateStr] = {
                        date: dateStr,
                        isoDate,
                        weekday: '',
                        lessons: {},
                        uCount: 0,
                        nuCount: 0,
                        totalCount: 0,
                        spCount: 0,
                        zwCount: 0,
                        slCount: 0
                    }
                }

                dayMap[dateStr].lessons[lessonNo] = {
                    symbol: typeInfo.type === 'sl' ? 'sL' : (typeInfo.type === 'ob' ? 'NB' : typeInfo.type.toUpperCase()),
                    type: typeInfo.type === 'ob' ? 'nb' : typeInfo.type
                }

                if (typeInfo.type === 'sl') {
                    dayMap[dateStr].slCount++
                    dayMap[dateStr].nuCount++
                    dayMap[dateStr].totalCount++
                } else if (typeInfo.isUnexcused) {
                    dayMap[dateStr].nuCount++
                    dayMap[dateStr].totalCount++
                } else if (typeInfo.type === 'u') {
                    dayMap[dateStr].uCount++
                    dayMap[dateStr].totalCount++
                } else if (typeInfo.type === 'sp') {
                    dayMap[dateStr].spCount++
                } else if (typeInfo.type === 'zw') {
                    dayMap[dateStr].zwCount++
                }
            }
        }

        const subjects: SubjectAttendance[] = Object.entries(subjectStats).map(([subject, stats]) => {
            const totalAbsences = stats.justified + stats.unjustified
            const totalLessons = stats.presences + totalAbsences
            const percentage = totalLessons > 0 
                ? Math.floor((stats.presences / totalLessons) * 100) 
                : 100

            const status: 'danger' | 'warning' | 'safe' = percentage < 50 ? 'danger' : percentage < 75 ? 'warning' : 'safe'

            return {
                subject,
                totalLessons,
                absentLessons: totalAbsences,
                excusedCount: stats.justified,
                unexcusedCount: stats.unjustified,
                percentage,
                status,
                absences: stats.absences.sort((a, b) => b.date.localeCompare(a.date) || a.lessonNumber - b.lessonNumber)
            }
        })

        const totalPresences = subjects.reduce((sum, s) => sum + Math.max(s.totalLessons - s.absentLessons, 0), 0)
        const totalScheduled = subjects.reduce((sum, s) => sum + s.totalLessons, 0)
        const totalAbsent = subjects.reduce((sum, s) => sum + s.absentLessons, 0)

        const overallPercentage = totalScheduled > 0 
            ? Math.round((totalPresences / totalScheduled) * 100) 
            : 100

        const overallStatus: 'danger' | 'warning' | 'safe' = overallPercentage < 50 ? 'danger' : overallPercentage < 75 ? 'warning' : 'safe'

        const sortedDays = Object.values(dayMap).sort((a, b) => b.isoDate.localeCompare(a.isoDate))
        const summary: LegacyAttendanceSummary = {
            u: sortedDays.reduce((acc, d) => acc + d.uCount, 0),
            nu: sortedDays.reduce((acc, d) => acc + d.nuCount, 0),
            total: sortedDays.reduce((acc, d) => acc + d.totalCount, 0),
            sp: sortedDays.reduce((acc, d) => acc + d.spCount, 0),
            zw: sortedDays.reduce((acc, d) => acc + d.zwCount, 0),
            sl: sortedDays.reduce((acc, d) => acc + (d.slCount || 0), 0)
        }

        let liveExcusedSet = new Set<string>()
        try {
            const liveRes = await fetchLiveJustificationsHistory(username, pass, '0')
            if (liveRes.success && liveRes.data) {
                for (const item of liveRes.data) {
                    if (item.statusCode === 'accepted' || item.statusCode === 'pending') {
                        for (const d of item.dates) {
                            if (item.lessons.length > 0) {
                                for (const l of item.lessons) {
                                    liveExcusedSet.add(`${d}_${l}`)
                                }
                            } else {
                                liveExcusedSet.add(d)
                            }
                        }
                    }
                }
            }
        } catch {}

        const unexcusedAbsences = parsedAbsences.filter((a) => {
            if (!a.isUnexcused) return false
            const keyWithLesson = `${a.date}_${a.lessonNumber}`
            const isoKeyWithLesson = a.date.includes('.') ? `${a.date.split('.').reverse().join('-')}_${a.lessonNumber}` : keyWithLesson
            return !liveExcusedSet.has(keyWithLesson) && !liveExcusedSet.has(isoKeyWithLesson)
        })

        if (translate) {
            const textsToTranslate = new Set<string>()
            subjects.forEach((s) => textsToTranslate.add(s.subject))
            parsedAbsences.forEach((a) => textsToTranslate.add(a.subject))
            const map = await translateBatch(Array.from(textsToTranslate))

            subjects.forEach((s) => {
                if (map[s.subject]) s.subject = map[s.subject]
                s.absences.forEach((a) => {
                    if (map[a.subject]) a.subject = map[a.subject]
                })
            })
            unexcusedAbsences.forEach((a) => {
                if (map[a.subject]) a.subject = map[a.subject]
            })
        }

        const result: AttendanceResult = {
            overallPercentage,
            overallStatus,
            totalScheduled,
            totalAbsent,
            safeAbsencesRemaining: Math.max(Math.floor(totalScheduled * 0.5) - totalAbsent, 0),
            lessonsToRecover: overallPercentage < 50 ? Math.ceil((totalAbsent * 2) - totalScheduled) : 0,
            subjects: subjects.filter(s => s.totalLessons > 0 || s.absentLessons > 0),
            unexcusedAbsences,
            legacyTable: {
                summary,
                days: sortedDays
            }
        }

        return { success: true, data: result }
    } catch (error: any) {
        return { success: false, error: String(error?.message || error) }
    }
}
