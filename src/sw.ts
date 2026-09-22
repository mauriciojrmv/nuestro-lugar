/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { clientsClaim } from 'workbox-core'
import { PHOTO_CACHE } from './lib/cacheNames'

declare const self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()

// App shell
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

/**
 * Private photos. Signed URLs change every hour, but the file behind a path never
 * does, so the cache key drops the token. Photos load instantly the second time
 * and stay viewable offline, on this device only (cleared on sign-out).
 * Only successful CORS responses are stored; nothing is ever cached for the API.
 */
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    url.pathname.includes('/storage/v1/object/sign/') &&
    // Notita photos are seen once: never kept on the device.
    !url.pathname.includes('/notes/') &&
    // Videos stream with range requests; only images are cached.
    /\.(jpe?g|png|webp|gif|avif)$/i.test(url.pathname),
  new CacheFirst({
    cacheName: PHOTO_CACHE,
    plugins: [
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          const url = new URL(request.url)
          url.search = ''
          return url.href
        },
      },
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 2500, maxAgeSeconds: 60 * 60 * 24 * 60, purgeOnQuotaError: true }),
    ],
  }),
)

// ---------------------------------------------------------------------------
// Push notifications: "Favi guardó un recuerdo con 3 fotos."
// ---------------------------------------------------------------------------
interface PushPayload {
  title?: string
  body?: string
  url?: string
  tag?: string
}

self.addEventListener('push', (event) => {
  let data: PushPayload = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { body: event.data?.text() }
  }
  const scope = self.registration.scope
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Nuestro Lugar', {
      body: data.body ?? '',
      icon: `${scope}pwa-192.png`,
      badge: `${scope}pwa-192.png`,
      tag: data.tag,
      data: { url: scope + (data.url ?? '') },
    }),
  )
})

// Tapping a notification opens (or focuses) the app on the right screen.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url: string = event.notification.data?.url ?? self.registration.scope
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = windows.find((w) => w.url.startsWith(self.registration.scope))
      if (existing) {
        await existing.focus()
        return existing.navigate(url)
      }
      return self.clients.openWindow(url)
    })(),
  )
})
