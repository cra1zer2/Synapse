import { getNativeLibrusSession, invalidateNativeSession } from '@/services/session.service'

export async function fetchGatewayEndpoint(username: string, pass: string, endpointPath: string): Promise<any> {
    const cleanUser = String(username || '').trim()
    const cleanPass = String(pass || '').trim()
    const session = await getNativeLibrusSession(cleanUser, cleanPass)

    const cleanPath = endpointPath.startsWith('/') ? endpointPath.slice(1) : endpointPath
    const fullUrl = cleanPath.startsWith('http') ? cleanPath : `https://synergia.librus.pl/${cleanPath}`

    const response = await session.fetch(fullUrl, {
        headers: {
            'Referer': 'https://synergia.librus.pl/gateway/ms/studentdatapanel/ui/',
            'Accept': 'application/json, text/plain, */*'
        }
    })

    if (response.status === 401) {
        invalidateNativeSession(cleanUser)
        throw new Error('Sesja wygasła (401)')
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
        return await response.json()
    }

    const text = await response.text()
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        if (text.includes('loguj') || text.includes('form-login')) {
            invalidateNativeSession(cleanUser)
            throw new Error('Wymagane ponowne logowanie')
        }
    }

    try {
        return JSON.parse(text)
    } catch {
        return text
    }
}
