-- ============================================================================
-- Nuestro Lugar · 07 · Notitas with a love reaction and an instant photo;
-- reliable push dispatch
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A notita can carry a camera photo (deleted with it) and be "loved" on read.
-- ---------------------------------------------------------------------------
alter table public.notes add column if not exists photo_path text;
alter table public.notes add column if not exists loved boolean not null default false;
alter table public.notes drop constraint if exists notes_body_check;
alter table public.notes add constraint notes_body_check check (char_length(body) <= 280);
alter table public.notes add constraint notes_has_content check (char_length(body) > 0 or photo_path is not null);
alter table public.notes add constraint notes_photo_path_check
  check (photo_path is null or photo_path like 'couples/' || couple_id::text || '/notes/%');

-- Only the recipient may mark it loved (just before it disappears). Nothing else is editable.
create policy "notes: recipient reacts" on public.notes
  for update to authenticated
  using (public.is_couple_member(couple_id) and recipient_id = (select auth.uid()))
  with check (public.is_couple_member(couple_id) and recipient_id = (select auth.uid()));
revoke update on public.notes from authenticated;
grant update (loved) on public.notes to authenticated;

alter table public.activity drop constraint if exists activity_kind_check;
alter table public.activity
  add constraint activity_kind_check
  check (kind in ('memory', 'photos', 'favorite', 'letter', 'note', 'note_seen', 'note_loved', 'comment'));

create or replace function public.activity_on_note()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity (couple_id, actor_id, kind, note_id)
    values (new.couple_id, new.author_id, 'note', new.id);
    return null;
  end if;

  if (select auth.uid()) = old.recipient_id then
    insert into public.activity (couple_id, actor_id, kind, note_id)
    values (old.couple_id, old.recipient_id, case when old.loved then 'note_loved' else 'note_seen' end, old.id);
  else
    delete from public.activity where kind = 'note' and note_id = old.id;
  end if;
  return null;
end $$;

-- ---------------------------------------------------------------------------
-- The push function waits briefly for photo counts: give the call time to finish
-- (pg_net's default 5 s timeout could cut it off).
-- ---------------------------------------------------------------------------
create or replace function private.dispatch_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  cfg private.push_config;
begin
  select * into cfg from private.push_config where id = 1;
  if not found then
    return null;
  end if;
  perform net.http_post(
    url := cfg.url,
    body := jsonb_build_object('activity_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', cfg.secret),
    timeout_milliseconds := 30000
  );
  return null;
exception when others then
  return null;
end $$;
