import { formatMonthYear, parseISODate } from '@/lib/dates'
import type { Memory } from '@/types/domain'

export interface ArchiveStats {
  memories: number
  photos: number
  specialDays: number
  first: Memory | null
  busiestMonth: string | null
}

/** Emotional numbers, not a dashboard. */
export function computeStats(memories: Memory[]): ArchiveStats {
  const perMonth = new Map<string, number>()
  let photos = 0
  const special = new Set<string>()
  for (const m of memories) {
    photos += m.photos.length
    if (m.favoritedBy.length) special.add(m.date)
    const key = m.date.slice(0, 7)
    perMonth.set(key, (perMonth.get(key) ?? 0) + 1)
  }
  let busiest: [string, number] | null = null
  for (const entry of perMonth) if (!busiest || entry[1] > busiest[1]) busiest = entry
  const first = memories.length ? memories.reduce((a, b) => (b.date < a.date ? b : a)) : null
  const busiestDate = busiest && busiest[1] > 1 ? parseISODate(`${busiest[0]}-01`) : null

  return {
    memories: memories.length,
    photos,
    specialDays: special.size,
    first,
    busiestMonth: busiestDate ? formatMonthYear(busiestDate.getFullYear(), busiestDate.getMonth()) : null,
  }
}
