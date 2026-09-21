import { useCallback, useEffect, useState } from 'react'
import { humanizeError } from '@/lib/errors'
import { disablePush, enablePush, isPushEnabled, pushSupport } from '@/services/push'
import { useAuth } from '@/providers/AuthProvider'
import { useToast } from '@/providers/ToastProvider'

/** Push notifications on this device. */
export function usePush() {
  const { user } = useAuth()
  const toast = useToast()
  const support = pushSupport()
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let alive = true
    isPushEnabled()
      .then((v) => alive && setEnabled(v))
      .finally(() => alive && setChecked(true))
    return () => {
      alive = false
    }
  }, [])

  const setOn = useCallback(
    async (on: boolean) => {
      if (!user || busy) return
      setBusy(true)
      try {
        if (on) {
          await enablePush(user.id)
          toast({ message: 'Listo. Te avisaremos aquí.' })
        } else {
          await disablePush()
        }
        setEnabled(on)
      } catch (error) {
        toast({ message: humanizeError(error, 'No pudimos activar las notificaciones.'), tone: 'error', duration: 6000 })
      } finally {
        setBusy(false)
      }
    },
    [user, busy, toast],
  )

  const permission = 'Notification' in window ? Notification.permission : 'denied'
  return { support, enabled, busy, setOn, permission, checked }
}
