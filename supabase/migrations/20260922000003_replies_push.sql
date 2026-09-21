-- ============================================================================
-- Nuestro Lugar · 06 · Replies on memories + push notifications
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Replies: a short private conversation under a memory (never public).
-- ---------------------------------------------------------------------------
create table public.memory_comments (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null,
  memory_id  uuid not null,
  author_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  constraint memory_comments_memory_fk
    foreign key (memory_id, couple_id) references public.memories (id, couple_id) on delete cascade
);
create index memory_comments_memory_idx on public.memory_comments (memory_id, created_at);
create index memory_comments_couple_idx on public.memory_comments (couple_id);

alter table public.memory_comments enable row level security;
revoke all on public.memory_comments from anon;

create policy "replies: members read" on public.memory_comments
  for select to authenticated using (public.is_couple_member(couple_id));
create policy "replies: members write as self" on public.memory_comments
  for insert to authenticated
  with check (public.is_couple_member(couple_id) and author_id = (select auth.uid()));
create policy "replies: author deletes" on public.memory_comments
  for delete to authenticated
  using (public.is_couple_member(couple_id) and author_id = (select auth.uid()));

alter table public.activity drop constraint if exists activity_kind_check;
alter table public.activity
  add constraint activity_kind_check
  check (kind in ('memory', 'photos', 'favorite', 'letter', 'note', 'note_seen', 'comment'));
alter table public.activity add column if not exists comment_id uuid;

create or replace function public.activity_on_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity (couple_id, actor_id, kind, memory_id, comment_id)
    values (new.couple_id, new.author_id, 'comment', new.memory_id, new.id);
  else
    delete from public.activity where kind = 'comment' and comment_id = old.id;
  end if;
  return null;
end $$;

create trigger memory_comments_activity after insert or delete on public.memory_comments
  for each row execute function public.activity_on_comment();
revoke execute on function public.activity_on_comment() from public, anon, authenticated;

alter publication supabase_realtime add table public.memory_comments;

-- ---------------------------------------------------------------------------
-- Push subscriptions: one row per device that asked for notifications.
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint   text not null unique check (endpoint like 'https://%'),
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon;

create policy "push: own devices" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.couple_members where user_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- Each new activity asks the "push" Edge Function to notify the partner.
-- Its URL and shared secret live in a private schema the API never exposes;
-- they're set once per project (not in version control).
-- ---------------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.push_config (
  id     int primary key default 1 check (id = 1),
  url    text not null,
  secret text not null
);

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
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', cfg.secret)
  );
  return null;
exception when others then
  -- A notification must never block saving a memory.
  return null;
end $$;

create trigger activity_push after insert on public.activity
  for each row execute function private.dispatch_push();
