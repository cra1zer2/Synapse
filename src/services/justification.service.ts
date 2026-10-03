import Librus from 'librus-api'
import { JustificationPayload, GatewayResponse } from '@/models/justification.model'

export async function fetchJustificationsHistory(
    username: string,
    pass: string,
    dateFrom: string,
    dateTo: string
): Promise<GatewayResponse<any>> {
    try {
        const client = new Librus()
        await client.authorize(username, pass)
        const caller = (client as any)._caller || (client as any).caller

        if (!caller) {
            return { success: false, error: 'Caller not found on Librus client' }
        }

        const url = `https://synergia.librus.pl/gateway/api/2.0/Justifications?dateFrom=${dateFrom}&dateTo=${dateTo}`
        const rawResponse = await caller.get(url)

        let parsed = rawResponse
        if (typeof rawResponse === 'string') {
            try {
                parsed = JSON.parse(rawResponse)
            } catch {
                parsed = rawResponse
            }
        }

        return { success: true, data: parsed }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}

export async function submitJustification(
    username: string,
    pass: string,
    payload: JustificationPayload
): Promise<GatewayResponse<any>> {
    try {
        const client = new Librus()
        await client.authorize(username, pass)
        const caller = (client as any)._caller || (client as any).caller

        if (!caller) {
            return { success: false, error: 'Caller not found on Librus client' }
        }

        const url = 'https://synergia.librus.pl/gateway/api/2.0/Justifications'
        const rawResponse = await caller.post(url, payload)

        let parsed = rawResponse
        if (typeof rawResponse === 'string') {
            try {
                parsed = JSON.parse(rawResponse)
            } catch {
                parsed = rawResponse
            }
        }

        return { success: true, data: parsed }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}