'use server'

import { fetchGatewayEndpoint } from '@/services/gateway.service'
import { fetchJustificationsHistory, submitJustification, fetchLiveJustificationsHistory } from '@/services/justification.service'
import { fetchSmartTimetable } from '@/services/timetable.service'
import { fetchStudentGrades } from '@/services/grade.service'
import { fetchAttendanceMetrics } from '@/services/attendance.service'
import {
    fetchMessagesBundle,
    fetchReceiversOnly,
    fetchUnreadCounters,
    fetchMessageContent,
    sendMessageToUser,
    downloadMessageAttachment
} from '@/services/message.service'
import { JustificationPayload } from '@/models/justification.model'
import { StudentProfile } from '@/models/account.model'
import { MessagesActionResult } from '@/models/message.model'
import { SmartTimetableResult } from '@/models/timetable.model'
import { GradesResult } from '@/models/grade.model'
import { AttendanceResult } from '@/models/attendance.model'

export async function getJustificationsAction(username: string, pass: string, dateFrom: string, dateTo: string) {
    try {
        return await fetchJustificationsHistory(username, pass, dateFrom, dateTo)
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function createJustificationAction(username: string, pass: string, payload: JustificationPayload) {
    try {
        return await submitJustification(username, pass, payload)
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
    serverTimings?: {
        totalMs: number
        timetableMs: number
        gradesMs: number
        attendanceMs: number
    }
    timetable?: { success: boolean; data?: SmartTimetableResult; error?: string }
    grades?: { success: boolean; data?: GradesResult; error?: string }
    attendance?: { success: boolean; data?: AttendanceResult; error?: string }
}> {
    const overallStart = performance.now()
    try {
        const cleanUser = String(username || '').trim()
        const cleanPass = String(pass || '').trim()
        if (!cleanUser || !cleanPass) {
            return { success: false, error: 'Brak danych logowania' }
        }

        let tTimetable = 0
        let tGrades = 0
        let tAttendance = 0

        const [timetableRes, gradesRes, attendanceRes] = await Promise.all([
            (async () => {
                const s = performance.now()
                try {
                    const res = await fetchSmartTimetable(cleanUser, cleanPass, translate, targetDateIso)
                    tTimetable = Math.round(performance.now() - s)
                    return res
                } catch (err: any) {
                    tTimetable = Math.round(performance.now() - s)
                    return {
                        success: false,
                        data: undefined as SmartTimetableResult | undefined,
                        error: String(err?.message || err)
                    }
                }
            })(),
            (async () => {
                const s = performance.now()
                try {
                    const res = await fetchStudentGrades(cleanUser, cleanPass, translate)
                    tGrades = Math.round(performance.now() - s)
                    return res
                } catch (err: any) {
                    tGrades = Math.round(performance.now() - s)
                    return {
                        success: false,
                        data: undefined as GradesResult | undefined,
                        error: String(err?.message || err)
                    }
                }
            })(),
            (async () => {
                const s = performance.now()
                try {
                    const res = await fetchAttendanceMetrics(cleanUser, cleanPass, translate)
                    tAttendance = Math.round(performance.now() - s)
                    return res
                } catch (err: any) {
                    tAttendance = Math.round(performance.now() - s)
                    return {
                        success: false,
                        data: undefined as AttendanceResult | undefined,
                        error: String(err?.message || err)
                    }
                }
            })()
        ])

        const totalMs = Math.round(performance.now() - overallStart)

        return {
            success: true,
            serverTimings: {
                totalMs,
                timetableMs: tTimetable,
                gradesMs: tGrades,
                attendanceMs: tAttendance
            },
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
        return await fetchSmartTimetable(username, pass, translate, targetDateIso)
    } catch (error: any) {
        return { success: false, error: String(error?.message || error) }
    }
}

export async function getStudentGradesAction(username: string, pass: string, translate: boolean) {
    try {
        return await fetchStudentGrades(username, pass, translate)
    } catch (error: any) {
        return { success: false, error: String(error?.message || error) }
    }
}

export async function getAttendanceAction(username: string, pass: string, translate: boolean) {
    try {
        return await fetchAttendanceMetrics(username, pass, translate)
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

        const rawClassNum =
            userInfo.ClassNumber ??
            me.ClassNumber ??
            accountInfo.ClassNumber ??
            userInfo.Number ??
            null
        const classNumber = rawClassNum !== null && !isNaN(Number(rawClassNum)) && Number(rawClassNum) > 0
            ? Number(rawClassNum)
            : null

        const isStudent = cleanUser.toLowerCase().includes('u')
        const role: 'student' | 'parent' = isStudent ? 'student' : 'parent'

        return {
            success: true,
            data: { fullName, className, schoolName, luckyNumber: lucky, classNumber, role }
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

export async function getReceiversAction(username: string, pass: string) {
    try {
        const list = await fetchReceiversOnly(username, pass)
        return { success: true, receivers: list }
    } catch (err: any) {
        return { success: false, receivers: [], error: String(err?.message || err) }
    }
}

export async function readMessageAction(username: string, pass: string, messageId: number, folderId: number = 5) {
    try {
        return await fetchMessageContent(username, pass, messageId, folderId)
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function downloadAttachmentAction(username: string, pass: string, filePath: string, fileName: string) {
    try {
        return await downloadMessageAttachment(username, pass, filePath, fileName)
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function sendMessageAction(username: string, pass: string, receiverId: number | number[], title: string, body: string) {
    try {
        const ids = Array.isArray(receiverId) ? receiverId : [receiverId]
        if (ids.length === 0) {
            return { success: false, error: 'Brak odbiorców' }
        }
        return await sendMessageToUser(username, pass, ids, title, body)
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function getUnreadCountsAction(username: string, pass: string) {
    try {
        return await fetchUnreadCounters(username, pass)
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

export interface DiagnosticItemResult {
    name: string
    category: string
    durationMs: number
    status: 'ok' | 'error'
    error?: string
    details?: string
}

export interface DiagnosticsBundleResult {
    success: boolean
    timestamp: string
    totalDurationMs: number
    items: DiagnosticItemResult[]
    error?: string
}

export async function runDisplayDiagnosticsAction(
    username: string,
    pass: string,
    translate: boolean = false
): Promise<DiagnosticsBundleResult> {
    const cleanUser = String(username || '').trim()
    const cleanPass = String(pass || '').trim()
    if (!cleanUser || !cleanPass) {
        return {
            success: false,
            timestamp: new Date().toISOString(),
            totalDurationMs: 0,
            items: [],
            error: 'Brak danych logowania'
        }
    }

    const overallStart = performance.now()
    const items: DiagnosticItemResult[] = []

    const testStep = async (
        name: string,
        category: string,
        fn: () => Promise<any>,
        extractDetails?: (data: any) => string
    ) => {
        const s = performance.now()
        try {
            const data = await fn()
            const durationMs = Math.round(performance.now() - s)
            const isOk = data && (data.success !== false)
            const errMsg = data?.error ? String(data.error) : undefined
            items.push({
                name,
                category,
                durationMs,
                status: isOk ? 'ok' : 'error',
                error: errMsg,
                details: extractDetails && isOk ? extractDetails(data) : undefined
            })
        } catch (err: any) {
            const durationMs = Math.round(performance.now() - s)
            items.push({
                name,
                category,
                durationMs,
                status: 'error',
                error: String(err?.message || err)
            })
        }
    }

    await testStep(
        'Profil i autoryzacja (Gateway)',
        'profile',
        () => getStudentProfileAction(cleanUser, cleanPass),
        (d) => d.data ? d.data.fullName + ' (' + d.data.className + ')' : 'OK'
    )

    await testStep(
        'Plan lekcji (Timetable)',
        'timetable',
        () => fetchSmartTimetable(cleanUser, cleanPass, translate),
        (d) => d.data?.schedule ? 'Dni: ' + d.data.schedule.length + ', Lekcji: ' + d.data.schedule.reduce((acc: number, cur: any) => acc + (cur.lessons?.length || 0), 0) : 'OK'
    )

    await testStep(
        'Oceny (Grades)',
        'grades',
        () => fetchStudentGrades(cleanUser, cleanPass, translate),
        (d) => d.data?.subjects ? 'Przedmiotów: ' + d.data.subjects.length + ', Średnia: ' + (d.data.overallAverage ?? '—') : 'OK'
    )

    await testStep(
        'Frekwencja (Attendance)',
        'attendance',
        () => fetchAttendanceMetrics(cleanUser, cleanPass, translate),
        (d) => d.data ? 'Obecność: ' + d.data.overallPercentage + '%, Nb: ' + d.data.totalAbsent : 'OK'
    )

    await testStep(
        'Wiadomości i ogłoszenia',
        'messages',
        () => fetchMessagesBundle(cleanUser, cleanPass),
        (d) => 'Wiadomości: ' + (d.messages?.length || 0) + ', Ogłoszenia: ' + (d.announcements?.length || 0)
    )

    await testStep(
        'Statusy usprawiedliwień',
        'justifications',
        () => fetchLiveJustificationsHistory(cleanUser, cleanPass, '0'),
        (d) => 'Wpisów: ' + (d.data?.length || 0)
    )

    const totalDurationMs = Math.round(performance.now() - overallStart)

    return {
        success: true,
        timestamp: new Date().toISOString(),
        totalDurationMs,
        items
    }
}
