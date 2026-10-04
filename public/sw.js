self.addEventListener('install', (event) => {
    self.skipWaiting()
})

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
    if (!event.data) return

    let data = {}
    try {
        data = event.data.json()
    } catch (e) {
        data = { title: 'Synapse', body: event.data.text() }
    }

    const options = {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: data.tag || 'synapse-update',
        data: data.data || { url: '/' },
        vibrate: [80, 40, 80]
    }

    event.waitUntil(self.registration.showNotification(data.title || 'Synapse', options))
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    const targetUrl = (event.notification.data && event.notification.data.url) || '/'

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(targetUrl)
                    return client.focus()
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl)
            }
        })
    )
})