import { MessageItem, MessageAttachment, AnnouncementItem, ReceiverItem, MessagesActionResult } from '@/models/message.model'
import { getNativeLibrusSession, invalidateNativeSession, NativeLibrusSession } from '@/services/session.service'
import { getAuthenticatedClient, invalidateClientSession } from '@/services/librus.service'
import { isStudentUsername } from '@/utils/account.util'
import {
    isLoggedOutHtml,
    tryDecodeBase64Content,
    parseInboxHtml,
    parseSentMessagesHtml,
    parseAnnouncementsHtml,
    parseRecipientsHtml,
    extractMessageBodyFromHtml,
    extractMessageAttachmentsFromHtml
} from '@/services/message-parser.service'

const messageBodyCacheV2 = new Map<string, { content: string; attachments: MessageAttachment[] }>()

function getDefaultReferer(username: string): string {
    return isStudentUsername(username)
        ? 'https://synergia.librus.pl/uczen/index'
        : 'https://synergia.librus.pl/rodzic/index'
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

const receiversCache = new Map<string, { data: ReceiverItem[]; expiresAt: number }>()

export async function fetchReceiversOnly(username: string, pass: string): Promise<ReceiverItem[]> {
    const cleanUser = String(username || '').trim().toLowerCase()
    const cleanPass = String(pass || '').trim()
    const now = Date.now()

    const cached = receiversCache.get(cleanUser)
    if (cached && cached.expiresAt > now && cached.data.length > 0) {
        return cached.data
    }

    try {
        const session = await getNativeLibrusSession(cleanUser, cleanPass)
        const list = await fetchReceiversList(session)
        if (list.length > 0) {
            receiversCache.set(cleanUser, {
                data: list,
                expiresAt: Date.now() + 10 * 60 * 1000
            })
        }
        return list
    } catch {
        return cached?.data || []
    }
}

export async function fetchMessagesBundle(username: string, pass: string): Promise<MessagesActionResult> {
    const bundleStart = performance.now()
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
        const session = await getNativeLibrusSession(cleanUser, cleanPass)

        const [inboxFetch, annFetch, sentFetch] = await Promise.all([
            fetchHtmlWithRetry(
                cleanUser,
                cleanPass,
                'https://synergia.librus.pl/wiadomosci/5',
                defaultRef
            ).catch(() => ({ session, html: '', ok: false })),
            fetchHtmlWithRetry(
                cleanUser,
                cleanPass,
                'https://synergia.librus.pl/ogloszenia',
                defaultRef
            ).catch(() => ({ session, html: '', ok: false })),
            fetchHtmlWithRetry(
                cleanUser,
                cleanPass,
                'https://synergia.librus.pl/wiadomosci/6',
                defaultRef
            ).catch(() => ({ session, html: '', ok: false }))
        ])

        const initialFetchMs = Math.round(performance.now() - bundleStart)

        if (inboxFetch.ok || annFetch.ok || sentFetch.ok) {
            const inboxMessages = parseInboxHtml(inboxFetch.html)
            const sentMessages = parseSentMessagesHtml(sentFetch.html)
            const announcements = parseAnnouncementsHtml(annFetch.html)

            const previewsStart = performance.now()
            for (const msg of inboxMessages) {
                const cacheKey = cleanUser + ':5:' + msg.id
                const cached = messageBodyCacheV2.get(cacheKey)
                if (cached) {
                    msg.content = cached.content
                    if (cached.attachments && cached.attachments.length > 0) {
                        msg.attachments = cached.attachments
                    }
                }
            }
            for (const msg of sentMessages) {
                const cacheKey = cleanUser + ':6:' + msg.id
                const cached = messageBodyCacheV2.get(cacheKey)
                if (cached) {
                    msg.content = cached.content
                    if (cached.attachments && cached.attachments.length > 0) {
                        msg.attachments = cached.attachments
                    }
                }
            }
            const previewsMs = Math.round(performance.now() - previewsStart)
            const totalMs = Math.round(performance.now() - bundleStart)

            const cachedRec = receiversCache.get(cleanUser.toLowerCase())
            const receiversList = cachedRec && cachedRec.expiresAt > Date.now() ? cachedRec.data : []

            return {
                success: true,
                messages: inboxMessages,
                sentMessages,
                announcements,
                receivers: receiversList,
                serverTimings: {
                    totalMs,
                    inboxMs: initialFetchMs,
                    previewsMs
                }
            }
        }

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
                hasAttachments: Boolean(item.hasAttachment || (item.files && item.files.length > 0)),
                folder: 'inbox'
            }))

            const sentMessages: MessageItem[] = sentList.map((item: any, idx: number) => ({
                id: Number(item.id) || idx + 1,
                sender: item.user || item.sender || 'Nauczyciel',
                subject: item.title || item.subject || 'Wiadomość',
                date: item.date || '',
                isRead: Boolean(item.read),
                hasAttachments: Boolean(item.hasAttachment || (item.files && item.files.length > 0)),
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
                receivers: []
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

export async function fetchMessageContent(
    username: string,
    pass: string,
    messageId: number,
    folderId: number = 5
): Promise<{ success: boolean; content?: string; attachments?: MessageAttachment[]; error?: string }> {
    try {
        const cleanUser = String(username || '').trim()
        const cleanPass = String(pass || '').trim()
        const cacheKey = cleanUser + ':' + folderId + ':' + messageId
        const cached = messageBodyCacheV2.get(cacheKey)
        if (cached && cached.content && cached.attachments.length > 0) {
            return { success: true, content: cached.content, attachments: cached.attachments }
        }

        const primary = await fetchHtmlWithRetry(
            cleanUser,
            cleanPass,
            'https://synergia.librus.pl/wiadomosci/1/' + folderId + '/' + messageId + '/f0',
            'https://synergia.librus.pl/wiadomosci/' + folderId
        )

        let body = extractMessageBodyFromHtml(primary.html)
        let attachments = extractMessageAttachmentsFromHtml(primary.html)
        if (body || attachments.length > 0) {
            if (body) messageBodyCacheV2.set(cacheKey, { content: body, attachments })
            return { success: true, content: body, attachments }
        }

        const secondary = await fetchHtmlWithRetry(
            cleanUser,
            cleanPass,
            'https://synergia.librus.pl/wiadomosci/1/' + folderId + '/' + messageId,
            'https://synergia.librus.pl/wiadomosci/' + folderId
        )

        body = extractMessageBodyFromHtml(secondary.html)
        attachments = extractMessageAttachmentsFromHtml(secondary.html)
        if (body || attachments.length > 0) {
            if (body) messageBodyCacheV2.set(cacheKey, { content: body, attachments })
            return { success: true, content: body, attachments }
        }

        const altFolder = folderId === 5 ? 6 : 5
        const alt = await fetchHtmlWithRetry(
            cleanUser,
            cleanPass,
            'https://synergia.librus.pl/wiadomosci/1/' + altFolder + '/' + messageId + '/f0',
            'https://synergia.librus.pl/wiadomosci/' + altFolder
        )
        body = extractMessageBodyFromHtml(alt.html)
        attachments = extractMessageAttachmentsFromHtml(alt.html)
        if (body || attachments.length > 0) {
            return { success: true, content: body, attachments }
        }

        try {
            const client = await getAuthenticatedClient(cleanUser, cleanPass)
            const msgData: any = await client.inbox.getMessage(folderId, messageId)
            const rawContent = typeof msgData === 'string' ? msgData : String(msgData?.content || '')
            const rawFiles = Array.isArray(msgData?.files)
                ? msgData.files.map((f: any, idx: number) => ({
                    name: String(f?.name || ('Załącznik ' + (idx + 1))),
                    path: String(f?.path || '').replace(/\\\//g, '/').replace(/^\//, '')
                })).filter((f: MessageAttachment) => Boolean(f.path))
                : []
            if (rawContent || rawFiles.length > 0) {
                return {
                    success: true,
                    content: tryDecodeBase64Content(rawContent),
                    attachments: rawFiles
                }
            }
        } catch {}

        return { success: true, content: '', attachments: [] }
    } catch (error: any) {
        return { success: false, error: String(error?.message || error) }
    }
}

export async function downloadMessageAttachment(
    username: string,
    pass: string,
    filePath: string,
    fileName: string
): Promise<{ success: boolean; base64?: string; mimeType?: string; fileName?: string; error?: string }> {
    try {
        const cleanUser = String(username || '').trim()
        const cleanPass = String(pass || '').trim()
        const normalizedPath = filePath.replace(/\\\//g, '/').replace(/^\//, '')
        const client = await getAuthenticatedClient(cleanUser, cleanPass)
        const stream: any = await client.inbox.getFile(normalizedPath)

        let fullBuffer: Buffer
        if (Buffer.isBuffer(stream)) {
            fullBuffer = stream
        } else if (typeof stream?.arrayBuffer === 'function') {
            fullBuffer = Buffer.from(await stream.arrayBuffer())
        } else {
            const chunks: Buffer[] = []
            await new Promise<void>((resolve, reject) => {
                stream.on('data', (chunk: Buffer | Uint8Array | string) => {
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
                })
                stream.on('end', () => resolve())
                stream.on('error', (err: any) => reject(err))
            })
            fullBuffer = Buffer.concat(chunks)
        }

        const ext = (fileName.split('.').pop() || '').toLowerCase()
        const mimeMap: Record<string, string> = {
            pdf: 'application/pdf',
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            gif: 'image/gif',
            webp: 'image/webp',
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            xls: 'application/vnd.ms-excel',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ppt: 'application/vnd.ms-powerpoint',
            pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            txt: 'text/plain',
            zip: 'application/zip'
        }
        const mimeType = mimeMap[ext] || 'application/octet-stream'

        return {
            success: true,
            base64: fullBuffer.toString('base64'),
            mimeType,
            fileName
        }
    } catch (error: any) {
        return {
            success: false,
            error: String(error?.message || 'Błąd pobierania załącznika')
        }
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
                formParams.append('DoKogo[' + index + ']', String(id))
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
