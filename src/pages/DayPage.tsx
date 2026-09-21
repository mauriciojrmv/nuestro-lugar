import { Link, Navigate, useParams } from 'react-router'
import { Mail, Plus } from 'lucide-react'
import { addDays, capitalize, formatLong, formatWeekday, isValidISODate, todayISO } from '@/lib/dates'
import { useArchive, useLetters } from '@/hooks/useArchive'
import { useComposer } from '@/providers/ComposerProvider'
import { useCouple } from '@/providers/CoupleProvider'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Feedback'
import { MemoryDetail } from '@/components/memory/MemoryDetail'

export function DayPage() {
  const { date = '' } = useParams()
  const { byDate, isLoading } = useArchive()
  const { data: letters } = useLetters()
  const { nameOf } = useCouple()
  const compose = useComposer()

  if (!isValidISODate(date)) return <Navigate to="/calendario" replace />

  const memories = byDate.get(date) ?? []
  const dayLetters = (letters ?? []).filter((l) => l.date === date)
  const canAdd = date <= todayISO()

  return (
    <div className="mx-auto max-w-[680px]">
      <PageHeader
        back={`/calendario?dia=${date}`}
        eyebrow={capitalize(formatWeekday(date))}
        title={formatLong(date)}
        trailing={
          canAdd && (
            <button onClick={() => compose({ date })} aria-label="Añadir a este día" className="-mr-2 grid size-11 place-items-center rounded-full text-accent active:opacity-50">
              <Plus className="size-7" strokeWidth={2} />
            </button>
          )
        }
      />

      {!isLoading && memories.length === 0 && dayLetters.length === 0 ? (
        <EmptyState
          title="Nada guardado este día."
          action={
            canAdd && (
              <Button icon={<Plus className="size-5" />} onClick={() => compose({ date })}>
                Añadir recuerdo
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-14">
          {memories.map((m) => (
            <MemoryDetail key={m.id} memory={m} showDate={false} afterDelete={memories.length === 1 ? `/calendario?dia=${date}` : undefined} />
          ))}
          {dayLetters.map((l) => (
            <Link key={l.id} to={`/cartitas/${l.id}`} className="flex items-center gap-4 rounded-[22px] bg-paper p-5 ring-1 ring-hairline active:opacity-70">
              <Mail className="size-6 text-rose" strokeWidth={1.6} />
              <span className="font-serif text-[18px] italic">
                Cartita de {nameOf(l.authorId)} para {nameOf(l.recipientId)}
              </span>
            </Link>
          ))}
        </div>
      )}

      <nav className="mt-16 flex justify-between border-t border-hairline pt-5 text-[15px]">
        <Link to={`/dia/${addDays(date, -1)}`} replace className="text-muted active:opacity-50">
          ← Día anterior
        </Link>
        {addDays(date, 1) <= todayISO() && (
          <Link to={`/dia/${addDays(date, 1)}`} replace className="text-muted active:opacity-50">
            Día siguiente →
          </Link>
        )}
      </nav>
    </div>
  )
}
