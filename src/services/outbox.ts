import { createStore, get, set, del } from 'idb-keyval'
import { isNetworkError } from '@/lib/errors'
import { insertMemory, type MemoryFields } from './memories'
import { insertLetter, type NewLetter } from './letters'

/**
 * Non-destructive actions made while offline (text memories and letters) are
 * kept on the device and replayed when the connection comes back. Every insert
 * uses a client-generated id and is idempotent, so replaying twice is harmless.
 */
export type OutboxItem =
  | { kind: 'memory'; key: string; id: string; coupleId: string; userId: string; fields: MemoryFields; createdAt: string }
  | { kind: 'letter'; key: string; letter: NewLetter; createdAt: string }

const store = createStore('nuestro-lugar-outbox', 'items')
const KEY = 'items'

export async function readOutbox(): Promise<OutboxItem[]> {
  return (await get<OutboxItem[]>(KEY, store)) ?? []
}

export async function enqueue(item: OutboxItem) {
  const items = await readOutbox()
  await set(KEY, [...items, item], store)
}

export async function clearOutbox() {
  await del(KEY, store)
}

let flushing: Promise<{ synced: number; failed: number }> | null = null

export function flushOutbox(): Promise<{ synced: number; failed: number }> {
  flushing ??= (async () => {
    const items = await readOutbox()
    const remaining: OutboxItem[] = []
    let synced = 0
    let failed = 0
    for (const item of items) {
      try {
        if (item.kind === 'memory') await insertMemory(item.id, item.coupleId, item.userId, item.fields)
        else await insertLetter(item.letter)
        synced++
      } catch (error) {
        console.error(error)
        // Keep it only if it failed for lack of connection; anything else would fail forever.
        if (isNetworkError(error)) remaining.push(item)
        else failed++
      }
    }
    // Items queued while we were flushing must survive.
    const processed = new Set(items.map((i) => i.key))
    const added = (await readOutbox()).filter((i) => !processed.has(i.key))
    await set(KEY, [...remaining, ...added], store)
    return { synced, failed }
  })().finally(() => {
    flushing = null
  })
  return flushing
}
