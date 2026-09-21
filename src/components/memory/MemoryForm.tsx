import { useEffect, useRef } from 'react'
import { CalendarDays, Images, MapPin, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import { MOODS } from '@/lib/constants'
import { todayISO } from '@/lib/dates'
import { SignedImage } from '@/components/ui/SignedImage'
import { Button } from '@/components/ui/Button'
import { SheetAction, SheetHeader } from '@/components/ui/Sheet'
import type { DraftPhoto } from '@/services/memorySave'
import type { MemoryFields } from '@/services/memories'
import type { Memory } from '@/types/domain'
import { DateRow } from './DateRow'
import { PhotoTray } from './PhotoTray'

interface Props {
  editing?: Memory
  fields: MemoryFields
  onFields: (f: MemoryFields) => void
  photos: DraftPhoto[]
  onPhotos: (p: DraftPhoto[]) => void
  onAddPhotos: () => void
  focusText?: boolean
  onCancel: () => void
  onSave: () => void
}

/** One screen: photos, a few words, the date. Everything else is optional and quiet. */
export function MemoryForm({ editing, fields, onFields, photos, onPhotos, onAddPhotos, focusText, onCancel, onSave }: Props) {
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const set = <K extends keyof MemoryFields>(key: K, value: MemoryFields[K]) => onFields({ ...fields, [key]: value })

  const hasPhotos = photos.length > 0 || Boolean(editing?.photos.length)
  const canSave = photos.length > 0 || Boolean(fields.title?.trim()) || Boolean(fields.body?.trim()) || Boolean(editing)

  useEffect(() => {
    if (focusText) requestAnimationFrame(() => bodyRef.current?.focus())
  }, [focusText])

  // Grow the text area with its content.
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 96)}px`
  }, [fields.body])

  return (
    <>
      <SheetHeader
        leading={<SheetAction onClick={onCancel}>Cancelar</SheetAction>}
        title={editing ? 'Editar recuerdo' : 'Nuevo recuerdo'}
      />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
        {hasPhotos ? (
          <div className="pt-2 pb-5">
            <PhotoTray
              photos={photos}
              onChange={onPhotos}
              onAdd={onAddPhotos}
              existing={editing?.photos.map((p) => (
                <SignedImage key={p.id} path={p.thumbPath ?? p.storagePath} eager frameClassName="aspect-square rounded-[14px] opacity-70" />
              ))}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={onAddPhotos}
            className="mt-2 mb-5 flex h-[88px] w-full items-center justify-center gap-2.5 rounded-[20px] border border-dashed border-muted/50 text-[16px] font-medium text-ink-2 transition-colors active:bg-surface-2/80"
          >
            <Images className="size-5" strokeWidth={1.7} />
            Añadir fotos
          </button>
        )}

        <input
          value={fields.title ?? ''}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Título"
          maxLength={120}
          enterKeyHint="next"
          className="w-full bg-transparent text-[26px] leading-tight font-bold tracking-[-0.025em] outline-none placeholder:text-muted/70"
        />
        <textarea
          ref={bodyRef}
          value={fields.body ?? ''}
          onChange={(e) => set('body', e.target.value)}
          placeholder="Escribe algo sobre este momento…"
          maxLength={20000}
          rows={3}
          className="mt-2 w-full resize-none bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-muted/80"
        />

        <div className="mt-4 overflow-hidden rounded-[20px] bg-fill">
          <DateRow
            value={fields.date}
            onChange={(date) => set('date', date)}
            icon={<CalendarDays strokeWidth={1.7} />}
            label="Fecha"
            max={todayISO()}
          />
          <div className="flex min-h-[56px] items-center gap-3 border-t border-hairline px-4">
            <MapPin className="size-[22px] text-muted" strokeWidth={1.8} />
            <input
              value={fields.location ?? ''}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Añadir lugar"
              maxLength={120}
              aria-label="Lugar"
              className="h-[56px] flex-1 bg-transparent text-[17px] outline-none placeholder:text-muted"
            />
          </div>
          <div className="flex items-center gap-3 border-t border-hairline py-2.5 pl-4">
            <Sparkles className="size-[22px] shrink-0 text-muted" strokeWidth={1.8} />
            <div
              className="no-scrollbar flex gap-1.5 overflow-x-auto pr-4 pl-1 [mask-image:linear-gradient(to_right,transparent,black_10px,black_calc(100%-20px),transparent)]"
              role="radiogroup"
              aria-label="Cómo se sintió"
            >
              {MOODS.map((mood) => (
                <button
                  key={mood}
                  type="button"
                  role="radio"
                  aria-checked={fields.mood === mood}
                  onClick={() => set('mood', fields.mood === mood ? null : mood)}
                  className={cn(
                    'h-10 shrink-0 rounded-full px-4 text-[15px] font-medium transition-colors duration-150',
                    fields.mood === mood ? 'bg-accent-fill text-[#0B0B0D]' : 'bg-surface text-ink-2 ring-1 ring-hairline',
                  )}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-hairline px-5 pt-3 pb-3">
        <Button size="lg" block onClick={onSave} disabled={!canSave}>
          {editing ? 'Guardar cambios' : 'Guardar'}
        </Button>
      </div>
    </>
  )
}
