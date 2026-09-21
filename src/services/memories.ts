import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'
import type { ISODate } from '@/lib/dates'
import type { Memory } from '@/types/domain'
import { toMemory, type MemoryWithRelations } from './mappers'
import { photoStorage } from './storage'

const MEMORY_SELECT = '*, memory_photos!memory_photos_memory_fk(*), favorites(user_id)'

/**
 * The whole archive in one query. Every view (Home, Calendar, Photos, Historia,
 * Momentos) derives from this single cached list, so they can never disagree.
 */
export async function fetchMemories(coupleId: string): Promise<Memory[]> {
  const rows = unwrap(
    await supabase
      .from('memories')
      .select(MEMORY_SELECT)
      .eq('couple_id', coupleId)
      .order('memory_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ) as unknown as MemoryWithRelations[]
  return rows.map(toMemory)
}

export interface MemoryFields {
  date: ISODate
  title: string | null
  body: string | null
  location: string | null
  mood: string | null
}

const memoryRow = (f: MemoryFields) => ({
  memory_date: f.date,
  title: f.title?.trim() || null,
  body: f.body?.trim() || null,
  location: f.location?.trim() || null,
  mood: f.mood || null,
})

/** Idempotent: re-running with the same id (retry, offline sync) is a no-op. */
export async function insertMemory(id: string, coupleId: string, userId: string, fields: MemoryFields) {
  unwrap(
    await supabase
      .from('memories')
      .upsert(
        { id, couple_id: coupleId, created_by: userId, ...memoryRow(fields) },
        { onConflict: 'id', ignoreDuplicates: true },
      ),
  )
}

export async function updateMemory(id: string, fields: MemoryFields) {
  unwrap(await supabase.from('memories').update(memoryRow(fields)).eq('id', id))
}

export async function setMemoryCover(id: string, photoId: string | null) {
  unwrap(await supabase.from('memories').update({ cover_photo_id: photoId }).eq('id', id))
}

export async function deleteMemory(memory: Memory) {
  unwrap(await supabase.from('memories').delete().eq('id', memory.id))
  const paths = memory.photos.flatMap((p) => (p.thumbPath ? [p.storagePath, p.thumbPath] : [p.storagePath]))
  // The rows are gone, so the files are unreachable either way; cleaning them up is best-effort.
  photoStorage.remove(paths).catch(console.error)
}
