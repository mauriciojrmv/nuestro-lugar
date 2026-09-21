import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Images, Mail, PenLine } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { LetterForm } from '@/components/letters/LetterForm'
import { useSaveMemory } from '@/hooks/useSaveMemory'
import { useCouple } from '@/providers/CoupleProvider'
import { shortName } from '@/utils/names'
import { todayISO, type ISODate } from '@/lib/dates'
import type { DraftPhoto } from '@/services/memorySave'
import type { MemoryFields } from '@/services/memories'
import type { Memory } from '@/types/domain'
import { MemoryForm } from './MemoryForm'
import { SaveStatus } from './SaveStatus'

export type ComposerMode = 'choose' | 'memory' | 'letter'

export interface ComposerRequest {
  mode?: ComposerMode
  date?: ISODate
  memory?: Memory
}

interface Props {
  request: ComposerRequest | null
  onClose: () => void
}

const emptyFields = (date: ISODate): MemoryFields => ({ date, title: null, body: null, location: null, mood: null })

const fieldsOf = (m: Memory): MemoryFields => ({
  date: m.date,
  title: m.title,
  body: m.body,
  location: m.location,
  mood: m.mood,
})

export function ComposerSheet({ request, onClose }: Props) {
  const open = request !== null
  // The provider remounts this component for every opening, so initial state is the draft.
  const [mode, setMode] = useState<ComposerMode>(() => (request?.memory ? 'memory' : (request?.mode ?? 'choose')))
  const [fields, setFields] = useState<MemoryFields>(() =>
    request?.memory ? fieldsOf(request.memory) : emptyFields(request?.date ?? todayISO()),
  )
  const [photos, setPhotos] = useState<DraftPhoto[]>([])
  const [focusText, setFocusText] = useState(request?.mode === 'memory')
  const fileRef = useRef<HTMLInputElement>(null)
  const { state, save, backToForm } = useSaveMemory()
  const { partner } = useCouple()
  const photosRef = useRef(photos)
  photosRef.current = photos

  // Release preview URLs when the sheet closes or unmounts.
  useEffect(() => {
    if (open) return
    photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl))
  }, [open])
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), [])

  const close = useCallback(() => {
    if (state.status === 'working') return
    onClose()
  }, [state.status, onClose])

  // After "Guardado.", close on its own.
  useEffect(() => {
    if (state.status !== 'done') return
    const t = setTimeout(onClose, state.first ? 1800 : 1100)
    return () => clearTimeout(t)
  }, [state, onClose])

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    const drafts: DraftPhoto[] = [...files]
      .filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
      .map((file) => ({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) }))
    setPhotos((prev) => [...prev, ...drafts])
    setMode('memory')
  }

  const pick = () => fileRef.current?.click()

  const choices: Array<{ key: string; icon: ReactNode; label: string; hint: string; onClick: () => void }> = [
    { key: 'photos', icon: <Images />, label: 'Fotos', hint: 'Del carrete', onClick: pick },
    {
      key: 'note',
      icon: <PenLine />,
      label: 'Nota',
      hint: 'Unas palabras',
      onClick: () => {
        setFocusText(true)
        setMode('memory')
      },
    },
    { key: 'letter', icon: <Mail />, label: 'Carta', hint: partner ? `Para ${shortName(partner)}` : 'Una cartita', onClick: () => setMode('letter') },
  ]

  let content: ReactNode
  if (mode === 'letter') {
    content = <LetterForm initialDate={request?.date} onClose={onClose} />
  } else if (state.status !== 'idle') {
    content = (
      <SaveStatus
        state={state}
        onRetry={() => void save({ memory: request?.memory, fields, photos })}
        onBack={backToForm}
      />
    )
  } else if (mode === 'memory') {
    content = (
      <MemoryForm
        editing={request?.memory}
        fields={fields}
        onFields={setFields}
        photos={photos}
        onPhotos={setPhotos}
        onAddPhotos={pick}
        focusText={focusText}
        onCancel={close}
        onSave={() => void save({ memory: request?.memory, fields, photos })}
      />
    )
  } else {
    content = (
      <div className="px-5 pt-3 pb-5 sm:pt-7">
        <h2 className="px-1 text-[26px] font-bold tracking-[-0.025em]">¿Qué quieres guardar?</h2>
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {choices.map((c, i) => (
            <motion.button
              key={c.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
              onClick={c.onClick}
              className="flex aspect-[0.92] flex-col items-start justify-between rounded-[22px] bg-surface-2/70 p-4 text-left transition-transform duration-150 active:scale-[0.96]"
            >
              <span className="text-accent [&>svg]:size-[26px] [&>svg]:stroke-[1.6]">{c.icon}</span>
              <span>
                <span className="block text-[17px] font-semibold">{c.label}</span>
                <span className="block text-[13px] text-muted">{c.hint}</span>
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      label="Añadir recuerdo"
      dismissible={state.status !== 'working'}
      size={mode === 'choose' ? 'auto' : 'tall'}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={state.status === 'idle' ? mode : 'status'}
          className="flex min-h-0 flex-1 flex-col"
          initial={{ opacity: 0, filter: 'blur(4px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(4px)' }}
          transition={{ duration: 0.2 }}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </Sheet>
  )
}
