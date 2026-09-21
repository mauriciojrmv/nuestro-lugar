import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qk } from '@/lib/queryKeys'
import type { ISODate } from '@/lib/dates'
import { fetchMemories, deleteMemory } from '@/services/memories'
import { fetchLetters } from '@/services/letters'
import { fetchActivity } from '@/services/activity'
import { setFavorite } from '@/services/favorites'
import { deletePhoto } from '@/services/photos'
import { fetchNotes, removeNote } from '@/services/notes'
import { addReply, deleteReply, fetchReplies } from '@/services/replies'
import { useAuth } from '@/providers/AuthProvider'
import { useCouple } from '@/providers/CoupleProvider'
import type { Memory, Note, Photo, PhotoEntry, Reply } from '@/types/domain'

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

export function useNotes() {
  const { couple } = useCouple()
  return useQuery({
    queryKey: qk.notes(couple?.id),
    queryFn: () => fetchNotes(couple!.id),
    enabled: Boolean(couple),
  })
}

/** Read or taken back: removed from the screen at once, deleted on the server. */
export function useRemoveNote() {
  const client = useQueryClient()
  const { couple } = useCouple()
  const key = qk.notes(couple?.id)
  return useMutation({
    mutationFn: (note: Note) => removeNote(note.id),
    onMutate: async (note) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<Note[]>(key)
      client.setQueryData<Note[]>(key, (list) => list?.filter((n) => n.id !== note.id))
      return { previous }
    },
    onError: (_e, _n, ctx) => ctx?.previous && client.setQueryData(key, ctx.previous),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: key })
      void client.invalidateQueries({ queryKey: qk.activity(couple?.id) })
    },
  })
}

/** Every reply in the space, grouped by memory. */
export function useReplies() {
  const { couple } = useCouple()
  const query = useQuery({
    queryKey: qk.replies(couple?.id),
    queryFn: () => fetchReplies(couple!.id),
    enabled: Boolean(couple),
  })
  const byMemory = useMemo(() => {
    const map = new Map<string, Reply[]>()
    for (const r of query.data ?? []) map.set(r.memoryId, [...(map.get(r.memoryId) ?? []), r])
    return map
  }, [query.data])
  return { byMemory, isLoading: query.isPending }
}

/** Replies show up instantly and are confirmed in the background. */
export function useSendReply() {
  const client = useQueryClient()
  const { user } = useAuth()
  const { couple } = useCouple()
  const key = qk.replies(couple?.id)
  return useMutation({
    mutationFn: (r: { id: string; memoryId: string; body: string }) =>
      addReply({ ...r, coupleId: couple!.id, authorId: user!.id }),
    onMutate: async (r) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<Reply[]>(key)
      client.setQueryData<Reply[]>(key, (list) => [
        ...(list ?? []),
        { id: r.id, memoryId: r.memoryId, authorId: user!.id, body: r.body.trim(), createdAt: new Date().toISOString(), pending: true },
      ])
      return { previous }
    },
    onError: (_e, _r, ctx) => ctx?.previous && client.setQueryData(key, ctx.previous),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: key })
      void client.invalidateQueries({ queryKey: qk.activity(couple?.id) })
    },
  })
}

export function useDeleteReply() {
  const client = useQueryClient()
  const { couple } = useCouple()
  const key = qk.replies(couple?.id)
  return useMutation({
    mutationFn: (reply: Reply) => deleteReply(reply.id),
    onMutate: async (reply) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<Reply[]>(key)
      client.setQueryData<Reply[]>(key, (list) => list?.filter((r) => r.id !== reply.id))
      return { previous }
    },
    onError: (_e, _r, ctx) => ctx?.previous && client.setQueryData(key, ctx.previous),
    onSettled: () => void client.invalidateQueries({ queryKey: key }),
  })
}
