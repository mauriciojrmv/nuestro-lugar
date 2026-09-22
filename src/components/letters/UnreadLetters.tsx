import { Link } from 'react-router'
import { motion } from 'motion/react'
import { Heart } from 'lucide-react'
import { useLetters } from '@/hooks/useArchive'
import { useAuth } from '@/providers/AuthProvider'
import { useCouple } from '@/providers/CoupleProvider'
import { timeAgo } from '@/lib/dates'

/** An unread letter shows up on Home as a sealed envelope. Hard to miss, gentle to open. */
export function UnreadLetters() {
  const { user } = useAuth()
  const { nameOf } = useCouple()
  const { data: letters } = useLetters()
  const unread = (letters ?? []).filter((l) => l.recipientId === user?.id && !l.readAt && !l.pending)
  if (!unread.length) return null
  const first = unread[unread.length - 1] // the oldest unread one first

  return (
    <motion.section
      initial={{ opacity: 0, y: 16, rotate: -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 20 }}
      className="mb-10"
      aria-label="Cartitas sin abrir"
    >
      <Link
        to={`/cartitas/${first.id}`}
        className="group relative block overflow-hidden rounded-[18px] bg-[#f3e6d3] text-[#2b2118] shadow-[0_14px_36px_rgb(0_0_0/0.25)] transition-transform duration-200 active:scale-[0.985]"
      >
        {/* Envelope flap */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[104px] bg-[#ead8bf]"
          style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
        />
        {/* Wax seal */}
        <span
          aria-hidden
          className="absolute top-[104px] left-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#a4505a] shadow-[0_4px_10px_rgb(0_0_0/0.3)] ring-4 ring-[#a4505a]/25 transition-transform duration-300 group-active:scale-90"
        >
          <Heart className="size-5 fill-[#f3e6d3] text-[#f3e6d3]" strokeWidth={0} />
        </span>
        <span className="relative block px-6 pt-[146px] pb-6 text-center">
          <span className="block font-serif text-[22px] leading-tight italic">
            {unread.length === 1 ? 'Tienes una cartita' : `Tienes ${unread.length} cartitas`} de {nameOf(first.authorId)}
          </span>
          <span className="mt-1.5 block text-[14px] font-medium opacity-60">
            {timeAgo(first.createdAt)} · Toca para abrirla
          </span>
        </span>
      </Link>
    </motion.section>
  )
}
