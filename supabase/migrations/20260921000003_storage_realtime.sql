-- ============================================================================
-- Nuestro Lugar · 03 · Storage + Realtime
--
-- One private bucket. Object paths encode ownership:
--   couples/<couple_id>/<memory_id>/<photo_id>.jpg        (main)
--   couples/<couple_id>/<memory_id>/<photo_id>_thumb.jpg  (thumbnail)
--   avatars/<user_id>/<timestamp>.jpg
-- Files are only served through short-lived signed URLs.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memories', 'memories', false, 31457280,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif', 'image/avif']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Parses the path safely: malformed names are simply denied.
create or replace function public.storage_path_owner(object_name text, out scope text, out owner uuid)
language plpgsql immutable set search_path = '' as $$
declare
  parts text[] := string_to_array(object_name, '/');
begin
  scope := null;
  owner := null;
  if coalesce(array_length(parts, 1), 0) < 3 then
    return;
  end if;
  begin
    owner := parts[2]::uuid;
  exception when invalid_text_representation then
    owner := null;
    return;
  end;
  scope := parts[1];
end $$;

create or replace function public.storage_can_read(object_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  p record;
begin
  select * into p from public.storage_path_owner(object_name);
  if p.scope = 'couples' then
    return public.is_couple_member(p.owner);
  elsif p.scope = 'avatars' then
    return public.shares_couple_with(p.owner);
  end if;
  return false;
end $$;

create or replace function public.storage_can_write(object_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  p record;
begin
  select * into p from public.storage_path_owner(object_name);
  if p.scope = 'couples' then
    return public.is_couple_member(p.owner);
  elsif p.scope = 'avatars' then
    return p.owner = (select auth.uid());
  end if;
  return false;
end $$;

revoke execute on function public.storage_can_read(text) from public, anon;
revoke execute on function public.storage_can_write(text) from public, anon;
grant execute on function public.storage_can_read(text) to authenticated;
grant execute on function public.storage_can_write(text) to authenticated;

drop policy if exists "memories bucket: read" on storage.objects;
drop policy if exists "memories bucket: upload" on storage.objects;
drop policy if exists "memories bucket: update" on storage.objects;
drop policy if exists "memories bucket: delete" on storage.objects;

create policy "memories bucket: read" on storage.objects
  for select to authenticated
  using (bucket_id = 'memories' and public.storage_can_read(name));

create policy "memories bucket: upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'memories' and public.storage_can_write(name));

create policy "memories bucket: update" on storage.objects
  for update to authenticated
  using (bucket_id = 'memories' and public.storage_can_write(name))
  with check (bucket_id = 'memories' and public.storage_can_write(name));

create policy "memories bucket: delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'memories' and public.storage_can_write(name));

-- ---------------------------------------------------------------------------
-- Realtime: changes are delivered only to subscribers whose RLS allows them.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table
  public.memories,
  public.memory_photos,
  public.favorites,
  public.letters,
  public.activity;
