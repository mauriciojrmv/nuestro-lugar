import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'
import type { CommentRow } from '@/types/database'
import type { Reply } from '@/types/domain'
import { toReply } from './mappers'

export async function fetchReplies(coupleId: string): Promise<Reply[]> {
  const rows = unwrap(
    await supabase.from('memory_comments').select('*').eq('couple_id', coupleId).order('created_at'),
  ) as CommentRow[]
  return rows.map(toReply)
}

export async function addReply(r: { id: string; coupleId: string; memoryId: string; authorId: string; body: string }) {
  unwrap(
    await supabase
      .from('memory_comments')
      .upsert(
        { id: r.id, couple_id: r.coupleId, memory_id: r.memoryId, author_id: r.authorId, body: r.body.trim() },
        { onConflict: 'id', ignoreDuplicates: true },
      ),
  )
}

export async function deleteReply(id: string) {
  unwrap(await supabase.from('memory_comments').delete().eq('id', id))
}
