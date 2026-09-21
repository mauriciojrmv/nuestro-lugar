import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { qk } from '@/lib/queryKeys'
import { toActivity } from '@/services/mappers'
import { flushOutbox } from '@/services/outbox'
import { useCouple } from '@/providers/CoupleProvider'
import { useToast } from '@/providers/ToastProvider'
import type { ActivityRow } from '@/types/database'
import { liveLine } from '@/utils/activityText'
import { PREF_LIVE_NOTICES, readPreference } from './usePreference'

/**
 * Keeps both phones in sync. Realtime only tells us *that* something changed;
 * the data itself is always re-read through RLS-protected queries.
 */
export function useRealtimeSync() {
  const { couple, me, nameOf } = useCouple()
  const client = useQueryClient()
  const toast = useToast()
  const coupleId = couple?.id
  const myId = me?.id
  // Names can change without the subscription needing to restart.
  const nameOfRef = useRef(nameOf)
  nameOfRef.current = nameOf

  useEffect(() => {
    if (!coupleId) return
    const filter = `couple_id=eq.${coupleId}`
    const timers = new Map<string, number>()

    // Coalesce bursts (a memory + 5 photos) into a single refetch.
    const invalidate = (key: readonly unknown[]) => {
      const id = JSON.stringify(key)
      window.clearTimeout(timers.get(id))
      timers.set(id, window.setTimeout(() => void client.invalidateQueries({ queryKey: key }), 250))
    }

    // Wait a moment so the photo count folded into a memory entry is final.
    const pendingNotices = new Map<number, ActivityRow>()
    const notice = (row: ActivityRow) => {
      if (row.actor_id === myId) return
      const isNew = !pendingNotices.has(row.id)
      pendingNotices.set(row.id, row)
      if (!isNew) return
      window.setTimeout(() => {
        const latest = pendingNotices.get(row.id)
        pendingNotices.delete(row.id)
        if (!latest || !readPreference(PREF_LIVE_NOTICES, true)) return
        toast({ message: liveLine(toActivity(latest), nameOfRef.current(latest.actor_id) || 'Tu pareja') })
      }, 1600)
    }

    const channel = supabase
      .channel(`couple:${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memories', filter }, () => invalidate(qk.memories(coupleId)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memory_photos', filter }, () => invalidate(qk.memories(coupleId)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'favorites', filter }, () => invalidate(qk.memories(coupleId)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'letters', filter }, () => invalidate(qk.letters(coupleId)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter }, () => invalidate(qk.notes(coupleId)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity', filter }, (payload) => {
        invalidate(qk.activity(coupleId))
        // Deletions aren't filterable in Realtime; "seen" shows up here instead.
        invalidate(qk.notes(coupleId))
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') notice(payload.new as ActivityRow)
      })
      .subscribe((status) => {
        // After a reconnect we may have missed events: catch up once.
        if (status === 'SUBSCRIBED') {
          invalidate(qk.memories(coupleId))
          invalidate(qk.letters(coupleId))
          invalidate(qk.activity(coupleId))
          invalidate(qk.notes(coupleId))
        }
      })

    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      void supabase.removeChannel(channel)
    }
  }, [coupleId, myId, client, toast])

  // Coming back online: replay offline saves, then refresh everything.
  useEffect(() => {
    if (!coupleId) return
    const sync = async () => {
      const { synced, failed } = await flushOutbox()
      if (synced > 0) toast({ message: synced === 1 ? 'Sincronizado.' : `${synced} cambios sincronizados.` })
      if (failed > 0) toast({ message: 'Algunos cambios guardados sin conexión no se pudieron sincronizar.', tone: 'error' })
      void client.invalidateQueries()
    }
    void sync()
    window.addEventListener('online', sync)
    return () => window.removeEventListener('online', sync)
  }, [coupleId, client, toast])
}
