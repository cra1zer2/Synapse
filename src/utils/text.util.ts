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

export function formatSubjectName(raw: string, showFull = false): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  if (showFull) return trimmed

  const map: Record<string, string> = {
    'Programowanie i testowanie aplikacji mobilnych oraz zaawansowanych webowych': 'Programowanie i testowanie...',
    'Programowanie i testowanie aplikacji': 'Programowanie i testowanie...',
    'Aplikacje mobilne oraz zaawansowane webowe': 'Aplikacje mobilne i webowe',
    'Obiektowe aplikacje desktopowe': 'Aplikacje desktopowe',
    'Działalność gospodarcza w branży informatycznej': 'Działalność gospodarcza',
    'Bezpieczeństwo i higiena pracy': 'BHP',
    'Wychowanie fizyczne': 'Wychowanie fizyczne',
    'Edukacja dla bezpieczeństwa': 'EDB',
    'Wiedza o społeczeństwie': 'WOS',
    'Historia i teraźniejszość': 'HiT',
    'Język angielski zawodowy': 'J. angielski zawodowy',
    'Godzina z wychowawcą': 'Zajęcia z wychowawcą',
    'zajęcia z wychowawcą': 'Zajęcia z wychowawcą'
  }

  if (map[trimmed]) return map[trimmed]

  const lower = trimmed.toLowerCase()
  if (lower.startsWith('programowanie i testowanie')) return 'Programowanie i testowanie...'
  if (lower.startsWith('aplikacje mobilne oraz zaawansow')) return 'Aplikacje mobilne i webowe'
  if (lower.startsWith('obiektowe aplikacje')) return 'Aplikacje desktopowe'
  if (lower.startsWith('działalność gospodarcza')) return 'Działalność gospodarcza'

  return trimmed
}
