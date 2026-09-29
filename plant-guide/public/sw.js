// Shows watering reminders pushed via Firebase Cloud Messaging and opens the
// app when one is tapped. No offline caching on purpose: GitHub Pages already
// caches aggressively and a stale service-worker cache would hide deploys.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }
  const msg = payload.data || payload.notification || payload

  // iOS revokes push permission if a push arrives without a visible notification.
  event.waitUntil(
    self.registration.showNotification(msg.title || 'Plants', {
      body: msg.body || '',
      icon: 'icon-192.png',
      tag: msg.tag || 'watering',
      data: { url: msg.url || './' },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || './', self.registration.scope).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
      const open = windows.find(w => w.url.startsWith(self.registration.scope))
      if (open) return open.focus()
      return self.clients.openWindow(url)
    })
  )
})
