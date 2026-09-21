import { Play } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDuration } from '@/utils/video'
import type { Photo } from '@/types/domain'

/** ▶ 0:27 over a video's thumbnail. Renders nothing for photos. */
export function VideoBadge({ photo, className, large }: { photo: Photo; className?: string; large?: boolean }) {
  if (photo.mediaType !== 'video') return null
  if (large)
    return (
      <span className={cn('pointer-events-none absolute inset-0 grid place-items-center', className)}>
        <span className="grid size-16 place-items-center rounded-full bg-black/45 text-white ring-1 ring-white/25 backdrop-blur-md">
          <Play className="ml-1 size-7 fill-white" strokeWidth={0} />
        </span>
      </span>
    )
  return (
    <span
      className={cn(
        'pointer-events-none absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[12px] font-semibold text-white tabular-nums backdrop-blur-md',
        className,
      )}
    >
      <Play className="size-3 fill-white" strokeWidth={0} />
      {formatDuration(photo.durationSeconds)}
    </span>
  )
}
