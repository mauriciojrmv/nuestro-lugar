import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { MotionConfig } from 'motion/react'
import { queryClient, queryPersister, PERSIST_BUSTER, PERSIST_MAX_AGE } from '@/lib/queryClient'
import { isConfigured } from '@/lib/env'
import { AuthProvider } from '@/providers/AuthProvider'
import { CoupleProvider } from '@/providers/CoupleProvider'
import { ToastProvider } from '@/providers/ToastProvider'
import { App } from '@/App'
import { SetupPage } from '@/pages/SetupPage'
import '@/styles/index.css'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* "user" honours prefers-reduced-motion for every animation. */}
    <MotionConfig reducedMotion="user">
      {isConfigured ? (
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: queryPersister,
            maxAge: PERSIST_MAX_AGE,
            buster: PERSIST_BUSTER,
            // Notitas are read once: they never touch the device's disk.
            dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.status === 'success' && q.queryKey[0] !== 'notes' },
          }}
        >
          <ToastProvider>
            <AuthProvider>
              <CoupleProvider>
                <App />
              </CoupleProvider>
            </AuthProvider>
          </ToastProvider>
        </PersistQueryClientProvider>
      ) : (
        <SetupPage />
      )}
    </MotionConfig>
  </StrictMode>,
)
