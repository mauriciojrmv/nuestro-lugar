import type { Profile } from '@/types/domain'

/** "Favi", "Mau": the nickname when there is one, otherwise the first name. */
export function shortName(profile: Profile | null | undefined): string {
  if (!profile) return ''
  return profile.nickname?.trim() || profile.displayName.trim().split(/\s+/)[0] || ''
}

export function initials(profile: Profile | null | undefined): string {
  return shortName(profile).charAt(0).toUpperCase()
}
