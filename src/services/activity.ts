import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'
import type { ActivityRow } from '@/types/database'
import type { Activity } from '@/types/domain'
import { toActivity } from './mappers'

export async function fetchActivity(coupleId: string, limit = 12): Promise<Activity[]> {
  const rows = unwrap(
    await supabase
      .from('activity')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ) as ActivityRow[]
  return rows.map(toActivity)
}
