import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useQueryClient } from '@tanstack/react-query'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { CouplePair } from '@/components/ui/Avatar'
import { InviteCode } from '@/components/couple/InviteCode'
import { useAuth } from '@/providers/AuthProvider'
import { useCouple } from '@/providers/CoupleProvider'
import { createCouple, joinCouple } from '@/services/couples'
import { signOut } from '@/services/auth'
import { humanizeError } from '@/lib/errors'
import { qk } from '@/lib/queryKeys'
import { DEFAULT_START_DATE } from '@/lib/constants'
import { formatLong } from '@/lib/dates'

type Step = 'start' | 'create' | 'join' | 'invite' | 'together'

function formatCode(raw: string) {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean
}

export function OnboardingPage() {
  const { user } = useAuth()
  const { couple, complete, me, partner } = useCouple()
  const client = useQueryClient()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(() => (couple ? (complete ? 'together' : 'invite') : 'start'))
  const [startDate, setStartDate] = useState(DEFAULT_START_DATE)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // The partner joined while we were showing the code.
  useEffect(() => {
    if (step === 'invite' && complete) setStep('together')
  }, [step, complete])

  const refresh = () => client.invalidateQueries({ queryKey: qk.couple(user?.id) })

  const run = async (action: () => Promise<unknown>, next: Step) => {
    setError(null)
    setBusy(true)
    try {
      await action()
      await refresh()
      setStep(next)
    } catch (err) {
      setError(humanizeError(err))
    } finally {
      setBusy(false)
    }
  }

  const enter = () => navigate('/', { replace: true })

  const screens: Record<Step, React.ReactNode> = {
    start: (
      <AuthLayout
        title="Vamos a crear nuestro espacio."
        subtitle="Un pequeño lugar que solo pertenece a ustedes dos."
        footer={
          <button onClick={() => void signOut()} className="text-muted active:opacity-50">
            Cerrar sesión
          </button>
        }
      >
        <div className="space-y-3">
          <Button size="lg" block onClick={() => setStep('create')}>
            Crear nuestro espacio
          </Button>
          <Button size="lg" variant="secondary" block onClick={() => setStep('join')}>
            Tengo un código
          </Button>
        </div>
      </AuthLayout>
    ),
    create: (
      <AuthLayout title="¿Desde cuándo?" subtitle="La fecha en que empezó su historia. Puedes cambiarla después.">
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            void run(() => createCouple(null, startDate || null), 'invite')
          }}
          className="space-y-3"
        >
          <Field label="Nuestro comienzo" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          {startDate && <p className="px-1 text-[14px] text-muted">Desde el {formatLong(startDate)}.</p>}
          {error && <p className="px-1 text-[14px] text-rose">{error}</p>}
          <Button type="submit" size="lg" block loading={busy} className="!mt-6">
            Crear
          </Button>
          <Button type="button" variant="ghost" block onClick={() => setStep('start')}>
            Atrás
          </Button>
        </form>
      </AuthLayout>
    ),
    join: (
      <AuthLayout title="Escribe el código." subtitle="Tu pareja lo encuentra en su pantalla de inicio.">
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            void run(() => joinCouple(code), 'together')
          }}
          className="space-y-3"
        >
          <input
            value={code}
            onChange={(e) => setCode(formatCode(e.target.value))}
            placeholder="XXXX-XXXX"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            aria-label="Código de invitación"
            className="h-[72px] w-full rounded-[18px] bg-surface text-center font-mono text-[30px] font-semibold tracking-[0.16em] ring-1 ring-hairline outline-none placeholder:text-muted/40 focus:ring-2 focus:ring-accent/60"
          />
          {error && <p className="px-1 text-[14px] text-rose">{error}</p>}
          <Button type="submit" size="lg" block loading={busy} disabled={code.length < 9} className="!mt-6">
            Unirme
          </Button>
          <Button type="button" variant="ghost" block onClick={() => setStep('start')}>
            Atrás
          </Button>
        </form>
      </AuthLayout>
    ),
    invite: (
      <AuthLayout title="Invita a tu persona." subtitle="Comparte este código con tu pareja. Lo necesitará al crear su cuenta.">
        {couple?.inviteCode && <InviteCode code={couple.inviteCode} />}
        <div className="mt-10 flex items-center gap-3 text-[15px] text-muted">
          <span className="relative flex size-2.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
            <span className="relative size-2.5 rounded-full bg-accent" />
          </span>
          Esperando a tu persona…
        </div>
        <Button variant="ghost" block className="mt-8" onClick={enter}>
          Entrar mientras tanto
        </Button>
      </AuthLayout>
    ),
    together: (
      <AuthLayout title="Ya estamos los dos." subtitle="Este es nuestro lugar.">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.15 }}
        >
          <CouplePair first={me} second={partner} size={52} />
        </motion.div>
        <Button size="lg" block className="mt-10" onClick={enter}>
          Entrar
        </Button>
      </AuthLayout>
    ),
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
      >
        {screens[step]}
      </motion.div>
    </AnimatePresence>
  )
}
