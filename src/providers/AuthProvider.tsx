import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { queryClient, queryPersister } from '@/lib/queryClient'
import { clearSignedUrlCache } from '@/services/storage'
import { clearOutbox } from '@/services/outbox'
import { PHOTO_CACHE } from '@/lib/cacheNames'

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({ session: null, user: null, loading: true })

/** Everything this device kept about the account goes away with it. */
async function wipeLocalData() {
  queryClient.clear()
  clearSignedUrlCache()
  await Promise.allSettled([
    queryPersister.removeClient(),
    clearOutbox(),
    'caches' in window ? caches.delete(PHOTO_CACHE) : Promise.resolve(false),
  ])
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, user: null, loading: true })

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setState({ session: data.session, user: data.session?.user ?? null, loading: false })
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setState({ session, user: session?.user ?? null, loading: false })
      if (event === 'SIGNED_OUT') void wipeLocalData()
      // Remove the one-time ?code= left by an email confirmation link.
      if (event === 'SIGNED_IN' && window.location.search.includes('code=')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.hash)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
