import { getNativeLibrusSession, invalidateNativeSession } from '@/services/session.service'

interface GatewayCacheItem {
    data: any
    expiresAt: number
}

const inFlightRequests = new Map<string, Promise<any>>()
const catalogCache = new Map<string, GatewayCacheItem>()

function isCacheableEndpoint(cleanPath: string): boolean {
    const p = cleanPath.toLowerCase()
    return (
        p.includes('gateway/api/2.0/users') ||
        p.includes('gateway/api/2.0/subjects') ||
        p.includes('gateway/api/2.0/auth/subjects') ||
        p.includes('gateway/api/2.0/lessons') ||
        p.includes('gateway/api/2.0/schools') ||
        p.includes('gateway/api/2.0/attendances/types') ||
        p.includes('gateway/api/2.0/grades/categories') ||
        p.includes('gateway/api/2.0/grades/comments') ||
        p.includes('gateway/api/2.0/me') ||
        p.includes('gateway/api/2.0/realizations')
    )
}

function getCacheTtlMs(cleanPath: string): number {
    const p = cleanPath.toLowerCase()
    if (p.includes('gateway/api/2.0/realizations')) return 3 * 60 * 1000 // 3 min
    if (p.includes('gateway/api/2.0/grades/comments')) return 2 * 60 * 1000 // 2 min
    return 4 * 60 * 1000 // 4 min for static catalogs
}

export function clearGatewayCache(username?: string): void {
    if (!username) {
        catalogCache.clear()
        inFlightRequests.clear()
        return
    }
    const prefix = `${username.trim().toLowerCase()}:`
    for (const key of catalogCache.keys()) {
        if (key.startsWith(prefix)) catalogCache.delete(key)
    }
    for (const key of inFlightRequests.keys()) {
        if (key.startsWith(prefix)) inFlightRequests.delete(key)
    }
}

export async function fetchGatewayEndpoint(username: string, pass: string, endpointPath: string): Promise<any> {
    const cleanUser = String(username || '').trim().toLowerCase()
    const cleanPass = String(pass || '').trim()
    const cleanPath = endpointPath.startsWith('/') ? endpointPath.slice(1) : endpointPath
    const cacheKey = `${cleanUser}:${cleanPath}`

    const now = Date.now()
    const isCacheable = isCacheableEndpoint(cleanPath)

    // 1. Check in-memory catalog cache
    if (isCacheable) {
        const cached = catalogCache.get(cacheKey)
        if (cached && cached.expiresAt > now) {
            return cached.data
        }
    }

    // 2. Check in-flight promise deduplication
    const inFlight = inFlightRequests.get(cacheKey)
    if (inFlight) {
        return inFlight
    }

    // 3. Execute request and share promise
    const execPromise = (async () => {
        try {
            const session = await getNativeLibrusSession(cleanUser, cleanPass)
            const fullUrl = cleanPath.startsWith('http') ? cleanPath : `https://synergia.librus.pl/${cleanPath}`

            const response = await session.fetch(fullUrl, {
                headers: {
                    'Referer': 'https://synergia.librus.pl/gateway/ms/studentdatapanel/ui/',
                    'Accept': 'application/json, text/plain, */*'
                }
            })

            if (response.status === 401) {
                invalidateNativeSession(cleanUser)
                clearGatewayCache(cleanUser)
                throw new Error('Sesja wygasła (401)')
            }

            let result: any
            const contentType = response.headers.get('content-type') || ''
            if (contentType.includes('application/json')) {
                result = await response.json()
            } else {
                const text = await response.text()
                if (text.includes('<!DOCTYPE') || text.includes('<html')) {
                    if (text.includes('loguj') || text.includes('form-login')) {
                        invalidateNativeSession(cleanUser)
                        clearGatewayCache(cleanUser)
                        throw new Error('Wymagane ponowne logowanie')
                    }
                }
                try {
                    result = JSON.parse(text)
                } catch {
                    result = text
                }
            }

            // Save to cache if valid
            if (isCacheable && result && typeof result === 'object' && result.code === undefined) {
                catalogCache.set(cacheKey, {
                    data: result,
                    expiresAt: Date.now() + getCacheTtlMs(cleanPath)
                })
            }

            return result
        } finally {
            inFlightRequests.delete(cacheKey)
        }
    })()

    inFlightRequests.set(cacheKey, execPromise)
    return execPromise
}
