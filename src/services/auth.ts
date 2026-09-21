import { supabase } from '@/lib/supabase'

export interface SignUpInput {
  displayName: string
  nickname?: string
  email: string
  password: string
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
  return data
}

/** Returns whether the account still needs email confirmation. */
export async function signUp({ displayName, nickname, email, password }: SignUpInput) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { display_name: displayName.trim(), nickname: nickname?.trim() || null },
      emailRedirectTo: window.location.origin + window.location.pathname,
    },
  })
  if (error) throw error
  return { needsConfirmation: !data.session }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) console.error(error)
}
