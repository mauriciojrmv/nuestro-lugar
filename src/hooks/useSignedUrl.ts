import { useEffect, useState } from 'react'
import { getSignedUrl, peekSignedUrl } from '@/services/storage'

/** Resolves a storage path to a short-lived URL; `null` until ready. */
export function useSignedUrl(path: string | null | undefined, enabled = true) {
  const [state, setState] = useState<{ path?: string | null; url: string | null; failed: boolean }>(() => ({
    path,
    url: path ? (peekSignedUrl(path) ?? null) : null,
    failed: false,
  }))

  // Reset synchronously when the path changes (no stale image flash).
  let current = state
  if (state.path !== path) {
    current = { path, url: path ? (peekSignedUrl(path) ?? null) : null, failed: false }
    setState(current)
  }

  useEffect(() => {
    if (!path || !enabled || current.url) return
    let alive = true
    getSignedUrl(path).then(
      (url) => alive && setState({ path, url, failed: false }),
      () => alive && setState({ path, url: null, failed: true }),
    )
    return () => {
      alive = false
    }
  }, [path, enabled, current.url])

  return { url: current.url, failed: current.failed }
}
