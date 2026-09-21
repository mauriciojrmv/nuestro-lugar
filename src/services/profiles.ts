import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'
import { prepareAvatar } from '@/utils/image'
import { avatarStoragePath, photoStorage } from './storage'

export async function updateProfile(userId: string, patch: { displayName?: string; nickname?: string | null }) {
  const row: Record<string, string | null> = {}
  if (patch.displayName !== undefined) row.display_name = patch.displayName.trim()
  if (patch.nickname !== undefined) row.nickname = patch.nickname?.trim() || null
  unwrap(await supabase.from('profiles').update(row).eq('id', userId))
}

export async function updateAvatar(userId: string, file: File, previousPath: string | null) {
  const blob = await prepareAvatar(file)
  const path = avatarStoragePath(userId)
  await photoStorage.upload(path, blob, { contentType: 'image/jpeg' })
  unwrap(await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId))
  if (previousPath) photoStorage.remove([previousPath]).catch(console.error)
  return path
}
