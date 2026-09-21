import { Link } from 'react-router'
import { CloudOff } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDayMonth } from '@/lib/dates'
import { coverOf } from '@/hooks/useArchive'
import { useCouple } from '@/providers/CoupleProvider'
import { SignedImage } from '@/components/ui/SignedImage'
import type { Memory } from '@/types/domain'

/** Large, photo-first card. Text memories get a quiet typographic card instead. */
export function MemoryCard({ memory, eyebrow, className }: { memory: Memory; eyebrow?: string; className?: string }) {
  const { nameOf } = useCouple()
  const cover = coverOf(memory)
  const author = nameOf(memory.createdBy)

  return (
    <Link
      to={memory.pending ? '#' : `/recuerdo/${memory.id}`}
      className={cn('group block animate-rise transition-transform duration-200 active:scale-[0.985]', className)}
    >
      {cover ? (
        <div className="relative">
          <SignedImage
            path={cover.thumbPath ?? cover.storagePath}
            eager
            alt={memory.title ?? ''}
            frameClassName="aspect-[4/5] w-full rounded-[24px] sm:aspect-[4/3]"
          />
          {memory.photos.length > 1 && (
            <span className="absolute top-3 right-3 rounded-full bg-black/55 px-3 py-1 text-[13px] font-semibold text-white backdrop-blur-md tabular-nums">
              {memory.photos.length} fotos
            </span>
          )}
        </div>
      ) : (
        <div className="rounded-[24px] bg-surface px-6 py-7">
          <p className="line-clamp-5 font-serif text-[20px] leading-[1.5] text-pretty text-ink-2">
            {memory.body || memory.title}
          </p>
        </div>
      )}
      <div className="px-1 pt-3.5">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        {/* Text-only cards already show the title when there's no body. */}
        {memory.title && (cover || memory.body) && (
          <p className="text-[19px] leading-snug font-semibold tracking-[-0.02em] text-balance">{memory.title}</p>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[15px] text-muted">
          {formatDayMonth(memory.date)}
          {author && <span>· Agregado por {author}</span>}
          {memory.pending && <CloudOff className="size-3.5" aria-label="Pendiente de sincronizar" />}
        </p>
      </div>
    </Link>
  )
}

/** Compact row for lists (calendar day, search results). */
export function MemoryRow({ memory }: { memory: Memory }) {
  const cover = coverOf(memory)
  const { nameOf } = useCouple()
  return (
    <Link
      to={memory.pending ? '#' : `/recuerdo/${memory.id}`}
      className="flex items-center gap-3.5 rounded-[18px] p-2 transition-colors active:bg-surface-2"
    >
      {cover ? (
        <SignedImage path={cover.thumbPath ?? cover.storagePath} frameClassName="size-16 shrink-0 rounded-[14px]" />
      ) : (
        <span className="grid size-16 shrink-0 place-items-center rounded-[14px] bg-surface font-serif text-[24px] text-accent">“</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-semibold">{memory.title || (cover ? 'Sin título' : memory.body?.split('\n')[0])}</p>
        <p className="truncate text-[15px] text-muted">
          {memory.photos.length > 0 && `${memory.photos.length} ${memory.photos.length === 1 ? 'foto' : 'fotos'} · `}
          {nameOf(memory.createdBy)}
        </p>
      </div>
    </Link>
  )
}
