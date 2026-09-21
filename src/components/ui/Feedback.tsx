import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

export function EmptyState({
  title,
  message,
  action,
  icon,
  className,
}: {
  title: string
  message?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex animate-rise flex-col items-center px-6 py-16 text-center', className)}>
      {icon && <div className="mb-5 text-accent [&>svg]:size-10">{icon}</div>}
      <p className="text-[22px] font-semibold tracking-[-0.02em] text-balance">{title}</p>
      {message && <p className="mt-2 max-w-[30ch] text-[15px] text-pretty text-muted">{message}</p>}
      {action && <div className="mt-7">{action}</div>}
    </div>
  )
}

/** Human error with a retry. */
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      title={message ?? 'No pudimos cargar esto.'}
      message="Comprueba tu conexión e inténtalo nuevamente."
      action={
        onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Reintentar
          </Button>
        )
      }
    />
  )
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-2', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-300 ease-[var(--ease-soft)]"
        style={{ width: `${Math.max(2, Math.min(100, value * 100))}%` }}
      />
    </div>
  )
}

/** Soft animated check drawn with a single stroke. */
export function SuccessCheck({ size = 72 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      aria-hidden
    >
      <circle cx="36" cy="36" r="34" className="fill-accent/15" />
      <motion.path
        d="M23 37.5 32 46l17-19"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.45, delay: 0.12, ease: [0.32, 0.72, 0, 1] }}
      />
    </motion.svg>
  )
}

/** Quiet skeleton block. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-[18px] bg-surface-2/70', className)} />
}
