import { addDays, parseISODate, type ISODate } from '@/lib/dates'
import type { Memory } from '@/types/domain'

export interface Rediscovery {
  memory: Memory
  label: string
}

/**
 * Picks an older memory to bring back to the surface, preferring anniversaries:
 * the same date in an earlier year, then the same day in an earlier month.
 * Stable for the whole day, so it doesn't change on every visit.
 */
export function rediscover(memories: Memory[], today: ISODate): Rediscovery | null {
  const cutoff = addDays(today, -14)
  const older = memories.filter((m) => m.date <= cutoff && !m.pending)
  if (older.length === 0) return null

  const t = parseISODate(today)
  const sameDate = older.filter((m) => m.date.slice(5) === today.slice(5))
  if (sameDate.length) {
    const memory = sameDate[0]
    const years = t.getFullYear() - parseISODate(memory.date).getFullYear()
    return { memory, label: years === 1 ? 'Hace un año' : `Hace ${years} años` }
  }

  const sameDay = older.filter((m) => m.date.slice(8) === today.slice(8))
  if (sameDay.length) {
    const memory = sameDay[0]
    const d = parseISODate(memory.date)
    const months = (t.getFullYear() - d.getFullYear()) * 12 + t.getMonth() - d.getMonth()
    return { memory, label: months === 1 ? 'Hace un mes' : `Hace ${months} meses` }
  }

  const seed = [...today].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
  return { memory: older[seed % older.length], label: 'Volver a este día' }
}
