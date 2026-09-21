import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'
import type { ISODate } from '@/lib/dates'
import type { LetterRow } from '@/types/database'
import type { Letter } from '@/types/domain'
import { toLetter } from './mappers'

export async function fetchLetters(coupleId: string): Promise<Letter[]> {
  const rows = unwrap(
    await supabase
      .from('letters')
      .select('*')
      .eq('couple_id', coupleId)
      .order('letter_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ) as LetterRow[]
  return rows.map(toLetter)
}

export interface NewLetter {
  id: string
  coupleId: string
  authorId: string
  recipientId: string
  date: ISODate
  body: string
}

/** Idempotent so it can be replayed from the offline outbox. */
export async function insertLetter(l: NewLetter) {
  unwrap(
    await supabase.from('letters').upsert(
      {
        id: l.id,
        couple_id: l.coupleId,
        author_id: l.authorId,
        recipient_id: l.recipientId,
        letter_date: l.date,
        body: l.body.trim(),
      },
      { onConflict: 'id', ignoreDuplicates: true },
    ),
  )
}

export async function markLetterRead(id: string) {
  unwrap(await supabase.from('letters').update({ read_at: new Date().toISOString() }).eq('id', id).is('read_at', null))
}

export async function deleteLetter(id: string) {
  unwrap(await supabase.from('letters').delete().eq('id', id))
}
