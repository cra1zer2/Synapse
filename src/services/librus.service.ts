import Librus from 'librus-api'

interface CachedSession {
    client: Librus
    expiresAt: number
}

const sessionStore = new Map<string, CachedSession>()
const pendingAuthStore = new Map<string, Promise<Librus>>()
const SESSION_TTL_MS = 20 * 60 * 1000

export async function getAuthenticatedClient(username: string, pass: string): Promise<Librus> {
    const cleanUser = String(username || '').trim()
    const cleanPass = String(pass || '').trim()
    const key = cleanUser.toLowerCase()
    const now = Date.now()

    const existing = sessionStore.get(key)
    if (existing && existing.expiresAt > now) {
        return existing.client
    }

    const pending = pendingAuthStore.get(key)
    if (pending) {
        return pending
    }

    const authPromise = (async () => {
        try {
            const client = new Librus()
            await Promise.race([
                client.authorize(cleanUser, cleanPass),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Przekroczono limit czasu logowania do Librusa (30s)')), 30000)
                )
            ])
            sessionStore.set(key, {
                client,
                expiresAt: Date.now() + SESSION_TTL_MS
            })
            return client
        } finally {
            pendingAuthStore.delete(key)
        }
    })()

    pendingAuthStore.set(key, authPromise)
    return authPromise
}

export function invalidateClientSession(username: string): void {
    const key = String(username || '').trim().toLowerCase()
    sessionStore.delete(key)
    pendingAuthStore.delete(key)
}
