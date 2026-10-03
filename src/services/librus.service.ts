import Librus from 'librus-api'
import { extractCookieHeader } from '@/utils/cookie.util'
import { safeUnwrapResponse } from '@/utils/serializer.util'

export interface DiagnosticResult {
    accountInfo: any
    luckyNumber: any
    timetable: any
    grades: any
    absences: any
    calendar: any
    inbox: any
    announcements: any
    clientInternals: any
}

export async function runFullLibrusDiagnostics(username: string, pass: string): Promise<DiagnosticResult> {
    const client = new Librus()
    await client.authorize(username, pass)

    const fetchSafe = async (fn: () => Promise<any>) => {
        try {
            const data = await fn()
            return { success: true, data }
        } catch (error) {
            return { success: false, error: String(error) }
        }
    }

    const [
        accountInfo,
        luckyNumber,
        timetable,
        grades,
        absences,
        calendar,
        inbox,
        announcements
    ] = await Promise.all([
        fetchSafe(() => client.info.getAccountInfo()),
        fetchSafe(() => client.info.getLuckyNumber()),
        fetchSafe(() => client.calendar.getTimetable()),
        fetchSafe(() => client.info.getGrades()),
        fetchSafe(() => client.absence.getAbsences()),
        fetchSafe(() => client.calendar.getCalendar()),
        fetchSafe(() => client.inbox.listInbox(5)),
        fetchSafe(() => client.inbox.listAnnouncements())
    ])

    const cookieHeader = extractCookieHeader(client)
    const callerInstance = (client as any)._caller || (client as any).caller

    const clientInternals = {
        clientKeys: Object.keys(client),
        callerAvailable: Boolean(callerInstance),
        hasCookies: Boolean(cookieHeader),
        cookieLength: cookieHeader.length
    }

    return {
        accountInfo,
        luckyNumber,
        timetable,
        grades,
        absences,
        calendar,
        inbox,
        announcements,
        clientInternals
    }
}

export async function testGatewayRequest(username: string, pass: string, targetPath: string) {
    try {
        const client = new Librus()
        await client.authorize(username, pass)
        const cookieHeader = extractCookieHeader(client)

        const cleanPath = targetPath.startsWith('/') ? targetPath.slice(1) : targetPath
        const url = `https://synergia.librus.pl/${cleanPath}`

        if (cookieHeader) {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Cookie': cookieHeader,
                    'Accept': 'application/json, text/plain, */*',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
                }
            })

            const text = await response.text()
            let parsedData: any
            try {
                parsedData = JSON.parse(text)
            } catch {
                parsedData = text
            }

            return { success: response.ok, data: parsedData }
        }

        const caller = (client as any)._caller || (client as any).caller
        if (!caller) {
            return { success: false, error: 'Caller not found on Librus client' }
        }

        const rawResponse = await caller.get(url)
        const data = safeUnwrapResponse(rawResponse)

        return { success: true, data }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}