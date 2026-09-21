import { cn } from '@/lib/cn'
import { SignedImage } from '@/components/ui/SignedImage'
import { useViewer } from '@/providers/ViewerProvider'
import type { PhotoEntry } from '@/types/domain'

interface Props {
  entries: PhotoEntry[]
  /** The full list the viewer can swipe through (defaults to `entries`). */
  context?: PhotoEntry[]
  className?: string
  columns?: 'photos' | 'memory'
}

/** Photos first: tight grid, square crops, tap to open. */
export function PhotoGrid({ entries, context, className, columns = 'photos' }: Props) {
  const open = useViewer()
  const all = context ?? entries

  return (
    <div
      className={cn(
        'grid gap-1',
        columns === 'photos' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3',
        className,
      )}
    >
      {entries.map((entry) => (
        <button
          key={entry.photo.id}
          onClick={() => open(all, all.indexOf(entry))}
          className="group relative overflow-hidden rounded-[14px] transition-transform duration-200 active:scale-[0.97]"
          aria-label={`Abrir foto${entry.memory.title ? ` de ${entry.memory.title}` : ''}`}
        >
          <SignedImage
            path={entry.photo.thumbPath ?? entry.photo.storagePath}
            frameClassName="aspect-square w-full"
            className="transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </button>
      ))}
    </div>
  )
}
