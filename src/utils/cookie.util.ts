export function extractCookieHeader(client: any): string {
    const caller = client._caller || client.caller
    if (!caller) {
        return ''
    }

    const jar = caller.cookieJar || caller._cookieJar || (caller._request && caller._request._jar)
    if (!jar) {
        return ''
    }

    try {
        if (typeof jar.getCookieStringSync === 'function') {
            return jar.getCookieStringSync('https://synergia.librus.pl')
        }
    } catch { }

    try {
        if (typeof jar.getCookiesSync === 'function') {
            const cookies = jar.getCookiesSync('https://synergia.librus.pl')
            return cookies.map((c: any) => `${c.key}=${c.value}`).join('; ')
        }
    } catch { }

    return ''
}