import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Bell, BellRing, Calendar, Camera, Download, Home, LogOut, Moon, Shield, User, UserRound, Users } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatMedium } from '@/lib/dates'
import { humanizeError } from '@/lib/errors'
import { qk } from '@/lib/queryKeys'
import { useAuth } from '@/providers/AuthProvider'
import { useCouple } from '@/providers/CoupleProvider'
import { useToast } from '@/providers/ToastProvider'
import { useTheme } from '@/hooks/useTheme'
import { PREF_LIVE_NOTICES, usePreference } from '@/hooks/usePreference'
import { updateAvatar, updateProfile } from '@/services/profiles'
import { updateCouple } from '@/services/couples'
import { signOut } from '@/services/auth'
import { PageHeader } from '@/components/ui/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { ListGroup, ListRow, Toggle } from '@/components/ui/List'
import { Sheet, SheetAction, SheetHeader } from '@/components/ui/Sheet'
import { Spinner } from '@/components/ui/Spinner'
import { InviteCode } from '@/components/couple/InviteCode'
import { shortName } from '@/utils/names'
import { useStorageUsage } from '@/hooks/useStorageUsage'
import { usePush } from '@/hooks/usePush'
import { formatBytes } from '@/services/usage'
import { ProgressBar } from '@/components/ui/Feedback'

type Editing = { title: string; value: string; type?: 'text' | 'date'; optional?: boolean; save: (v: string) => Promise<void> }

export function SettingsPage() {
  const { user } = useAuth()
  const { couple, me, partner, complete } = useCouple()
  const client = useQueryClient()
  const toast = useToast()
  const { preference, setPreference } = useTheme()
  const [liveNotices, setLiveNotices] = usePreference(PREF_LIVE_NOTICES, true)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const usage = useStorageUsage()
  const push = usePush()

  const refreshCouple = () => client.invalidateQueries({ queryKey: qk.couple(user?.id) })

  const changeAvatar = async (file: File | undefined) => {
    if (!file || !user) return
    setAvatarBusy(true)
    try {
      await updateAvatar(user.id, file, me?.avatarPath ?? null)
      await refreshCouple()
    } catch (error) {
      toast({ message: humanizeError(error, 'No pudimos cambiar tu foto.'), tone: 'error' })
    } finally {
      setAvatarBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-[560px]">
      <PageHeader back="/mas" title="Configuración" />

      <div className="mb-8 flex flex-col items-center">
        <button onClick={() => fileRef.current?.click()} className="relative rounded-full active:opacity-80" aria-label="Cambiar foto de perfil">
          <Avatar profile={me} size={88} />
          <span className="absolute right-0 bottom-0 grid size-8 place-items-center rounded-full bg-ink text-bg ring-4 ring-bg">
            {avatarBusy ? <Spinner size={14} /> : <Camera className="size-4" strokeWidth={2} />}
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void changeAvatar(e.target.files?.[0])} />
        <p className="mt-3 text-[20px] font-semibold">{shortName(me)}</p>
        <p className="text-[14px] text-muted">{user?.email}</p>
      </div>

      <ListGroup title="Cuenta">
        <ListRow
          icon={<User />}
          label="Nombre"
          detail={me?.displayName}
          chevron
          onClick={() =>
            setEditing({
              title: 'Nombre',
              value: me?.displayName ?? '',
              save: async (v) => {
                await updateProfile(user!.id, { displayName: v })
                await refreshCouple()
              },
            })
          }
        />
        <ListRow
          icon={<UserRound />}
          label="Cómo te llaman"
          detail={me?.nickname ?? 'Añadir'}
          chevron
          onClick={() =>
            setEditing({
              title: 'Cómo te llaman',
              value: me?.nickname ?? '',
              optional: true,
              save: async (v) => {
                await updateProfile(user!.id, { nickname: v })
                await refreshCouple()
              },
            })
          }
        />
      </ListGroup>

      <ListGroup title="Pareja" footer={!complete ? 'Comparte el código con tu pareja para que se una.' : undefined}>
        <ListRow icon={<Users />} label="Tu persona" detail={partner ? partner.displayName : 'Pendiente'} />
        <ListRow
          icon={<Home />}
          label="Espacio"
          detail={couple?.name}
          chevron
          onClick={() =>
            setEditing({
              title: 'Nombre del espacio',
              value: couple?.name ?? '',
              save: async (v) => {
                await updateCouple(couple!.id, { name: v })
                await refreshCouple()
              },
            })
          }
        />
        <ListRow
          icon={<Calendar />}
          label="Comienzo"
          detail={couple?.startDate ? formatMedium(couple.startDate) : 'Añadir'}
          chevron
          onClick={() =>
            setEditing({
              title: 'Nuestro comienzo',
              value: couple?.startDate ?? '',
              type: 'date',
              optional: true,
              save: async (v) => {
                await updateCouple(couple!.id, { startDate: v || null })
                await refreshCouple()
              },
            })
          }
        />
        {!complete && couple?.inviteCode && (
          <div className="border-t border-hairline px-4 py-5">
            <InviteCode code={couple.inviteCode} compact />
          </div>
        )}
      </ListGroup>

      <ListGroup
        title="Notificaciones"
        footer={
          push.support === 'needs-install'
            ? 'En iPhone, primero añade la app a la pantalla de inicio (Compartir → Añadir a pantalla de inicio) y ábrela desde ahí.'
            : push.support === 'unsupported'
              ? 'Este navegador no permite notificaciones. Instala la app en tu móvil para recibirlas.'
              : push.permission === 'denied'
                ? 'Las notificaciones están bloqueadas. Actívalas en los ajustes del móvil para esta app.'
                : 'Te avisamos aunque la app esté cerrada. Nunca mostramos el texto de notitas, cartas ni respuestas.'
        }
      >
        <ListRow
          icon={<BellRing />}
          label="En este móvil"
          trailing={
            <Toggle
              checked={push.enabled}
              onChange={(on) => void push.setOn(on)}
              label="Notificaciones en este móvil"
              disabled={push.support !== 'ok' || push.busy}
            />
          }
        />
        <ListRow icon={<Bell />} label="Dentro de la app" trailing={<Toggle checked={liveNotices} onChange={setLiveNotices} label="Avisos dentro de la app" />} />
      </ListGroup>

      <ListGroup title="Preferencias">
        <div className="flex min-h-[58px] items-center gap-3 px-4">
          <span className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-accent-soft text-accent">
            <Moon className="size-5" />
          </span>
          <span className="flex-1 text-[17px]">Aspecto</span>
          <Segmented
            value={preference}
            onChange={setPreference}
            options={[
              ['system', 'Auto'],
              ['light', 'Claro'],
              ['dark', 'Oscuro'],
            ]}
          />
        </div>
      </ListGroup>

      <ListGroup
        title="Almacenamiento"
        footer={
          usage.nearLimit
            ? 'Se está llenando. Exporten una copia y amplíen el espacio antes de que se llene, o no se podrán subir más fotos ni videos.'
            : 'Incluye fotos, videos y fotos de perfil. Los videos ocupan mucho más que las fotos.'
        }
      >
        <div className="px-4 py-4">
          <div className="flex items-baseline justify-between text-[16px]">
            <span>{usage.isLoading ? 'Calculando…' : `${formatBytes(usage.used)} de ${formatBytes(usage.limit)}`}</span>
            <span className="text-[15px] text-muted tabular-nums">{Math.min(100, Math.round(usage.ratio * 100))}%</span>
          </div>
          <ProgressBar value={usage.ratio} className={usage.nearLimit ? 'mt-3 [&>div]:bg-rose' : 'mt-3'} />
        </div>
      </ListGroup>

      <ListGroup
        title="Privacidad"
        footer="Sus recuerdos solo son visibles para ustedes dos. Las fotos se sirven con enlaces temporales. Sin publicidad, sin analítica, sin rastreadores."
      >
        <ListRow icon={<Shield />} label="Privado para nosotros" />
        <ListRow icon={<Download />} label="Exportar datos" to="/exportar" />
      </ListGroup>

      <ListGroup>
        <ListRow icon={<LogOut />} label="Cerrar sesión" destructive onClick={() => void signOut()} />
      </ListGroup>

      <EditSheet editing={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex rounded-[11px] bg-surface-2 p-[3px]" role="radiogroup">
      {options.map(([key, label]) => (
        <button
          key={key}
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className={cn(
            'h-9 rounded-[9px] px-3 text-[14px] font-semibold transition-colors',
            value === key ? 'bg-elevated text-ink shadow-[0_1px_4px_rgb(0_0_0/0.18)]' : 'text-ink-2',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function EditSheet({ editing, onClose }: { editing: Editing | null; onClose: () => void }) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openedFor, setOpenedFor] = useState<Editing | null>(null)

  // Reset the field each time a different setting is opened.
  if (editing && editing !== openedFor) {
    setOpenedFor(editing)
    setValue(editing.value)
    setError(null)
  }

  const save = async () => {
    if (!editing) return
    setBusy(true)
    setError(null)
    try {
      await editing.save(value.trim())
      onClose()
    } catch (err) {
      setError(humanizeError(err, 'No pudimos guardar el cambio.'))
    } finally {
      setBusy(false)
    }
  }

  const valid = editing?.optional || value.trim().length > 0

  return (
    <Sheet open={Boolean(editing)} onClose={onClose} label={editing?.title ?? 'Editar'}>
      <SheetHeader
        leading={<SheetAction onClick={onClose}>Cancelar</SheetAction>}
        title={editing?.title}
        trailing={
          <SheetAction strong onClick={() => void save()} disabled={!valid || busy}>
            {busy ? 'Guardando…' : 'Guardar'}
          </SheetAction>
        }
      />
      <div className="px-5 pt-2 pb-6">
        <input
          autoFocus
          type={editing?.type ?? 'text'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && valid && void save()}
          maxLength={60}
          className="h-[54px] w-full rounded-[16px] bg-fill px-4 text-[17px] outline-none focus:ring-2 focus:ring-accent/60"
        />
        {error && <p className="mt-2 px-1 text-[14px] text-rose">{error}</p>}
      </div>
    </Sheet>
  )
}
