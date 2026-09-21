export { photoStorage } from './provider'
export type { PhotoStorage, UploadOptions } from './types'
export { getSignedUrl, peekSignedUrl, clearSignedUrlCache } from './signedUrls'

/** Where a couple's photo files live. Kept in one place so paths stay consistent. */
export const photoPaths = (coupleId: string, memoryId: string, photoId: string, ext: string) => ({
  main: `couples/${coupleId}/${memoryId}/${photoId}.${ext}`,
  thumb: `couples/${coupleId}/${memoryId}/${photoId}_thumb.jpg`,
})

export const avatarStoragePath = (userId: string) => `avatars/${userId}/${Date.now()}.jpg`
