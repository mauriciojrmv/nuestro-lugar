import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'
import type { Photo } from '@/types/domain'
import { photoStorage } from './storage'

export interface NewPhotoRow {
  id: string
  memory_id: string
  couple_id: string
  storage_path: string
  thumb_path: string
  original_filename: string
  content_type: string
  width: number
  height: number
  size_bytes: number
  position: number
  created_by: string
}

/** Inserted in one statement so the partner sees a single "agregó 3 fotos". */
export async function insertPhotos(rows: NewPhotoRow[]) {
  if (rows.length === 0) return
  unwrap(await supabase.from('memory_photos').upsert(rows, { onConflict: 'id', ignoreDuplicates: true }))
}

export async function deletePhoto(photo: Photo) {
  unwrap(await supabase.from('memory_photos').delete().eq('id', photo.id))
  const paths = photo.thumbPath ? [photo.storagePath, photo.thumbPath] : [photo.storagePath]
  photoStorage.remove(paths).catch(console.error)
}
