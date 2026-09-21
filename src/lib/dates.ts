/** Calendar dates are stored as plain 'YYYY-MM-DD' strings and parsed as local dates. */
export type ISODate = string

const LOCALE = 'es-ES'

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export const WEEKDAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO(): ISODate {
  return toISODate(new Date())
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return toISODate(parseISODate(value)) === value
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function monthName(month: number): string {
  return MONTHS[month]
}

/** "21 de septiembre" (adds the year when it isn't the current one). */
export function formatDayMonth(iso: ISODate, forceYear = false): string {
  const d = parseISODate(iso)
  const base = `${d.getDate()} de ${MONTHS[d.getMonth()]}`
  return forceYear || d.getFullYear() !== new Date().getFullYear() ? `${base} de ${d.getFullYear()}` : base
}

/** "21 de septiembre de 2026" */
export function formatLong(iso: ISODate): string {
  return formatDayMonth(iso, true)
}

/** "Hoy", "Ayer" or "5 de septiembre" */
export function formatRelativeDay(iso: ISODate): string {
  const today = todayISO()
  if (iso === today) return 'Hoy'
  if (iso === addDays(today, -1)) return 'Ayer'
  if (iso === addDays(today, 1)) return 'Mañana'
  return formatDayMonth(iso)
}

/** "lunes" */
export function formatWeekday(iso: ISODate): string {
  return parseISODate(iso).toLocaleDateString(LOCALE, { weekday: 'long' })
}

/** "11 SEP 2026" */
export function formatShort(iso: ISODate): string {
  const d = parseISODate(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3).toUpperCase()} ${d.getFullYear()}`
}

/** "Septiembre 2026" */
export function formatMonthYear(year: number, month: number): string {
  return `${capitalize(MONTHS[month])} ${year}`
}

const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })

/** "hace 2 horas" */
export function timeAgo(timestamp: string, now = Date.now()): string {
  const seconds = Math.round((new Date(timestamp).getTime() - now) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 45) return 'ahora'
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour')
  if (abs < 86400 * 7) return relative.format(Math.round(seconds / 86400), 'day')
  return formatDayMonth(toISODate(new Date(timestamp)))
}

export interface CalendarDay {
  iso: ISODate
  day: number
  inMonth: boolean
}

/** Monday-first weeks covering the whole month. */
export function monthMatrix(year: number, month: number): CalendarDay[][] {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - offset)
  const weeks: CalendarDay[][] = []
  const cursor = new Date(start)
  do {
    const week: CalendarDay[] = []
    for (let i = 0; i < 7; i++) {
      week.push({ iso: toISODate(cursor), day: cursor.getDate(), inMonth: cursor.getMonth() === month })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  } while (cursor.getMonth() === month)
  return weeks
}

export function monthKey(iso: ISODate): string {
  return iso.slice(0, 7)
}
