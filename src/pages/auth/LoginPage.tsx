import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { signIn } from '@/services/auth'
import { humanizeError } from '@/lib/errors'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      // The router moves on as soon as the session exists.
    } catch (err) {
      setError(humanizeError(err, 'No pudimos iniciar sesión.'))
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Nuestro lugar."
      subtitle="Privado para nosotros."
      footer={
        <>
          ¿Primera vez?{' '}
          <Link to="/registro" className="font-semibold text-accent">
            Crear cuenta
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <Field label="Correo" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="animate-fade-in px-1 pt-1 text-[14px] text-rose">{error}</p>}
        <Button type="submit" size="lg" block loading={loading} className="!mt-6">
          Entrar
        </Button>
      </form>
    </AuthLayout>
  )
}
