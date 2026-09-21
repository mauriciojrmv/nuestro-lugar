import { Link } from 'react-router'
import { Mail, PenLine } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDayMonth } from '@/lib/dates'
import { useLetters } from '@/hooks/useArchive'
import { useAuth } from '@/providers/AuthProvider'
import { useCouple } from '@/providers/CoupleProvider'
import { useComposer } from '@/providers/ComposerProvider'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/Feedback'

export function LettersPage() {
  const { user } = useAuth()
  const { nameOf, partner } = useCouple()
  const { data: letters, isPending, isError, refetch } = useLetters()
  const compose = useComposer()

  const write = partner && (
    <Button icon={<PenLine className="size-[18px]" />} onClick={() => compose({ mode: 'letter' })}>
      Escribir una cartita
    </Button>
  )

  return (
    <div className="mx-auto max-w-[640px]">
      <PageHeader back="/mas" title="Cartitas" subtitle="Pequeñas cartas, solo para ustedes." />

      {isError && !letters ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !isPending && (letters?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<Mail strokeWidth={1.4} />}
          title="Todavía no hay cartitas."
          message={partner ? `Escribe la primera para ${nameOf(partner.id)}.` : 'Cuando tu persona se una, podrán escribirse.'}
          action={write}
        />
      ) : (
        <>
          <div className="mb-6">{write}</div>
          <ul className="space-y-2.5">
            {letters?.map((l) => {
              const toMe = l.recipientId === user?.id
              const unread = toMe && !l.readAt
              return (
                <li key={l.id}>
                  <Link
                    to={`/cartitas/${l.id}`}
                    className="flex animate-rise items-center gap-4 rounded-[22px] bg-paper px-5 py-4.5 ring-1 ring-hairline transition-transform duration-150 active:scale-[0.985]"
                  >
                    <span className={cn('grid size-11 shrink-0 place-items-center rounded-full', unread ? 'bg-rose/15 text-rose' : 'bg-surface-2 text-muted')}>
                      <Mail className="size-5" strokeWidth={1.7} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-serif text-[19px] italic">
                        {toMe ? `De ${nameOf(l.authorId)}` : `Para ${nameOf(l.recipientId)}`}
                      </span>
                      <span className="block truncate text-[14px] text-muted">{l.body.split('\n')[0]}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="text-[13px] text-muted">{formatDayMonth(l.date)}</span>
                      {unread && <span className="size-2 rounded-full bg-rose" aria-label="Sin leer" />}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
