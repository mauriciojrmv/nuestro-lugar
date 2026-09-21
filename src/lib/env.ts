const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const env = {
  supabaseUrl: url?.replace(/\/+$/, '') ?? '',
  supabaseAnonKey: anonKey ?? '',
}

export const isConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey)
