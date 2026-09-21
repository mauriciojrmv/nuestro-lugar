import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useNotes, useRemoveNote } from '@/hooks/useArchive'
import { useAuth } from '@/providers/AuthProvider'
import { useCouple } from '@/providers/CoupleProvider'
import { useToast } from '@/providers/ToastProvider'
import { humanizeError } from '@/lib/errors'
import { timeAgo } from '@/lib/dates'
import type { Note } from '@/types/domain'

const PAPER = 'bg-[#f6ecd9] text-[#2b2118]'

/**
 * Notes waiting for me float gently on Home. Opening one reveals it; closing it
 * sends it flying away and deletes it. Notes I left show a quiet "not seen yet".
 */
export function FloatingNotes() {
  const { user } = useAuth()
  const { nameOf } = useCouple()
  const { data: notes } = useNotes()
  const remove = useRemoveNote()
  const toast = useToast()
  const [open, setOpen] = useState<Note | null>(null)

  const incoming = (notes ?? []).filter((n) => n.recipientId === user?.id)
  const outgoing = (notes ?? []).filter((n) => n.authorId === user?.id)
  if (!incoming.length && !outgoing.length) return null

  const from = incoming[0] ? nameOf(incoming[0].authorId) : ''

  const close = () => {
    const note = open
    setOpen(null)
    if (note) remove.mutate(note, { onError: (e) => toast({ message: humanizeError(e), tone: 'error' }) })
  }

  return (
    <section className="mb-10" aria-label="Notitas">
      <AnimatePresence>
        {incoming.length > 0 && (
          <motion.div
            key="stack"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -60, rotate: 8, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="relative mx-auto flex max-w-[320px] justify-center py-3"
          >
            {/* Extra notes peek out behind the first one */}
            {incoming.slice(1, 3).map((n, i) => (
              <span
                key={n.id}
                aria-hidden
                className={`absolute inset-x-6 top-3 bottom-3 rounded-[6px] ${PAPER} opacity-70 shadow-[0_10px_30px_rgb(0_0_0/0.2)]`}
                style={{ transform: `rotate(${i === 0 ? 4 : -5}deg) translateY(${6 + i * 4}px)` }}
              />
            ))}
            <motion.button
              onClick={() => setOpen(incoming[0])}
              animate={{ y: [0, -7, 0], rotate: [-2.5, -1, -2.5] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
              whileTap={{ scale: 0.96 }}
              className={`relative w-full rounded-[6px] px-6 py-6 text-left ${PAPER} shadow-[0_18px_40px_rgb(0_0_0/0.3)]`}
            >
              <span className="block font-serif text-[21px] leading-snug italic">
                {incoming.length === 1 ? `Una notita de ${from}` : `${incoming.length} notitas de ${from}`}
              </span>
              <span className="mt-2 block text-[15px] font-medium opacity-60">Toca para leer</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {outgoing.map((n) => (
        <div key={n.id} className="mt-3 flex min-h-12 items-center justify-between gap-3 rounded-[16px] bg-surface px-4 py-2">
          <span className="text-[15px] text-muted">
            Tu notita para {nameOf(n.recipientId)} aún no la ha visto.
          </span>
          <button
            onClick={() => remove.mutate(n, { onSuccess: () => toast({ message: 'Notita retirada.' }) })}
            className="-mr-2 h-11 shrink-0 rounded-full px-3 text-[15px] font-semibold text-accent active:opacity-50"
          >
            Retirar
          </button>
        </div>
      ))}

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key={open.id}
              className="fixed inset-0 z-[75] flex items-center justify-center px-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { delay: 0.25, duration: 0.3 } }}
              role="dialog"
              aria-modal="true"
              aria-label={`Notita de ${nameOf(open.authorId)}`}
            >
              <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={close} aria-hidden />
              <motion.div
                initial={{ scale: 0.85, rotate: -4, y: 30 }}
                animate={{ scale: 1, rotate: -1.5, y: 0 }}
                exit={{ y: -window.innerHeight * 0.7, rotate: 14, scale: 0.8, opacity: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.9, 0.6] } }}
                transition={{ type: 'spring', stiffness: 240, damping: 20 }}
                className={`relative w-full max-w-[360px] rounded-[8px] px-7 pt-8 pb-6 ${PAPER} shadow-[0_30px_80px_rgb(0_0_0/0.45)]`}
              >
                <p className="font-serif text-[25px] leading-[1.45] whitespace-pre-wrap text-pretty">{open.body}</p>
                <p className="mt-5 text-right font-serif text-[18px] italic opacity-70">— {nameOf(open.authorId)}</p>
                <p className="mt-1 text-right text-[13px] opacity-50">{timeAgo(open.createdAt)}</p>
                <button
                  onClick={close}
                  className="mt-6 h-12 w-full rounded-[14px] bg-[#2b2118] text-[17px] font-semibold text-[#f6ecd9] active:scale-[0.98]"
                >
                  Cerrar
                </button>
                <p className="mt-3 text-center text-[13px] opacity-60">Al cerrarla, desaparece.</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </section>
  )
}
