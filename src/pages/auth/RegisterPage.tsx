import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { MailCheck } from 'lucide-react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { signUp } from '@/services/auth'
import { AppError, humanizeError } from '@/lib/errors'

export function RegisterPage() {
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (password.length < 8) throw new AppError('La contraseña debe tener al menos 8 caracteres.')
      const { needsConfirmation } = await signUp({ displayName: name, nickname, email, password })
      if (needsConfirmation) setConfirmSent(true)
    } catch (err) {
      setError(humanizeError(err, 'No pudimos crear tu cuenta.'))
    } finally {
      setLoading(false)
    }
  }

  if (confirmSent) {
    return (
      <AuthLayout
        title="Revisa tu correo."
        subtitle={`Te enviamos un enlace a ${email.trim()} para confirmar tu cuenta. Ábrelo en este mismo dispositivo.`}
        footer={
          <Link to="/entrar" className="font-semibold text-accent">
            Ya lo confirmé
          </Link>
        }
      >
        <MailCheck className="size-10 text-accent" strokeWidth={1.5} />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Crear cuenta."
      subtitle="Solo tú y tu persona tendrán acceso."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/entrar" className="font-semibold text-accent">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <Field label="Tu nombre" autoComplete="given-name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        <Field
          label="Cómo te llaman (opcional)"
          maxLength={30}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          hint="Así aparecerás en la app. Por ejemplo, “Favi” o “Mau”."
        />
        <Field label="Correo" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Al menos 8 caracteres."
        />
        {error && <p className="animate-fade-in px-1 pt-1 text-[14px] text-rose">{error}</p>}
        <Button type="submit" size="lg" block loading={loading} className="!mt-6">
          Crear cuenta
        </Button>
      </form>
    </AuthLayout>
  )
}
