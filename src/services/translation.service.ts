const translationCache = new Map<string, string>()

const SCHOOL_DICTIONARY: Record<string, string> = {
    'matematyka': 'Mathematics',
    'język polski': 'Polish',
    'jezyk polski': 'Polish',
    'język angielski': 'English',
    'jezyk angielski': 'English',
    'język niemiecki': 'German',
    'jezyk niemiecki': 'German',
    'język hiszpański': 'Spanish',
    'jezyk hiszpanski': 'Spanish',
    'historia': 'History',
    'historia i teraźniejszość': 'History and Current Affairs',
    'historia i terazniejszosc': 'History and Current Affairs',
    'hit': 'History and Current Affairs',
    'biologia': 'Biology',
    'chemia': 'Chemistry',
    'fizyka': 'Physics',
    'geografia': 'Geography',
    'informatyka': 'Computer Science',
    'wychowanie fizyczne': 'Physical Education (PE)',
    'wf': 'Physical Education (PE)',
    'edukacja dla bezpieczeństwa': 'Safety Education',
    'edukacja dla bezpieczenstwa': 'Safety Education',
    'edb': 'Safety Education',
    'wiedza o społeczeństwie': 'Social Studies',
    'wiedza o spoleczenstwie': 'Social Studies',
    'wos': 'Social Studies',
    'religia': 'Religion',
    'etyka': 'Ethics',
    'godzina z wychowawcą': 'Homeroom',
    'godzina z wychowawca': 'Homeroom',
    'zajęcia z wychowawcą': 'Homeroom',
    'zajecia z wychowawca': 'Homeroom',
    'gzw': 'Homeroom',
    'zajęcia szkolne': 'School Classes',
    'zajecia szkolne': 'School Classes',
    'programowanie aplikacji internetowych': 'Web App Programming',
    'programowanie aplikacji desktopowych i mobilnych': 'Desktop & Mobile Programming',
    'programowanie i testowanie aplikacji mobilnych oraz zaawansowanych webowych': 'Mobile & Advanced Web App Development & Testing',
    'programowanie i testowanie aplikacji': 'App Programming & Testing',
    'tworzenie stron i aplikacji internetowych': 'Web Development',
    'projektowanie stron internetowych': 'Web Design',
    'bazy danych': 'Databases',
    'systemy baz danych': 'Database Systems',
    'administracja bazami danych': 'Database Administration',
    'działalność gospodarcza w branży informatycznej': 'IT Business Economics',
    'dzialalnosc gospodarcza w branzy informatycznej': 'IT Business Economics',
    'język angielski zawodowy': 'Vocational English',
    'jezyk angielski zawodowy': 'Vocational English',
    'pracownia programowania': 'Programming Lab',
    'pracownia aplikacji internetowych': 'Web App Lab',
    'bezpieczeństwo i higiena pracy': 'Occupational Health & Safety',
    'bezpieczenstwo i higiena pracy': 'Occupational Health & Safety',
    'bhp': 'Occupational Health & Safety',
    'nieobecność nieusprawiedliwiona': 'Unexcused absence',
    'nieobecnosc nieusprawiedliwiona': 'Unexcused absence',
    'nieobecność usprawiedliwiona': 'Excused absence',
    'nieobecnosc usprawiedliwiona': 'Excused absence',
    'spóźnienie': 'Tardy / Late',
    'spoznienie': 'Tardy / Late',
    'zwolnienie': 'Excused early leave',
    'zastępstwo': 'Substitution',
    'zastepstwo': 'Substitution',
    'odwołane': 'Cancelled',
    'odwolane': 'Cancelled',
    'odwołane zajęcia': 'Cancelled class',
    'odwolane zajecia': 'Cancelled class',
    'skrócona lekcja': 'Shortened period',
    'skrocona lekcja': 'Shortened period',
    'skrócone': 'Shortened',
    'skrocone': 'Shortened',
    'nauczyciel nieobecny': 'Teacher absent',
    'sprawdzian': 'Exam',
    'kartkówka': 'Quiz',
    'kartkowka': 'Quiz',
    'praca klasowa': 'Class Test',
    'odpowiedź ustna': 'Oral Exam',
    'odpowiedz ustna': 'Oral Exam',
    'zadanie domowe': 'Homework',
    'aktywność': 'Participation',
    'aktywnosc': 'Participation',
    'nieprzygotowanie': 'Unprepared',
    'brak zadania': 'Missing Homework'
}

function normalizeKey(str: string): string {
    return str
        .toLowerCase()
        .replace(/\s*\(\s*gr\.?\s*[\w\d]+.*?\)/gi, '')
        .replace(/\s*\(\s*\d+\s*\/\s*\d+\s*\)/g, '')
        .replace(/\s*\[.*?\]/g, '')
        .trim()
}

async function fetchFromDynamicTranslationEngines(text: string): Promise<string | null> {
    const encoded = encodeURIComponent(text)

    try {
        const urlChrome = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=pl&tl=en&q=${encoded}`
        const resChrome = await fetch(urlChrome, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })
        if (resChrome.ok) {
            const json = await resChrome.json()
            if (Array.isArray(json) && typeof json[0] === 'string' && json[0].trim().length > 0) {
                return json[0].trim()
            }
        }
    } catch { }

    try {
        const urlGtx = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=pl&tl=en&dt=t&q=${encoded}`
        const resGtx = await fetch(urlGtx, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
            }
        })
        if (resGtx.ok) {
            const json = await resGtx.json()
            if (Array.isArray(json) && Array.isArray(json[0])) {
                const combined = json[0].map((item: any) => item[0]).join('').trim()
                if (combined.length > 0) {
                    return combined
                }
            }
        }
    } catch { }

    try {
        const urlMemory = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=pl|en`
        const resMemory = await fetch(urlMemory)
        if (resMemory.ok) {
            const json = await resMemory.json()
            if (json && json.responseData && typeof json.responseData.translatedText === 'string') {
                const clean = json.responseData.translatedText.trim()
                if (clean.length > 0 && !clean.toUpperCase().includes('MYMEMORY WARNING')) {
                    return clean
                }
            }
        }
    } catch { }

    return null
}

export async function translateTextToEnglish(text: string): Promise<string> {
    const trimmed = text.trim()
    if (!trimmed || trimmed === '-') {
        return text
    }

    if (translationCache.has(trimmed)) {
        return translationCache.get(trimmed)!
    }

    const normKey = normalizeKey(trimmed)
    if (SCHOOL_DICTIONARY[normKey]) {
        const translated = SCHOOL_DICTIONARY[normKey]
        translationCache.set(trimmed, translated)
        return translated
    }

    for (const [key, val] of Object.entries(SCHOOL_DICTIONARY)) {
        if (normKey === key || normKey.startsWith(key) || key.startsWith(normKey)) {
            translationCache.set(trimmed, val)
            return val
        }
    }

    const dynamicTranslation = await fetchFromDynamicTranslationEngines(trimmed)
    if (dynamicTranslation) {
        translationCache.set(trimmed, dynamicTranslation)
        return dynamicTranslation
    }

    return trimmed
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