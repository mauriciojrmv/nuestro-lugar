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
  ({ url, request }) => request.method === 'GET' && url.pathname.includes('/storage/v1/object/sign/'),
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
