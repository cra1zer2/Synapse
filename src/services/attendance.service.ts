/**
 * Service: Attendance Metrics
 * Aggregates attendance records, lesson catalogs, types, and live justifications from Gateway v2 into subject and journal views.
 * Used by dashboard sync and diagnostics Server Actions.
 */

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
import { translateBatch, resolveTranslateTarget } from '@/services/translation.service'
import { isStudentUsername } from '@/utils/account.util'

export async function fetchAttendanceMetrics(
    username: string,
    pass: string,
    translate: boolean | string = false
): Promise<{ success: boolean; data?: AttendanceResult; error?: string }> {
    const targetCode = resolveTranslateTarget(translate)
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

        type NormalizedAttendanceType = 'nb' | 'u' | 'sl' | 'sp' | 'zw' | 'ob'
        interface AttendanceTypeMeta {
            type: NormalizedAttendanceType
            typeName: string
            isUnexcused: boolean
            isPresence: boolean
            countsAsPresence: boolean
        }

        const typeMap = new Map<number, AttendanceTypeMeta>([
            [1, { type: 'nb', typeName: 'Nieobecność', isUnexcused: true, isPresence: false, countsAsPresence: false }],
            [2, { type: 'sp', typeName: 'Spóźnienie', isUnexcused: false, isPresence: false, countsAsPresence: true }],
            [3, { type: 'u', typeName: 'Nieobecność uspr.', isUnexcused: false, isPresence: false, countsAsPresence: false }],
            [4, { type: 'zw', typeName: 'Zwolnienie', isUnexcused: false, isPresence: false, countsAsPresence: true }],
            [100, { type: 'ob', typeName: 'Obecność', isUnexcused: false, isPresence: true, countsAsPresence: true }]
        ])

        for (const t of rawTypes) {
            const id = Number(t.Id)
            const short = String(t.Short || '').trim().toLowerCase()
            const name = String(t.Name || '').trim().toLowerCase()
            const standardTypeId = t.StandardType?.Id !== undefined ? Number(t.StandardType.Id) : undefined

            let normalizedType: NormalizedAttendanceType = 'nb'
            let isUnexcused = true
            let isPlainPresence = false
            let countsAsPresence = false

            // Check explicit non-presence categories before IsPresenceKind (Librus marks `sp` and `zw` with IsPresenceKind: true)
            // and check `sL` before `sp` because "Spóźnienie powyżej limitu" contains "spóźnienie".
            if (short === 'sl' || name.includes('limit') || name.includes('kwalifikowane')) {
                normalizedType = 'sl'
                isUnexcused = true
                isPlainPresence = false
                countsAsPresence = false
            } else if (short === 'sp' || name.includes('spóźnienie') || name.includes('spoznienie') || standardTypeId === 2) {
                normalizedType = 'sp'
                isUnexcused = false
                isPlainPresence = false
                countsAsPresence = t.IsPresenceKind !== false
            } else if (short === 'zw' || name.includes('zwolnienie') || standardTypeId === 4) {
                normalizedType = 'zw'
                isUnexcused = false
                isPlainPresence = false
                countsAsPresence = t.IsPresenceKind !== false
            } else if (short === 'u' || (name.includes('usprawiedliw') && !name.includes('nieusp')) || standardTypeId === 3) {
                normalizedType = 'u'
                isUnexcused = false
                isPlainPresence = false
                countsAsPresence = false
            } else if (short === 'nb' || short === 'nn' || name.includes('nieobecność') || name.includes('nieobecnosc') || standardTypeId === 1) {
                normalizedType = 'nb'
                isUnexcused = true
                isPlainPresence = false
                countsAsPresence = false
            } else if (
                short === 'ob' ||
                short === 'o' ||
                short === 'on' ||
                name.includes('obecność') ||
                name.includes('obecnosc') ||
                standardTypeId === 100 ||
                t.IsPresenceKind === true
            ) {
                normalizedType = 'ob'
                isUnexcused = false
                isPlainPresence = true
                countsAsPresence = true
            }

            typeMap.set(id, {
                type: normalizedType,
                typeName: t.Name || (normalizedType === 'sl' ? 'sL' : short.toUpperCase()),
                isUnexcused,
                isPresence: isPlainPresence,
                countsAsPresence
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

        const missingLessonIds = Array.from(
            new Set(
                rawAttendances
                    .map((item: any) => (item.Lesson ? Number(item.Lesson.Id) : NaN))
                    .filter((id: number) => !isNaN(id) && !lessonMap.has(id))
            )
        )
        if (missingLessonIds.length > 0) {
            for (let i = 0; i < missingLessonIds.length; i += 25) {
                const chunk = missingLessonIds.slice(i, i + 25)
                const extraLessonsRes = await fetchGatewayEndpoint(
                    username,
                    pass,
                    `gateway/api/2.0/Lessons/${chunk.join(',')}`
                ).catch(() => null)
                const extraLessons = Array.isArray(extraLessonsRes?.Lessons)
                    ? extraLessonsRes.Lessons
                    : extraLessonsRes?.Lesson
                      ? [extraLessonsRes.Lesson]
                      : []
                for (const l of extraLessons) {
                    const lId = Number(l.Id)
                    if (!isNaN(lId)) {
                        lessonMap.set(lId, {
                            subjectId: l.Subject ? Number(l.Subject.Id) : undefined,
                            teacherId: l.Teacher ? Number(l.Teacher.Id) : undefined
                        })
                    }
                }
            }
        }

        const missingSubjectIds = Array.from(
            new Set(
                Array.from(lessonMap.values())
                    .map((info) => info.subjectId)
                    .filter((id): id is number => typeof id === 'number' && !isNaN(id) && !subjectNames.has(id))
            )
        )
        if (missingSubjectIds.length > 0) {
            for (let i = 0; i < missingSubjectIds.length; i += 25) {
                const chunk = missingSubjectIds.slice(i, i + 25)
                const extraSubjectsRes = await fetchGatewayEndpoint(
                    username,
                    pass,
                    `gateway/api/2.0/Subjects/${chunk.join(',')}`
                ).catch(() => null)
                const extraSubjects = Array.isArray(extraSubjectsRes?.Subjects)
                    ? extraSubjectsRes.Subjects
                    : extraSubjectsRes?.Subject
                      ? [extraSubjectsRes.Subject]
                      : []
                for (const s of extraSubjects) {
                    const sId = Number(s.Id ?? s.numericIdentifier)
                    const sName = String(s.Name ?? s.name ?? '').trim()
                    if (!isNaN(sId) && sName) {
                        subjectNames.set(sId, sName)
                    }
                }
            }
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
            const parsedLessonNo =
                item.LessonNo !== undefined && item.LessonNo !== null && item.LessonNo !== ''
                    ? Number(item.LessonNo)
                    : NaN
            const lessonNo = Number.isFinite(parsedLessonNo) ? parsedLessonNo : 1

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
            if (lessonNo >= 0 && lessonNo < lessonRanges.length && lessonRanges[lessonNo]) {
                timeStr = `${lessonRanges[lessonNo].From} - ${lessonRanges[lessonNo].To}`
            }

            const typeId = item.Type ? Number(item.Type.Id) : 1
            const typeInfo: AttendanceTypeMeta = typeMap.get(typeId) || {
                type: 'nb',
                typeName: 'Nieobecność nieusprawiedliwiona',
                isUnexcused: true,
                isPresence: false,
                countsAsPresence: false
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

            if (typeInfo.isPresence) {
                subjectStats[subjectName].presences++
                if (!dayMap[dateStr].lessons[lessonNo]) {
                    dayMap[dateStr].lessons[lessonNo] = {
                        symbol: 'OB',
                        type: 'ob',
                        subject: subjectName,
                        teacher: teacherName || undefined
                    }
                }
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

                if (typeInfo.type === 'u') {
                    subjectStats[subjectName].justified++
                } else if (typeInfo.isUnexcused) {
                    subjectStats[subjectName].unjustified++
                } else if (typeInfo.type === 'sp') {
                    subjectStats[subjectName].lates++
                    if (typeInfo.countsAsPresence) {
                        subjectStats[subjectName].presences++
                    }
                } else if (typeInfo.type === 'zw') {
                    if (typeInfo.countsAsPresence) {
                        subjectStats[subjectName].presences++
                    } else {
                        subjectStats[subjectName].justified++
                    }
                }

                dayMap[dateStr].lessons[lessonNo] = {
                    symbol: typeInfo.type === 'sl' ? 'sL' : (typeInfo.type === 'ob' ? 'NB' : typeInfo.type.toUpperCase()),
                    type: typeInfo.type === 'ob' ? 'nb' : typeInfo.type,
                    subject: subjectName,
                    teacher: teacherName || undefined
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

        const toIsoSort = (d: string) => {
            const m = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
            return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : d
        }

        const subjects: SubjectAttendance[] = Object.entries(subjectStats).map(([subject, stats]) => {
            const totalAbsences = stats.justified + stats.unjustified
            const totalLessons = stats.presences + totalAbsences
            const percentage = totalLessons > 0
                ? Math.round((stats.presences / totalLessons) * 100)
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
                absences: stats.absences.sort((a, b) => toIsoSort(b.date).localeCompare(toIsoSort(a.date)) || a.lessonNumber - b.lessonNumber)
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
        const isStudentAccount = isStudentUsername(username)
        if (!isStudentAccount) {
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
        }

        const unexcusedAbsences = parsedAbsences.filter((a) => {
            if (!a.isUnexcused) return false
            const isoDateKey = a.date.includes('.') ? a.date.split('.').reverse().join('-') : a.date
            const keyWithLesson = `${a.date}_${a.lessonNumber}`
            const isoKeyWithLesson = `${isoDateKey}_${a.lessonNumber}`
            return (
                !liveExcusedSet.has(keyWithLesson) &&
                !liveExcusedSet.has(isoKeyWithLesson) &&
                !liveExcusedSet.has(a.date) &&
                !liveExcusedSet.has(isoDateKey)
            )
        })

        if (targetCode === 'en') {
const enTypeNames: Record<string, string> = {
  nb: 'Unexcused absence',
  u: 'Excused absence',
  sp: 'Late',
  zw: 'Released',
  sl: 'Exempt / Limit',
}
const normalizeEnType = (a: (typeof parsedAbsences)[number]) => {
  if (enTypeNames[a.type]) a.typeName = enTypeNames[a.type]
}
subjects.forEach((s) => s.absences.forEach(normalizeEnType))
parsedAbsences.forEach(normalizeEnType)
unexcusedAbsences.forEach(normalizeEnType)
}
if (targetCode) {
const textsToTranslate = new Set<string>()
            const collectAbsence = (a: (typeof parsedAbsences)[number]) => {
                if (a.subject) textsToTranslate.add(a.subject)
                if (a.typeName && targetCode !== 'en') textsToTranslate.add(a.typeName)
            }

            subjects.forEach((s) => {
                if (s.subject) textsToTranslate.add(s.subject)
                s.absences.forEach(collectAbsence)
            })
            parsedAbsences.forEach(collectAbsence)
            unexcusedAbsences.forEach(collectAbsence)
            sortedDays.forEach((d) => {
                Object.values(d.lessons).forEach((l) => {
                    if (l?.subject) textsToTranslate.add(l.subject)
                })
            })

            const map = await translateBatch(Array.from(textsToTranslate), targetCode)
            const visitedAbsences = new Set<(typeof parsedAbsences)[number]>()

            const applyAbsence = (a: (typeof parsedAbsences)[number]) => {
                if (visitedAbsences.has(a)) return
                visitedAbsences.add(a)
                if (a.subject && map[a.subject]) a.subject = map[a.subject]
                if (a.typeName && map[a.typeName]) a.typeName = map[a.typeName]
            }

            subjects.forEach((s) => {
                if (map[s.subject]) s.subject = map[s.subject]
                s.absences.forEach(applyAbsence)
            })
            unexcusedAbsences.forEach(applyAbsence)
            sortedDays.forEach((d) => {
                Object.values(d.lessons).forEach((l) => {
                    if (l?.subject && map[l.subject]) {
                        l.subject = map[l.subject]
                    }
                })
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
