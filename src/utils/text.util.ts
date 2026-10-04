export function cleanSenderName(raw: string): string {
    if (!raw) return ''

    let text = raw.replace(/\s*\[.*?\]\s*/g, '').trim()
    const parenMatch = text.match(/^(.*?)\s*\((.*?)\)$/)
    if (parenMatch) {
        const first = parenMatch[1].trim()
        const second = parenMatch[2].trim()
        if (first.toLowerCase() === second.toLowerCase()) {
            text = first
        }
    }

    const parts = text.split(' ')
    return parts
        .map((p) => {
            if (p.length === 0) return ''
            return p[0].toUpperCase() + p.slice(1).toLowerCase()
        })
        .join(' ')
}