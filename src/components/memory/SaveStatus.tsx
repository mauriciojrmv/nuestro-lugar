import { motion } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { ProgressBar, SuccessCheck } from '@/components/ui/Feedback'
import type { SaveState } from '@/hooks/useSaveMemory'

interface Props {
  state: Exclude<SaveState, { status: 'idle' }>
  onRetry: () => void
  onBack: () => void
}

const photoWord = (n: number) => (n === 1 ? '1 foto' : `${n} fotos`)

/** Preparing is quick; uploading is most of the wait. */
function overall(state: Extract<SaveState, { status: 'working' }>) {
  if (state.phase === 'preparing') return state.progress * 0.08
  if (state.phase === 'uploading') return 0.08 + state.progress * 0.92
  return 1
}

/** Never leave the person wondering whether it's working. */
export function SaveStatus({ state, onRetry, onBack }: Props) {
  return (
    <div className="flex min-h-[340px] flex-1 flex-col items-center justify-center px-8 py-10 text-center" aria-live="polite">
      {state.status === 'working' && (
        <div className="w-full max-w-[300px]">
          <p className="text-[20px] font-semibold tracking-[-0.02em]">
            {state.phase === 'preparing' && state.photoCount > 0 && `Preparando ${photoWord(state.photoCount)}…`}
            {state.phase === 'uploading' && state.photoCount > 0 && `Subiendo ${photoWord(state.photoCount)}…`}
            {(state.phase === 'saving' || state.photoCount === 0) && 'Guardando…'}
          </p>
          {state.photoCount > 0 && (
            <>
              <ProgressBar value={overall(state)} className="mt-6" />
              <p className="mt-2 text-[13px] text-muted tabular-nums">{Math.round(overall(state) * 100)}%</p>
            </>
          )}
        </div>
      )}

      {state.status === 'done' && (
        <div className="flex flex-col items-center">
          <SuccessCheck size={state.first ? 88 : 72} />
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.35 }}
            className="mt-5 text-[22px] font-semibold tracking-[-0.02em]"
          >
            {state.first ? 'Todo comienza con uno.' : 'Guardado.'}
          </motion.p>
          {state.offline && (
            <p className="mt-2 max-w-[28ch] text-[15px] text-pretty text-muted">
              Está guardado en este dispositivo. Se sincronizará al volver la conexión.
            </p>
          )}
        </div>
      )}

      {state.status === 'error' && (
        <div className="flex flex-col items-center">
          <p className="text-[20px] font-semibold tracking-[-0.02em]">No pudimos guardar este recuerdo.</p>
          <p className="mt-2 max-w-[30ch] text-[15px] text-pretty text-muted">{state.message}</p>
          <div className="mt-7 flex gap-2">
            <Button variant="secondary" onClick={onBack}>
              Volver
            </Button>
            <Button onClick={onRetry}>Reintentar</Button>
          </div>
        </div>
      )}
    </div>
  )
}
