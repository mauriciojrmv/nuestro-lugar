import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Outlet, RouterProvider, createHashRouter, useRouteError } from 'react-router'
import { useAuth } from '@/providers/AuthProvider'
import { useCouple } from '@/providers/CoupleProvider'
import { ComposerProvider } from '@/providers/ComposerProvider'
import { ViewerProvider } from '@/providers/ViewerProvider'
import { AppShell } from '@/layouts/AppShell'
import { PlaceMark } from '@/components/ui/TabIcons'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/Feedback'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage'
import { HomePage } from '@/pages/HomePage'
import { CalendarPage } from '@/pages/CalendarPage'
import { DayPage } from '@/pages/DayPage'
import { MemoryPage } from '@/pages/MemoryPage'
import { PhotosPage } from '@/pages/PhotosPage'
import { MorePage } from '@/pages/MorePage'

// Secondary screens load on demand to keep the first open fast.
const TimelinePage = lazy(() => import('@/pages/TimelinePage').then((m) => ({ default: m.TimelinePage })))
const MomentsPage = lazy(() => import('@/pages/MomentsPage').then((m) => ({ default: m.MomentsPage })))
const LettersPage = lazy(() => import('@/pages/LettersPage').then((m) => ({ default: m.LettersPage })))
const LetterPage = lazy(() => import('@/pages/LetterPage').then((m) => ({ default: m.LetterPage })))
const ExportPage = lazy(() => import('@/pages/ExportPage').then((m) => ({ default: m.ExportPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))

const later = (node: ReactNode) => <Suspense fallback={null}>{node}</Suspense>

export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <PlaceMark className="size-14 animate-pulse text-accent" />
    </div>
  )
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <Splash />
  return session ? <Navigate to="/" replace /> : children
}

function RequireSession({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <Splash />
  return session ? children : <Navigate to="/entrar" replace />
}

/** The app itself only exists inside a couple's space. */
function RequireCouple() {
  const { couple, isLoading, isError, refetch } = useCouple()
  if (isLoading) return <Splash />
  if (!couple && isError) return <ErrorState message="No pudimos abrir nuestro lugar." onRetry={refetch} />
  if (!couple) return <Navigate to="/bienvenida" replace />
  return (
    <ComposerProvider>
      <ViewerProvider>
        <AppShell />
      </ViewerProvider>
    </ComposerProvider>
  )
}

function Onboarding() {
  const { isLoading } = useCouple()
  return isLoading ? <Splash /> : <OnboardingPage />
}

function RouteError() {
  const error = useRouteError()
  console.error(error)
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="text-[22px] font-semibold">Algo no salió como esperábamos.</p>
        <p className="mt-2 text-[15px] text-muted">Vuelve a intentarlo. Tus recuerdos están a salvo.</p>
        <Button className="mt-6" onClick={() => window.location.replace(window.location.pathname)}>
          Volver al inicio
        </Button>
      </div>
    </div>
  )
}

// Hash routing: GitHub Pages serves a single index.html and knows nothing about app routes.
const router = createHashRouter([
  {
    element: <Outlet />,
    errorElement: <RouteError />,
    children: [
      { path: 'entrar', element: <GuestOnly><LoginPage /></GuestOnly> },
      { path: 'registro', element: <GuestOnly><RegisterPage /></GuestOnly> },
      { path: 'bienvenida', element: <RequireSession><Onboarding /></RequireSession> },
      {
        element: <RequireSession><RequireCouple /></RequireSession>,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'calendario', element: <CalendarPage /> },
          { path: 'dia/:date', element: <DayPage /> },
          { path: 'recuerdo/:id', element: <MemoryPage /> },
          { path: 'fotos', element: <PhotosPage /> },
          { path: 'mas', element: <MorePage /> },
          { path: 'historia', element: later(<TimelinePage />) },
          { path: 'momentos', element: later(<MomentsPage />) },
          { path: 'cartitas', element: later(<LettersPage />) },
          { path: 'cartitas/:id', element: later(<LetterPage />) },
          { path: 'exportar', element: later(<ExportPage />) },
          { path: 'ajustes', element: later(<SettingsPage />) },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
