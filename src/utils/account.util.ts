/**
 * Utils: Account Helpers
 * Normalizes Synergia usernames, classifies student/parent/demo accounts, and formats profile labels.
 * Used across auth, account session hooks, server profile actions, and demo data providers.
 */

const PLACEHOLDER_PROFILE_VALUES = new Set(['klasa', 'szkoła', 'szkola', 'class', 'school'])

function normalizeUsername(username?: string | null): string {
  return String(username || '').trim().toLowerCase()
}

export function isDemoParentAccount(username?: string | null): boolean {
  const clean = normalizeUsername(username)
  return clean === 'demor' || clean === 'demoparent'
}

export function isDemoAccount(username?: string | null): boolean {
  const clean = normalizeUsername(username)
  return (
    clean === 'demo' ||
    clean === 'demou' ||
    clean === 'demor' ||
    clean === 'demoparent' ||
    clean === 'test' ||
    clean === 'testu' ||
    clean.startsWith('demo_') ||
    clean.startsWith('demo-') ||
    clean.startsWith('test_')
  )
}

export function isStudentUsername(username?: string | null): boolean {
  const clean = normalizeUsername(username)
  if (!clean || isDemoParentAccount(clean)) return false
  if (isDemoAccount(clean)) return true
  return /^\d+u$/.test(clean) || clean.endsWith('u')
}

export function resolveAvatarLetter(name?: string | null, username?: string | null): string {
  const source = (name || username || 'S').trim()
  if (!source) return 'S'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

export function sanitizeAccountLabel(value?: string | null): string {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''
  if (PLACEHOLDER_PROFILE_VALUES.has(trimmed.toLowerCase())) return ''
  return trimmed
}

export function formatClassLabel(cls: unknown): string {
  if (!cls || typeof cls !== 'object') return ''
  const record = cls as Record<string, unknown>
  const name = sanitizeAccountLabel(typeof record.Name === 'string' ? record.Name : '')
  if (name) return name
  const symbol = sanitizeAccountLabel(typeof record.Symbol === 'string' ? record.Symbol : '')
  const rawNum =
    record.Number !== undefined && record.Number !== null ? String(record.Number).trim() : ''
  if (rawNum && symbol) {
    if (symbol.toLowerCase().startsWith(rawNum.toLowerCase())) {
      return symbol
    }
    return `${rawNum}${symbol}`
  }
  return symbol || rawNum || ''
}
