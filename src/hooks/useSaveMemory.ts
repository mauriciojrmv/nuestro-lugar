import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/queryKeys'
import { humanizeError, isNetworkError } from '@/lib/errors'
import { runSaveJob, type DraftPhoto, type SaveJob, type SavePhase } from '@/services/memorySave'
import type { MemoryFields } from '@/services/memories'
import { enqueue } from '@/services/outbox'
import { useAuth } from '@/providers/AuthProvider'
import { useCouple } from '@/providers/CoupleProvider'
import type { Memory } from '@/types/domain'

export type SaveState =
  | { status: 'idle' }
  | { status: 'working'; phase: SavePhase; progress: number; photoCount: number }
  | { status: 'done'; offline: boolean; first: boolean }
  | { status: 'error'; message: string }

export interface SaveRequest {
  memory?: Memory
  fields: MemoryFields
  photos: DraftPhoto[]
}

export function useSaveMemory() {
  const { user } = useAuth()
  const { couple } = useCouple()
  const client = useQueryClient()
  const [state, setState] = useState<SaveState>({ status: 'idle' })
  // Survives retries so finished uploads/rows aren't repeated.
  const jobRef = useRef<SaveJob | null>(null)

  const save = useCallback(
    async ({ memory, fields, photos }: SaveRequest) => {
      if (!user || !couple) return
      const key = qk.memories(couple.id)
      const existing = client.getQueryData<Memory[]>(key) ?? []
      const first = !memory && existing.length === 0

      // Offline, text only: keep it on the device and show it right away.
      if (!navigator.onLine && photos.length === 0 && !memory) {
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        await enqueue({ kind: 'memory', key: id, id, coupleId: couple.id, userId: user.id, fields, createdAt: now })
        client.setQueryData<Memory[]>(key, (list) => [
          {
            id,
            coupleId: couple.id,
            date: fields.date,
            title: fields.title?.trim() || null,
            body: fields.body?.trim() || null,
            location: fields.location?.trim() || null,
            mood: fields.mood,
            coverPhotoId: null,
            createdBy: user.id,
            createdAt: now,
            updatedAt: now,
            photos: [],
            favoritedBy: [],
            pending: true,
          },
          ...(list ?? []),
        ])
        setState({ status: 'done', offline: true, first })
        return
      }

      if (!jobRef.current) {
        const startPosition = memory ? Math.max(-1, ...memory.photos.map((p) => p.position)) + 1 : 0
        jobRef.current = {
          memoryId: memory?.id ?? crypto.randomUUID(),
          isNew: !memory,
          coupleId: couple.id,
          userId: user.id,
          fields,
          photos,
          startPosition,
          setCover: photos.length > 0 && (!memory || !memory.coverPhotoId),
        }
      }
      const job = jobRef.current
      // The draft may have been edited after a failed attempt. Draft photo objects
      // carry their own "prepared/uploaded" flags, so nothing is repeated.
      if (!job.memorySaved) job.fields = fields
      if (!job.photosSaved) job.photos = photos

      setState({ status: 'working', phase: 'preparing', progress: 0, photoCount: photos.length })
      try {
        await runSaveJob(job, (phase, progress) =>
          setState({ status: 'working', phase, progress, photoCount: photos.length }),
        )
        jobRef.current = null
        await Promise.all([
          client.invalidateQueries({ queryKey: key }),
          client.invalidateQueries({ queryKey: qk.activity(couple.id) }),
        ])
        setState({ status: 'done', offline: false, first })
      } catch (error) {
        console.error(error)
        setState({
          status: 'error',
          message: isNetworkError(error)
            ? 'Comprueba tu conexión e inténtalo nuevamente.'
            : humanizeError(error, 'Inténtalo nuevamente en un momento.'),
        })
      }
    },
    [user, couple, client],
  )

  /** Forget a half-finished job (e.g. the person edited the draft after an error). */
  const reset = useCallback(() => {
    jobRef.current = null
    setState({ status: 'idle' })
  }, [])

  const backToForm = useCallback(() => setState({ status: 'idle' }), [])

  return { state, save, reset, backToForm }
}
