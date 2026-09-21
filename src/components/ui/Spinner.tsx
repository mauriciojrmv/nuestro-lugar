import { cn } from '@/lib/cn'

/** iOS-style activity indicator: 8 fading spokes. */
export function Spinner({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn('animate-spin [animation-duration:900ms] [animation-timing-function:steps(8)]', className)}
      role="progressbar"
      aria-label="Cargando"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <rect
          key={i}
          x="11"
          y="2"
          width="2"
          height="6"
          rx="1"
          fill="currentColor"
          opacity={0.25 + (i / 8) * 0.75}
          transform={`rotate(${i * 45} 12 12)`}
        />
      ))}
    </svg>
  )
}
