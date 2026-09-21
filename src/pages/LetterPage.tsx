import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { formatLong } from '@/lib/dates'
import { humanizeError } from '@/lib/errors'
import { qk } from '@/lib/queryKeys'
import { useLetters } from '@/hooks/useArchive'
import { useAuth } from '@/providers/AuthProvider'
import { useCouple } from '@/providers/CoupleProvider'
import { useToast } from '@/providers/ToastProvider'
import { deleteLetter, markLetterRead } from '@/services/letters'
import { PageHeader } from '@/components/ui/PageHeader'
import { IconButton } from '@/components/ui/IconButton'
import { ConfirmSheet } from '@/components/ui/ActionSheet'
import { EmptyState } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { useComposer } from '@/providers/ComposerProvider'

export function LetterPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const { couple, nameOf } = useCouple()
  const { data: letters, isPending } = useLetters()
  const client = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)
  const compose = useComposer()
  const letter = letters?.find((l) => l.id === id)

  // Opening it is reading it.
  const unreadForMe = Boolean(letter && letter.recipientId === user?.id && !letter.readAt && !letter.pending)
  useEffect(() => {
    if (!unreadForMe) return
    markLetterRead(id)
      .then(() => client.invalidateQueries({ queryKey: qk.letters(couple?.id) }))
      .catch(console.error)
  }, [unreadForMe, id, client, couple?.id])

  const remove = async () => {
    try {
      await deleteLetter(id)
      await client.invalidateQueries({ queryKey: qk.letters(couple?.id) })
      navigate('/cartitas', { replace: true })
    } catch (error) {
      toast({ message: humanizeError(error, 'No pudimos eliminar la cartita.'), tone: 'error' })
    }
  }

  return (
    <div className="mx-auto max-w-[620px]">
      <PageHeader
        back="/cartitas"
        trailing={
          letter?.authorId === user?.id &&
          !letter?.pending && (
            <IconButton label="Eliminar cartita" onClick={() => setConfirm(true)}>
              <Trash2 className="size-5 text-muted" />
            </IconButton>
          )
        }
      />
      {letter ? (
        <article className="animate-rise rounded-[28px] bg-paper px-7 pt-9 pb-8 font-serif ring-1 ring-hairline sm:px-10 sm:pt-12">
          <p className="font-sans text-[12px] font-semibold tracking-[0.08em] text-muted uppercase">{formatLong(letter.date)}</p>
          <h1 className="mt-4 text-[28px] italic">Para {nameOf(letter.recipientId)}</h1>
          <p className="mt-6 text-[19px] leading-[1.7] whitespace-pre-wrap text-pretty">{letter.body}</p>
          <p className="mt-10 text-right text-[19px] leading-snug text-ink-2 italic">
            Con cariño,
            <br />
            {nameOf(letter.authorId)}
          </p>
        </article>
      ) : (
        !isPending && <EmptyState title="Esta cartita ya no está aquí." />
      )}
      {letter && letter.recipientId === user?.id && (
        <Button variant="secondary" size="lg" block className="mt-6" onClick={() => compose({ mode: 'letter' })}>
          Responder con una cartita
        </Button>
      )}
      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="¿Eliminar esta cartita?"
        message="Dejará de estar para los dos."
        confirmLabel="Eliminar cartita"
        onConfirm={() => void remove()}
      />
    </div>
  )
}
