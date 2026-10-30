'use server'

import { fetchGatewayEndpoint } from '@/services/gateway.service'
import { fetchJustificationsHistory, submitJustification, fetchLiveJustificationsHistory } from '@/services/justification.service'
import { fetchSmartTimetable } from '@/services/timetable.service'
import { fetchStudentGrades } from '@/services/grade.service'
import { fetchAttendanceMetrics } from '@/services/attendance.service'
import {
    fetchMessagesBundle,
    fetchUnreadCounters,
    fetchMessageContent,
    sendMessageToUser
} from '@/services/message.service'
import { runLibrusBenchmark } from '@/services/benchmark.service'
import { JustificationPayload } from '@/models/justification.model'
import { StudentProfile } from '@/models/account.model'
import { MessagesActionResult } from '@/models/message.model'
import { SmartTimetableResult } from '@/models/timetable.model'
import { GradesResult } from '@/models/grade.model'
import { AttendanceResult } from '@/models/attendance.model'

export async function executeLibrusBenchmarkAction(username: string, pass: string) {
    try {
        const report = await runLibrusBenchmark(username, pass)
        return { success: true, data: report }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function getJustificationsAction(username: string, pass: string, dateFrom: string, dateTo: string) {
    try {
        const result = await fetchJustificationsHistory(username, pass, dateFrom, dateTo)
        return result
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function createJustificationAction(username: string, pass: string, payload: JustificationPayload) {
    try {
        const result = await submitJustification(username, pass, payload)
        return result
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function syncAllUserDataAction(
    username: string,
    pass: string,
    translate: boolean,
    targetDateIso?: string
): Promise<{
    success: boolean
    error?: string
    timetable?: { success: boolean; data?: SmartTimetableResult; error?: string }
    grades?: { success: boolean; data?: GradesResult; error?: string }
    attendance?: { success: boolean; data?: AttendanceResult; error?: string }
}> {
    try {
        const cleanUser = String(username || '').trim()
        const cleanPass = String(pass || '').trim()
        if (!cleanUser || !cleanPass) {
            return { success: false, error: 'Brak danych logowania' }
        }

        

        const [timetableRes, gradesRes, attendanceRes] = await Promise.all([
            fetchSmartTimetable(cleanUser, cleanPass, translate, targetDateIso).catch((err) => ({
                success: false,
                data: undefined as SmartTimetableResult | undefined,
                error: String(err?.message || err)
            })),
            fetchStudentGrades(cleanUser, cleanPass, translate).catch((err) => ({
                success: false,
                data: undefined as GradesResult | undefined,
                error: String(err?.message || err)
            })),
            fetchAttendanceMetrics(cleanUser, cleanPass, translate).catch((err) => ({
                success: false,
                data: undefined as AttendanceResult | undefined,
                error: String(err?.message || err)
            }))
        ])

        return {
            success: true,
            timetable: timetableRes,
            grades: gradesRes,
            attendance: attendanceRes
        }
    } catch (error: any) {
        return {
            success: false,
            error: String(error?.message || error)
        }
    }
}

export async function getSmartTimetableAction(username: string, pass: string, translate: boolean, targetDateIso?: string) {
    try {
        const result = await fetchSmartTimetable(username, pass, translate, targetDateIso)
        return result
    } catch (error: any) {
        return { success: false, error: String(error?.message || error) }
    }
}

export async function getStudentGradesAction(username: string, pass: string, translate: boolean) {
    try {
        const result = await fetchStudentGrades(username, pass, translate)
        return result
    } catch (error: any) {
        return { success: false, error: String(error?.message || error) }
    }
}

export async function getAttendanceAction(username: string, pass: string, translate: boolean) {
    try {
        const result = await fetchAttendanceMetrics(username, pass, translate)
        return result
    } catch (error: any) {
        return { success: false, error: String(error?.message || error) }
    }
}

export async function getStudentProfileAction(username: string, pass: string): Promise<{ success: boolean; data?: StudentProfile; error?: string }> {
    try {
        const cleanUser = String(username || '').trim()
        const cleanPass = String(pass || '').trim()
        if (!cleanUser || !cleanPass) {
            return { success: false, error: 'Wprowadź login i hasło' }
        }

        const meRes = await fetchGatewayEndpoint(cleanUser, cleanPass, 'gateway/api/2.0/Me')
        const luckyRes = await fetchGatewayEndpoint(cleanUser, cleanPass, 'gateway/api/2.0/LuckyNumbers').catch(() => null)

        const me = meRes?.Me || meRes?.data?.Me
        if (!me || typeof me !== 'object') {
            return { success: false, error: 'Nieprawidłowy login lub hasło (brak profilu)' }
        }

        const accountInfo = me.Account || {}
        const userInfo = me.User || {}

        const firstName = userInfo.FirstName || accountInfo.FirstName || ''
        const lastName = userInfo.LastName || accountInfo.LastName || ''
        const full = [firstName, lastName].filter(Boolean).join(' ')
        const fullName = full.length > 0 ? full : (accountInfo.Login || cleanUser)

        const className = me.Class?.Symbol || me.Class?.Name || 'Klasa'
        const schoolName = me.School?.Name || 'Szkoła'

        const rawLucky = luckyRes?.LuckyNumber?.LuckyNumber
        const lucky = typeof rawLucky === 'number' ? rawLucky : null

        const isStudent = cleanUser.toLowerCase().includes('u')
        const role: 'student' | 'parent' = isStudent ? 'student' : 'parent'

        return {
            success: true,
            data: { fullName, className, schoolName, luckyNumber: lucky, role }
        }
    } catch (error: any) {
        const msg = String(error?.message || error)
        const friendly = msg.includes('401') || msg.includes('Błędny') || msg.includes('login')
            ? 'Nieprawidłowy login lub hasło'
            : msg
        return { success: false, error: friendly }
    }
}

export async function getMessagesAndAnnouncementsAction(
    username: string,
    pass: string
): Promise<MessagesActionResult> {
    return fetchMessagesBundle(username, pass)
}

export async function readMessageAction(username: string, pass: string, messageId: number, folderId: number = 5) {
    try {
        const res = await fetchMessageContent(username, pass, messageId, folderId)
        return res
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function sendMessageAction(username: string, pass: string, receiverId: number | number[], title: string, body: string) {
    try {
        const ids = Array.isArray(receiverId) ? receiverId : [receiverId]
        for (const id of ids) {
            const res = await sendMessageToUser(username, pass, id, title, body)
            if (!res.success) return res
        }
        return { success: true }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function getUnreadCountsAction(username: string, pass: string) {
    try {
        const res = await fetchUnreadCounters(username, pass)
        return res
    } catch (error) {
        return { success: false, unreadMessages: 0, announcementsCount: 0, error: String(error) }
    }
}


export async function getLiveJustificationsAction(
    username: string,
    pass: string,
    statusFilter: '0' | '1' | '2' | '3' = '0'
) {
    try {
        return await fetchLiveJustificationsHistory(username, pass, statusFilter)
    } catch (error: any) {
        return { success: false, data: [], error: String(error?.message || error) }
    }
}
