import Librus from 'librus-api'

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

    const clientInternals = {
        keys: Object.keys(client),
        callerAvailable: Boolean((client as any)._caller || (client as any).caller)
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