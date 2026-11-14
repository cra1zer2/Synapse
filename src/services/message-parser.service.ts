import * as cheerio from 'cheerio'
import { MessageItem, MessageAttachment, AnnouncementItem, ReceiverItem } from '@/models/message.model'

export function isLoggedOutHtml(html: string): boolean {
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

export function tryDecodeBase64Content(raw: string): string {
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

function itemSubjectOrDefault(s: string): string {
    return s || 'Wiadomość'
}

export function parseInboxHtml(html: string): MessageItem[] {
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

export function parseSentMessagesHtml(html: string): MessageItem[] {
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
            subject: itemSubjectOrDefault(subject),
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

export function parseAnnouncementsHtml(html: string): AnnouncementItem[] {
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

export function parseRecipientsHtml(html: string, groupName: string): ReceiverItem[] {
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

export function extractMessageBodyFromHtml(html: string): string {
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

export function extractMessageAttachmentsFromHtml(html: string): MessageAttachment[] {
    if (!html) return []
    const normalizedHtml = html.replace(/\\\//g, '/')
    const $ = cheerio.load(normalizedHtml)
    const attachments: MessageAttachment[] = []

    const names: string[] = []
    $('img[src*="filetype"], img[src*="ikona_plik"], img[src*="file"]').each((_, elem) => {
        const text = $(elem).parent().text().replace(/\s+/g, ' ').trim()
        if (text && !names.includes(text)) {
            names.push(text)
        }
    })

    const paths: string[] = []
    const rowNames: string[] = []

    $('img[src*="download"], a[href*="pobierz_zalacznik"], [onclick*="pobierz_zalacznik"]').each((_, elem) => {
        const rawAttr = ($(elem).attr('onclick') || $(elem).attr('href') || '').replace(/\\\//g, '/')
        const match = rawAttr.match(/wiadomosci\/pobierz_zalacznik\/[0-9a-zA-Z/_-]+/i)
        if (match && match[0]) {
            const cleanPath = match[0].replace(/^\//, '')
            if (!paths.includes(cleanPath)) {
                paths.push(cleanPath)
                const tr = $(elem).closest('tr')
                if (tr.length > 0) {
                    const firstTd = tr.find('td').first().text().replace(/\s+/g, ' ').trim()
                    if (firstTd && !/^(pliki|załączniki):?$/i.test(firstTd)) {
                        rowNames.push(firstTd)
                    } else {
                        rowNames.push('')
                    }
                } else {
                    rowNames.push('')
                }
            }
        }
    })

    if (paths.length === 0) {
        const globalMatches = normalizedHtml.matchAll(/wiadomosci\/pobierz_zalacznik\/[0-9a-zA-Z/_-]+/gi)
        for (const m of globalMatches) {
            const cleanPath = m[0].replace(/^\//, '')
            if (!paths.includes(cleanPath)) {
                paths.push(cleanPath)
            }
        }
    }

    for (let i = 0; i < paths.length; i++) {
        const filePath = paths[i]
        if (!filePath) continue
        const fileName = names[i] || rowNames[i] || ('Załącznik ' + (i + 1))
        attachments.push({ name: fileName, path: filePath })
    }

    return attachments
}
