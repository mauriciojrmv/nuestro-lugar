/**
 * End-to-end check of the security model against a real Supabase project.
 *
 *   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run verify:rls
 *
 * Creates three throwaway accounts: A and B share a couple, C is an outsider.
 * Every assertion is made with the public anon key only, exactly like the app.
 * Requires sign-ups enabled and email confirmation off (true for `supabase start`).
 * Run it against a local or staging project, not the one with your real memories.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

let failures = 0
const ok = (cond, label) => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${label}`)
  if (!cond) failures++
}

const run = Date.now().toString(36)
async function account(name) {
  const client = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await client.auth.signUp({
    email: `${name}-${run}@example.test`,
    password: `pw-${run}-secure`,
    options: { data: { display_name: name } },
  })
  if (error || !data.session) throw new Error(`sign up ${name}: ${error?.message ?? 'no session (email confirmation on?)'}`)
  return { client, id: data.user.id }
}

const anon = createClient(url, key, { auth: { persistSession: false } })
const A = await account('Ana')
const B = await account('Beto')
const C = await account('Carla')

console.log('\nCouples')
const { data: couple, error: createErr } = await A.client.rpc('create_couple', { p_name: null, p_start_date: '2026-09-11' })
ok(!createErr && couple?.invite_code, 'A creates a couple and gets an invite code')
const { error: twiceErr } = await A.client.rpc('create_couple', { p_name: null, p_start_date: null })
ok(/already_in_couple/.test(twiceErr?.message ?? ''), 'A cannot create a second couple')
const { error: badCode } = await C.client.rpc('join_couple', { p_code: 'ZZZZ-ZZZZ' })
ok(/invalid_code/.test(badCode?.message ?? ''), 'an invalid code is rejected')
const { error: joinErr } = await B.client.rpc('join_couple', { p_code: couple.invite_code.toLowerCase() })
ok(!joinErr, 'B joins with the code (case-insensitive)')
const { error: thirdErr } = await C.client.rpc('join_couple', { p_code: couple.invite_code })
ok(Boolean(thirdErr), 'C cannot join a complete couple (code is retired)')
const { data: cCouple } = await C.client.from('couples').select('*')
ok(cCouple?.length === 0, 'C cannot see the couple')
const { error: forgeMember } = await C.client.from('couple_members').insert({ couple_id: couple.id, user_id: C.id })
ok(Boolean(forgeMember), 'C cannot insert itself into couple_members')

console.log('\nMemories')
const memoryId = crypto.randomUUID()
const { error: memErr } = await A.client
  .from('memories')
  .insert({ id: memoryId, couple_id: couple.id, memory_date: '2026-09-11', title: 'Nuestro comienzo', created_by: A.id })
ok(!memErr, 'A creates a memory')
const { data: bSees } = await B.client.from('memories').select('id').eq('id', memoryId)
ok(bSees?.length === 1, 'B sees it')
const { data: cSees } = await C.client.from('memories').select('id')
ok(cSees?.length === 0, 'C sees nothing')
const { data: anonSees } = await anon.from('memories').select('id')
ok(!anonSees?.length, 'anonymous visitors see nothing')
const { error: cInsert } = await C.client
  .from('memories')
  .insert({ couple_id: couple.id, memory_date: '2026-09-12', created_by: C.id })
ok(Boolean(cInsert), 'C cannot write into the couple')
const { error: forgeAuthor } = await B.client
  .from('memories')
  .insert({ couple_id: couple.id, memory_date: '2026-09-12', created_by: A.id })
ok(Boolean(forgeAuthor), 'B cannot create a memory in A’s name')
await B.client.from('memories').delete().eq('id', memoryId)
const { data: stillThere } = await A.client.from('memories').select('id').eq('id', memoryId)
ok(stillThere?.length === 1, 'B cannot delete A’s memory')
const { error: moveErr } = await B.client.from('memories').update({ created_by: B.id }).eq('id', memoryId)
ok(Boolean(moveErr), 'authorship is immutable')

console.log('\nStorage')
const path = `couples/${couple.id}/${memoryId}/${crypto.randomUUID()}.jpg`
const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
const { error: upErr } = await A.client.storage.from('memories').upload(path, bytes, { contentType: 'image/jpeg' })
ok(!upErr, 'A uploads a photo')
const { data: bSigned } = await B.client.storage.from('memories').createSignedUrl(path, 60)
ok(Boolean(bSigned?.signedUrl), 'B can get a signed URL')
const { data: cSigned } = await C.client.storage.from('memories').createSignedUrl(path, 60)
ok(!cSigned?.signedUrl, 'C cannot sign it')
const { data: cDownload } = await C.client.storage.from('memories').download(path)
ok(!cDownload, 'C cannot download it')
const publicRes = await fetch(`${url}/storage/v1/object/public/memories/${path}`)
ok(publicRes.status >= 400, 'there is no public URL')
const { error: cUpload } = await C.client.storage
  .from('memories')
  .upload(`couples/${couple.id}/${memoryId}/intruder.jpg`, bytes, { contentType: 'image/jpeg' })
ok(Boolean(cUpload), 'C cannot upload into the couple’s folder')
const { error: badPath } = await A.client.storage.from('memories').upload(`elsewhere/${crypto.randomUUID()}.jpg`, bytes, { contentType: 'image/jpeg' })
ok(Boolean(badPath), 'uploads outside the known folders are refused')

console.log('\nPhotos, favorites, letters, activity')
const photoId = crypto.randomUUID()
const { error: photoErr } = await A.client.from('memory_photos').insert({
  id: photoId,
  couple_id: couple.id,
  memory_id: memoryId,
  storage_path: path,
  created_by: A.id,
})
ok(!photoErr, 'A attaches the photo')
const { error: crossPhoto } = await C.client.from('memory_photos').insert({
  couple_id: couple.id,
  memory_id: memoryId,
  storage_path: `couples/${couple.id}/${memoryId}/x.jpg`,
  created_by: C.id,
})
ok(Boolean(crossPhoto), 'C cannot attach photos to the memory')
const { error: favErr } = await B.client.from('favorites').insert({ memory_id: memoryId, couple_id: couple.id, user_id: B.id })
ok(!favErr, 'B marks it as favorite')
const { error: letterErr } = await A.client
  .from('letters')
  .insert({ couple_id: couple.id, author_id: A.id, recipient_id: B.id, body: 'Hola' })
ok(!letterErr, 'A writes a letter to B')
const { error: letterToC } = await A.client
  .from('letters')
  .insert({ couple_id: couple.id, author_id: A.id, recipient_id: C.id, body: 'Hola' })
ok(Boolean(letterToC), 'letters can only go to the partner')
const { data: cLetters } = await C.client.from('letters').select('id')
ok(cLetters?.length === 0, 'C reads no letters')
const { data: activity } = await B.client.from('activity').select('kind, photo_count').order('id')
ok(
  activity?.some((a) => a.kind === 'memory' && a.photo_count === 1) && activity?.some((a) => a.kind === 'letter'),
  'activity is recorded by triggers (memory with 1 photo, letter)',
)
const { error: forgeActivity } = await C.client.from('activity').insert({ couple_id: couple.id, kind: 'memory' })
ok(Boolean(forgeActivity), 'activity cannot be forged')

console.log('\nIntegrity')
const { error: coverOk } = await A.client.from('memories').update({ cover_photo_id: photoId }).eq('id', memoryId)
ok(!coverOk, 'a memory’s own photo can be its cover')
const { error: coverBad } = await A.client.from('memories').update({ cover_photo_id: crypto.randomUUID() }).eq('id', memoryId)
ok(Boolean(coverBad), 'a foreign photo cannot be a cover')
const { data: linked } = await A.client
  .from('letters')
  .insert({ couple_id: couple.id, author_id: A.id, recipient_id: B.id, body: 'Para este día', memory_id: memoryId })
  .select('id')
  .single()
const { error: readErr } = await B.client.from('letters').update({ read_at: new Date().toISOString() }).eq('id', linked.id)
ok(!readErr, 'the recipient can mark a letter as read')
const { error: editErr } = await B.client.from('letters').update({ body: 'otra cosa' }).eq('id', linked.id)
ok(Boolean(editErr), 'the recipient cannot rewrite the letter')
const { error: authorRead } = await A.client.from('letters').update({ read_at: null }).eq('id', linked.id)
ok(Boolean(authorRead), 'the author cannot change its read state')
const { error: delErr } = await A.client.from('memories').delete().eq('id', memoryId)
ok(!delErr, 'the author deletes the memory (photos, favorites cascade)')
const { data: orphan } = await B.client.from('letters').select('memory_id').eq('id', linked.id).single()
ok(orphan && orphan.memory_id === null, 'a letter tied to it survives, detached')
const { data: goneFav } = await B.client.from('favorites').select('memory_id')
ok(goneFav?.length === 0, 'its favorites are gone')

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`)
process.exit(failures === 0 ? 0 : 1)
