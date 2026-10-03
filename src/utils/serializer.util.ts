export function safeUnwrapResponse(response: any): any {
    if (response === null || response === undefined) {
        return null
    }

    let textContent = ''

    if (typeof response === 'function') {
        try {
            if (typeof (response as any).text === 'function') {
                textContent = (response as any).text()
            } else if (typeof (response as any).html === 'function') {
                textContent = response('body').text() || (response as any).html()
            } else {
                textContent = String(response)
            }
        } catch {
            textContent = String(response)
        }
    } else if (typeof response === 'string') {
        textContent = response
    } else if (typeof response === 'object') {
        if (typeof response.text === 'function') {
            try {
                textContent = response.text()
            } catch {
                textContent = ''
            }
        } else if (typeof response.html === 'function') {
            try {
                textContent = response('body').text() || response.html()
            } catch {
                textContent = ''
            }
        } else {
            try {
                return JSON.parse(JSON.stringify(response))
            } catch {
                textContent = String(response)
            }
        }
    } else {
        return response
    }

    if (textContent) {
        try {
            return JSON.parse(textContent)
        } catch {
            return textContent
        }
    }

    return response
}