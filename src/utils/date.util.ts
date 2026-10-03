export function formatDisplayDate(raw: string | number | undefined, defaultYear: number, defaultMonth: number): string {
    if (!raw) {
        return `${String(defaultMonth).padStart(2, '0')}.${defaultYear}`
    }

    const str = String(raw).trim()

    const isoMatch = str.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (isoMatch) {
        const year = isoMatch[1]
        const month = isoMatch[2].padStart(2, '0')
        const day = isoMatch[3].padStart(2, '0')
        return `${day}.${month}.${year}`
    }

    const dotMatch = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
    if (dotMatch) {
        const day = dotMatch[1].padStart(2, '0')
        const month = dotMatch[2].padStart(2, '0')
        const year = dotMatch[3]
        return `${day}.${month}.${year}`
    }

    const numeric = parseInt(str, 10)
    if (!isNaN(numeric) && numeric >= 1 && numeric <= 31) {
        const day = String(numeric).padStart(2, '0')
        const month = String(defaultMonth).padStart(2, '0')
        return `${day}.${month}.${defaultYear}`
    }

    return str
}

export function extractTimeInterval(text: string): { cleanText: string; timeBadge: string | null } {
    if (!text) {
        return { cleanText: '', timeBadge: null }
    }

    const hoursMatch = text.match(/Godziny:\s*(\d{1,2}:\d{2})\s*do\s*(\d{1,2}:\d{2})/i)
    if (hoursMatch) {
        const timeBadge = `${hoursMatch[1]} - ${hoursMatch[2]}`
        const cleanText = text.replace(/Godziny:\s*\d{1,2}:\d{2}\s*do\s*\d{1,2}:\d{2}/gi, '').trim()
        return { cleanText, timeBadge }
    }

    return { cleanText: text, timeBadge: null }
}