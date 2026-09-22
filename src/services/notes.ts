import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'
import type { NoteRow } from '@/types/database'
import type { Note } from '@/types/domain'
import { prepareSnapshot } from '@/utils/image'
import { toNote } from './mappers'
import { photoStorage } from './storage'

export async function fetchNotes(coupleId: string): Promise<Note[]> {
  const rows = unwrap(
    await supabase.from('notes').select('*').eq('couple_id', coupleId).order('created_at'),
  ) as NoteRow[]
  return rows.map(toNote)
}

export const notePhotoPath = (coupleId: string, noteId: string) => `couples/${coupleId}/notes/${noteId}.jpg`

export async function sendNote(n: {
  id: string
  coupleId: string
  authorId: string
  recipientId: string
  body: string
  photo?: File | null
  onProgress?: (fraction: number) => void
}) {
  let photoPath: string | null = null
  if (n.photo) {
    const blob = await prepareSnapshot(n.photo)
    photoPath = notePhotoPath(n.coupleId, n.id)
    await photoStorage.upload(photoPath, blob, { contentType: 'image/jpeg', onProgress: (b) => n.onProgress?.(b / blob.size) })
  }
  unwrap(
    await supabase.from('notes').upsert(
      {
        id: n.id,
        couple_id: n.coupleId,
        author_id: n.authorId,
        recipient_id: n.recipientId,
        body: n.body.trim(),
        photo_path: photoPath,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    ),
  )
}

/**
 * Reading a note (recipient) or taking it back (author): either way it's gone
 * for good, photo included. "loved" tells the author it was loved, not just seen.
 */
export async function removeNote(note: Note, loved = false) {
  if (loved) unwrap(await supabase.from('notes').update({ loved: true }).eq('id', note.id))
  unwrap(await supabase.from('notes').delete().eq('id', note.id))
  if (note.photoPath) photoStorage.remove([note.photoPath]).catch(console.error)
}
