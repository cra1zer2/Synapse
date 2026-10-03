import Librus from 'librus-api'
import { JustificationPayload, GatewayResponse } from '@/models/justification.model'
import { extractCookieHeader } from '@/utils/cookie.util'
import { safeUnwrapResponse } from '@/utils/serializer.util'

export async function fetchJustificationsHistory(
    username: string,
    pass: string,
    dateFrom: string,
    dateTo: string
): Promise<GatewayResponse<any>> {
    try {
        const client = new Librus()
        await client.authorize(username, pass)
        const cookieHeader = extractCookieHeader(client)

        const url = `https://synergia.librus.pl/gateway/api/2.0/Justifications?dateFrom=${dateFrom}&dateTo=${dateTo}`

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

export async function submitJustification(
    username: string,
    pass: string,
    payload: JustificationPayload
): Promise<GatewayResponse<any>> {
    try {
        const client = new Librus()
        await client.authorize(username, pass)
        const cookieHeader = extractCookieHeader(client)

        const url = 'https://synergia.librus.pl/gateway/api/2.0/Justifications'

        if (cookieHeader) {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Cookie': cookieHeader,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
                },
                body: JSON.stringify(payload)
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

        const rawResponse = await caller.post(url, payload)
        const data = safeUnwrapResponse(rawResponse)

        return { success: true, data }
    } catch (error) {
        return { success: false, error: String(error) }
    }
}