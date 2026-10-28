'use server'

import { JustificationPayload, GatewayResponse, LiveJustificationItem } from '@/models/justification.model'
import { getNativeLibrusSession, invalidateNativeSession } from '@/services/session.service'

function parsePeriodLessons(str: string): { dates: string[]; lessons: number[] } {
    const dates: string[] = []
    const lessons: number[] = []

    const dateMatches = str.matchAll(/(\d{4}-\d{2}-\d{2})/g)
    for (const m of dateMatches) {
        if (!dates.includes(m[1])) {
            dates.push(m[1])
        }
    }

    const lessonSection = str.match(/lekcj[ae]:?\s*([\d,\s]+)/i)
    if (lessonSection) {
        const nums = lessonSection[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
        lessons.push(...nums)
    }

    return { dates, lessons }
}

export async function fetchLiveJustificationsHistory(
    username: string,
    pass: string,
    statusFilter: '0' | '1' | '2' | '3' = '0',
    dateFrom: string = '',
    dateTo: string = ''
): Promise<{ success: boolean; data: LiveJustificationItem[]; error?: string }> {
    try {
        const cleanUser = String(username || '').trim()
        const cleanPass = String(pass || '').trim()
        if (!cleanUser || !cleanPass || cleanUser.toLowerCase().endsWith('u')) {
            return { success: true, data: [] }
        }
        let session = await getNativeLibrusSession(cleanUser, cleanPass)

        const now = new Date()
        const schoolYearStart = now.getMonth() >= 7 ? `${now.getFullYear()}-09-01` : `${now.getFullYear() - 1}-09-01`
        const schoolYearEnd = now.getMonth() >= 7 ? `${now.getFullYear() + 1}-06-30` : `${now.getFullYear()}-06-30`
        const gwFrom = dateFrom || schoolYearStart
        const gwTo = dateTo || schoolYearEnd
        const gwStatusMap: Record<string, string> = { '1': 'send', '2': 'accept', '3': 'reject' }
        const gwStatusParam = gwStatusMap[statusFilter] ? `&status=${gwStatusMap[statusFilter]}` : ''

        const gwUrl = `https://synergia.librus.pl/gateway/api/2.0/Justifications?dateFrom=${gwFrom}&dateTo=${gwTo}${gwStatusParam}`
        let gwRes = await session.fetch(gwUrl, {
            headers: {
                'Referer': 'https://synergia.librus.pl/gateway/ms/studentdatapanel/ui/',
                'Accept': 'application/json, text/plain, */*'
            }
        })

        if (gwRes.status === 401) {
            invalidateNativeSession(cleanUser)
            session = await getNativeLibrusSession(cleanUser, cleanPass)
            gwRes = await session.fetch(gwUrl, {
                headers: {
                    'Referer': 'https://synergia.librus.pl/gateway/ms/studentdatapanel/ui/',
                    'Accept': 'application/json, text/plain, */*'
                }
            })
        }

        if (gwRes.ok) {
            const gwJson: any = await gwRes.json().catch(() => null)
            if (gwJson && Array.isArray(gwJson.data)) {
                const items: LiveJustificationItem[] = gwJson.data.map((entry: any, idx: number) => {
                    const rawLessons = Array.isArray(entry.lessons) ? entry.lessons : []
                    const lessonNums = Array.from(
                        new Set<number>(rawLessons.map((l: any) => Number(l.number)).filter((n: number) => !isNaN(n)))
                    ).sort((a, b) => a - b)

                    const lessonDates = Array.from(
                        new Set<string>(rawLessons.map((l: any) => String(l.date || '')).filter(Boolean))
                    )
                    const fromStr = String(entry.dateFrom || lessonDates[0] || '')
                    const toStr = String(entry.dateTo || fromStr)
                    const dates = lessonDates.length > 0 ? lessonDates : [fromStr, toStr].filter(Boolean)

                    const dateLabel = fromStr && toStr && fromStr !== toStr ? `${fromStr} - ${toStr}` : fromStr
                    const periodStr = lessonNums.length > 0
                        ? `${dateLabel}, ${lessonNums.length === 1 ? 'lekcja' : 'lekcje'}: ${lessonNums.join(', ')}`
                        : dateLabel

                    const rawSt = String(entry.justificationStatus || '').toLowerCase()
                    let statusCode: 'accepted' | 'pending' | 'rejected' | 'unknown' = 'unknown'
                    let statusRaw = rawSt
                    if (rawSt === 'accept' || rawSt.includes('usprawiedliwione')) {
                        statusCode = 'accepted'
                        statusRaw = 'usprawiedliwione'
                    } else if (rawSt === 'send' || rawSt.includes('wysłane')) {
                        statusCode = 'pending'
                        statusRaw = 'wysłane'
                    } else if (rawSt === 'reject' || rawSt.includes('odrzucone')) {
                        statusCode = 'rejected'
                        statusRaw = 'odrzucone'
                    }

                    const teachers = Array.isArray(entry.notifiedTeachers)
                        ? entry.notifiedTeachers.map((t: any) => String(t?.name || '')).filter(Boolean).join(', ')
                        : ''

                    return {
                        id: `just-${entry.id ?? idx}-${entry.postDate ?? ''}`,
                        periodStr,
                        dates,
                        lessons: lessonNums,
                        count: Number(entry.justifiedAbsences ?? lessonNums.length) || 0,
                        comment: String(entry.messageFromParent || ''),
                        teacher: teachers,
                        sentAt: String(entry.postDate || ''),
                        statusRaw,
                        statusCode
                    }
                })

                return { success: true, data: items }
            }
        }

        const getRes = await session.fetch('https://synergia.librus.pl/eusprawiedliwienia', {
            headers: {
                'Referer': 'https://synergia.librus.pl/rodzic/index',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        })

        if (!getRes.ok) {
            return { success: false, data: [], error: 'Nie udało się otworzyć e-usprawiedliwień' }
        }

        const initialHtml = await getRes.text()
        const keyMatch = initialHtml.match(/name=["']requestkey["'][^>]*value=["']([^"']+)["']/i)
            || initialHtml.match(/value=["']([^"']+)["'][^>]*name=["']requestkey["']/i)
        const requestkey = keyMatch ? keyMatch[1] : ''

        let targetHtml = initialHtml

        if (requestkey) {
            const today = new Date()
            const y = today.getFullYear()
            const m = String(today.getMonth() + 1).padStart(2, '0')
            const d = String(today.getDate()).padStart(2, '0')
            const fallbackTo = `${y}-${m}-${d}`

            const fromDate = new Date()
            fromDate.setDate(fromDate.getDate() - 60)
            const fy = fromDate.getFullYear()
            const fm = String(fromDate.getMonth() + 1).padStart(2, '0')
            const fd = String(fromDate.getDate()).padStart(2, '0')
            const fallbackFrom = `${fy}-${fm}-${fd}`

            const params = new URLSearchParams({
                requestkey,
                usprawiedliwienia_filtr: '1',
                data_od: dateFrom || fallbackFrom,
                data_do: dateTo || fallbackTo,
                status: statusFilter
            })

            const postRes = await session.fetch('https://synergia.librus.pl/eusprawiedliwienia', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Referer': 'https://synergia.librus.pl/eusprawiedliwienia',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                },
                body: params.toString()
            })

            if (postRes.ok) {
                targetHtml = await postRes.text()
            }
        }

        const items: LiveJustificationItem[] = []
        const tableMatch = targetHtml.match(/<table[^>]*class=["'][^"']*decorated stretch[^"']*["'][\s\S]*?<\/table>/i)

        if (tableMatch) {
            const rowMatches = tableMatch[0].matchAll(/<tr[^>]*>([\s\S]*?<\/tr>)/gi)
            let idx = 0
            for (const m of rowMatches) {
                const row = m[1]
                if (row.includes('<th') || row.includes('Brak usprawiedliwień') || row.includes('Okres usprawiedliwienia')) continue

                const cells = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map(c =>
                    c[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                )

                if (cells.length >= 6) {
                    const periodStr = cells[1] || ''
                    const count = parseInt(cells[2] || '0', 10) || 0
                    const comment = cells[3] || ''
                    const teacher = cells[4] || ''
                    const sentAt = cells[5] || ''
                    const statusRaw = cells[6] || ''

                    if (periodStr === 'Okres usprawiedliwienia' || sentAt === 'Data wysłania') continue

                    const statusLower = statusRaw.toLowerCase()
                    let statusCode: 'accepted' | 'pending' | 'rejected' | 'unknown' = 'unknown'

                    if (statusLower.includes('usprawiedliwione') || statusLower.includes('zaakceptowan')) {
                        statusCode = 'accepted'
                    } else if (statusLower.includes('wysłane') || statusLower.includes('oczek')) {
                        statusCode = 'pending'
                    } else if (statusLower.includes('odrzucon')) {
                        statusCode = 'rejected'
                    }

                    const { dates, lessons } = parsePeriodLessons(periodStr)

                    if (periodStr && sentAt) {
                        items.push({
                            id: `just-${idx++}-${sentAt}`,
                            periodStr,
                            dates,
                            lessons,
                            count,
                            comment,
                            teacher,
                            sentAt,
                            statusRaw,
                            statusCode
                        })
                    }
                }
            }
        }

        return { success: true, data: items }
    } catch (error: any) {
        return { success: false, data: [], error: String(error?.message || error) }
    }
}

export async function fetchJustificationsHistory(
    username: string,
    pass: string,
    dateFrom: string,
    dateTo: string
): Promise<GatewayResponse<any>> {
    return await fetchLiveJustificationsHistory(username, pass, '0', dateFrom, dateTo)
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function toIsoDate(raw: string): string {
    const s = String(raw || '').trim()
    if (ISO_DATE_RE.test(s)) return s
    const dotted = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
    if (dotted) return `${dotted[3]}-${dotted[2].padStart(2, '0')}-${dotted[1].padStart(2, '0')}`
    return s
}

function normalizePayload(payload: JustificationPayload): JustificationPayload {
    const dateFrom = toIsoDate(payload.dateFrom)
    const dateTo = toIsoDate(payload.dateTo || payload.dateFrom)
    const lessons = Array.from(new Set((payload.lessons || []).map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0)))
        .sort((a, b) => a - b)
    return {
        dateFrom,
        dateTo,
        messageFromParent: String(payload.messageFromParent ?? ''),
        lessons,
        sendNotify: Boolean(payload.sendNotify)
    }
}

async function postJustificationOnce(session: Awaited<ReturnType<typeof getNativeLibrusSession>>, body: JustificationPayload) {
    const res = await session.fetch('https://synergia.librus.pl/gateway/api/2.0/Justifications', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Referer': 'https://synergia.librus.pl/gateway/ms/studentdatapanel/ui/',
            'Origin': 'https://synergia.librus.pl',
            'Accept': 'application/json, text/plain, */*'
        },
        body: JSON.stringify(body)
    })
    const text = await res.text()
    let data: any = null
    try { data = JSON.parse(text) } catch { data = null }
    return { status: res.status, ok: res.ok, data, text }
}

export async function submitJustification(
    username: string,
    pass: string,
    payload: JustificationPayload
): Promise<GatewayResponse<any>> {
    const cleanUser = String(username || '').trim()
    const cleanPass = String(pass || '').trim()
    const body = normalizePayload(payload)

    if (!ISO_DATE_RE.test(body.dateFrom) || !ISO_DATE_RE.test(body.dateTo)) {
        return { success: false, error: `Nieprawidłowa data: ${payload.dateFrom}` }
    }

    try {
        let session = await getNativeLibrusSession(cleanUser, cleanPass)
        let result = await postJustificationOnce(session, body)

        const looksExpired = result.status === 401 || (!result.data && /<html|loguj/i.test(result.text))
        if (looksExpired) {
            invalidateNativeSession(cleanUser)
            session = await getNativeLibrusSession(cleanUser, cleanPass)
            result = await postJustificationOnce(session, body)
        }

        const { data } = result
        const statusField = String(data?.Status ?? data?.status ?? '').toLowerCase()
        const isSuccess = result.ok && statusField !== 'error' && data?.successful !== false

        const librusMessage = data?.Message || data?.message
        const error = isSuccess
            ? undefined
            : `${librusMessage || 'Błąd wysyłania usprawiedliwienia'} (HTTP ${result.status}${data?.Code ? `, ${data.Code}` : ''})`

        return { success: isSuccess, data, error }
    } catch (error: any) {
        return { success: false, error: String(error?.message || error) }
    }
}
