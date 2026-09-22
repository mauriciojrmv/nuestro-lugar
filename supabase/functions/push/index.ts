// Sends a push notification to the partner for each new activity.
// Called by the database (private.dispatch_push) with a shared secret.
// Payloads never contain the text of notes, letters or replies: only who did what.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SECRET = Deno.env.get('PUSH_SECRET') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? '/'

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? APP_URL,
  Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
  Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
)

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

type Activity = {
  id: number
  couple_id: string
  actor_id: string | null
  kind: 'memory' | 'photos' | 'favorite' | 'letter' | 'note' | 'note_seen' | 'note_loved' | 'comment'
  memory_id: string | null
  letter_id: string | null
  note_id: string | null
  photo_count: number
  video_count: number
}

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`)
function media(a: Activity) {
  if (a.photo_count === 1 && !a.video_count) return 'una foto'
  if (a.video_count === 1 && !a.photo_count) return 'un video'
  return [a.photo_count && plural(a.photo_count, 'foto', 'fotos'), a.video_count && plural(a.video_count, 'video', 'videos')]
    .filter(Boolean)
    .join(' y ')
}

function message(a: Activity, name: string, memoryAuthor: string | null, recipient: string, noteHasPhoto: boolean) {
  const memoryUrl = a.memory_id ? `#/recuerdo/${a.memory_id}` : '#/'
  switch (a.kind) {
    case 'memory':
      return {
        body: a.photo_count + a.video_count > 0 ? `${name} guardó un recuerdo con ${media(a)}.` : `${name} guardó un recuerdo.`,
        url: memoryUrl,
      }
    case 'photos':
      return { body: `${name} agregó ${media(a)}.`, url: memoryUrl }
    case 'favorite':
      return {
        body: memoryAuthor === recipient ? `A ${name} le encantó tu recuerdo.` : `${name} marcó un momento como favorito.`,
        url: memoryUrl,
      }
    case 'letter':
      return { body: `${name} te escribió una cartita.`, url: a.letter_id ? `#/cartitas/${a.letter_id}` : '#/cartitas' }
    case 'note':
      return { body: noteHasPhoto ? `${name} te dejó una notita con foto.` : `${name} te dejó una notita.`, url: '#/' }
    case 'note_seen':
      return { body: `${name} vio tu notita.`, url: '#/' }
    case 'note_loved':
      return { body: `A ${name} le encantó tu notita.`, url: '#/' }
    case 'comment':
      return { body: `${name} respondió a ${memoryAuthor === recipient ? 'tu' : 'un'} recuerdo.`, url: memoryUrl }
  }
}

Deno.serve(async (req) => {
  if (!SECRET || req.headers.get('x-push-secret') !== SECRET) return new Response('forbidden', { status: 403 })
  const { activity_id } = await req.json().catch(() => ({}))
  if (!activity_id) return new Response('bad request', { status: 400 })

  let { data: a } = await admin.from('activity').select('*').eq('id', activity_id).maybeSingle<Activity>()
  if (!a || !a.actor_id) return new Response('gone', { status: 200 })
  if (a.kind === 'memory') {
    // A memory's photo count is folded in right after it's created: wait for it.
    await new Promise((r) => setTimeout(r, 2500))
    ;({ data: a } = await admin.from('activity').select('*').eq('id', activity_id).maybeSingle<Activity>())
    if (!a || !a.actor_id) return new Response('gone', { status: 200 })
  }

  const { data: members } = await admin
    .from('couple_members')
    .select('user_id, profiles(display_name, nickname)')
    .eq('couple_id', a.couple_id)
  const actor = members?.find((m) => m.user_id === a.actor_id)
  const profile = actor?.profiles as unknown as { display_name: string; nickname: string | null } | undefined
  const name = profile?.nickname || profile?.display_name.split(/\s+/)[0] || 'Tu pareja'
  const recipients = (members ?? []).map((m) => m.user_id).filter((id) => id !== a.actor_id)
  if (!recipients.length) return new Response('nobody', { status: 200 })

  let memoryAuthor: string | null = null
  if (a.memory_id) {
    const { data: m } = await admin.from('memories').select('created_by').eq('id', a.memory_id).maybeSingle()
    memoryAuthor = m?.created_by ?? null
  }

  let noteHasPhoto = false
  if (a.kind === 'note' && a.note_id) {
    const { data: n } = await admin.from('notes').select('photo_path').eq('id', a.note_id).maybeSingle()
    if (!n) return new Response('gone', { status: 200 }) // taken back already
    noteHasPhoto = Boolean(n.photo_path)
  }

  const { data: subs } = await admin.from('push_subscriptions').select('*').in('user_id', recipients)
  let sent = 0
  await Promise.all(
    (subs ?? []).map(async (s) => {
      const msg = message(a!, name, memoryAuthor, s.user_id, noteHasPhoto)
      const payload = JSON.stringify({ title: 'Nuestro Lugar', body: msg.body, url: msg.url, tag: `${a!.kind}-${a!.memory_id ?? a!.id}` })
      try {
        // "high" = deliver now. With the default, Apple and Google may hold the
        // notification (battery saving) until the phone wakes or the app opens.
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 60 * 60 * 24,
          urgency: 'high',
        })
        sent++
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode
        // The device unsubscribed or the subscription expired: forget it.
        if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('id', s.id)
        else console.error('push failed', status, (error as Error).message)
      }
    }),
  )
  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } })
})
