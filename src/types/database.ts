/**
 * Row shapes as returned by PostgREST (snake_case).
 * Services map them into the camelCase domain types in ./domain.
 * Can be replaced by `supabase gen types typescript` output later.
 */
export interface ProfileRow {
  id: string
  display_name: string
  nickname: string | null
  avatar_path: string | null
  created_at: string
  updated_at: string
}

export interface CoupleRow {
  id: string
  name: string
  start_date: string | null
  invite_code: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CoupleMemberRow {
  couple_id: string
  user_id: string
  joined_at: string
}

export interface MemoryRow {
  id: string
  couple_id: string
  memory_date: string
  title: string | null
  body: string | null
  location: string | null
  mood: string | null
  cover_photo_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MemoryPhotoRow {
  id: string
  couple_id: string
  memory_id: string
  storage_path: string
  thumb_path: string | null
  original_filename: string | null
  content_type: string | null
  width: number | null
  height: number | null
  size_bytes: number | null
  position: number
  created_by: string | null
  created_at: string
}

export interface FavoriteRow {
  memory_id: string
  couple_id: string
  user_id: string
  created_at: string
}

export interface LetterRow {
  id: string
  couple_id: string
  memory_id: string | null
  author_id: string | null
  recipient_id: string | null
  letter_date: string
  body: string
  read_at: string | null
  created_at: string
  updated_at: string
}

export interface ActivityRow {
  id: number
  couple_id: string
  actor_id: string | null
  kind: 'memory' | 'photos' | 'favorite' | 'letter'
  memory_id: string | null
  letter_id: string | null
  photo_count: number
  created_at: string
}
