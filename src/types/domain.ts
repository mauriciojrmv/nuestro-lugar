import type { ISODate } from '@/lib/dates'

export interface Profile {
  id: string
  displayName: string
  nickname: string | null
  avatarPath: string | null
}

export interface Couple {
  id: string
  name: string
  startDate: ISODate | null
  inviteCode: string | null
}

export interface Photo {
  id: string
  memoryId: string
  storagePath: string
  thumbPath: string | null
  originalFilename: string | null
  contentType: string | null
  width: number | null
  height: number | null
  position: number
  /** Photos and videos share one list per memory. */
  mediaType: 'image' | 'video'
  durationSeconds: number | null
  createdBy: string | null
  createdAt: string
}

/** The central entity: photos, favorites and letters all hang off a memory. */
export interface Memory {
  id: string
  coupleId: string
  date: ISODate
  title: string | null
  body: string | null
  location: string | null
  mood: string | null
  coverPhotoId: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  photos: Photo[]
  favoritedBy: string[]
  /** Saved on this device while offline, not yet synced. */
  pending?: boolean
}

export interface Letter {
  id: string
  coupleId: string
  memoryId: string | null
  authorId: string | null
  recipientId: string | null
  date: ISODate
  body: string
  readAt: string | null
  createdAt: string
  pending?: boolean
}

/** A note read once: it is deleted as soon as the recipient closes it. */
export interface Note {
  id: string
  authorId: string
  recipientId: string
  body: string
  createdAt: string
}

export type ActivityKind = 'memory' | 'photos' | 'favorite' | 'letter' | 'note' | 'note_seen'

export interface Activity {
  id: number
  actorId: string | null
  kind: ActivityKind
  memoryId: string | null
  letterId: string | null
  photoCount: number
  videoCount: number
  createdAt: string
}

/** A photo together with the memory it belongs to (for the viewer and grids). */
export interface PhotoEntry {
  photo: Photo
  memory: Memory
}
