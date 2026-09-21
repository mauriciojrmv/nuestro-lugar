import { useState } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'motion/react'
import { Play, Plus, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { DraftPhoto } from '@/services/memorySave'
import { isVideoFile } from '@/utils/video'

interface Props {
  photos: DraftPhoto[]
  onChange: (photos: DraftPhoto[]) => void
  onAdd: () => void
  /** Photos already saved in the memory being edited (read-only here). */
  existing?: React.ReactNode
}

/**
 * Picked photos, shown instantly. Long-press (or drag with a mouse) to reorder;
 * the first one is the cover.
 */
export function PhotoTray({ photos, onChange, onAdd, existing }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = photos.findIndex((p) => p.id === active.id)
    const to = photos.findIndex((p) => p.id === over.id)
    onChange(arrayMove(photos, from, to))
  }

  const remove = (id: string) => {
    const photo = photos.find((p) => p.id === id)
    if (photo) URL.revokeObjectURL(photo.previewUrl)
    onChange(photos.filter((p) => p.id !== id))
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {existing}
            {photos.map((photo, i) => (
              <SortableThumb
                key={photo.id}
                photo={photo}
                cover={i === 0 && !existing}
                onRemove={() => remove(photo.id)}
                onMakeCover={i > 0 && !existing ? () => onChange([photo, ...photos.filter((p) => p.id !== photo.id)]) : undefined}
              />
            ))}
            <button
              type="button"
              onClick={onAdd}
              className="grid aspect-square place-items-center rounded-[14px] bg-fill text-muted transition-transform active:scale-95"
              aria-label="Añadir más fotos"
            >
              <Plus className="size-6" strokeWidth={1.8} />
            </button>
          </div>
        </SortableContext>
      </DndContext>
      {photos.length > 1 && (
        <p className="mt-2.5 px-0.5 text-[14px] text-muted">
          {existing ? 'Mantén pulsada una foto para cambiar el orden.' : 'Toca una foto para usarla de portada. Mantenla pulsada para reordenar.'}
        </p>
      )}
    </div>
  )
}

function SortableThumb({
  photo,
  cover,
  onRemove,
  onMakeCover,
}: {
  photo: DraftPhoto
  cover: boolean
  onRemove: () => void
  onMakeCover?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id })
  const [failed, setFailed] = useState(false)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('relative aspect-square touch-manipulation', isDragging && 'z-10')}
      {...attributes}
      {...listeners}
      onClick={onMakeCover}
      aria-label={onMakeCover ? 'Usar como portada' : undefined}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: isDragging ? 1.06 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={cn(
          'size-full overflow-hidden rounded-[14px] bg-surface-2',
          isDragging && 'shadow-[0_12px_30px_rgb(0_0_0/0.3)]',
        )}
      >
        {isVideoFile(photo.file) ? (
          // "#t=0.1" makes Safari paint a first frame instead of a blank box.
          <video src={`${photo.previewUrl}#t=0.1`} muted playsInline preload="metadata" className="pointer-events-none size-full object-cover" />
        ) : !failed ? (
          <img
            src={photo.previewUrl}
            alt=""
            draggable={false}
            onError={() => setFailed(true)}
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center px-2 text-center text-[11px] text-muted">{photo.file.name}</div>
        )}
      </motion.div>
      {isVideoFile(photo.file) && (
        <span className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid size-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md">
            <Play className="ml-0.5 size-5 fill-white" strokeWidth={0} />
          </span>
        </span>
      )}
      {cover && (
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-2.5 py-0.5 text-[12px] font-semibold text-white backdrop-blur-md">
          Portada
        </span>
      )}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={onRemove}
        aria-label={isVideoFile(photo.file) ? 'Quitar video' : 'Quitar foto'}
        className="absolute top-1 right-1 grid size-8 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/20 backdrop-blur-md transition-transform after:absolute after:-inset-2 after:content-[''] active:scale-90"
      >
        <X className="size-[18px]" strokeWidth={2.6} />
      </button>
    </div>
  )
}
