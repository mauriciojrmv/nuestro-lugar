import { useCallback, useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()

function read(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : v === '1'
  } catch {
    return fallback
  }
}

export function readPreference(key: string, fallback: boolean) {
  return read(key, fallback)
}

/** A small on/off preference stored on this device. */
export function usePreference(key: string, fallback: boolean) {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => read(key, fallback),
  )
  const set = useCallback(
    (next: boolean) => {
      try {
        localStorage.setItem(key, next ? '1' : '0')
      } catch {
        // Storage unavailable: nothing to persist.
      }
      listeners.forEach((l) => l())
    },
    [key],
  )
  return [value, set] as const
}

export const PREF_LIVE_NOTICES = 'nl.liveNotices'
