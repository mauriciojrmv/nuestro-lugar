import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/dates'
import { humanizeError } from '@/lib/errors'
import { useDeleteReply, useReplies, useSendReply } from '@/hooks/useArchive'
import { useAuth } from '@/providers/AuthProvider'
import { useCouple } from '@/providers/CoupleProvider'
import { useToast } from '@/providers/ToastProvider'
import { Avatar } from '@/components/ui/Avatar'
import { ConfirmSheet } from '@/components/ui/ActionSheet'
import type { Memory, Reply } from '@/types/domain'

/** A quiet conversation under a memory. Not a chat, not public: just the two of you. */
export function MemoryReplies({ memory }: { memory: Memory }) {
  const { user } = useAuth()
  const { members, nameOf, partner } = useCouple()
  const { byMemory } = useReplies()
  const send = useSendReply()
  const remove = useDeleteReply()
  const toast = useToast()
  const [text, setText] = useState('')
  const [toDelete, setToDelete] = useState<Reply | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const replies = byMemory.get(memory.id) ?? []

  // Grow with the text, up to ~4 lines.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`
  }, [text])

  if (memory.pending) return null

  const submit = () => {
    const body = text.trim()
    if (!body) return
    setText('')
    send.mutate(
      { id: crypto.randomUUID(), memoryId: memory.id, body },
      {
        onError: (e) => {
          setText(body)
          toast({ message: humanizeError(e, 'No pudimos enviar tu respuesta.'), tone: 'error' })
        },
      },
    )
  }

  return (
    <section className="mt-8 border-t border-hairline pt-6" aria-label="Respuestas">
      {replies.length > 0 && (
        <ul className="mb-5 space-y-4">
          <AnimatePresence initial={false}>
            {replies.map((r) => {
              const mine = r.authorId === user?.id
              return (
                <motion.li
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: r.pending ? 0.6 : 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-3"
                >
                  <Avatar profile={members.find((m) => m.id === r.authorId)} size={32} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline gap-2 text-[14px]">
                      <span className="font-semibold">{nameOf(r.authorId)}</span>
                      <span className="text-muted">{r.pending ? 'enviando…' : timeAgo(r.createdAt)}</span>
                      {mine && !r.pending && (
                        <button onClick={() => setToDelete(r)} className="-my-2 ml-auto px-2 py-2 text-[14px] text-muted active:opacity-50">
                          Borrar
                        </button>
                      )}
                    </p>
                    <p className="mt-0.5 text-[16px] leading-relaxed whitespace-pre-wrap text-pretty text-ink-2">{r.body}</p>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}

      {partner && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="flex items-end gap-2 rounded-[22px] bg-surface py-1.5 pr-1.5 pl-4 ring-1 ring-hairline focus-within:ring-accent/50"
        >
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 1000))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer: fine)').matches) {
                e.preventDefault()
                submit()
              }
            }}
            rows={1}
            placeholder={replies.length ? 'Responder…' : `Responder a ${nameOf(memory.createdBy) || 'este recuerdo'}…`}
            aria-label="Escribe una respuesta"
            className="min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[16px] leading-snug outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="Enviar respuesta"
            className={cn(
              'grid size-11 shrink-0 place-items-center rounded-full transition-all duration-150 active:scale-90',
              text.trim() ? 'bg-accent-fill text-[#0B0B0D]' : 'bg-surface-2 text-muted',
            )}
          >
            <ArrowUp className="size-5" strokeWidth={2.4} />
          </button>
        </form>
      )}

      <ConfirmSheet
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="¿Borrar tu respuesta?"
        confirmLabel="Borrar"
        onConfirm={() => toDelete && remove.mutate(toDelete)}
      />
    </section>
  )
}
