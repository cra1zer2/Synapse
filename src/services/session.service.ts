const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

function makeBannerHeader(): string {
    const shiftCharacters = (value: string | number) =>
        String(value)
            .split('')
            .map((character) => String.fromCharCode(character.charCodeAt(0) + 20))
            .join('')
    return `${shiftCharacters(Math.random())}_${shiftCharacters(Date.now())}`
}

class NativeCookieJar {
    private cookies: Map<string, Map<string, string>> = new Map([
        ['synergia.librus.pl', new Map([['TestCookie', '1']])]
    ])

    saveFromHeaders(domain: string, headers: Headers): void {
        let setCookieHeaders: string[] = []
        if (typeof (headers as any).getSetCookie === 'function') {
            setCookieHeaders = (headers as any).getSetCookie()
        } else {
            const raw = headers.get('set-cookie')
            if (raw) {
                setCookieHeaders = raw.split(/,(?=[^;]+=[^;]+)/)
            }
        }

        if (!this.cookies.has(domain)) {
            this.cookies.set(domain, new Map())
        }
        const domainMap = this.cookies.get(domain)!

        for (const str of setCookieHeaders) {
            const [pair] = str.split(';')
            const eqIdx = pair.indexOf('=')
            if (eqIdx > 0) {
                const name = pair.slice(0, eqIdx).trim()
                const val = pair.slice(eqIdx + 1).trim()
                if (!val || val === 'deleted') {
                    domainMap.delete(name)
                } else {
                    domainMap.set(name, val)
                }
            }
        }
    }

    getCookieHeader(domain: string): string {
        const merged = new Map<string, string>()
        for (const [d, map] of this.cookies.entries()) {
            if (domain.includes(d) || d.includes(domain)) {
                for (const [k, v] of map.entries()) {
                    merged.set(k, v)
                }
            }
        }
        const parts: string[] = []
        for (const [k, v] of merged.entries()) {
            parts.push(`${k}=${v}`)
        }
        return parts.join('; ')
    }
}

export class NativeLibrusSession {
    username: string
    password: string
    jar: NativeCookieJar
    isAuthenticated: boolean
    expiresAt: number

    constructor(username: string, password: string) {
        this.username = String(username || '').trim()
        this.password = String(password || '').trim()
        this.jar = new NativeCookieJar()
        this.isAuthenticated = false
        this.expiresAt = 0
    }

    async authenticate(): Promise<void> {
        const v = Math.floor(Date.now() / 1000)
        let res = await fetch(`https://synergia.librus.pl/loguj/portalRodzina?v=${v}`, {
            headers: { 'User-Agent': UA },
            redirect: 'manual'
        })
        this.jar.saveFromHeaders('synergia.librus.pl', res.headers)
        let loc = res.headers.get('location')
        if (!loc) {
            throw new Error('Brak adresu przekierowania logowania Synergia')
        }

        let oauthUrl = loc.startsWith('http') ? loc : `https://api.librus.pl${loc}`
        res = await fetch(oauthUrl, {
            headers: {
                'User-Agent': UA,
                'Cookie': this.jar.getCookieHeader('api.librus.pl')
            },
            redirect: 'manual'
        })
        this.jar.saveFromHeaders('api.librus.pl', res.headers)

        if (res.status === 302 && res.headers.get('location')) {
            const nextLoc = res.headers.get('location')!
            oauthUrl = nextLoc.startsWith('http') ? nextLoc : `https://api.librus.pl${nextLoc}`
            res = await fetch(oauthUrl, {
                headers: {
                    'User-Agent': UA,
                    'Cookie': this.jar.getCookieHeader('api.librus.pl')
                },
                redirect: 'manual'
            })
            this.jar.saveFromHeaders('api.librus.pl', res.headers)
        }

        const loginParams = new URLSearchParams({
            action: 'login',
            login: this.username,
            pass: this.password
        })

        res = await fetch('https://api.librus.pl/OAuth/Authorization?client_id=46', {
            method: 'POST',
            headers: {
                'User-Agent': UA,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Referer': 'https://api.librus.pl/OAuth/Authorization?client_id=46',
                'Origin': 'https://api.librus.pl',
                'x-baner': makeBannerHeader(),
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Cookie': this.jar.getCookieHeader('api.librus.pl')
            },
            body: loginParams.toString(),
            redirect: 'manual'
        })
        this.jar.saveFromHeaders('api.librus.pl', res.headers)

        const authJson: any = await res.json().catch(() => null)
        if (!authJson || authJson.status !== 'ok' || !authJson.goTo) {
            throw new Error((authJson && authJson.message) || 'Nieprawidłowy login lub hasło')
        }

        let currentTarget: string | null = authJson.goTo.startsWith('http') ? authJson.goTo : `https://api.librus.pl${authJson.goTo}`
        let hopCount = 0

        while (currentTarget && hopCount < 10) {
            hopCount++
            const domain = new URL(currentTarget).hostname
            res = await fetch(currentTarget, {
                headers: {
                    'User-Agent': UA,
                    'Referer': 'https://api.librus.pl/',
                    'Cookie': this.jar.getCookieHeader(domain)
                },
                redirect: 'manual'
            })
            this.jar.saveFromHeaders(domain, res.headers)

            if (res.status === 302 || res.status === 301 || res.status === 303 || res.status === 307) {
                const nextStep = res.headers.get('location')
                if (!nextStep) break
                currentTarget = nextStep.startsWith('http') ? nextStep : `https://${domain}${nextStep}`
            } else {
                break
            }
        }

        this.isAuthenticated = true
        this.expiresAt = Date.now() + 20 * 60 * 1000
    }

    async fetch(url: string, options: RequestInit = {}): Promise<Response> {
        let currentUrl = url
        let currentOptions: RequestInit = { ...options }
        let hops = 0

        while (hops < 6) {
            hops++
            const targetDomain = new URL(currentUrl).hostname
            const cookieHeader = this.jar.getCookieHeader(targetDomain)
            const headers: Record<string, string> = {
                'User-Agent': UA,
                ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
                ...((currentOptions.headers as Record<string, string>) || {})
            }

            const res = await fetch(currentUrl, {
                ...currentOptions,
                headers,
                redirect: 'manual'
            })

            this.jar.saveFromHeaders(targetDomain, res.headers)

            if (res.status === 301 || res.status === 302 || res.status === 303 || res.status === 307 || res.status === 308) {
                const location = res.headers.get('location')
                if (!location) return res
                currentUrl = new URL(location, currentUrl).toString()
                if (res.status === 301 || res.status === 302 || res.status === 303) {
                    currentOptions = {
                        method: 'GET',
                        headers: {
                            Referer: url
                        }
                    }
                }
                continue
            }

            return res
        }

        const finalDomain = new URL(currentUrl).hostname
        const finalCookie = this.jar.getCookieHeader(finalDomain)
        return fetch(currentUrl, {
            ...currentOptions,
            headers: {
                'User-Agent': UA,
                ...(finalCookie ? { 'Cookie': finalCookie } : {}),
                ...((currentOptions.headers as Record<string, string>) || {})
            }
        })
    }
}

const activeSessions = new Map<string, NativeLibrusSession>()
const pendingLogins = new Map<string, Promise<NativeLibrusSession>>()

export async function getNativeLibrusSession(username: string, password: string): Promise<NativeLibrusSession> {
    const key = String(username || '').trim().toLowerCase()
    const now = Date.now()

    const existing = activeSessions.get(key)
    if (existing && existing.isAuthenticated && existing.expiresAt > now) {
        return existing
    }

    const inFlight = pendingLogins.get(key)
    if (inFlight) {
        return inFlight
    }

    const loginPromise = (async () => {
        try {
            const session = new NativeLibrusSession(username, password)
            await session.authenticate()
            activeSessions.set(key, session)
            return session
        } finally {
            pendingLogins.delete(key)
        }
    })()

    pendingLogins.set(key, loginPromise)
    return loginPromise
}

export function invalidateNativeSession(username: string): void {
    const key = String(username || '').trim().toLowerCase()
    activeSessions.delete(key)
    pendingLogins.delete(key)
}
