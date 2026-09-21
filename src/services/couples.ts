import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'
import type { CoupleRow, ProfileRow } from '@/types/database'
import type { Couple, Profile } from '@/types/domain'
import { toCouple, toProfile } from './mappers'

export interface CoupleState {
  couple: Couple
  members: Profile[]
}

export async function fetchMyCouple(userId: string): Promise<CoupleState | null> {
  const membership = unwrap(
    await supabase.from('couple_members').select('couple_id, couples(*)').eq('user_id', userId).maybeSingle(),
  ) as unknown as { couple_id: string; couples: CoupleRow } | null
  if (!membership) return null

  const members = unwrap(
    await supabase
      .from('couple_members')
      .select('joined_at, profiles(*)')
      .eq('couple_id', membership.couple_id)
      .order('joined_at'),
  ) as unknown as { joined_at: string; profiles: ProfileRow }[]

  return {
    couple: toCouple(membership.couples),
    members: members.map((m) => toProfile(m.profiles)),
  }
}

export async function createCouple(name: string | null, startDate: string | null) {
  return toCouple(unwrap(await supabase.rpc('create_couple', { p_name: name, p_start_date: startDate })) as CoupleRow)
}

export async function joinCouple(code: string) {
  return toCouple(unwrap(await supabase.rpc('join_couple', { p_code: code })) as CoupleRow)
}

export async function regenerateInviteCode(): Promise<string> {
  return unwrap(await supabase.rpc('regenerate_invite_code')) as string
}

export async function updateCouple(coupleId: string, patch: { name?: string; startDate?: string | null }) {
  const row: Partial<CoupleRow> = {}
  if (patch.name !== undefined) row.name = patch.name.trim() || 'Nuestro lugar'
  if (patch.startDate !== undefined) row.start_date = patch.startDate
  unwrap(await supabase.from('couples').update(row).eq('id', coupleId))
}
