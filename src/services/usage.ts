import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'

/** The storage plan's size. Change VITE_STORAGE_LIMIT_MB after upgrading (e.g. 102400 for 100 GB). */
export const STORAGE_LIMIT_BYTES = (Number(import.meta.env.VITE_STORAGE_LIMIT_MB) || 1024) * 1024 * 1024

/** When to start showing a gentle heads-up on Home. */
export const STORAGE_WARN_AT = 0.8

export async function fetchStorageUsage(): Promise<number> {
  return Number(unwrap(await supabase.rpc('couple_storage_usage')) ?? 0)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  if (bytes < 1024 ** 3) return `${Math.round(bytes / 1024 ** 2)} MB`
  return `${(bytes / 1024 ** 3).toFixed(bytes < 10 * 1024 ** 3 ? 1 : 0).replace('.', ',')} GB`
}
