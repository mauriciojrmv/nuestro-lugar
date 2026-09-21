import { supabase } from '@/lib/supabase'
import { AppError, unwrap } from '@/lib/errors'

/** Public VAPID key (safe to ship). The private half lives only in the Edge Function. */
const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ''

export type PushSupport = 'ok' | 'needs-install' | 'unsupported' | 'unconfigured'

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export function pushSupport(): PushSupport {
  if (!VAPID_PUBLIC_KEY) return 'unconfigured'
  // iPhone only allows notifications for apps added to the Home Screen.
  if (isIOS() && !isStandalone()) return 'needs-install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  return 'ok'
}

function keyBytes(base64url: string) {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function registration() {
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) throw new AppError('Las notificaciones estarán listas cuando la app termine de instalarse. Ábrela de nuevo en un momento.')
  return reg
}

/** Is this device currently subscribed? */
export async function isPushEnabled(): Promise<boolean> {
  if (pushSupport() !== 'ok' || Notification.permission !== 'granted') return false
  const reg = await navigator.serviceWorker.getRegistration()
  return Boolean(await reg?.pushManager.getSubscription())
}

/** Must be called from a tap: browsers only ask for permission after a user gesture. */
export async function enablePush(userId: string) {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new AppError('Las notificaciones están bloqueadas. Actívalas en los ajustes del móvil para esta app.')
  }
  const reg = await registration()
  // Some browsers never answer when their push service is unreachable: don't spin forever.
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new AppError('No pudimos conectar con el servicio de notificaciones. Inténtalo más tarde.')), 20_000),
  )
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await Promise.race([
      reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }),
      timeout,
    ]))
  const json = sub.toJSON()
  unwrap(
    await supabase.from('push_subscriptions').upsert(
      { user_id: userId, endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
      { onConflict: 'endpoint' },
    ),
  )
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}
