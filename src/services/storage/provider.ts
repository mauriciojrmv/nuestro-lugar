import { PHOTO_BUCKET } from '@/lib/constants'
import { createSupabaseStorage } from './supabaseStorage'
import type { PhotoStorage } from './types'

/** The active storage provider. Swap this line to change where photos live. */
export const photoStorage: PhotoStorage = createSupabaseStorage(PHOTO_BUCKET)
