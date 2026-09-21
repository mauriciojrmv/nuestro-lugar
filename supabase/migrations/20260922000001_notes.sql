-- ============================================================================
-- Nuestro Lugar · 04 · Notitas
-- Short notes for the partner that are read once. Reading one deletes it:
-- nothing is kept, not even for the author. Only the fact that it was seen
-- remains in the activity feed.
-- ============================================================================

create table public.notes (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples (id) on delete cascade,
  author_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 280),
  created_at   timestamptz not null default now(),
  check (author_id <> recipient_id)
);
create index notes_recipient_idx on public.notes (couple_id, recipient_id, created_at);

alter table public.notes enable row level security;
revoke all on public.notes from anon;

-- Only the two people involved ever see a note (in a couple that's both, but it's explicit).
create policy "notes: author or recipient read" on public.notes
  for select to authenticated
  using (public.is_couple_member(couple_id) and (select auth.uid()) in (author_id, recipient_id));

create policy "notes: write to partner" on public.notes
  for insert to authenticated
  with check (
    public.is_couple_member(couple_id)
    and author_id = (select auth.uid())
    and exists (
      select 1 from public.couple_members m
      where m.couple_id = notes.couple_id and m.user_id = notes.recipient_id
    )
  );

-- Reading (recipient) or taking it back (author) both delete it. Notes are never edited.
create policy "notes: author or recipient delete" on public.notes
  for delete to authenticated
  using (public.is_couple_member(couple_id) and (select auth.uid()) in (author_id, recipient_id));

-- ---------------------------------------------------------------------------
-- Activity: "Mau te dejó una notita" / "Favi vio tu notita" (never the text)
-- ---------------------------------------------------------------------------
alter table public.activity drop constraint if exists activity_kind_check;
alter table public.activity
  add constraint activity_kind_check
  check (kind in ('memory', 'photos', 'favorite', 'letter', 'note', 'note_seen'));
alter table public.activity add column if not exists note_id uuid;

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
    values (old.couple_id, old.recipient_id, 'note_seen', old.id);
  else
    -- Taken back before being read: as if it never happened.
    delete from public.activity where kind = 'note' and note_id = old.id;
  end if;
  return null;
end $$;

create trigger notes_activity after insert or delete on public.notes
  for each row execute function public.activity_on_note();

revoke execute on function public.activity_on_note() from public, anon, authenticated;

alter publication supabase_realtime add table public.notes;
