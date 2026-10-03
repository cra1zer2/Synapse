export function safeUnwrapResponse(response: any): any {
    if (response === null || response === undefined) {
        return null
    }

    if (typeof response === 'string') {
        try {
            return JSON.parse(response)
        } catch {
            return response
        }
    }

    if (typeof response === 'number' || typeof response === 'boolean') {
        return response
    }

    if (typeof response === 'function') {
        try {
            const bodyText = response('body').text()
            if (bodyText && bodyText.trim().length > 0) {
                try {
                    return JSON.parse(bodyText.trim())
                } catch {
                    return bodyText.trim()
                }
            }
            const allText = response.text ? response.text() : ''
            if (allText && allText.trim().length > 0) {
                try {
                    return JSON.parse(allText.trim())
                } catch {
                    return allText.trim()
                }
            }
            const htmlText = response.html ? response.html() : ''
            return htmlText
        } catch (err) {
            return { functionError: String(err) }
        }
    }

    if (typeof response === 'object') {
        if ('data' in response && response.data !== undefined) {
            return safeUnwrapResponse(response.data)
        }
        if ('body' in response && response.body !== undefined) {
            return safeUnwrapResponse(response.body)
        }
        if ('payload' in response && response.payload !== undefined) {
            return safeUnwrapResponse(response.payload)
        }

        try {
            return JSON.parse(JSON.stringify(response))
        } catch {
            const result: Record<string, any> = {}
            for (const key of Object.keys(response)) {
                if (
                    key === 'request' ||
                    key === 'socket' ||
                    key === 'client' ||
                    key === 'req' ||
                    key === 'res' ||
                    key === 'connection'
                ) {
                    continue
                }
                try {
                    result[key] = JSON.parse(JSON.stringify(response[key]))
                } catch {
                    result[key] = typeof response[key]
                }
            }
            return result
        }
    }

    return response
}