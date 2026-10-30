import * as cheerio from 'cheerio'
import { MessageItem, AnnouncementItem, ReceiverItem, MessagesActionResult } from '@/models/message.model'
import { getNativeLibrusSession, invalidateNativeSession, NativeLibrusSession } from '@/services/session.service'
import { getAuthenticatedClient, invalidateClientSession } from '@/services/librus.service'

function getDefaultReferer(username: string): string {
    return String(username || '').trim().toLowerCase().endsWith('u')
        ? 'https://synergia.librus.pl/uczen/index'
        : 'https://synergia.librus.pl/rodzic/index'
}

function isLoggedOutHtml(html: string): boolean {
    if (!html) return true
    if (
        html.includes('OAuth/Authorization') ||
        html.includes('form-login') ||
        html.includes('Sesja wygasła') ||
        html.includes('Brak dostępu')
    ) {
        return true
    }
    if (html.includes('Przekierowanie') && html.includes('loguj')) return true

    const hasSynergiaLayout =
        html.includes('container-message') ||
        html.includes('container-background') ||
        html.includes('decorated') ||
        html.includes('Wyloguj')

    return !hasSynergiaLayout
}

function tryDecodeBase64Content(raw: string): string {
    const trimmed = raw.trim()
    if (!trimmed) return ''

    const cdataMatch = trimmed.match(/<!\[CDATA\[([\s\S]*?)\]\]>/i)
    const candidate = (cdataMatch ? cdataMatch[1] : trimmed).replace(/\s+/g, '')

    if (
        candidate.length >= 16 &&
        candidate.length % 4 === 0 &&
        /^[A-Za-z0-9+/]+={0,2}$/.test(candidate) &&
        !trimmed.includes(' ')
    ) {
        try {
            const decoded = Buffer.from(candidate, 'base64').toString('utf-8')
            if (decoded && !decoded.includes('\uFFFD')) {
                const $ = cheerio.load(decoded)
                $('br').replaceWith('\n')
                return $.text().replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() || decoded.trim()
            }
        } catch {}
    }

    return trimmed
}

async function fetchHtmlWithRetry(
    cleanUser: string,
    cleanPass: string,
    url: string,
    referer?: string
): Promise<{ session: NativeLibrusSession; html: string; ok: boolean }> {
    const effectiveReferer = referer || getDefaultReferer(cleanUser)
    let session = await getNativeLibrusSession(cleanUser, cleanPass)
    let res = await session.fetch(url, {
        headers: {
            'Referer': effectiveReferer,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
    })

    let html = res.ok ? await res.text() : ''
    if (!res.ok || res.status === 401 || isLoggedOutHtml(html)) {
        invalidateNativeSession(cleanUser)
        session = await getNativeLibrusSession(cleanUser, cleanPass)
        res = await session.fetch(url, {
            headers: {
                'Referer': effectiveReferer,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        })
        html = res.ok ? await res.text() : ''
    }

    return { session, html, ok: res.ok && !isLoggedOutHtml(html) }
}

function parseInboxHtml(html: string): MessageItem[] {
    const messages: MessageItem[] = []
    if (!html) return messages

    const $ = cheerio.load(html)
    let rows = $('table.container-message table.decorated.stretch tbody tr')
    if (rows.length === 0) {
        rows = $('table.decorated.stretch tbody tr')
    }

    rows.each((idx, row) => {
        const children = $(row).children('td')
        if (children.length < 5) return

        const rowText = $(row).text().trim()
        if (rowText.includes('Brak wiadomości')) return

        const linkHref =
            $(children[3]).find('a').attr('href') ||
            $(children[2]).find('a').attr('href') ||
            $(row).find('a[href*="wiadomosci"]').attr('href') ||
            ''

        let id = 0
        if (linkHref) {
            const explicitMatch = linkHref.match(/\/?wiadomosci\/\d+\/\d+\/(\d+)/i)
            if (explicitMatch) {
                id = Number(explicitMatch[1])
            } else {
                const parts = linkHref.split('/').filter(Boolean)
                const candidate = Number(parts[3] || parts[parts.length - 1])
                if (!isNaN(candidate) && candidate > 0) {
                    id = candidate
                }
            }
        }

        if (!id) {
            const checkboxVal = $(row).find('input[type="checkbox"]').attr('value')
            if (checkboxVal && !isNaN(Number(checkboxVal))) {
                id = Number(checkboxVal)
            }
        }

        const sender = $(children[2]).text().replace(/\s+/g, ' ').trim()
        const subject = $(children[3]).text().replace(/\s+/g, ' ').trim()
        const date = $(children[4]).text().replace(/\s+/g, ' ').trim()

        if (!id && !subject) return

        const style2 = ($(children[2]).attr('style') || '').toLowerCase()
        const style3 = ($(children[3]).attr('style') || '').toLowerCase()
        const isRead = !style2.includes('bold') && !style3.includes('bold')
        const hasAttachments = $(children[1]).find('img').length > 0

        messages.push({
            id: id || idx + 1,
            sender: sender || 'Nauczyciel',
            subject: subject || 'Wiadomość',
            date,
            isRead,
            hasAttachments,
            folder: 'inbox'
        })
    })

    messages.sort((a, b) => {
        const timeA = new Date(a.date.replace(' ', 'T')).getTime() || 0
        const timeB = new Date(b.date.replace(' ', 'T')).getTime() || 0
        if (timeB !== timeA) return timeB - timeA
        return Number(b.id) - Number(a.id)
    })

    return messages
}

function parseSentMessagesHtml(html: string): MessageItem[] {
    const messages: MessageItem[] = []
    if (!html) return messages

    const $ = cheerio.load(html)
    let rows = $('table.container-message table.decorated.stretch tbody tr')
    if (rows.length === 0) {
        rows = $('table.decorated.stretch tbody tr')
    }
    if (rows.length === 0) {
        rows = $('table.decorated tbody tr')
    }

    rows.each((idx, row) => {
        const children = $(row).children('td')
        if (children.length < 5) return

        const rowText = $(row).text().trim()
        if (rowText.includes('Brak wiadomości') || rowText.includes('Więcej poleceń')) return

        const linkHref =
            $(children[3]).find('a').attr('href') ||
            $(children[2]).find('a').attr('href') ||
            $(row).find('a[href*="wiadomosci"]').attr('href') ||
            ''

        let id = 0
        if (linkHref) {
            const explicitMatch = linkHref.match(/\/?wiadomosci\/\d+\/\d+\/(\d+)/i)
            if (explicitMatch) {
                id = Number(explicitMatch[1])
            } else {
                const parts = linkHref.split('/').filter(Boolean)
                const candidate = Number(parts[3] || parts[parts.length - 1])
                if (!isNaN(candidate) && candidate > 0) {
                    id = candidate
                }
            }
        }

        if (!id) {
            const checkboxVal = $(row).find('input[type="checkbox"]').attr('value')
            if (checkboxVal && !isNaN(Number(checkboxVal))) {
                id = Number(checkboxVal)
            }
        }

        const sender = $(children[2]).text().replace(/\s+/g, ' ').trim()
        const subject = $(children[3]).text().replace(/\s+/g, ' ').trim()
        const date = $(children[4]).text().replace(/\s+/g, ' ').trim()
        const readStatusText = $(children[5]).text().replace(/\s+/g, ' ').trim().toLowerCase()

        if (!id && !subject) return
        if (sender.includes('Adresat') || subject.includes('Temat') || date.includes('Wysłano')) return

        const isRead = readStatusText.includes('tak')
        const hasAttachments = $(children[1]).find('img').length > 0

        messages.push({
            id: id || idx + 1,
            sender: sender || 'Nauczyciel',
            subject: subject || 'Wiadomość',
            date,
            isRead,
            hasAttachments,
            folder: 'sent'
        })
    })

    messages.sort((a, b) => {
        const timeA = new Date(a.date.replace(' ', 'T')).getTime() || 0
        const timeB = new Date(b.date.replace(' ', 'T')).getTime() || 0
        if (timeB !== timeA) return timeB - timeA
        return Number(b.id) - Number(a.id)
    })

    return messages
}

function parseAnnouncementsHtml(html: string): AnnouncementItem[] {
    const announcements: AnnouncementItem[] = []
    if (!html) return announcements

    const $ = cheerio.load(html)
    let tables = $('div#body div.container-background table.decorated')
    if (tables.length === 0) {
        tables = $('table.decorated')
    }

    let aIdx = 0
    tables.each((_, table) => {
        const title = $(table).find('thead').text().replace(/\s+/g, ' ').trim()
        const cols = $(table).find('td')
        if (!title || cols.length < 4) return

        const author = $(cols[1]).text().replace(/\s+/g, ' ').trim() || 'Dyrekcja'
        const date = $(cols[2]).text().replace(/\s+/g, ' ').trim() || ''

        const contentCell = $(cols[3]).clone()
        contentCell.find('br').replaceWith('\n')
        const rawContent = contentCell.text().replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
        const content = tryDecodeBase64Content(rawContent)

        if (content || title) {
            announcements.push({
                id: ++aIdx,
                author,
                title,
                date,
                content
            })
        }
    })

    announcements.sort((a, b) => {
        const timeA = new Date(a.date.replace(' ', 'T')).getTime() || 0
        const timeB = new Date(b.date.replace(' ', 'T')).getTime() || 0
        if (timeB !== timeA) return timeB - timeA
        return Number(b.id) - Number(a.id)
    })

    return announcements
}

function parseRecipientsHtml(html: string, groupName: string): ReceiverItem[] {
    const list: ReceiverItem[] = []
    if (!html) return list

    const $ = cheerio.load(html)
    $("table.message-recipients-detail tr[class*='line'], tr").each((_, row) => {
        const $row = $(row)
        const rawVal =
            $row.find("input[name='DoKogo[]']").attr('value') ||
            $row.find("input[type='checkbox']").attr('value') ||
            ''
        const id = parseInt(rawVal, 10)
        const name = $row.find('label').text().replace(/\s+/g, ' ').trim()
        if (id && name && !list.some((x) => x.id === id)) {
            list.push({ id, name, group: groupName })
        }
    })

    if (list.length === 0) {
        const inputMatches = html.matchAll(/<input[^>]*value="(\d+)"[^>]*>\s*([^<\n\r]+)/gi)
        for (const m of inputMatches) {
            const id = Number(m[1])
            const name = m[2].trim()
            if (id && name && !list.some((x) => x.id === id)) {
                list.push({ id, name, group: groupName })
            }
        }
    }

    return list
}

async function fetchReceiversList(session: NativeLibrusSession): Promise<ReceiverItem[]> {
    const receiversList: ReceiverItem[] = []
    try {
        const composeRes = await session.fetch('https://synergia.librus.pl/wiadomosci/2/5', {
            headers: {
                'Referer': 'https://synergia.librus.pl/wiadomosci/5',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        })

        let csrfToken = ''
        if (composeRes.ok) {
            const composeHtml = await composeRes.text()
            const csrfMatch = composeHtml.match(/var\s+csrfTokenValue\s*=\s*["']([^"']+)["']/)
            if (csrfMatch) {
                csrfToken = csrfMatch[1]
            }
        }

        const recipientGroups = [
            { type: 'wychowawca', name: 'Wychowawca' },
            { type: 'nauczyciel', name: 'Nauczyciele' },
            { type: 'bibliotekarz', name: 'Bibliotekarz' },
            { type: 'sekretariat', name: 'Sekretariat' },
            { type: 'admin', name: 'Administrator' }
        ]

        const groupResults = await Promise.all(
            recipientGroups.map(async (g) => {
                try {
                    const params = new URLSearchParams({
                        typAdresata: g.type,
                        poprzednia: '5',
                        tabZaznaczonych: '',
                        czyWirtualneKlasy: 'false',
                        idGrupy: '0'
                    })

                    const headers: Record<string, string> = {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'Referer': 'https://synergia.librus.pl/wiadomosci/2/5',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': '*/*'
                    }
                    if (csrfToken) {
                        headers['requestkey'] = csrfToken
                    }

                    const res = await session.fetch('https://synergia.librus.pl/getRecipients', {
                        method: 'POST',
                        headers,
                        body: params.toString()
                    })

                    if (res.ok) {
                        const html = await res.text()
                        return parseRecipientsHtml(html, g.name)
                    }
                } catch {}
                return [] as ReceiverItem[]
            })
        )

        for (const group of groupResults) {
            for (const r of group) {
                if (!receiversList.some((x) => x.id === r.id)) {
                    receiversList.push(r)
                }
            }
        }

        receiversList.sort((a, b) => a.name.localeCompare(b.name, 'pl'))
    } catch {}

    return receiversList
}

export async function fetchMessagesBundle(username: string, pass: string): Promise<MessagesActionResult> {
    try {
        const cleanUser = String(username || '').trim()
        const cleanPass = String(pass || '').trim()
        if (!cleanUser || !cleanPass) {
            return {
                success: false,
                messages: [],
                announcements: [],
                receivers: [],
                error: 'Brak danych logowania'
            }
        }

        const defaultRef = getDefaultReferer(cleanUser)
        const inboxFetch = await fetchHtmlWithRetry(
            cleanUser,
            cleanPass,
            'https://synergia.librus.pl/wiadomosci/5',
            defaultRef
        )
        const session = inboxFetch.session

        const [annFetch, receiversList, sentFetch] = await Promise.all([
            fetchHtmlWithRetry(
                cleanUser,
                cleanPass,
                'https://synergia.librus.pl/ogloszenia',
                defaultRef
            ).catch(() => ({ session, html: '', ok: false })),
            fetchReceiversList(session),
            fetchHtmlWithRetry(
                cleanUser,
                cleanPass,
                'https://synergia.librus.pl/wiadomosci/6',
                defaultRef
            ).catch(() => ({ session, html: '', ok: false }))
        ])

        if (inboxFetch.ok || annFetch.ok || sentFetch.ok) {
            const inboxMessages = parseInboxHtml(inboxFetch.html)
            const sentMessages = parseSentMessagesHtml(sentFetch.html)
            const announcements = parseAnnouncementsHtml(annFetch.html)

            return {
                success: true,
                messages: inboxMessages,
                sentMessages,
                announcements,
                receivers: receiversList
            }
        }

        // Fallback to librus-api client if native session HTML was rejected
        try {
            invalidateClientSession(cleanUser)
            const client = await getAuthenticatedClient(cleanUser, cleanPass)
            const [rawInbox, rawSent, rawAnnouncements] = await Promise.all([
                client.inbox.listInbox(5).catch(() => []),
                client.inbox.listInbox(6).catch(() => []),
                client.inbox.listAnnouncements().catch(() => [])
            ])

            const inboxList = Array.isArray(rawInbox) ? rawInbox : []
            const sentList = Array.isArray(rawSent) ? rawSent : []
            const announcementsList = Array.isArray(rawAnnouncements) ? rawAnnouncements : []

            const messages: MessageItem[] = inboxList.map((item: any, idx: number) => ({
                id: Number(item.id) || idx + 1,
                sender: item.user || item.sender || 'Nauczyciel',
                subject: item.title || item.subject || 'Wiadomość',
                date: item.date || '',
                isRead: Boolean(item.read),
                hasAttachments: Boolean(item.files && item.files.length > 0),
                folder: 'inbox'
            }))

            const sentMessages: MessageItem[] = sentList.map((item: any, idx: number) => ({
                id: Number(item.id) || idx + 1,
                sender: item.user || item.sender || 'Nauczyciel',
                subject: item.title || item.subject || 'Wiadomość',
                date: item.date || '',
                isRead: Boolean(item.read),
                hasAttachments: Boolean(item.files && item.files.length > 0),
                folder: 'sent'
            }))

            const announcements: AnnouncementItem[] = announcementsList.map((item: any, idx: number) => ({
                id: Number(item.id) || idx + 1,
                author: item.user || item.author || 'Dyrekcja',
                title: item.title || 'Ogłoszenie',
                date: item.date || '',
                content: tryDecodeBase64Content(String(item.content || ''))
            }))

            return {
                success: true,
                messages,
                sentMessages,
                announcements,
                receivers: receiversList
            }
        } catch (fallbackErr: any) {
            return {
                success: false,
                messages: [],
                announcements: [],
                receivers: [],
                error: String(fallbackErr?.message || 'Błąd ładowania wiadomości')
            }
        }
    } catch (error: any) {
        return {
            success: false,
            messages: [],
            announcements: [],
            receivers: [],
            error: String(error?.message || error)
        }
    }
}

function extractMessageBodyFromHtml(html: string): string {
    if (!html) return ''

    const xmlMatch = html.match(/<Message>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/Message>/i)
    if (xmlMatch && xmlMatch[1]) {
        return tryDecodeBase64Content(xmlMatch[1])
    }

    const $ = cheerio.load(html)
    const contentNode = $('.container-message-content').first()

    if (contentNode.length > 0) {
        const cloned = contentNode.clone()
        cloned.find('br').replaceWith('\n')
        const rawText = cloned.text().replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
        if (rawText) {
            return tryDecodeBase64Content(rawText)
        }
    }

    const fallbackNode = $('table.stretch.container-message td.message-folders+td').first()
    if (fallbackNode.length > 0) {
        const innerContent = fallbackNode.find('.container-message-content')
        if (innerContent.length > 0) {
            const cloned = innerContent.clone()
            cloned.find('br').replaceWith('\n')
            const rawText = cloned.text().replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
            if (rawText) {
                return tryDecodeBase64Content(rawText)
            }
        }
    }

    return ''
}

export async function fetchMessageContent(
    username: string,
    pass: string,
    messageId: number,
    folderId: number = 5
): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
        const cleanUser = String(username || '').trim()
        const cleanPass = String(pass || '').trim()

        const primary = await fetchHtmlWithRetry(
            cleanUser,
            cleanPass,
            `https://synergia.librus.pl/wiadomosci/1/${folderId}/${messageId}/f0`,
            `https://synergia.librus.pl/wiadomosci/${folderId}`
        )

        let body = extractMessageBodyFromHtml(primary.html)
        if (body) {
            return { success: true, content: body }
        }

        const secondary = await fetchHtmlWithRetry(
            cleanUser,
            cleanPass,
            `https://synergia.librus.pl/wiadomosci/1/${folderId}/${messageId}`,
            `https://synergia.librus.pl/wiadomosci/${folderId}`
        )

        body = extractMessageBodyFromHtml(secondary.html)
        if (body) {
            return { success: true, content: body }
        }

        const altFolder = folderId === 5 ? 6 : 5
        const alt = await fetchHtmlWithRetry(
            cleanUser,
            cleanPass,
            `https://synergia.librus.pl/wiadomosci/1/${altFolder}/${messageId}/f0`,
            `https://synergia.librus.pl/wiadomosci/${altFolder}`
        )
        body = extractMessageBodyFromHtml(alt.html)
        if (body) {
            return { success: true, content: body }
        }

        // Fallback to librus-api getMessage
        try {
            const client = await getAuthenticatedClient(cleanUser, cleanPass)
            const msgData: any = await client.inbox.getMessage(folderId, messageId)
            const rawContent = typeof msgData === 'string' ? msgData : String(msgData?.content || '')
            if (rawContent) {
                return { success: true, content: tryDecodeBase64Content(rawContent) }
            }
        } catch {}

        return { success: true, content: '' }
    } catch (error: any) {
        return { success: false, error: String(error?.message || error) }
    }
}

export async function sendMessageToUser(
    username: string,
    pass: string,
    receiverId: number | number[],
    title: string,
    body: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const cleanUser = String(username || '').trim()
        const cleanPass = String(pass || '').trim()
        const session = await getNativeLibrusSession(cleanUser, cleanPass)

        await session.fetch('https://synergia.librus.pl/wiadomosci/2/5', {
            headers: {
                'Referer': 'https://synergia.librus.pl/wiadomosci/5',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        })

        const formParams = new URLSearchParams()
        const ids = Array.isArray(receiverId) ? receiverId : [receiverId]
        if (ids.length === 1) {
            formParams.append('DoKogo', String(ids[0]))
        } else {
            ids.forEach((id, index) => {
                formParams.append(`DoKogo[${index}]`, String(id))
            })
        }
        formParams.append('temat', title)
        formParams.append('tresc', body)
        formParams.append('poprzednia', '6')
        formParams.append('wyslij', 'Wyślij')

        const res = await session.fetch('https://synergia.librus.pl/wiadomosci/5', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': 'https://synergia.librus.pl/wiadomosci/2/5',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            body: formParams.toString()
        })

        if (!res.ok) {
            return { success: false, error: 'Błąd wysyłania wiadomości' }
        }

        return { success: true }
    } catch (error: any) {
        return { success: false, error: String(error?.message || error) }
    }
}

export async function fetchUnreadCounters(
    username: string,
    pass: string
): Promise<{ success: boolean; unreadMessages: number; announcementsCount: number }> {
    try {
        const bundle = await fetchMessagesBundle(username, pass)
        if (!bundle.success) {
            return { success: false, unreadMessages: 0, announcementsCount: 0 }
        }

        const unreadMessages = bundle.messages.filter((m) => !m.isRead).length
        const announcementsCount = bundle.announcements.length

        return {
            success: true,
            unreadMessages,
            announcementsCount
        }
    } catch {
        return {
            success: false,
            unreadMessages: 0,
            announcementsCount: 0
        }
    }
}
