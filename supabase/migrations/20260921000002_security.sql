-- ============================================================================
-- Nuestro Lugar · 02 · Access control
-- Row Level Security is the real boundary. The UI hiding a button is never
-- what keeps data private.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Membership helpers (security definer so they can read couple_members
-- without recursing into its own RLS policy)
-- ---------------------------------------------------------------------------
create or replace function public.is_couple_member(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.couple_members m
    where m.couple_id = cid and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.shares_couple_with(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select uid = (select auth.uid()) or exists (
    select 1
    from public.couple_members me
    join public.couple_members other on other.couple_id = me.couple_id
    where me.user_id = (select auth.uid()) and other.user_id = uid
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.couples        enable row level security;
alter table public.couple_members enable row level security;
alter table public.memories       enable row level security;
alter table public.memory_photos  enable row level security;
alter table public.letters        enable row level security;
alter table public.favorites      enable row level security;
alter table public.activity       enable row level security;

-- Nothing is ever readable without an account.
revoke all on all tables in schema public from anon;

-- profiles ------------------------------------------------------------------
create policy "profiles: read self and partner" on public.profiles
  for select to authenticated using (public.shares_couple_with(id));
create policy "profiles: update self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- couples -------------------------------------------------------------------
-- Created and joined only through the RPCs below.
create policy "couples: members read" on public.couples
  for select to authenticated using (public.is_couple_member(id));
create policy "couples: members update" on public.couples
  for update to authenticated
  using (public.is_couple_member(id)) with check (public.is_couple_member(id));
revoke update on public.couples from authenticated;
grant update (name, start_date) on public.couples to authenticated;

-- couple_members --------------------------------------------------------------
create policy "couple_members: members read" on public.couple_members
  for select to authenticated using (public.is_couple_member(couple_id));

-- memories ------------------------------------------------------------------
create policy "memories: members read" on public.memories
  for select to authenticated using (public.is_couple_member(couple_id));
create policy "memories: members create as self" on public.memories
  for insert to authenticated
  with check (public.is_couple_member(couple_id) and created_by = (select auth.uid()));
create policy "memories: members edit" on public.memories
  for update to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
create policy "memories: author deletes" on public.memories
  for delete to authenticated
  using (public.is_couple_member(couple_id) and created_by = (select auth.uid()));

-- memory_photos ---------------------------------------------------------------
create policy "photos: members read" on public.memory_photos
  for select to authenticated using (public.is_couple_member(couple_id));
create policy "photos: members add as self" on public.memory_photos
  for insert to authenticated
  with check (public.is_couple_member(couple_id) and created_by = (select auth.uid()));
create policy "photos: members reorder" on public.memory_photos
  for update to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
revoke update on public.memory_photos from authenticated;
grant update (position) on public.memory_photos to authenticated;
create policy "photos: uploader deletes" on public.memory_photos
  for delete to authenticated
  using (public.is_couple_member(couple_id) and created_by = (select auth.uid()));

-- letters -------------------------------------------------------------------
create policy "letters: members read" on public.letters
  for select to authenticated using (public.is_couple_member(couple_id));
create policy "letters: write to partner" on public.letters
  for insert to authenticated
  with check (
    public.is_couple_member(couple_id)
    and author_id = (select auth.uid())
    and exists (
      select 1 from public.couple_members m
      where m.couple_id = letters.couple_id and m.user_id = letters.recipient_id
    )
  );
create policy "letters: author or recipient update" on public.letters
  for update to authenticated
  using (public.is_couple_member(couple_id)
         and (select auth.uid()) in (author_id, recipient_id))
  with check (public.is_couple_member(couple_id));
create policy "letters: author deletes" on public.letters
  for delete to authenticated
  using (public.is_couple_member(couple_id) and author_id = (select auth.uid()));

-- favorites -----------------------------------------------------------------
create policy "favorites: members read" on public.favorites
  for select to authenticated using (public.is_couple_member(couple_id));
create policy "favorites: own add" on public.favorites
  for insert to authenticated
  with check (public.is_couple_member(couple_id) and user_id = (select auth.uid()));
create policy "favorites: own remove" on public.favorites
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- activity (read-only for clients) -------------------------------------------
create policy "activity: members read" on public.activity
  for select to authenticated using (public.is_couple_member(couple_id));

-- ---------------------------------------------------------------------------
-- Couple RPCs
-- ---------------------------------------------------------------------------
create or replace function public.generate_invite_code()
returns text language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 symbols, no 0/O/1/I
  bytes bytea := decode(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'hex');
  code text := '';
begin
  for i in 0..7 loop
    code := code || substr(alphabet, (get_byte(bytes, i * 2) % 32) + 1, 1);
    if i = 3 then code := code || '-'; end if;
  end loop;
  return code;
end $$;

create or replace function public.create_couple(p_name text default null, p_start_date date default null)
returns public.couples language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_couple public.couples;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if exists (select 1 from public.couple_members where user_id = v_uid) then
    raise exception 'already_in_couple';
  end if;

  loop
    v_code := public.generate_invite_code();
    exit when not exists (select 1 from public.couples where invite_code = v_code);
  end loop;

  insert into public.couples (name, start_date, invite_code, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Nuestro lugar'), p_start_date, v_code, v_uid)
  returning * into v_couple;

  insert into public.couple_members (couple_id, user_id) values (v_couple.id, v_uid);
  return v_couple;
end $$;

create or replace function public.join_couple(p_code text)
returns public.couples language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_clean text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_couple public.couples;
  v_count int;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if length(v_clean) <> 8 then
    raise exception 'invalid_code';
  end if;

  select * into v_couple from public.couples
  where invite_code = substr(v_clean, 1, 4) || '-' || substr(v_clean, 5, 4)
  for update;

  if not found then
    raise exception 'invalid_code';
  end if;
  if exists (select 1 from public.couple_members where user_id = v_uid) then
    raise exception 'already_in_couple';
  end if;

  select count(*) into v_count from public.couple_members where couple_id = v_couple.id;
  if v_count >= 2 then
    raise exception 'couple_full';
  end if;

  insert into public.couple_members (couple_id, user_id) values (v_couple.id, v_uid);

  -- The space is complete: the code is no longer needed.
  update public.couples set invite_code = null where id = v_couple.id
  returning * into v_couple;
  return v_couple;
end $$;

create or replace function public.regenerate_invite_code()
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_couple_id uuid;
  v_code text;
begin
  select couple_id into v_couple_id from public.couple_members where user_id = v_uid;
  if v_couple_id is null then
    raise exception 'not_in_couple';
  end if;
  if (select count(*) from public.couple_members where couple_id = v_couple_id) >= 2 then
    raise exception 'couple_full';
  end if;
  loop
    v_code := public.generate_invite_code();
    exit when not exists (select 1 from public.couples where invite_code = v_code);
  end loop;
  update public.couples set invite_code = v_code where id = v_couple_id;
  return v_code;
end $$;

revoke execute on function public.create_couple(text, date) from public, anon;
revoke execute on function public.join_couple(text) from public, anon;
revoke execute on function public.regenerate_invite_code() from public, anon;
revoke execute on function public.generate_invite_code() from public, anon, authenticated;
grant execute on function public.create_couple(text, date) to authenticated;
grant execute on function public.join_couple(text) to authenticated;
grant execute on function public.regenerate_invite_code() to authenticated;

-- ---------------------------------------------------------------------------
-- Activity feed, written by triggers so it can't be forged from the client
-- ---------------------------------------------------------------------------
create or replace function public.activity_on_memory()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.activity (couple_id, actor_id, kind, memory_id)
  values (new.couple_id, new.created_by, 'memory', new.id);
  return null;
end $$;

create trigger memories_activity after insert on public.memories
  for each row execute function public.activity_on_memory();

-- Statement-level: one upload of N photos becomes a single activity entry.
-- Photos added right after creating a memory are folded into that entry.
create or replace function public.activity_on_photos()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r record;
begin
  for r in
    select couple_id, memory_id, created_by, count(*)::int as n
    from new_rows group by couple_id, memory_id, created_by
  loop
    update public.activity
       set photo_count = photo_count + r.n
     where kind = 'memory'
       and memory_id = r.memory_id
       and actor_id is not distinct from r.created_by
       and created_at > now() - interval '30 minutes';
    if not found then
      insert into public.activity (couple_id, actor_id, kind, memory_id, photo_count)
      values (r.couple_id, r.created_by, 'photos', r.memory_id, r.n);
    end if;
  end loop;
  return null;
end $$;

create trigger memory_photos_activity after insert on public.memory_photos
  referencing new table as new_rows
  for each statement execute function public.activity_on_photos();

create or replace function public.activity_on_favorite()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity (couple_id, actor_id, kind, memory_id)
    values (new.couple_id, new.user_id, 'favorite', new.memory_id);
    return null;
  end if;
  delete from public.activity
   where kind = 'favorite' and memory_id = old.memory_id and actor_id = old.user_id;
  return null;
end $$;

create trigger favorites_activity after insert or delete on public.favorites
  for each row execute function public.activity_on_favorite();

create or replace function public.activity_on_letter()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.activity (couple_id, actor_id, kind, letter_id)
  values (new.couple_id, new.author_id, 'letter', new.id);
  return null;
end $$;

create trigger letters_activity after insert on public.letters
  for each row execute function public.activity_on_letter();

-- Trigger functions are not callable as RPCs.
revoke execute on function public.activity_on_memory() from public, anon, authenticated;
revoke execute on function public.activity_on_photos() from public, anon, authenticated;
revoke execute on function public.activity_on_favorite() from public, anon, authenticated;
revoke execute on function public.activity_on_letter() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
