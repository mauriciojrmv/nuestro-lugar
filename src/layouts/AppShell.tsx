import type { ComponentType } from 'react'
import { NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Plus, WifiOff } from 'lucide-react'
import { cn } from '@/lib/cn'
import { CalendarGlyph, HomeGlyph, MoreGlyph, PhotosGlyph, PlaceMark } from '@/components/ui/TabIcons'
import { CouplePair } from '@/components/ui/Avatar'
import { useComposer } from '@/providers/ComposerProvider'
import { useCouple } from '@/providers/CoupleProvider'
import { useOnline } from '@/hooks/useOnline'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

interface Tab {
  to: string
  label: string
  Icon: ComponentType<{ active?: boolean; className?: string }>
}

const TABS: Tab[] = [
  { to: '/', label: 'Inicio', Icon: HomeGlyph },
  { to: '/calendario', label: 'Calendario', Icon: CalendarGlyph },
  { to: '/fotos', label: 'Fotos', Icon: PhotosGlyph },
  { to: '/mas', label: 'Más', Icon: MoreGlyph },
]

/** Screens where the floating "+" belongs. */
const FAB_ROUTES = ['/', '/calendario', '/fotos', '/historia']

export function AppShell() {
  useRealtimeSync()
  const location = useLocation()
  const online = useOnline()
  const compose = useComposer()
  const { me, partner } = useCouple()
  const showFab = FAB_ROUTES.includes(location.pathname)

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-hairline px-4 py-7 lg:flex">
        <div className="flex items-center gap-2.5 px-3">
          <PlaceMark className="size-8 text-accent" />
          <span className="text-[17px] font-semibold tracking-[-0.02em]">Nuestro lugar</span>
        </div>
        <nav className="mt-9 space-y-0.5" aria-label="Principal">
          {TABS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex h-11 items-center gap-3 rounded-[12px] px-3 text-[15px] font-medium transition-colors',
                  isActive ? 'bg-surface text-ink' : 'text-muted hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon active={isActive} className={cn('size-[22px]', isActive && 'text-accent')} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => compose()}
          className="mt-6 flex h-11 items-center justify-center gap-2 rounded-[14px] bg-ink text-[15px] font-semibold text-bg transition-transform active:scale-[0.97]"
        >
          <Plus className="size-[18px]" strokeWidth={2.4} />
          Nuevo recuerdo
        </button>
        <div className="mt-auto px-3">
          <CouplePair first={me} second={partner} size={24} />
        </div>
      </aside>

      <div className="min-w-0">
        <AnimatePresence>
          {!online && (
            <motion.div
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              className="fixed inset-x-0 top-0 z-40 flex justify-center pt-[calc(env(safe-area-inset-top)+6px)] pointer-events-none"
            >
              <span className="material flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium text-muted ring-1 ring-hairline">
                <WifiOff className="size-3.5" strokeWidth={2} />
                Sin conexión
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          className="mx-auto w-full max-w-[1080px] px-4 pb-[calc(env(safe-area-inset-bottom)+112px)] sm:px-6 lg:px-10 lg:pt-4 lg:pb-16"
        >
          <Outlet />
        </motion.main>
      </div>

      {/* Floating add button (phones) */}
      <AnimatePresence>
        {showFab && (
          <motion.button
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            onClick={() => compose()}
            aria-label="Añadir recuerdo"
            className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-30 grid size-14 place-items-center rounded-full bg-ink text-bg shadow-[0_10px_30px_rgb(0_0_0/0.25)] active:scale-90 lg:hidden"
          >
            <Plus className="size-6" strokeWidth={2.2} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Tab bar (phones and tablets) */}
      <nav
        aria-label="Principal"
        className="material fixed inset-x-0 bottom-0 z-30 border-t border-hairline pb-safe lg:hidden"
      >
        <div className="mx-auto grid h-[56px] max-w-[560px] grid-cols-4">
          {TABS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-[3px] text-[10.5px] font-medium tracking-[0.01em] transition-colors active:opacity-60',
                  isActive ? 'text-accent' : 'text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon active={isActive} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <ScrollRestoration />
    </div>
  )
}
