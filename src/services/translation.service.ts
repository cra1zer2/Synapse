const translationCache = new Map<string, string>()

export async function translateTextToEnglish(text: string): Promise<string> {
    const trimmed = text.trim()
    if (!trimmed) {
        return text
    }

    if (translationCache.has(trimmed)) {
        return translationCache.get(trimmed)!
    }

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=pl&tl=en&dt=t&q=${encodeURIComponent(trimmed)}`
        const response = await fetch(url)

        if (!response.ok) {
            return text
        }

        const json = await response.json()
        if (Array.isArray(json) && Array.isArray(json[0])) {
            const translated = json[0].map((item: any) => item[0]).join('')
            translationCache.set(trimmed, translated)
            return translated
        }

        return text
    } catch {
        return text
    }
}

export async function translateBatch(texts: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {}

    await Promise.all(
        texts.map(async (str) => {
            const translated = await translateTextToEnglish(str)
            result[str] = translated
        })
    )

    return result
}