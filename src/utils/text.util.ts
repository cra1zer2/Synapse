/**
 * Utils: Text & Localization Formatting
 * Cleans Librus sender names, abbreviates verbose Polish subject names, and computes Polish plural forms.
 * Used across message views, schedule/grade/attendance cards, and bilingual dictionary rules.
 */

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

  return text
    .split(' ')
    .map((p) => (p.length === 0 ? '' : p[0].toUpperCase() + p.slice(1).toLowerCase()))
    .join(' ')
}

export function formatSubjectName(raw: string, _showFull = false): string {
  if (!raw) return ''
  return raw.trim()
}

export function formatPolishPlural(
  count: number,
  singular: string,
  few: string,
  many: string
): string {
  const abs = Math.abs(Math.trunc(count))
  if (abs === 1) return singular
  const lastTwo = abs % 100
  const last = abs % 10
  if (lastTwo >= 12 && lastTwo <= 14) return many
  if (last >= 2 && last <= 4) return few
  return many
}
