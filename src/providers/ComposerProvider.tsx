import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { ComposerSheet, type ComposerRequest } from '@/components/memory/ComposerSheet'

const ComposerContext = createContext<(request?: ComposerRequest) => void>(() => {})

/** One composer for the whole app, opened from anywhere with `useComposer()`. */
export function ComposerProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ComposerRequest | null>(null)
  // A new key per opening gives every draft a clean slate.
  const [session, setSession] = useState(0)
  const open = useCallback((r: ComposerRequest = {}) => {
    setSession((n) => n + 1)
    setRequest({ ...r })
  }, [])
  const close = useCallback(() => setRequest(null), [])
  const value = useMemo(() => open, [open])

  return (
    <ComposerContext.Provider value={value}>
      {children}
      <ComposerSheet key={session} request={request} onClose={close} />
    </ComposerContext.Provider>
  )
}

export const useComposer = () => useContext(ComposerContext)
