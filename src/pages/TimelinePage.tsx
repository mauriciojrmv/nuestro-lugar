import { useMemo, useRef } from 'react'
import { Link } from 'react-router'
import { ArrowDown } from 'lucide-react'
import { formatLong, formatShort } from '@/lib/dates'
import { coverOf, useArchive } from '@/hooks/useArchive'
import { useCouple } from '@/providers/CoupleProvider'
import { useComposer } from '@/providers/ComposerProvider'
import { PageHeader } from '@/components/ui/PageHeader'
import { SignedImage } from '@/components/ui/SignedImage'
import { Button } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { computeStats } from '@/utils/stats'

/** The story, oldest first. It grows by itself as memories are saved. */
export function TimelinePage() {
  const { memories, isLoading } = useArchive()
  const { couple } = useCouple()
  const compose = useComposer()
  const endRef = useRef<HTMLDivElement>(null)
  const story = useMemo(
    () => [...memories].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)),
    [memories],
  )
  const stats = useMemo(() => computeStats(memories), [memories])

  let lastYear = ''

  return (
    <div className="mx-auto max-w-[640px]">
      <PageHeader
        back="/mas"
        title="Nuestra historia"
        subtitle={couple?.startDate ? `Desde el ${formatLong(couple.startDate)}.` : undefined}
      />

      {memories.length > 0 && (
        <div className="mb-10 flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-muted">
          <Stat value={stats.memories} one="recuerdo" many="recuerdos" />
          <Stat value={stats.photos} one="foto" many="fotos" />
          {stats.specialDays > 0 && <Stat value={stats.specialDays} one="día especial" many="días especiales" />}
          {stats.busiestMonth && (
            <span className="basis-full text-[15px]">El mes con más recuerdos: {stats.busiestMonth}.</span>
          )}
        </div>
      )}

      {story.length > 6 && (
        <Button
          variant="secondary"
          className="mb-8"
          icon={<ArrowDown className="size-[18px]" />}
          onClick={() => endRef.current?.scrollIntoView({ behavior: 'smooth' })}
        >
          Ir al más reciente
        </Button>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="aspect-[4/3] w-full" />
        </div>
      ) : story.length === 0 ? (
        <EmptyState
          title="La historia empieza aquí."
          message="Cada recuerdo que guarden aparecerá en esta línea, en orden."
          action={<Button onClick={() => compose()}>Guardar primer recuerdo</Button>}
        />
      ) : (
        <ol className="relative ml-1.5 border-l border-hairline pl-6">
          {couple?.startDate && couple.startDate <= story[0].date && (
            <li className="relative pb-12">
              <span className="absolute top-1.5 -left-[29px] size-2.5 rounded-full bg-accent ring-4 ring-bg" />
              <p className="eyebrow">{formatShort(couple.startDate)}</p>
              <p className="mt-1 font-serif text-[20px] italic">Aquí empezó todo.</p>
            </li>
          )}
          {story.map((m) => {
            const year = m.date.slice(0, 4)
            const showYear = year !== lastYear
            lastYear = year
            const cover = coverOf(m)
            return (
              <li key={m.id} className="relative pb-12">
                {showYear && story[0].date.slice(0, 4) !== year && (
                  <p className="-ml-6 mb-8 text-[28px] font-bold tracking-[-0.03em] text-muted/70">{year}</p>
                )}
                <span className="absolute top-1.5 -left-[28.5px] size-2 rounded-full bg-muted/60 ring-4 ring-bg" />
                <Link to={`/recuerdo/${m.id}`} className="block transition-transform duration-200 active:scale-[0.985]">
                  <p className="eyebrow">{formatShort(m.date)}</p>
                  {cover && (
                    <SignedImage
                      path={cover.thumbPath ?? cover.storagePath}
                      frameClassName="mt-3 aspect-[4/3] w-full rounded-[22px]"
                    />
                  )}
                  {m.title && <p className="mt-3 text-[19px] leading-snug font-semibold tracking-[-0.02em] text-balance">{m.title}</p>}
                  {m.body && <p className="mt-1 line-clamp-2 text-[15px] text-pretty text-muted">{m.body}</p>}
                </Link>
              </li>
            )
          })}
        </ol>
      )}
      <div ref={endRef} />
    </div>
  )
}

function Stat({ value, one, many }: { value: number; one: string; many: string }) {
  return (
    <span>
      <span className="font-semibold text-ink tabular-nums">{value}</span> {value === 1 ? one : many}
    </span>
  )
}
