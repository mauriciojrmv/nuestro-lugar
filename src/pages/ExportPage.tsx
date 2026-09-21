import { useRef, useState } from 'react'
import { Archive, FileJson, Folder, Mail } from 'lucide-react'
import { humanizeError } from '@/lib/errors'
import { useArchive, useLetters } from '@/hooks/useArchive'
import { useCouple } from '@/providers/CoupleProvider'
import { exportArchive, type ExportProgress } from '@/services/export'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { ProgressBar, SuccessCheck } from '@/components/ui/Feedback'

type Status = { kind: 'idle' } | { kind: 'working'; progress: ExportProgress } | { kind: 'done' } | { kind: 'error'; message: string }

/** Nothing here depends on a provider keeping things forever: take a copy whenever you want. */
export function ExportPage() {
  const { memories, photos } = useArchive()
  const { data: letters } = useLetters()
  const { members } = useCouple()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const abortRef = useRef<AbortController | null>(null)

  const start = async () => {
    const controller = new AbortController()
    abortRef.current = controller
    setStatus({ kind: 'working', progress: { done: 0, total: photos.length } })
    try {
      await exportArchive(
        { memories, letters: letters ?? [], profiles: members },
        (progress) => setStatus({ kind: 'working', progress }),
        controller.signal,
      )
      setStatus({ kind: 'done' })
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') setStatus({ kind: 'idle' })
      else setStatus({ kind: 'error', message: humanizeError(error, 'No pudimos preparar el archivo.') })
    }
  }

  return (
    <div className="mx-auto max-w-[560px]">
      <PageHeader back="/mas" title="Exportar nuestra historia" subtitle="Puedes exportar nuestra historia cuando quieras." />

      <div className="rounded-[24px] bg-surface p-6">
        <p className="text-[15px] leading-relaxed text-pretty text-ink-2">
          Se creará un archivo ZIP con todas las fotografías, organizadas por año, mes y día, junto con el texto de cada recuerdo y
          sus cartitas. Guárdalo en un lugar seguro.
        </p>
        <ul className="mt-5 space-y-3 text-[15px]">
          <Item icon={<Folder />} text={`${memories.length} ${memories.length === 1 ? 'recuerdo' : 'recuerdos'}, por fecha`} />
          <Item icon={<Archive />} text={`${photos.length} ${photos.length === 1 ? 'fotografía' : 'fotografías'} tal como se guardaron`} />
          <Item icon={<FileJson />} text="recuerdo.json con fecha, título, texto, lugar y autor" />
          <Item icon={<Mail />} text={`${letters?.length ?? 0} cartitas en texto`} />
        </ul>
      </div>

      <div className="mt-8" aria-live="polite">
        {status.kind === 'working' && (
          <div>
            <p className="text-[17px] font-semibold">
              {status.progress.total > 0
                ? `Descargando fotos… ${status.progress.done} de ${status.progress.total}`
                : 'Preparando el archivo…'}
            </p>
            <ProgressBar value={status.progress.total ? status.progress.done / status.progress.total : 1} className="mt-4" />
            <Button variant="ghost" className="mt-4 -ml-3" onClick={() => abortRef.current?.abort()}>
              Cancelar
            </Button>
          </div>
        )}
        {status.kind === 'done' && (
          <div className="flex flex-col items-center py-4 text-center">
            <SuccessCheck size={64} />
            <p className="mt-4 text-[19px] font-semibold">Listo.</p>
            <p className="mt-1 text-[15px] text-muted">Tu copia se descargó en este dispositivo.</p>
          </div>
        )}
        {status.kind === 'error' && (
          <p className="mb-4 text-[15px] text-rose">{status.message} Inténtalo nuevamente.</p>
        )}
        {status.kind !== 'working' && (
          <Button size="lg" block onClick={start} disabled={memories.length === 0 && (letters?.length ?? 0) === 0}>
            {status.kind === 'done' ? 'Exportar de nuevo' : 'Exportar nuestra historia'}
          </Button>
        )}
      </div>
      <p className="mt-4 px-1 text-[13px] text-pretty text-muted">
        Con muchas fotos puede tardar unos minutos. Mantén la app abierta mientras se prepara.
      </p>
    </div>
  )
}

function Item({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="text-accent [&>svg]:size-[18px]">{icon}</span>
      {text}
    </li>
  )
}
