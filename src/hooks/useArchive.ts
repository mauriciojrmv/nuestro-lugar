import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/queryKeys'
import type { ISODate } from '@/lib/dates'
import { fetchMemories, deleteMemory } from '@/services/memories'
import { fetchLetters } from '@/services/letters'
import { fetchActivity } from '@/services/activity'
import { setFavorite } from '@/services/favorites'
import { deletePhoto } from '@/services/photos'
import { useAuth } from '@/providers/AuthProvider'
import { useCouple } from '@/providers/CoupleProvider'
import type { Memory, Photo, PhotoEntry } from '@/types/domain'

export function coverOf(memory: Memory): Photo | undefined {
  return memory.photos.find((p) => p.id === memory.coverPhotoId) ?? memory.photos[0]
}

export function useMemories() {
  const { couple } = useCouple()
  return useQuery({
    queryKey: qk.memories(couple?.id),
    queryFn: () => fetchMemories(couple!.id),
    enabled: Boolean(couple),
  })
}

export function useLetters() {
  const { couple } = useCouple()
  return useQuery({
    queryKey: qk.letters(couple?.id),
    queryFn: () => fetchLetters(couple!.id),
    enabled: Boolean(couple),
  })
}

export function useActivity() {
  const { couple } = useCouple()
  return useQuery({
    queryKey: qk.activity(couple?.id),
    queryFn: () => fetchActivity(couple!.id),
    enabled: Boolean(couple),
  })
}

export interface ArchiveIndex {
  memories: Memory[]
  byId: Map<string, Memory>
  /** Memories per day, oldest first within the day. */
  byDate: Map<ISODate, Memory[]>
  /** Every photo, newest day first, in memory order. */
  photos: PhotoEntry[]
  favorites: Memory[]
}

/** One pass over the archive feeds every view. */
export function useArchive() {
  const query = useMemories()
  const index = useMemo<ArchiveIndex>(() => {
    const memories = query.data ?? []
    const byId = new Map<string, Memory>()
    const byDate = new Map<ISODate, Memory[]>()
    const photos: PhotoEntry[] = []
    for (const m of memories) {
      byId.set(m.id, m)
      byDate.set(m.date, [m, ...(byDate.get(m.date) ?? [])])
      for (const p of m.photos) photos.push({ photo: p, memory: m })
    }
    return { memories, byId, byDate, photos, favorites: memories.filter((m) => m.favoritedBy.length > 0) }
  }, [query.data])
  return { ...index, isLoading: query.isPending, isError: query.isError, refetch: query.refetch }
}

export function useToggleFavorite() {
  const client = useQueryClient()
  const { user } = useAuth()
  const { couple } = useCouple()
  const key = qk.memories(couple?.id)

  return useMutation({
    mutationFn: ({ memory, favorite }: { memory: Memory; favorite: boolean }) =>
      setFavorite(memory.id, memory.coupleId, user!.id, favorite),
    onMutate: async ({ memory, favorite }) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<Memory[]>(key)
      client.setQueryData<Memory[]>(key, (list) =>
        list?.map((m) =>
          m.id !== memory.id
            ? m
            : {
                ...m,
                favoritedBy: favorite
                  ? [...new Set([...m.favoritedBy, user!.id])]
                  : m.favoritedBy.filter((id) => id !== user!.id),
              },
        ),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => ctx?.previous && client.setQueryData(key, ctx.previous),
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  })
}

export function useDeletePhoto() {
  const client = useQueryClient()
  const { couple } = useCouple()
  const key = qk.memories(couple?.id)
  return useMutation({
    mutationFn: (photo: Photo) => deletePhoto(photo),
    onSuccess: (_d, photo) => {
      client.setQueryData<Memory[]>(key, (list) =>
        list?.map((m) => (m.id === photo.memoryId ? { ...m, photos: m.photos.filter((p) => p.id !== photo.id) } : m)),
      )
      void client.invalidateQueries({ queryKey: key })
    },
  })
}

export function useDeleteMemory() {
  const client = useQueryClient()
  const { couple } = useCouple()
  const key = qk.memories(couple?.id)
  return useMutation({
    mutationFn: (memory: Memory) => deleteMemory(memory),
    onSuccess: (_d, memory) => {
      client.setQueryData<Memory[]>(key, (list) => list?.filter((m) => m.id !== memory.id))
      void client.invalidateQueries({ queryKey: key })
      void client.invalidateQueries({ queryKey: qk.activity(couple?.id) })
    },
  })
}
