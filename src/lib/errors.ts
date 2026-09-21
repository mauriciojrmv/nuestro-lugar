/**
 * Turns any thrown value into copy a person can read.
 * Technical details still go to the console; they're never hidden, just not shown.
 */
export class AppError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'AppError'
  }
}

const KNOWN: Array<[RegExp, string]> = [
  [/already_in_couple/, 'Esta cuenta ya forma parte de un espacio.'],
  [/invalid_code/, 'Ese código no existe. Revísalo con tu pareja.'],
  [/couple_full/, 'Este espacio ya está completo.'],
  [/not_in_couple/, 'Todavía no formas parte de un espacio.'],
  [/invalid login credentials/i, 'El correo o la contraseña no coinciden.'],
  [/email not confirmed/i, 'Confirma tu correo antes de entrar. Revisa tu bandeja de entrada.'],
  [/user already registered/i, 'Ya existe una cuenta con este correo.'],
  [/password should be at least|weak password/i, 'La contraseña debe tener al menos 8 caracteres.'],
  [/unable to validate email|invalid email/i, 'Ese correo no parece válido.'],
  [/rate limit|too many requests/i, 'Demasiados intentos. Espera un momento.'],
  [/signups not allowed|signup is disabled/i, 'Los registros están cerrados para este lugar.'],
  [/jwt expired|invalid jwt|refresh token/i, 'Tu sesión expiró. Vuelve a entrar.'],
  [/payload too large|exceeded the maximum allowed size/i, 'Esta foto es demasiado grande.'],
  [/unsupported_image/, 'No pudimos leer esta imagen en este dispositivo.'],
  [/space_taken/, 'Este lugar ya pertenece a otra pareja.'],
  [/mime type .* is not supported|invalid_mime_type/i, 'Este formato no se puede guardar.'],
]

export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  const message = errorText(error)
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|offline/i.test(message)
}

function errorText(error: unknown): string {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message)
  return ''
}

export function humanizeError(error: unknown, fallback = 'No pudimos completar esta acción.'): string {
  if (error instanceof AppError) return error.message
  if (isNetworkError(error)) return 'Comprueba tu conexión e inténtalo nuevamente.'
  const text = errorText(error)
  for (const [pattern, copy] of KNOWN) if (pattern.test(text)) return copy
  return fallback
}

/** Unwraps a Supabase `{ data, error }` result, throwing the error so callers can catch it once. */
export function unwrap<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) {
    console.error(result.error)
    throw result.error
  }
  return result.data as T
}
