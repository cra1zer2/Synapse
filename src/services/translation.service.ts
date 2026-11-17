/**
 * Service: Dynamic Multi-Language Translation
 * Translates dynamic Polish school text into any target language code via free translation engines with caching and bounded concurrency.
 * Supports arbitrary target codes configured in LANGUAGE_REGISTRY.
 */

const MAX_CACHE_ENTRIES = 4000
const MAX_CHUNK_CHARS = 1200
const ENGINE_TIMEOUT_MS = 4500
const DEFAULT_BATCH_CONCURRENCY = 6

const translationCache = new Map<string, string>()
const inFlightTranslations = new Map<string, Promise<string>>()

export function resolveTranslateTarget(target?: boolean | string | null): string | null {
  if (!target) return null
  if (target === true) return 'en'
  const clean = String(target).trim().toLowerCase()
  if (!clean || clean === 'pl' || clean === 'false') return null
  if (clean === 'true') return 'en'
  return clean
}

function setCacheEntry(key: string, value: string): void {
  if (translationCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = translationCache.keys().next().value
    if (oldestKey !== undefined) {
      translationCache.delete(oldestKey)
    }
  }
  translationCache.set(key, value)
}

function isNonTranslatable(trimmed: string): boolean {
  if (!trimmed || trimmed === '-' || trimmed === '—') return true
  if (/^(https?:\/\/|www\.)\S+$/i.test(trimmed)) return true
  if (!/[\p{L}]{2,}/u.test(trimmed)) return true
  return false
}

function extractChromeTranslation(json: unknown): string | null {
  if (!Array.isArray(json)) return null
  const parts: string[] = []

  for (const item of json) {
    if (typeof item === 'string') {
      parts.push(item)
    } else if (Array.isArray(item) && typeof item[0] === 'string') {
      parts.push(item[0])
    }
  }

  const joined = parts.join('').trim()
  return joined.length > 0 ? joined : null
}

async function fetchSingleChunkFromEngines(text: string, targetLang: string): Promise<string | null> {
  const encoded = encodeURIComponent(text)
  const tl = encodeURIComponent(targetLang)

  try {
    const urlChrome = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=pl&tl=${tl}&q=${encoded}`
    const resChrome = await fetch(urlChrome, {
      signal: AbortSignal.timeout(ENGINE_TIMEOUT_MS),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    if (resChrome.ok) {
      const json: unknown = await resChrome.json()
      const extracted = extractChromeTranslation(json)
      if (extracted) return extracted
    }
  } catch {}

  try {
    const urlGtx = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=pl&tl=${tl}&dt=t&q=${encoded}`
    const resGtx = await fetch(urlGtx, {
      signal: AbortSignal.timeout(ENGINE_TIMEOUT_MS),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      }
    })
    if (resGtx.ok) {
      const json: unknown = await resGtx.json()
      if (Array.isArray(json) && Array.isArray(json[0])) {
        const combined = json[0]
          .map((item: unknown) => (Array.isArray(item) && typeof item[0] === 'string' ? item[0] : ''))
          .join('')
          .trim()
        if (combined.length > 0) return combined
      }
    }
  } catch {}

  if (text.length <= 480) {
    try {
      const urlMemory = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=pl|${tl}`
      const resMemory = await fetch(urlMemory, {
        signal: AbortSignal.timeout(ENGINE_TIMEOUT_MS)
      })
      if (resMemory.ok) {
        const json: any = await resMemory.json()
        const translatedText = json?.responseData?.translatedText
        if (typeof translatedText === 'string') {
          const clean = translatedText.trim()
          if (clean.length > 0 && !clean.toUpperCase().includes('MYMEMORY WARNING')) {
            return clean
          }
        }
      }
    } catch {}
  }

  return null
}

function splitOversizedSegment(segment: string, maxChars: number): string[] {
  if (segment.length <= maxChars) return [segment]

  const pieces: string[] = []
  const sentences = segment.split(/(?<=[.!?])\s+/)
  let current = ''

  const flushWordChunks = (longSentence: string) => {
    const words = longSentence.split(/\s+/)
    let line = ''
    for (const word of words) {
      if (!line) {
        line = word
      } else if (line.length + 1 + word.length <= maxChars) {
        line += ' ' + word
      } else {
        pieces.push(line)
        line = word
      }
    }
    if (line) pieces.push(line)
  }

  for (const sentence of sentences) {
    if (!sentence) continue
    if (sentence.length > maxChars) {
      if (current) {
        pieces.push(current)
        current = ''
      }
      flushWordChunks(sentence)
      continue
    }

    if (!current) {
      current = sentence
    } else if (current.length + 1 + sentence.length <= maxChars) {
      current += ' ' + sentence
    } else {
      pieces.push(current)
      current = sentence
    }
  }

  if (current) pieces.push(current)
  return pieces
}

async function translateSegment(segment: string, targetLang: string): Promise<string> {
  const trimmed = segment.trim()
  if (isNonTranslatable(trimmed)) return segment

  const cacheKey = `${targetLang}:${trimmed}`
  const cached = translationCache.get(cacheKey)
  if (cached !== undefined) return cached

  const inFlight = inFlightTranslations.get(cacheKey)
  if (inFlight) return inFlight

  const promise = (async () => {
    try {
      if (trimmed.length <= MAX_CHUNK_CHARS) {
        const dynamic = await fetchSingleChunkFromEngines(trimmed, targetLang)
        if (dynamic) {
          setCacheEntry(cacheKey, dynamic)
          return dynamic
        }
        return trimmed
      }

      const chunks = splitOversizedSegment(trimmed, MAX_CHUNK_CHARS)
      const translatedChunks: string[] = []
      for (const chunk of chunks) {
        const translated = await translateSegment(chunk, targetLang)
        translatedChunks.push(translated)
      }
      const joined = translatedChunks.join(' ').trim() || trimmed
      setCacheEntry(cacheKey, joined)
      return joined
    } finally {
      inFlightTranslations.delete(cacheKey)
    }
  })()

  inFlightTranslations.set(cacheKey, promise)
  return promise
}

export async function translateText(text: string, target: boolean | string = 'en'): Promise<string> {
  const targetLang = resolveTranslateTarget(target)
  if (!targetLang) return text

  const trimmed = text.trim()
  if (isNonTranslatable(trimmed)) {
    return text
  }

  const cacheKey = `${targetLang}:${trimmed}`
  const cached = translationCache.get(cacheKey)
  if (cached !== undefined) {
    return cached
  }

  if (trimmed.includes('\n')) {
    const paragraphs = trimmed.split(/\r?\n\r?\n/)
    const translatedParagraphs = await Promise.all(
      paragraphs.map(async (paragraph) => {
        const pTrimmed = paragraph.trim()
        if (!pTrimmed) return ''
        if (!pTrimmed.includes('\n')) {
          return translateSegment(pTrimmed, targetLang)
        }
        const lines = pTrimmed.split(/\r?\n/)
        const translatedLines = await Promise.all(
          lines.map((line) => (line.trim() ? translateSegment(line.trim(), targetLang) : Promise.resolve('')))
        )
        return translatedLines.join('\n')
      })
    )
    const combined = translatedParagraphs.join('\n\n')
    setCacheEntry(cacheKey, combined)
    return combined
  }

  return translateSegment(trimmed, targetLang)
}

export async function translateBatch(
  texts: string[],
  target: boolean | string = 'en',
  concurrency: number = DEFAULT_BATCH_CONCURRENCY
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  const targetLang = resolveTranslateTarget(target)
  if (!targetLang) return result

  const uniqueTexts = Array.from(new Set(texts)).filter((t) => Boolean(t && t.trim()))
  if (uniqueTexts.length === 0) return result

  const workerCount = Math.min(Math.max(1, concurrency), uniqueTexts.length)
  let cursor = 0

  const worker = async () => {
    while (cursor < uniqueTexts.length) {
      const index = cursor++
      const original = uniqueTexts[index]
      result[original] = await translateText(original, targetLang)
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return result
}
