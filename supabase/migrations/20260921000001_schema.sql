-- ============================================================================
-- Nuestro Lugar · 01 · Schema
-- Every shared resource belongs to a couple_id. Composite foreign keys
-- (memory_id, couple_id) make it impossible to attach a photo, favorite or
-- letter of one couple to a memory of another.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  nickname     text check (char_length(nickname) <= 30),
  avatar_path  text check (avatar_path is null or avatar_path like 'avatars/' || id::text || '/%'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- couples + couple_members
-- ---------------------------------------------------------------------------
create table public.couples (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Nuestro lugar' check (char_length(name) between 1 and 60),
  start_date  date,
  invite_code text unique check (invite_code is null or invite_code ~ '^[A-Z2-9]{4}-[A-Z2-9]{4}$'),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.couple_members (
  couple_id uuid not null references public.couples (id) on delete cascade,
  -- unique: an account can never belong to more than one couple.
  user_id   uuid not null unique references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

-- ---------------------------------------------------------------------------
-- memories: the central entity
-- ---------------------------------------------------------------------------
create table public.memories (
  id             uuid primary key default gen_random_uuid(),
  couple_id      uuid not null references public.couples (id) on delete cascade,
  memory_date    date not null,
  title          text check (char_length(title) <= 120),
  body           text check (char_length(body) <= 20000),
  location       text check (char_length(location) <= 120),
  mood           text check (char_length(mood) <= 30),
  cover_photo_id uuid,
  created_by     uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, couple_id)
);
create index memories_couple_date_idx on public.memories (couple_id, memory_date desc);

-- ---------------------------------------------------------------------------
-- memory_photos: files live in Storage, only metadata lives here
-- ---------------------------------------------------------------------------
create table public.memory_photos (
  id                uuid primary key default gen_random_uuid(),
  couple_id         uuid not null,
  memory_id         uuid not null,
  storage_path      text not null unique,
  thumb_path        text,
  original_filename text check (char_length(original_filename) <= 255),
  content_type      text,
  width             integer check (width > 0),
  height            integer check (height > 0),
  size_bytes        bigint,
  position          integer not null default 0,
  created_by        uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  -- Named: memories ↔ memory_photos has two relationships (this one and the cover),
  -- and the API embeds photos through this one explicitly.
  constraint memory_photos_memory_fk
    foreign key (memory_id, couple_id) references public.memories (id, couple_id) on delete cascade,
  check (storage_path like 'couples/' || couple_id::text || '/%'),
  check (thumb_path is null or thumb_path like 'couples/' || couple_id::text || '/%')
);
create index memory_photos_memory_idx on public.memory_photos (memory_id, position);
create index memory_photos_couple_idx on public.memory_photos (couple_id);

alter table public.memories
  add constraint memories_cover_photo_fk
  foreign key (cover_photo_id) references public.memory_photos (id) on delete set null;

-- ---------------------------------------------------------------------------
-- letters ("Cartitas")
-- ---------------------------------------------------------------------------
create table public.letters (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples (id) on delete cascade,
  memory_id    uuid,
  author_id    uuid default auth.uid() references public.profiles (id) on delete set null,
  recipient_id uuid references public.profiles (id) on delete set null,
  letter_date  date not null default current_date,
  body         text not null check (char_length(body) between 1 and 20000),
  read_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  foreign key (memory_id, couple_id) references public.memories (id, couple_id) on delete set null (memory_id),
  check (author_id is distinct from recipient_id)
);
create index letters_couple_idx on public.letters (couple_id, letter_date desc);

-- ---------------------------------------------------------------------------
-- favorites ("Momentos")
-- ---------------------------------------------------------------------------
create table public.favorites (
  memory_id  uuid not null,
  couple_id  uuid not null,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (memory_id, user_id),
  foreign key (memory_id, couple_id) references public.memories (id, couple_id) on delete cascade
);
create index favorites_couple_idx on public.favorites (couple_id);

-- ---------------------------------------------------------------------------
-- activity: written only by triggers, read by both members
-- ---------------------------------------------------------------------------
create table public.activity (
  id          bigint generated always as identity primary key,
  couple_id   uuid not null references public.couples (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete set null,
  kind        text not null check (kind in ('memory', 'photos', 'favorite', 'letter')),
  memory_id   uuid references public.memories (id) on delete cascade,
  letter_id   uuid references public.letters (id) on delete cascade,
  photo_count integer not null default 0,
  created_at  timestamptz not null default now()
);
create index activity_couple_idx on public.activity (couple_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Generic triggers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger couples_touch before update on public.couples
  for each row execute function public.touch_updated_at();
create trigger memories_touch before update on public.memories
  for each row execute function public.touch_updated_at();
create trigger letters_touch before update on public.letters
  for each row execute function public.touch_updated_at();

-- Ownership columns are immutable once written.
create or replace function public.protect_ownership()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- Referential actions (e.g. ON DELETE SET NULL) run nested; let them through.
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if new.couple_id is distinct from old.couple_id then
    raise exception 'couple_id is immutable';
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'created_by is immutable';
  end if;
  return new;
end $$;

create trigger memories_protect before update on public.memories
  for each row execute function public.protect_ownership();
create trigger memory_photos_protect before update on public.memory_photos
  for each row execute function public.protect_ownership();

-- A memory's cover must be one of its own photos.
create or replace function public.check_memory_cover()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.cover_photo_id is not null and not exists (
    select 1 from public.memory_photos p
    where p.id = new.cover_photo_id and p.memory_id = new.id
  ) then
    raise exception 'cover photo must belong to the memory';
  end if;
  return new;
end $$;

create trigger memories_cover_check before update of cover_photo_id on public.memories
  for each row execute function public.check_memory_cover();

-- Letters: the recipient can only mark as read; the author can edit the text.
create or replace function public.protect_letter()
returns trigger language plpgsql set search_path = '' as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if new.couple_id is distinct from old.couple_id
     or new.author_id is distinct from old.author_id
     or new.recipient_id is distinct from old.recipient_id then
    raise exception 'letter ownership is immutable';
  end if;
  if (select auth.uid()) = old.recipient_id then
    if new.body is distinct from old.body
       or new.letter_date is distinct from old.letter_date
       or new.memory_id is distinct from old.memory_id then
      raise exception 'only the author can edit a letter';
    end if;
  elsif new.read_at is distinct from old.read_at then
    raise exception 'only the recipient can mark a letter as read';
  end if;
  return new;
end $$;

create trigger letters_protect before update on public.letters
  for each row execute function public.protect_letter();

-- New auth user → profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, nickname)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 60),
    left(nullif(trim(new.raw_user_meta_data ->> 'nickname'), ''), 30)
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
