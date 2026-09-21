import { useEffect, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { SuccessCheck } from '@/components/ui/Feedback'
import { SheetAction, SheetHeader } from '@/components/ui/Sheet'
import { DateRow } from '@/components/memory/DateRow'
import { useAuth } from '@/providers/AuthProvider'
import { useCouple } from '@/providers/CoupleProvider'
import { insertLetter, type NewLetter } from '@/services/letters'
import { enqueue } from '@/services/outbox'
import { humanizeError } from '@/lib/errors'
import { qk } from '@/lib/queryKeys'
import { todayISO, type ISODate } from '@/lib/dates'
import type { Letter } from '@/types/domain'
import { shortName } from '@/utils/names'

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent'; offline: boolean } | { kind: 'error'; message: string }

/** A private letter, not a chat message: one page, one signature. */
export function LetterForm({ initialDate, onClose }: { initialDate?: ISODate; onClose: () => void }) {
  const { user } = useAuth()
  const { couple, me, partner } = useCouple()
  const client = useQueryClient()
  const [body, setBody] = useState('')
  const [date, setDate] = useState<ISODate>(initialDate ?? todayISO())
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const textRef = useRef<HTMLTextAreaElement>(null)
  // Stable across retries: the insert is idempotent, so a retry can never duplicate the letter.
  const idRef = useRef(crypto.randomUUID())

  useEffect(() => {
    requestAnimationFrame(() => textRef.current?.focus())
  }, [])

  useEffect(() => {
    if (status.kind !== 'sent') return
    const t = setTimeout(onClose, 1400)
    return () => clearTimeout(t)
  }, [status, onClose])

  const send = async () => {
    if (!user || !couple || !partner || !body.trim()) return
    const letter: NewLetter = {
      id: idRef.current,
      coupleId: couple.id,
      authorId: user.id,
      recipientId: partner.id,
      date,
      body,
    }
    setStatus({ kind: 'sending' })
    try {
      if (!navigator.onLine) {
        await enqueue({ kind: 'letter', key: letter.id, letter, createdAt: new Date().toISOString() })
        client.setQueryData<Letter[]>(qk.letters(couple.id), (list) => [
          {
            id: letter.id,
            coupleId: couple.id,
            memoryId: null,
            authorId: user.id,
            recipientId: partner.id,
            date,
            body: body.trim(),
            readAt: null,
            createdAt: new Date().toISOString(),
            pending: true,
          },
          ...(list ?? []),
        ])
        setStatus({ kind: 'sent', offline: true })
        return
      }
      await insertLetter(letter)
      await client.invalidateQueries({ queryKey: qk.letters(couple.id) })
      void client.invalidateQueries({ queryKey: qk.activity(couple.id) })
      setStatus({ kind: 'sent', offline: false })
    } catch (error) {
      setStatus({ kind: 'error', message: humanizeError(error, 'No pudimos enviar la cartita.') })
    }
  }

  if (status.kind === 'sent') {
    return (
      <div className="flex min-h-[340px] flex-1 flex-col items-center justify-center px-8 text-center">
        <SuccessCheck />
        <p className="mt-5 text-[22px] font-semibold tracking-[-0.02em]">Enviada.</p>
        <p className="mt-2 text-[15px] text-pretty text-muted">
          {status.offline ? 'Se enviará al volver la conexión.' : `${shortName(partner)} podrá leerla cuando quiera.`}
        </p>
      </div>
    )
  }

  return (
    <>
      <SheetHeader leading={<SheetAction onClick={onClose}>Cancelar</SheetAction>} title="Cartita" />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-1 pb-4">
        {!partner ? (
          <p className="py-16 text-center text-[16px] text-pretty text-muted">
            Cuando tu persona se una, podrás escribirle cartitas.
          </p>
        ) : (
          <>
            <div className="rounded-[24px] bg-paper px-6 pt-7 pb-6 font-serif ring-1 ring-hairline">
              <p className="text-[22px] italic">Para {shortName(partner)}</p>
              <textarea
                ref={textRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escribe aquí…"
                maxLength={20000}
                rows={8}
                className="mt-5 min-h-[220px] w-full resize-none bg-transparent font-serif text-[19px] leading-[1.6] outline-none placeholder:text-muted/50"
              />
              <p className="mt-4 text-right text-[17px] leading-snug text-ink-2 italic">
                Con cariño,
                <br />
                {shortName(me)}
              </p>
            </div>
            <div className="mt-4 overflow-hidden rounded-[20px] bg-fill">
              <DateRow value={date} onChange={setDate} icon={<CalendarDays strokeWidth={1.7} />} label="Fecha" />
            </div>
            {status.kind === 'error' && <p className="mt-3 px-1 text-[14px] text-rose">{status.message}</p>}
          </>
        )}
      </div>
      {partner && (
        <div className="shrink-0 border-t border-hairline px-5 pt-3 pb-3">
          <Button size="lg" block onClick={send} disabled={!body.trim()} loading={status.kind === 'sending'}>
            {status.kind === 'error' ? 'Reintentar' : 'Enviar cartita'}
          </Button>
        </div>
      )}
    </>
  )
}
