import { useEffect, useState } from 'react'
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
 * Notes waiting for me float above the whole app: they drift in like a falling
 * paper, then hover, rising and settling, with a shadow that breathes below them.
 * Opening one reveals it; closing it sends it flying away and deletes it.
 */
export function FloatingNotes() {
  const { user } = useAuth()
  const { nameOf } = useCouple()
  const { data: notes } = useNotes()
  const remove = useRemoveNote()
  const toast = useToast()
  const [open, setOpen] = useState<Note | null>(null)

  const incoming = (notes ?? []).filter((n) => n.recipientId === user?.id)
  const top = incoming[0]

  // Escape closes the open note (desktop).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const close = () => {
    const note = open
    setOpen(null)
    if (note) remove.mutate(note, { onError: (e) => toast({ message: humanizeError(e), tone: 'error' }) })
  }

  return createPortal(
    <>
      <AnimatePresence>
        {top && !open && (
          <motion.div
            key="floating-note"
            className="fixed bottom-[calc(env(safe-area-inset-bottom)+92px)] left-4 z-[35] lg:bottom-8 lg:left-[272px]"
            initial={{ y: -520, x: 60, rotate: -28, opacity: 0 }}
            animate={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
            exit={{ y: -200, rotate: 18, opacity: 0, scale: 0.8, transition: { duration: 0.45, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: 'spring', stiffness: 60, damping: 11, mass: 1.1 }}
          >
            {/* Shadow on the "ground": smaller and fainter when the note rises */}
            <motion.span
              aria-hidden
              className="absolute -bottom-4 left-1/2 h-3 w-24 -translate-x-1/2 rounded-full bg-black/45 blur-md"
              animate={{ scaleX: [1, 0.72, 1], opacity: [0.5, 0.25, 0.5] }}
              transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.button
              onClick={() => setOpen(top)}
              aria-label={`Abrir notita de ${nameOf(top.authorId)}`}
              className="relative block"
              animate={{ y: [0, -12, 0], rotate: [-5, -1.5, -5], x: [0, 3, 0] }}
              transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
              whileTap={{ scale: 0.94 }}
            >
              {/* Extra notes peek out behind */}
              {incoming.slice(1, 3).map((n, i) => (
                <span
                  key={n.id}
                  aria-hidden
                  className={`absolute inset-0 rounded-[5px] ${PAPER} shadow-[0_8px_20px_rgb(0_0_0/0.25)]`}
                  style={{ transform: `rotate(${i === 0 ? 7 : -8}deg) translate(${i === 0 ? 6 : -5}px, ${4 + i * 3}px)` }}
                />
              ))}
              <span className={`relative block w-[152px] rounded-[5px] px-4 pt-3.5 pb-3 text-left ${PAPER} shadow-[0_16px_34px_rgb(0_0_0/0.35)]`}>
                {/* Tape */}
                <span aria-hidden className="absolute -top-2 left-1/2 h-4 w-12 -translate-x-1/2 -rotate-3 rounded-[2px] bg-white/55" />
                <span className="block font-serif text-[16px] leading-tight italic">
                  {incoming.length === 1 ? 'Una notita de' : `${incoming.length} notitas de`} {nameOf(top.authorId)}
                </span>
                <span className="mt-1.5 block text-[12px] font-semibold tracking-[0.02em] opacity-60">Toca para leer</span>
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

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
              initial={{ scale: 0.6, rotate: -8, y: 180, x: -80 }}
              animate={{ scale: 1, rotate: -1.5, y: 0, x: 0 }}
              exit={{ y: -window.innerHeight * 0.75, x: 80, rotate: 16, scale: 0.75, opacity: 0, transition: { duration: 0.65, ease: [0.4, 0, 0.9, 0.6] } }}
              transition={{ type: 'spring', stiffness: 200, damping: 19 }}
              className={`relative w-full max-w-[360px] rounded-[8px] px-7 pt-9 pb-6 ${PAPER} shadow-[0_30px_80px_rgb(0_0_0/0.45)]`}
            >
              <span aria-hidden className="absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 rotate-2 rounded-[2px] bg-white/55" />
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
      </AnimatePresence>
    </>,
    document.body,
  )
}

/** On Home, for the author: "Tu notita para Favi aún no la ha visto · Retirar". */
export function NotesWaiting() {
  const { user } = useAuth()
  const { nameOf } = useCouple()
  const { data: notes } = useNotes()
  const remove = useRemoveNote()
  const toast = useToast()
  const outgoing = (notes ?? []).filter((n) => n.authorId === user?.id)
  if (!outgoing.length) return null

  return (
    <section className="mb-10 space-y-2" aria-label="Notitas enviadas">
      {outgoing.map((n) => (
        <div key={n.id} className="flex min-h-12 items-center justify-between gap-3 rounded-[16px] bg-surface px-4 py-2">
          <span className="text-[15px] text-muted">Tu notita para {nameOf(n.recipientId)} aún no la ha visto.</span>
          <button
            onClick={() => remove.mutate(n, { onSuccess: () => toast({ message: 'Notita retirada.' }) })}
            className="-mr-2 h-11 shrink-0 rounded-full px-3 text-[15px] font-semibold text-accent active:opacity-50"
          >
            Retirar
          </button>
        </div>
      ))}
    </section>
  )
}
