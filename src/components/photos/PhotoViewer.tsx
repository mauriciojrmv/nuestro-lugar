import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion, type PanInfo } from 'motion/react'
import { ChevronLeft, Download, Ellipsis, Heart, Image as ImageIcon, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatLong } from '@/lib/dates'
import { humanizeError } from '@/lib/errors'
import { useSignedUrl } from '@/hooks/useSignedUrl'
import { useArchive, useDeletePhoto, useToggleFavorite } from '@/hooks/useArchive'
import { useAuth } from '@/providers/AuthProvider'
import { useCouple } from '@/providers/CoupleProvider'
import { useToast } from '@/providers/ToastProvider'
import { ActionSheet, ConfirmSheet } from '@/components/ui/ActionSheet'
import { photoStorage, getSignedUrl } from '@/services/storage'
import { saveImage } from '@/utils/download'
import type { PhotoEntry } from '@/types/domain'

interface Props {
  entries: PhotoEntry[]
  startIndex: number
  onClose: () => void
}

const slide = {
  enter: (dir: number) => ({ x: dir === 0 ? 0 : `${dir * 100}%`, opacity: dir === 0 ? 0 : 1, scale: dir === 0 ? 0.94 : 1 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({ x: dir === 0 ? 0 : `${dir * -100}%`, opacity: dir === 0 ? 0 : 1 }),
}

export function PhotoViewer({ entries: initialEntries, startIndex, onClose }: Props) {
  const { user } = useAuth()
  const { nameOf } = useCouple()
  const { byId } = useArchive()
  const toggleFavorite = useToggleFavorite()
  const deletePhoto = useDeletePhoto()
  const toast = useToast()
  const navigate = useNavigate()

  const [entries, setEntries] = useState(initialEntries)
  const [[index, direction], setPage] = useState<[number, number]>([startIndex, 0])
  const [chrome, setChrome] = useState(true)
  const [menu, setMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const entry = entries[Math.min(index, entries.length - 1)]
  const memory = entry ? (byId.get(entry.memory.id) ?? entry.memory) : null
  const favorite = Boolean(memory && user && memory.favoritedBy.includes(user.id))

  const paginate = useCallback(
    (dir: number) => {
      setPage(([i]) => {
        const next = i + dir
        return next < 0 || next >= entries.length ? [i, 0] : [next, dir]
      })
    },
    [entries.length],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (menu || confirmDelete) return
      if (e.key === 'ArrowRight') paginate(1)
      else if (e.key === 'ArrowLeft') paginate(-1)
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = prev
    }
  }, [paginate, onClose, menu, confirmDelete])

  // Warm up the neighbours so swiping feels instant.
  useEffect(() => {
    for (const i of [index - 1, index + 1]) {
      const p = entries[i]?.photo
      if (p) getSignedUrl(p.storagePath).then((url) => (new Image().src = url)).catch(() => undefined)
    }
  }, [index, entries])

  if (!entry || !memory) return null

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info
    if (Math.abs(offset.x) > Math.abs(offset.y)) {
      if (offset.x < -70 || velocity.x < -500) paginate(1)
      else if (offset.x > 70 || velocity.x > 500) paginate(-1)
    } else if (offset.y > 110 || velocity.y > 700) {
      onClose()
    }
  }

  const download = async () => {
    try {
      const blob = await photoStorage.download(entry.photo.storagePath)
      const ext = entry.photo.storagePath.split('.').pop() ?? 'jpg'
      await saveImage(blob, `Nuestro-Lugar-${memory.date}-${entry.photo.position + 1}.${ext}`)
    } catch (error) {
      toast({ message: humanizeError(error, 'No pudimos descargar esta foto.'), tone: 'error' })
    }
  }

  const remove = () => {
    deletePhoto.mutate(entry.photo, {
      onSuccess: () => {
        const rest = entries.filter((e) => e.photo.id !== entry.photo.id)
        if (rest.length === 0) return onClose()
        setEntries(rest)
        setPage(([i]) => [Math.min(i, rest.length - 1), 0])
        toast({ message: 'Foto eliminada.' })
      },
      onError: (error) => toast({ message: humanizeError(error, 'No pudimos eliminar esta foto.'), tone: 'error' }),
    })
  }

  const canDelete = entry.photo.createdBy === user?.id

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[60] bg-black text-white select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      role="dialog"
      aria-modal="true"
      aria-label="Foto"
    >
      <AnimatePresence initial={true} custom={direction} mode="popLayout">
        <motion.div
          key={entry.photo.id}
          custom={direction}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ x: { type: 'spring', stiffness: 320, damping: 34 }, opacity: { duration: 0.2 }, scale: { duration: 0.35, ease: [0.32, 0.72, 0, 1] } }}
          drag
          dragDirectionLock
          dragSnapToOrigin
          dragElastic={0.5}
          onDragEnd={onDragEnd}
          onTap={() => setChrome((c) => !c)}
          className="absolute inset-0 flex touch-none items-center justify-center"
        >
          <ViewerImage entry={entry} />
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <AnimatePresence>
        {chrome && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/55 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top)+8px)]">
              <ViewerButton label="Cerrar" onClick={onClose}>
                <ChevronLeft className="size-7" strokeWidth={2} />
              </ViewerButton>
              <div className="flex gap-1">
                <ViewerButton
                  label={favorite ? 'Quitar de Momentos' : 'Guardar en Momentos'}
                  onClick={() => toggleFavorite.mutate({ memory, favorite: !favorite })}
                >
                  <motion.span key={String(favorite)} initial={{ scale: 0.6 }} animate={{ scale: [0.6, 1.25, 1] }} transition={{ duration: 0.35 }}>
                    <Heart className={cn('size-6', favorite && 'fill-rose text-rose')} strokeWidth={1.8} />
                  </motion.span>
                </ViewerButton>
                <ViewerButton label="Más opciones" onClick={() => setMenu(true)}>
                  <Ellipsis className="size-6" strokeWidth={2} />
                </ViewerButton>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 px-5 pb-[calc(env(safe-area-inset-bottom)+18px)]">
              {memory.title && <p className="text-[17px] font-semibold text-balance">{memory.title}</p>}
              <p className="mt-0.5 text-[14px] text-white/70">
                {formatLong(memory.date)}
                {entry.photo.createdBy && ` · Agregada por ${nameOf(entry.photo.createdBy)}`}
              </p>
              {entries.length > 1 && (
                <p className="mt-1 text-[13px] text-white/50 tabular-nums">
                  {index + 1} de {entries.length}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ActionSheet
        open={menu}
        onClose={() => setMenu(false)}
        actions={[
          {
            label: 'Ver recuerdo',
            icon: <ImageIcon />,
            onSelect: () => {
              onClose()
              navigate(`/recuerdo/${memory.id}`)
            },
          },
          { label: 'Descargar', icon: <Download />, onSelect: () => void download() },
          ...(canDelete ? [{ label: 'Eliminar foto', icon: <Trash2 />, destructive: true, onSelect: () => setConfirmDelete(true) }] : []),
        ]}
      />
      <ConfirmSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="¿Eliminar esta foto?"
        message="Se eliminará para los dos. Esta acción no se puede deshacer."
        confirmLabel="Eliminar foto"
        onConfirm={remove}
      />
    </motion.div>,
    document.body,
  )
}

function ViewerButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-full bg-white/10 backdrop-blur-xl transition-transform active:scale-90"
    >
      {children}
    </button>
  )
}

/** Thumbnail first (already cached), then the full image fades in exactly over it. */
function ViewerImage({ entry }: { entry: PhotoEntry }) {
  const { photo } = entry
  const thumb = useSignedUrl(photo.thumbPath)
  const main = useSignedUrl(photo.storagePath)
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="relative size-full">
      {thumb.url && !loaded && (
        <img src={thumb.url} alt="" crossOrigin="anonymous" draggable={false} className="absolute inset-0 size-full object-contain" />
      )}
      {main.url && (
        <img
          src={main.url}
          alt={entry.memory.title ?? ''}
          crossOrigin="anonymous"
          draggable={false}
          onLoad={() => setLoaded(true)}
          className={cn('absolute inset-0 size-full object-contain transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
        />
      )}
    </div>
  )
}
