import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'
import type { NoteRow } from '@/types/database'
import type { Note } from '@/types/domain'
import { toNote } from './mappers'

export async function fetchNotes(coupleId: string): Promise<Note[]> {
  const rows = unwrap(
    await supabase.from('notes').select('*').eq('couple_id', coupleId).order('created_at'),
  ) as NoteRow[]
  return rows.map(toNote)
}

export async function sendNote(n: { id: string; coupleId: string; authorId: string; recipientId: string; body: string }) {
  unwrap(
    await supabase.from('notes').upsert(
      { id: n.id, couple_id: n.coupleId, author_id: n.authorId, recipient_id: n.recipientId, body: n.body.trim() },
      { onConflict: 'id', ignoreDuplicates: true },
    ),
  )
}

/** Reading a note (recipient) or taking it back (author): either way it's gone for good. */
export async function removeNote(id: string) {
  unwrap(await supabase.from('notes').delete().eq('id', id))
}
