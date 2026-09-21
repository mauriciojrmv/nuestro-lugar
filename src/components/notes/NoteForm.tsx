import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { SuccessCheck } from '@/components/ui/Feedback'
import { SheetAction, SheetHeader } from '@/components/ui/Sheet'
import { useAuth } from '@/providers/AuthProvider'
import { useCouple } from '@/providers/CoupleProvider'
import { sendNote } from '@/services/notes'
import { humanizeError } from '@/lib/errors'
import { qk } from '@/lib/queryKeys'
import { cn } from '@/lib/cn'
import { shortName } from '@/utils/names'

const MAX = 280

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string }

/** A little paper note for the partner. It will be read once, then it's gone. */
export function NoteForm({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const { couple, partner } = useCouple()
  const client = useQueryClient()
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const idRef = useRef(crypto.randomUUID())
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    requestAnimationFrame(() => textRef.current?.focus())
  }, [])

  useEffect(() => {
    if (status.kind !== 'sent') return
    const t = setTimeout(onClose, 1500)
    return () => clearTimeout(t)
  }, [status, onClose])

  const send = async () => {
    if (!user || !couple || !partner || !body.trim()) return
    setStatus({ kind: 'sending' })
    try {
      await sendNote({ id: idRef.current, coupleId: couple.id, authorId: user.id, recipientId: partner.id, body })
      await client.invalidateQueries({ queryKey: qk.notes(couple.id) })
      void client.invalidateQueries({ queryKey: qk.activity(couple.id) })
      setStatus({ kind: 'sent' })
    } catch (error) {
      setStatus({ kind: 'error', message: humanizeError(error, 'No pudimos dejar la notita.') })
    }
  }

  if (status.kind === 'sent') {
    return (
      <div className="flex min-h-[320px] flex-1 flex-col items-center justify-center px-8 text-center">
        <SuccessCheck />
        <p className="mt-5 text-[22px] font-semibold tracking-[-0.02em]">Notita dejada.</p>
        <p className="mt-2 text-[16px] text-pretty text-muted">{shortName(partner)} la verá flotando al abrir la app.</p>
      </div>
    )
  }

  const left = MAX - body.length

  return (
    <>
      <SheetHeader leading={<SheetAction onClick={onClose}>Cancelar</SheetAction>} title="Notita" />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3 pb-4">
        {!partner ? (
          <p className="py-16 text-center text-[16px] text-pretty text-muted">
            Cuando tu persona se una, podrás dejarle notitas.
          </p>
        ) : (
          <>
            <div className="mx-auto max-w-[340px] -rotate-1 rounded-[6px] bg-[#f6ecd9] px-6 pt-6 pb-4 text-[#2b2118] shadow-[0_14px_40px_rgb(0_0_0/0.28)]">
              <p className="font-serif text-[17px] italic opacity-70">Para {shortName(partner)}</p>
              <textarea
                ref={textRef}
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, MAX))}
                placeholder="Algo pequeño…"
                rows={5}
                className="mt-2 w-full resize-none bg-transparent font-serif text-[22px] leading-[1.45] outline-none placeholder:text-[#2b2118]/40"
              />
              <p className={cn('text-right text-[13px] tabular-nums', left < 30 ? 'text-[#a4505a]' : 'text-[#2b2118]/50')}>{left}</p>
            </div>
            <p className="mt-6 text-center text-[15px] text-pretty text-muted">
              Se verá una sola vez. Al cerrarla, desaparece.
            </p>
            {status.kind === 'error' && <p className="mt-3 text-center text-[15px] text-rose">{status.message}</p>}
          </>
        )}
      </div>
      {partner && (
        <div className="shrink-0 border-t border-hairline px-5 pt-3 pb-3">
          <Button size="lg" block onClick={send} disabled={!body.trim()} loading={status.kind === 'sending'}>
            {status.kind === 'error' ? 'Reintentar' : 'Dejar notita'}
          </Button>
        </div>
      )}
    </>
  )
}
