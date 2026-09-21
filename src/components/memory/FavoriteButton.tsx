import { useState } from 'react'
import { motion } from 'motion/react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useToggleFavorite } from '@/hooks/useArchive'
import { useAuth } from '@/providers/AuthProvider'
import type { Memory } from '@/types/domain'

/** ♡ → ♥ with a small, single pulse. */
export function FavoriteButton({ memory, className }: { memory: Memory; className?: string }) {
  const { user } = useAuth()
  const toggle = useToggleFavorite()
  const [bursts, setBursts] = useState(0)
  const active = Boolean(user && memory.favoritedBy.includes(user.id))

  return (
    <button
      onClick={() => {
        if (!active) setBursts((n) => n + 1)
        toggle.mutate({ memory, favorite: !active })
      }}
      disabled={memory.pending}
      aria-pressed={active}
      aria-label={active ? 'Quitar de Momentos' : 'Guardar en Momentos'}
      title={active ? 'Quitar de Momentos' : 'Guardar en Momentos'}
      className={cn('relative grid size-10 place-items-center rounded-full transition-transform active:scale-90', className)}
    >
      <motion.span
        key={bursts}
        initial={bursts ? { scale: 0.7 } : false}
        animate={{ scale: bursts ? [0.7, 1.28, 1] : 1 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      >
        <Heart className={cn('size-[22px] transition-colors', active ? 'fill-rose text-rose' : 'text-ink')} strokeWidth={1.8} />
      </motion.span>
    </button>
  )
}
