import { useMemo } from 'react'
import { BookOpen, Download, Heart, LogOut, Mail, Settings } from 'lucide-react'
import { formatLong } from '@/lib/dates'
import { useArchive, useLetters } from '@/hooks/useArchive'
import { useAuth } from '@/providers/AuthProvider'
import { useCouple } from '@/providers/CoupleProvider'
import { signOut } from '@/services/auth'
import { CouplePair } from '@/components/ui/Avatar'
import { ListGroup, ListRow } from '@/components/ui/List'
import { computeStats } from '@/utils/stats'
import { mediaLabel } from '@/utils/media'

export function MorePage() {
  const { user } = useAuth()
  const { couple, me, partner } = useCouple()
  const { memories } = useArchive()
  const { data: letters } = useLetters()
  const stats = useMemo(() => computeStats(memories), [memories])
  const unread = (letters ?? []).filter((l) => l.recipientId === user?.id && !l.readAt).length

  return (
    <div className="mx-auto max-w-[560px]">
      <header className="flex flex-col items-center pt-safe pb-10 text-center">
        <div className="pt-12 lg:pt-8">
          <CouplePair first={me} second={partner} size={56} showNames={false} />
        </div>
        <h1 className="mt-5 text-[26px] font-bold tracking-[-0.025em]">{couple?.name ?? 'Nuestro lugar'}</h1>
        {couple?.startDate && <p className="mt-1 font-serif text-[15px] text-accent italic">Desde el {formatLong(couple.startDate)}.</p>}
        {stats.memories > 0 && (
          <p className="mt-3 text-[14px] text-muted">
            {stats.memories} {stats.memories === 1 ? 'recuerdo' : 'recuerdos'}
            {stats.photos + stats.videos > 0 && ` · ${mediaLabel(stats.photos, stats.videos)}`}
          </p>
        )}
      </header>

      <ListGroup>
        <ListRow icon={<BookOpen />} label="Nuestra historia" to="/historia" />
        <ListRow icon={<Heart />} label="Momentos" detail={stats.specialDays > 0 ? String(stats.specialDays) : undefined} to="/momentos" />
        <ListRow
          icon={<Mail />}
          label="Cartitas"
          to="/cartitas"
          trailing={unread > 0 ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose px-1.5 text-[12px] font-semibold text-white">{unread}</span> : undefined}
        />
      </ListGroup>

      <ListGroup>
        <ListRow icon={<Download />} label="Exportar recuerdos" to="/exportar" />
        <ListRow icon={<Settings />} label="Configuración" to="/ajustes" />
      </ListGroup>

      <ListGroup footer="Privado para nosotros. Sin publicidad, sin rastreadores.">
        <ListRow icon={<LogOut />} label="Cerrar sesión" destructive onClick={() => void signOut()} />
      </ListGroup>
    </div>
  )
}
