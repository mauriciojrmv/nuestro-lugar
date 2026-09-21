/**
 * Tab bar glyphs. Outline when idle, filled when selected, like iOS.
 */
interface Props {
  active?: boolean
  className?: string
}

const base = {
  width: 26,
  height: 26,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function HomeGlyph({ active, className }: Props) {
  return (
    <svg {...base} className={className}>
      <path
        d="M4 10.2 12 4l8 6.2V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.2a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.2H5.5A1.5 1.5 0 0 1 4 19v-8.8Z"
        fill={active ? 'currentColor' : 'none'}
      />
    </svg>
  )
}

export function CalendarGlyph({ active, className }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" fill={active ? 'currentColor' : 'none'} />
      <path d="M8 3v3.5M16 3v3.5" />
      <path d="M3.5 9.8h17" stroke={active ? 'var(--bg)' : 'currentColor'} />
      <circle cx="12" cy="14.8" r="1.4" fill={active ? 'var(--bg)' : 'currentColor'} stroke="none" />
    </svg>
  )
}

export function PhotosGlyph({ active, className }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3.5" fill={active ? 'currentColor' : 'none'} />
      <path
        d="m4 17 4.6-4.6a1.5 1.5 0 0 1 2.1 0L16 17.7m-2.2-2.2 1.6-1.6a1.5 1.5 0 0 1 2.1 0l2.4 2.4"
        stroke={active ? 'var(--bg)' : 'currentColor'}
      />
      <circle cx="15.5" cy="9" r="1.5" fill={active ? 'var(--bg)' : 'none'} stroke={active ? 'none' : 'currentColor'} />
    </svg>
  )
}

export function MoreGlyph({ active, className }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" fill={active ? 'currentColor' : 'none'} />
      {[8.2, 12, 15.8].map((cx) => (
        <circle key={cx} cx={cx} cy="12" r="1.15" fill={active ? 'var(--bg)' : 'currentColor'} stroke="none" />
      ))}
    </svg>
  )
}

/** The app mark: a doorway (a place) with a warm light inside. */
export function PlaceMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none">
      <path d="M21 47.5V28.5a11 11 0 0 1 22 0v19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M17 47.5h30" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="32" cy="37.5" r="2.6" fill="var(--rose)" />
    </svg>
  )
}
