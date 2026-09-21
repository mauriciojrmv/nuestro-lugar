import { Link } from 'react-router'
import { Plus } from 'lucide-react'
import { capitalize, formatLong, formatWeekday, formatDayMonth, timeAgo, todayISO } from '@/lib/dates'
import { useActivity, useArchive } from '@/hooks/useArchive'
import { useCouple } from '@/providers/CoupleProvider'
import { useComposer } from '@/providers/ComposerProvider'
import { CouplePair } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { MemoryCard } from '@/components/memory/MemoryCard'
import { InviteCode } from '@/components/couple/InviteCode'
import { activityLine } from '@/utils/activityText'
import { rediscover } from '@/utils/rediscover'
import type { Activity } from '@/types/domain'

export function HomePage() {
  const { couple, me, partner, complete, nameOf, members } = useCouple()
  const { memories, byDate, isLoading, isError, refetch } = useArchive()
  const compose = useComposer()
  const today = todayISO()
  const todays = byDate.get(today) ?? []
  const latest = memories.find((m) => m.date !== today)
  const back = rediscover(memories, today)
  const showBack = back && back.memory.id !== latest?.id

  return (
    <div className="mx-auto max-w-[640px]">
      {/* Hero */}
      <header className="pt-safe">
        <div className="flex h-12 items-center lg:h-8">
          <CouplePair first={me} second={partner} size={26} />
        </div>
        <div className="animate-rise pt-7 pb-9">
          <p className="eyebrow">
            {capitalize(formatWeekday(today))}, {formatDayMonth(today)}
          </p>
          <h1 className="mt-2 text-[40px] leading-[1.02] font-bold tracking-[-0.035em]">Nuestro lugar.</h1>
          <p className="mt-2.5 text-[17px] text-muted">La historia que estamos construyendo.</p>
          {couple?.startDate && couple.startDate <= today && (
            <p className="mt-4 font-serif text-[15px] text-accent italic">Desde el {formatLong(couple.startDate)}.</p>
          )}
        </div>
      </header>

      {!complete && couple?.inviteCode && (
        <section className="mb-10 animate-rise rounded-[24px] bg-surface p-6">
          <p className="text-[19px] font-semibold tracking-[-0.02em]">Invita a tu persona.</p>
          <p className="mt-1 mb-5 text-[15px] text-muted">Comparte este código con tu pareja.</p>
          <InviteCode code={couple.inviteCode} compact />
        </section>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="aspect-[4/5] w-full rounded-[24px] sm:aspect-[4/3]" />
          <Skeleton className="h-5 w-40" />
        </div>
      ) : isError && memories.length === 0 ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : memories.length === 0 ? (
        <EmptyState
          title="Este lugar todavía está vacío."
          message="Vamos a llenarlo de momentos. Todo comienza con uno."
          action={
            <Button size="lg" icon={<Plus className="size-5" strokeWidth={2.2} />} onClick={() => compose()}>
              Guardar primer recuerdo
            </Button>
          }
        />
      ) : (
        <div className="space-y-12">
          <section>
            <SectionTitle>Hoy</SectionTitle>
            {todays.length > 0 ? (
              <div className="space-y-8">
                {todays.map((m) => (
                  <MemoryCard key={m.id} memory={m} />
                ))}
              </div>
            ) : (
              <button
                onClick={() => compose({ date: today })}
                className="flex w-full items-center justify-between gap-4 rounded-[24px] bg-surface px-6 py-6 text-left transition-transform duration-150 active:scale-[0.985]"
              >
                <span>
                  <span className="block text-[19px] font-semibold tracking-[-0.02em]">¿Quieres guardar algo de hoy?</span>
                  <span className="mt-1 block text-[15px] text-muted">Una foto, unas palabras.</span>
                </span>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-bg">
                  <Plus className="size-5" strokeWidth={2.4} />
                </span>
              </button>
            )}
          </section>

          {latest && (
            <section>
              <SectionTitle>Recuerdo más reciente</SectionTitle>
              <MemoryCard memory={latest} />
            </section>
          )}

          {showBack && (
            <section>
              <SectionTitle>{back.label}</SectionTitle>
              <MemoryCard memory={back.memory} />
            </section>
          )}

          <RecentActivity nameOf={nameOf} myId={me?.id} ready={members.length > 0} />
        </div>
      )}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 px-1 text-[22px] font-bold tracking-[-0.025em]">{children}</h2>
}

function RecentActivity({ nameOf, myId, ready }: { nameOf: (id: string | null) => string; myId?: string; ready: boolean }) {
  const { data } = useActivity()
  const items = (data ?? []).slice(0, 4)
  if (!ready || items.length === 0) return null

  const linkFor = (a: Activity) => (a.letterId ? `/cartitas/${a.letterId}` : a.memoryId ? `/recuerdo/${a.memoryId}` : '/')

  return (
    <section>
      <SectionTitle>Actividad reciente</SectionTitle>
      <ul>
        {items.map((a) => (
          <li key={a.id}>
            <Link to={linkFor(a)} className="flex items-baseline justify-between gap-4 rounded-[14px] px-1 py-2.5 active:opacity-60">
              <span className="text-[15px] text-ink-2">{activityLine(a, nameOf(a.actorId), a.actorId === myId)}</span>
              <span className="shrink-0 text-[13px] text-muted">{timeAgo(a.createdAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
