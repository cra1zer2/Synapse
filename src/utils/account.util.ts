export function normalizeUsername(username?: string | null): string {
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
    clean.startsWith('demo-')
  )
}

export function isStudentUsername(username?: string | null): boolean {
  const clean = normalizeUsername(username)
  if (!clean) return false
  if (isDemoParentAccount(clean)) return false
  if (
    clean === 'demo' ||
    clean === 'demou' ||
    clean === 'test' ||
    clean === 'testu' ||
    clean.startsWith('demo_') ||
    clean.startsWith('demo-')
  ) {
    return true
  }
  return /^\d+u$/.test(clean) || clean.endsWith('u')
}

export function resolveAccountRole(
  username?: string | null,
  explicitRole?: 'student' | 'parent'
): 'student' | 'parent' {
  if (explicitRole === 'student' || explicitRole === 'parent') {
    return explicitRole
  }
  return isStudentUsername(username) ? 'student' : 'parent'
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
