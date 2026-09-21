import type { ActivityRow, CoupleRow, LetterRow, MemoryPhotoRow, MemoryRow, NoteRow, ProfileRow } from '@/types/database'
import type { Activity, Couple, Letter, Memory, Note, Photo, Profile } from '@/types/domain'

export const toProfile = (r: ProfileRow): Profile => ({
  id: r.id,
  displayName: r.display_name,
  nickname: r.nickname,
  avatarPath: r.avatar_path,
})

export const toCouple = (r: CoupleRow): Couple => ({
  id: r.id,
  name: r.name,
  startDate: r.start_date,
  inviteCode: r.invite_code,
})

export const toPhoto = (r: MemoryPhotoRow): Photo => ({
  id: r.id,
  memoryId: r.memory_id,
  storagePath: r.storage_path,
  thumbPath: r.thumb_path,
  originalFilename: r.original_filename,
  contentType: r.content_type,
  width: r.width,
  height: r.height,
  position: r.position,
  createdBy: r.created_by,
  createdAt: r.created_at,
})

export type MemoryWithRelations = MemoryRow & {
  memory_photos: MemoryPhotoRow[] | null
  favorites: { user_id: string }[] | null
}

export const toMemory = (r: MemoryWithRelations): Memory => ({
  id: r.id,
  coupleId: r.couple_id,
  date: r.memory_date,
  title: r.title,
  body: r.body,
  location: r.location,
  mood: r.mood,
  coverPhotoId: r.cover_photo_id,
  createdBy: r.created_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  photos: (r.memory_photos ?? []).map(toPhoto).sort((a, b) => a.position - b.position),
  favoritedBy: (r.favorites ?? []).map((f) => f.user_id),
})

export const toLetter = (r: LetterRow): Letter => ({
  id: r.id,
  coupleId: r.couple_id,
  memoryId: r.memory_id,
  authorId: r.author_id,
  recipientId: r.recipient_id,
  date: r.letter_date,
  body: r.body,
  readAt: r.read_at,
  createdAt: r.created_at,
})

export const toNote = (r: NoteRow): Note => ({
  id: r.id,
  authorId: r.author_id,
  recipientId: r.recipient_id,
  body: r.body,
  createdAt: r.created_at,
})

export const toActivity = (r: ActivityRow): Activity => ({
  id: r.id,
  actorId: r.actor_id,
  kind: r.kind,
  memoryId: r.memory_id,
  letterId: r.letter_id,
  photoCount: r.photo_count,
  createdAt: r.created_at,
})
