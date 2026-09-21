import { createClient } from '@supabase/supabase-js'
import { env, isConfigured } from './env'

// Only the public anon/publishable key ever reaches the browser.
// Every row and every file is protected by RLS and storage policies.
export const supabase = createClient(
  isConfigured ? env.supabaseUrl : 'http://localhost:54321',
  isConfigured ? env.supabaseAnonKey : 'missing-key',
  {
    auth: {
      // PKCE puts the auth code in ?code= instead of the URL hash,
      // which keeps email links compatible with hash routing.
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'nl.auth',
    },
    realtime: { params: { eventsPerSecond: 5 } },
  },
)
