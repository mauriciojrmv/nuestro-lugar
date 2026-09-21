import { photoStorage } from './provider'

/**
 * Batches and caches signed URLs. Components ask for one path at a time;
 * requests made in the same tick are signed in a single round trip.
 */
const TTL_SECONDS = 60 * 60
const REFRESH_MARGIN_MS = 5 * 60 * 1000
const MAX_BATCH = 100

interface Entry {
  url: string
  expiresAt: number
}

const cache = new Map<string, Entry>()
const waiting = new Map<string, Array<{ resolve: (url: string) => void; reject: (e: unknown) => void }>>()
let scheduled = false

export function peekSignedUrl(path: string): string | undefined {
  const hit = cache.get(path)
  return hit && hit.expiresAt - REFRESH_MARGIN_MS > Date.now() ? hit.url : undefined
}

export function getSignedUrl(path: string): Promise<string> {
  const hit = peekSignedUrl(path)
  if (hit) return Promise.resolve(hit)
  return new Promise((resolve, reject) => {
    const list = waiting.get(path)
    if (list) list.push({ resolve, reject })
    else waiting.set(path, [{ resolve, reject }])
    if (!scheduled) {
      scheduled = true
      setTimeout(flush, 0)
    }
  })
}

export function clearSignedUrlCache() {
  cache.clear()
}

async function flush() {
  scheduled = false
  const batch = [...waiting.entries()]
  waiting.clear()
  for (let i = 0; i < batch.length; i += MAX_BATCH) {
    const chunk = batch.slice(i, i + MAX_BATCH)
    try {
      const urls = await photoStorage.signUrls(chunk.map(([p]) => p), TTL_SECONDS)
      const expiresAt = Date.now() + TTL_SECONDS * 1000
      for (const [path, handlers] of chunk) {
        const url = urls[path]
        if (url) {
          cache.set(path, { url, expiresAt })
          handlers.forEach((h) => h.resolve(url))
        } else {
          handlers.forEach((h) => h.reject(new Error('not_found')))
        }
      }
    } catch (error) {
      for (const [, handlers] of chunk) handlers.forEach((h) => h.reject(error))
    }
  }
}
