-- ============================================================================
-- Nuestro Lugar · 05 · Videos, a single private space, storage usage
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Videos live next to photos: same table, same memory, same privacy.
-- ---------------------------------------------------------------------------
alter table public.memory_photos
  add column if not exists media_type text not null default 'image' check (media_type in ('image', 'video')),
  add column if not exists duration_seconds numeric(8, 2) check (duration_seconds is null or duration_seconds >= 0);

-- 50 MB is the largest single upload on Supabase's free plan.
update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array[
         'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif', 'image/avif',
         'video/mp4', 'video/quicktime', 'video/webm'
       ]
 where id = 'memories';

-- "Mau agregó 2 fotos y 1 video"
alter table public.activity add column if not exists video_count integer not null default 0;

create or replace function public.activity_on_photos()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r record;
begin
  for r in
    select couple_id, memory_id, created_by,
           count(*) filter (where media_type = 'image')::int as photos,
           count(*) filter (where media_type = 'video')::int as videos
    from new_rows group by couple_id, memory_id, created_by
  loop
    update public.activity
       set photo_count = photo_count + r.photos,
           video_count = video_count + r.videos
     where kind = 'memory'
       and memory_id = r.memory_id
       and actor_id is not distinct from r.created_by
       and created_at > now() - interval '30 minutes';
    if not found then
      insert into public.activity (couple_id, actor_id, kind, memory_id, photo_count, video_count)
      values (r.couple_id, r.created_by, 'photos', r.memory_id, r.photos, r.videos);
    end if;
  end loop;
  return null;
end $$;

-- ---------------------------------------------------------------------------
-- One space per installation. Even if sign-ups stay open, a stranger with an
-- account can't create a space, so they can't upload anything or use quota.
-- ---------------------------------------------------------------------------
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
  -- Serialise concurrent attempts, then allow only the first space ever.
  lock table public.couples in share row exclusive mode;
  if exists (select 1 from public.couples) then
    raise exception 'space_taken';
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

-- Avatars too: only people inside a space can upload one.
create or replace function public.storage_can_write(object_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  p record;
begin
  select * into p from public.storage_path_owner(object_name);
  if p.scope = 'couples' then
    return public.is_couple_member(p.owner);
  elsif p.scope = 'avatars' then
    return p.owner = (select auth.uid())
       and exists (select 1 from public.couple_members where user_id = p.owner);
  end if;
  return false;
end $$;

-- ---------------------------------------------------------------------------
-- How much space this couple uses (photos, videos, thumbnails and avatars).
-- ---------------------------------------------------------------------------
create or replace function public.couple_storage_usage()
returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce(sum((o.metadata ->> 'size')::bigint), 0)
  from storage.objects o
  join public.couple_members me on me.user_id = (select auth.uid())
  where o.bucket_id = 'memories'
    and (
      o.name like 'couples/' || me.couple_id::text || '/%'
      or exists (
        select 1 from public.couple_members m
        where m.couple_id = me.couple_id and o.name like 'avatars/' || m.user_id::text || '/%'
      )
    );
$$;

revoke execute on function public.couple_storage_usage() from public, anon;
grant execute on function public.couple_storage_usage() to authenticated;
