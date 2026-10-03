import Librus from 'librus-api'
import { AttendanceStats, SubjectAttendance, AttendanceResult } from '@/models/attendance.model'

export async function fetchAttendanceMetrics(
    username: string,
    pass: string
): Promise<{ success: boolean; data?: AttendanceResult; error?: string }> {
    try {
        const client = new Librus()
        await client.authorize(username, pass)

        const rawAbsences = await client.absence.getAbsences()
        const subjectsMap: Record<string, { total: number; absent: number }> = {}

        let excused = 0
        let unexcused = 0
        let lateness = 0
        let latenessOverLimit = 0

        const scanAbsenceEntry = (entry: any) => {
            if (!entry || typeof entry !== 'object') {
                return
            }

            const type = String(entry.type || entry.symbol || '').trim().toLowerCase()
            const subject = (entry.subject || 'All Subjects').trim()

            if (!subjectsMap[subject]) {
                subjectsMap[subject] = { total: 0, absent: 0 }
            }

            subjectsMap[subject].total++

            if (type === 'nb') {
                unexcused++
                subjectsMap[subject].absent++
            } else if (type === 'u') {
                excused++
                subjectsMap[subject].absent++
            } else if (type === 'sl') {
                latenessOverLimit++
                unexcused++
                subjectsMap[subject].absent++
            } else if (type === 'sp') {
                lateness++
            }
        }

        const traverseObject = (obj: any) => {
            if (!obj) {
                return
            }
            if (Array.isArray(obj)) {
                for (const item of obj) {
                    traverseObject(item)
                }
            } else if (typeof obj === 'object') {
                if ('type' in obj || 'symbol' in obj) {
                    scanAbsenceEntry(obj)
                } else {
                    for (const key of Object.keys(obj)) {
                        traverseObject(obj[key])
                    }
                }
            }
        }

        traverseObject(rawAbsences)

        const totalAbsences = excused + unexcused
        const estimatedCompletedLessons = Math.max(totalAbsences + 20, 50)
        const presences = Math.max(0, estimatedCompletedLessons - totalAbsences)
        const attendancePercentage =
            estimatedCompletedLessons > 0
                ? Math.round((presences / estimatedCompletedLessons) * 1000) / 10
                : 100

        const isAtRisk = attendancePercentage < 50.0

        const safeAbsencesRemaining = Math.max(0, Math.floor(presences - estimatedCompletedLessons * 0.5))
        const lessonsToRecover = isAtRisk
            ? Math.max(0, Math.ceil(totalAbsences * 2 - estimatedCompletedLessons))
            : 0

        const overallStats: AttendanceStats = {
            totalLessons: estimatedCompletedLessons,
            presences,
            absences: totalAbsences,
            excused,
            unexcused,
            lateness,
            latenessOverLimit,
            attendancePercentage,
            isAtRisk,
            safeAbsencesRemaining,
            lessonsToRecover
        }

        const subjectsList: SubjectAttendance[] = Object.keys(subjectsMap).map((subName) => {
            const data = subjectsMap[subName]
            const subTotal = Math.max(data.total, data.absent + 5)
            const subPresences = Math.max(0, subTotal - data.absent)
            const pct = Math.round((subPresences / subTotal) * 1000) / 10

            return {
                subject: subName,
                totalLessons: subTotal,
                absentLessons: data.absent,
                percentage: pct,
                isAtRisk: pct < 50.0
            }
        })

        return {
            success: true,
            data: {
                overall: overallStats,
                subjects: subjectsList
            }
        }
    } catch (error) {
        return {
            success: false,
            error: String(error)
        }
    }
}