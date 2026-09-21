import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/cn'

export interface ToastOptions {
  message: string
  /** Shown before the message, e.g. a small avatar or check. */
  leading?: ReactNode
  action?: { label: string; onClick: () => void }
  tone?: 'default' | 'error'
  duration?: number
}

interface Toast extends ToastOptions {
  id: number
}

const ToastContext = createContext<(options: ToastOptions) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const show = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++
      setToasts((t) => [...t.slice(-1), { ...options, id }])
      window.setTimeout(() => dismiss(id), options.duration ?? (options.action ? 6000 : 3200))
    },
    [dismiss],
  )

  const value = useMemo(() => show, [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex flex-col items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+10px)]"
        aria-live="polite"
        role="status"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.96, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, scale: 0.97, filter: 'blur(4px)' }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className={cn(
                'material pointer-events-auto flex max-w-[min(92vw,420px)] items-center gap-2.5 rounded-full py-2.5 pr-3 pl-3.5',
                'text-[15px] leading-tight font-medium shadow-[0_8px_30px_rgb(0_0_0/0.12)] ring-1 ring-hairline',
                t.tone === 'error' ? 'text-rose' : 'text-ink',
              )}
              onClick={() => dismiss(t.id)}
            >
              {t.leading}
              <span className="text-pretty">{t.message}</span>
              {t.action && (
                <button
                  className="ml-1 rounded-full px-2 py-0.5 font-semibold text-accent"
                  onClick={(e) => {
                    e.stopPropagation()
                    t.action!.onClick()
                    dismiss(t.id)
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
