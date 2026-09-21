import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence } from 'motion/react'
import { PhotoViewer } from '@/components/photos/PhotoViewer'
import type { PhotoEntry } from '@/types/domain'

type OpenViewer = (entries: PhotoEntry[], index: number) => void

const ViewerContext = createContext<OpenViewer>(() => {})

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ entries: PhotoEntry[]; index: number; key: number } | null>(null)
  const open = useCallback<OpenViewer>((entries, index) => setState({ entries, index, key: Date.now() }), [])
  const close = useCallback(() => setState(null), [])
  const value = useMemo(() => open, [open])

  return (
    <ViewerContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {state && <PhotoViewer key={state.key} entries={state.entries} startIndex={state.index} onClose={close} />}
      </AnimatePresence>
    </ViewerContext.Provider>
  )
}

export const useViewer = () => useContext(ViewerContext)
