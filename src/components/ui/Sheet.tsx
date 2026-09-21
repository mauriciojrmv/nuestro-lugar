import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react'
import { cn } from '@/lib/cn'
import { useIsWide } from '@/hooks/useMediaQuery'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Accessible name for the dialog. */
  label: string
  /** When false, the sheet can't be swiped or tapped away (e.g. while saving). */
  dismissible?: boolean
  className?: string
  /** Taller sheets for composing; compact for menus. */
  size?: 'auto' | 'tall'
}

let openSheets = 0

function lockScroll() {
  if (openSheets++ === 0) document.documentElement.style.overflow = 'hidden'
}
function unlockScroll() {
  if (--openSheets === 0) document.documentElement.style.overflow = ''
}

const spring = { type: 'spring', stiffness: 380, damping: 38, mass: 0.9 } as const

/**
 * iOS-like sheet: slides up from the bottom on phones, a centered card on wider screens.
 * Swipe down on the grabber area to dismiss.
 */
export function Sheet({ open, onClose, children, label, dismissible = true, className, size = 'auto' }: SheetProps) {
  const wide = useIsWide()
  const drag = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const dismissRef = useRef(dismissible)
  dismissRef.current = dismissible

  useEffect(() => {
    if (!open) return
    lockScroll()
    const previous = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissRef.current) closeRef.current()
    }
    window.addEventListener('keydown', onKey)
    requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }))
    return () => {
      unlockScroll()
      window.removeEventListener('keydown', onKey)
      previous?.focus?.({ preventScroll: true })
    }
  }, [open])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (dismissible && (info.offset.y > 120 || info.velocity.y > 600)) onClose()
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-[var(--scrim)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => dismissible && onClose()}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            className={cn(
              'relative flex w-full flex-col overflow-hidden bg-elevated text-ink outline-none',
              'rounded-t-[30px] shadow-[0_-10px_40px_rgb(0_0_0/0.18)] sm:max-w-[520px] sm:rounded-[30px] sm:shadow-[0_30px_80px_rgb(0_0_0/0.35)]',
              size === 'tall' ? 'max-h-[94dvh] min-h-[60dvh] sm:min-h-0' : 'max-h-[90dvh]',
              className,
            )}
            initial={wide ? { opacity: 0, scale: 0.96, y: 12 } : { y: '100%' }}
            animate={wide ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={wide ? { opacity: 0, scale: 0.97, y: 8 } : { y: '100%' }}
            transition={spring}
            drag={wide ? false : 'y'}
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            <div
              className="flex shrink-0 touch-none justify-center pt-2 pb-1 sm:hidden"
              onPointerDown={(e) => dismissible && drag.start(e)}
            >
              <span className="h-[5px] w-9 rounded-full bg-muted/40" />
            </div>
            <div className="flex min-h-0 flex-1 flex-col pb-safe">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** Header row inside a sheet: optional leading/trailing actions and a centered title. */
export function SheetHeader({
  title,
  leading,
  trailing,
  onPointerDown,
}: {
  title?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
  onPointerDown?: (e: React.PointerEvent) => void
}) {
  return (
    <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 pt-1 pb-2 sm:pt-4" onPointerDown={onPointerDown}>
      <div className="justify-self-start">{leading}</div>
      <div className="text-[17px] font-semibold tracking-[-0.02em]">{title}</div>
      <div className="justify-self-end">{trailing}</div>
    </div>
  )
}

/** Text button used in sheet headers ("Cancelar", "Guardar"). */
export function SheetAction({
  children,
  onClick,
  strong,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  strong?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-11 rounded-full px-3 text-[17px] transition-opacity active:opacity-50 disabled:opacity-30',
        strong ? 'font-semibold text-accent' : 'text-ink-2',
      )}
    >
      {children}
    </button>
  )
}
