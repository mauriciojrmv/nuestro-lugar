import { Link } from 'react-router'
import { Heart } from 'lucide-react'
import { formatDayMonth } from '@/lib/dates'
import { coverOf, useArchive } from '@/hooks/useArchive'
import { PageHeader } from '@/components/ui/PageHeader'
import { SignedImage } from '@/components/ui/SignedImage'
import { EmptyState } from '@/components/ui/Feedback'

/** The memories either of you marked with ♡. */
export function MomentsPage() {
  const { favorites, isLoading } = useArchive()

  return (
    <div>
      <PageHeader back="/mas" title="Momentos" subtitle="Los recuerdos más importantes." />
      {!isLoading && favorites.length === 0 ? (
        <EmptyState
          icon={<Heart strokeWidth={1.4} />}
          title="Todavía no hay momentos."
          message="Toca ♡ en un recuerdo para guardarlo aquí."
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
          {favorites.map((m) => {
            const cover = coverOf(m)
            return (
              <Link key={m.id} to={`/recuerdo/${m.id}`} className="block animate-rise transition-transform duration-200 active:scale-[0.97]">
                {cover ? (
                  <SignedImage path={cover.thumbPath ?? cover.storagePath} frameClassName="aspect-[4/5] w-full rounded-[20px]" />
                ) : (
                  <div className="flex aspect-[4/5] items-end rounded-[20px] bg-surface p-4">
                    <p className="line-clamp-6 font-serif text-[16px] leading-snug text-ink-2">{m.body || m.title}</p>
                  </div>
                )}
                <p className="mt-2 truncate px-0.5 text-[15px] font-semibold">{m.title || formatDayMonth(m.date)}</p>
                {m.title && <p className="px-0.5 text-[13px] text-muted">{formatDayMonth(m.date)}</p>}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
