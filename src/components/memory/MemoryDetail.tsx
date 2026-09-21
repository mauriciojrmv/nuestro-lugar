import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Download, Ellipsis, MapPin, Pencil, Trash2 } from 'lucide-react'
import { formatLong, formatWeekday, capitalize } from '@/lib/dates'
import { humanizeError } from '@/lib/errors'
import { useDeleteMemory, useReplies } from '@/hooks/useArchive'
import { useAuth } from '@/providers/AuthProvider'
import { useCouple } from '@/providers/CoupleProvider'
import { useComposer } from '@/providers/ComposerProvider'
import { useToast } from '@/providers/ToastProvider'
import { useViewer } from '@/providers/ViewerProvider'
import { SignedImage } from '@/components/ui/SignedImage'
import { IconButton } from '@/components/ui/IconButton'
import { ActionSheet, ConfirmSheet } from '@/components/ui/ActionSheet'
import { PhotoGrid } from '@/components/photos/PhotoGrid'
import { VideoBadge } from '@/components/photos/VideoBadge'
import { safeFileName } from '@/utils/download'
import type { Memory, PhotoEntry } from '@/types/domain'
import { FavoriteButton } from './FavoriteButton'
import { MemoryReplies } from './MemoryReplies'
import { Heart } from 'lucide-react'

interface Props {
  memory: Memory
  /** On the day page the date is already the page title. */
  showDate?: boolean
  /** Where to go after deleting. */
  afterDelete?: string
}

export function MemoryDetail({ memory, showDate = true, afterDelete }: Props) {
  const { user } = useAuth()
  const { nameOf, members, partner } = useCouple()
  const partnerLoves = Boolean(partner && memory.favoritedBy.includes(partner.id))
  const compose = useComposer()
  const openViewer = useViewer()
  const toast = useToast()
  const navigate = useNavigate()
  const remove = useDeleteMemory()
  const [menu, setMenu] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const replies = useReplies().byMemory.get(memory.id) ?? []

  const entries: PhotoEntry[] = memory.photos.map((photo) => ({ photo, memory }))
  const [first, ...rest] = entries
  const isAuthor = memory.createdBy === user?.id

  const download = async () => {
    toast({ message: 'Preparando la descarga…' })
    try {
      const { exportArchive } = await import('@/services/export')
      await exportArchive(
        {
          memories: [memory],
          letters: [],
          profiles: members,
          replies,
          includeLetters: false,
          filename: `Recuerdo-${memory.date}-${safeFileName(memory.title ?? 'recuerdo', 40)}.zip`,
        },
        () => undefined,
      )
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError')
        toast({ message: humanizeError(error, 'No pudimos descargar este recuerdo.'), tone: 'error' })
    }
  }

  const confirmDelete = () =>
    remove.mutate(memory, {
      onSuccess: () => {
        toast({ message: 'Recuerdo eliminado.' })
        if (afterDelete) navigate(afterDelete, { replace: true })
      },
      onError: (error) => toast({ message: humanizeError(error, 'No pudimos eliminar este recuerdo.'), tone: 'error' }),
    })

  return (
    <article className="animate-rise">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showDate && (
            <Link to={`/dia/${memory.date}`} className="eyebrow inline-block active:opacity-60">
              {capitalize(formatWeekday(memory.date))} · {formatLong(memory.date)}
            </Link>
          )}
          {memory.title && (
            <h2 className="mt-1 text-[28px] leading-[1.12] font-bold tracking-[-0.03em] text-balance">{memory.title}</h2>
          )}
          <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[15px] text-muted">
            {memory.createdBy && <span>Agregado por {nameOf(memory.createdBy)}</span>}
            {memory.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" strokeWidth={2} />
                {memory.location}
              </span>
            )}
            {memory.mood && <span className="rounded-full bg-accent-soft px-3 py-0.5 text-[13px] font-semibold text-accent">{memory.mood}</span>}
          </p>
          {partnerLoves && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose/12 px-3 py-1 text-[14px] font-medium text-rose">
              <Heart className="size-3.5 fill-current" strokeWidth={0} />A {nameOf(partner!.id)} le encanta
            </p>
          )}
        </div>
        {!memory.pending && (
          <div className="-mr-2 flex shrink-0 items-center">
            <FavoriteButton memory={memory} />
            <IconButton label="Más opciones" onClick={() => setMenu(true)}>
              <Ellipsis className="size-[22px]" />
            </IconButton>
          </div>
        )}
      </div>

      {first && (
        <button
          onClick={() => openViewer(entries, 0)}
          className="relative mt-5 block w-full transition-transform duration-200 active:scale-[0.99]"
          aria-label={first.photo.mediaType === 'video' ? 'Reproducir video' : 'Abrir foto'}
        >
          <SignedImage
            path={first.photo.mediaType === 'video' ? first.photo.thumbPath : first.photo.storagePath}
            eager
            frameClassName="w-full rounded-[22px] max-h-[78vh]"
            frameStyle={{ aspectRatio: first.photo.width && first.photo.height ? `${first.photo.width} / ${first.photo.height}` : '4 / 5' }}
          />
          <VideoBadge photo={first.photo} large />
        </button>
      )}
      {rest.length > 0 && <PhotoGrid entries={rest} context={entries} columns="memory" className="mt-1" />}

      {memory.body && <p className="mt-6 text-[17px] leading-[1.65] whitespace-pre-wrap text-pretty text-ink-2">{memory.body}</p>}

      <MemoryReplies memory={memory} />

      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        actions={[
          { label: 'Editar', icon: <Pencil />, onSelect: () => compose({ memory }) },
          ...(memory.photos.length > 0 ? [{ label: 'Descargar recuerdo', icon: <Download />, onSelect: () => void download() }] : []),
          ...(isAuthor ? [{ label: 'Eliminar recuerdo', icon: <Trash2 />, destructive: true, onSelect: () => setConfirm(true) }] : []),
        ]}
      />
      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="¿Eliminar este recuerdo?"
        message="Se eliminarán también sus fotos, para los dos. Esta acción no se puede deshacer."
        confirmLabel="Eliminar recuerdo"
        onConfirm={confirmDelete}
      />
    </article>
  )
}
