import Librus from 'librus-api'
import { writeFile } from 'fs/promises'
import path from 'path'
import { BenchmarkItem, BenchmarkReport } from '@/models/benchmark.model'

export async function runLibrusBenchmark(username: string, pass: string): Promise<BenchmarkReport> {
    const items: BenchmarkItem[] = []
    const overallStart = performance.now()

    const authStart = performance.now()
    const client = new Librus()
    await client.authorize(username, pass)
    const authorizationDurationMs = Math.round(performance.now() - authStart)

    const measure = async (name: string, fn: () => Promise<any>) => {
        const start = performance.now()
        try {
            const data = await fn()
            const durationMs = Math.round(performance.now() - start)
            const jsonString = JSON.stringify(data ?? {})
            const payloadBytes = Buffer.byteLength(jsonString, 'utf8')
            items.push({
                endpoint: name,
                durationMs,
                success: true,
                payloadBytes
            })
        } catch (error) {
            const durationMs = Math.round(performance.now() - start)
            items.push({
                endpoint: name,
                durationMs,
                success: false,
                payloadBytes: 0,
                error: String(error)
            })
        }
    }

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    await measure('info.getAccountInfo', () => client.info.getAccountInfo())
    await measure('info.getLuckyNumber', () => client.info.getLuckyNumber())
    await measure('calendar.getTimetable', () => client.calendar.getTimetable())
    await measure('info.getGrades', () => client.info.getGrades())
    await measure('absence.getAbsences', () => client.absence.getAbsences())
    await measure('calendar.getCalendar', () => client.calendar.getCalendar(currentMonth, currentYear))
    await measure('inbox.listInbox', () => client.inbox.listInbox(5))
    await measure('inbox.listAnnouncements', () => client.inbox.listAnnouncements())
    await measure('inbox.listReceivers', () => client.inbox.listReceivers())

    const totalDurationMs = Math.round(performance.now() - overallStart)

    const successfulItems = items.filter((i) => i.success)
    const sortedByDuration = [...successfulItems].sort((a, b) => b.durationMs - a.durationMs)

    const slowestEndpoint = sortedByDuration.length > 0
        ? `${sortedByDuration[0].endpoint} (${sortedByDuration[0].durationMs} ms)`
        : 'N/A'

    const fastestEndpoint = sortedByDuration.length > 0
        ? `${sortedByDuration[sortedByDuration.length - 1].endpoint} (${sortedByDuration[sortedByDuration.length - 1].durationMs} ms)`
        : 'N/A'

    const report: BenchmarkReport = {
        timestamp: new Date().toISOString(),
        authorizationDurationMs,
        totalDurationMs,
        slowestEndpoint,
        fastestEndpoint,
        items
    }

    const reportPath = path.join(process.cwd(), 'benchmark-report.json')
    await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8')

    return report
}