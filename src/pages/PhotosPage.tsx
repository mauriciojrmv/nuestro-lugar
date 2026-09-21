import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { formatMonthYear, parseISODate } from '@/lib/dates'
import { useArchive } from '@/hooks/useArchive'
import { useComposer } from '@/providers/ComposerProvider'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { PhotoGrid } from '@/components/photos/PhotoGrid'
import type { PhotoEntry } from '@/types/domain'
import { mediaLabelOf } from '@/utils/media'

export function PhotosPage() {
  const { photos, isLoading, isError, refetch } = useArchive()
  const compose = useComposer()

  const months = useMemo(() => {
    const groups: { key: string; label: string; entries: PhotoEntry[] }[] = []
    for (const entry of photos) {
      const key = entry.memory.date.slice(0, 7)
      let group = groups[groups.length - 1]
      if (!group || group.key !== key) {
        const d = parseISODate(entry.memory.date)
        group = { key, label: formatMonthYear(d.getFullYear(), d.getMonth()), entries: [] }
        groups.push(group)
      }
      group.entries.push(entry)
    }
    return groups
  }, [photos])

  return (
    <div>
      <PageHeader
        title="Fotos"
        subtitle={photos.length > 0 ? mediaLabelOf(photos.map((e) => e.photo)) : undefined}
      />
      {isLoading ? (
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-[14px]" />
          ))}
        </div>
      ) : isError && photos.length === 0 ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : photos.length === 0 ? (
        <EmptyState
          title="Todavía no hay fotos aquí."
          message="Las fotos y videos de cada recuerdo aparecerán en este lugar."
          action={
            <Button icon={<Plus className="size-5" />} onClick={() => compose()}>
              Añadir fotos
            </Button>
          }
        />
      ) : (
        <div className="space-y-9">
          {months.map((m) => (
            <section key={m.key}>
              <h2 className="mb-3 px-1 text-[17px] font-semibold tracking-[-0.01em]">{m.label}</h2>
              <PhotoGrid entries={m.entries} context={photos} />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
