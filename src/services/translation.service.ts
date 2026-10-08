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
    'tworzenie stron i aplikacji internetowych': 'Web Development',
    'bazy danych': 'Databases',
    'systemy baz danych': 'Database Systems',
    'administracja bazami danych': 'Database Administration',
    'projektowanie stron internetowych': 'Web Design',
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

export async function translateTextToEnglish(text: string): Promise<string> {
    const trimmed = text.trim()
    if (!trimmed) {
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

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=pl&tl=en&dt=t&q=${encodeURIComponent(trimmed)}`
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })

        if (!response.ok) {
            return trimmed
        }

        const json = await response.json()
        if (Array.isArray(json) && Array.isArray(json[0])) {
            const translated = json[0].map((item: any) => item[0]).join('')
            translationCache.set(trimmed, translated)
            return translated
        }

        return trimmed
    } catch {
        return trimmed
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