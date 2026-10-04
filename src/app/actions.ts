'use server'

import Librus from 'librus-api'
import { runFullLibrusDiagnostics, testGatewayRequest } from '@/services/librus.service'
import { fetchJustificationsHistory, submitJustification } from '@/services/justification.service'
import { fetchSmartTimetable } from '@/services/timetable.service'
import { fetchStudentGrades } from '@/services/grade.service'
import { fetchAttendanceMetrics } from '@/services/attendance.service'
import { JustificationPayload } from '@/models/justification.model'
import { StudentProfile } from '@/models/account.model'

export async function executeLibrusDiagnostics(username: string, pass: string) {
    try {
        const results = await runFullLibrusDiagnostics(username, pass)
        return {
            success: true,
            data: results
        }
    } catch (error) {
        return {
            success: false,
            error: String(error)
        }
    }
}

export async function executeGatewayProbe(username: string, pass: string, targetPath: string) {
    try {
        const result = await testGatewayRequest(username, pass, targetPath)
        return result
    } catch (error) {
        return {
            success: false,
            error: String(error)
        }
    }
}

export async function getJustificationsAction(username: string, pass: string, dateFrom: string, dateTo: string) {
    try {
        const result = await fetchJustificationsHistory(username, pass, dateFrom, dateTo)
        return result
    } catch (error) {
        return {
            success: false,
            error: String(error)
        }
    }
}

export async function createJustificationAction(username: string, pass: string, payload: JustificationPayload) {
    try {
        const result = await submitJustification(username, pass, payload)
        return result
    } catch (error) {
        return {
            success: false,
            error: String(error)
        }
    }
}

export async function getSmartTimetableAction(username: string, pass: string, translate: boolean, targetDateIso?: string) {
    try {
        const result = await fetchSmartTimetable(username, pass, translate, targetDateIso)
        return result
    } catch (error) {
        return {
            success: false,
            error: String(error)
        }
    }
}

export async function getStudentGradesAction(username: string, pass: string, translate: boolean) {
    try {
        const result = await fetchStudentGrades(username, pass, translate)
        return result
    } catch (error) {
        return {
            success: false,
            error: String(error)
        }
    }
}

export async function getAttendanceAction(username: string, pass: string, translate: boolean) {
    try {
        const result = await fetchAttendanceMetrics(username, pass, translate)
        return result
    } catch (error) {
        return {
            success: false,
            error: String(error)
        }
    }
}

export async function getStudentProfileAction(username: string, pass: string): Promise<{ success: boolean; data?: StudentProfile; error?: string }> {
    try {
        const client = new Librus()
        await client.authorize(username, pass)

        const [accountInfo, luckyNum] = await Promise.all([
            client.info.getAccountInfo().catch(() => null),
            client.info.getLuckyNumber().catch(() => null)
        ])

        const student = accountInfo?.student || accountInfo?.user || {}
        const fullName = [student.name, student.surname].filter(Boolean).join(' ') || username
        const className = student.class || student.className || 'Klasa Technikum'
        const schoolName = student.school || 'TEB Edukacja'
        const lucky = typeof luckyNum === 'number' ? luckyNum : parseInt(String(luckyNum), 10) || null

        return {
            success: true,
            data: {
                fullName,
                className,
                schoolName,
                luckyNumber: lucky
            }
        }
    } catch (error) {
        return {
            success: false,
            error: String(error)
        }
    }
}