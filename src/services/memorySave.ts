import { prepareImage, type PreparedImage } from '@/utils/image'
import { isVideoFile, prepareVideo, type PreparedVideo } from '@/utils/video'
import { insertMemory, setMemoryCover, updateMemory, type MemoryFields } from './memories'
import { insertPhotos, type NewPhotoRow } from './photos'
import { photoPaths, photoStorage } from './storage'

export interface DraftPhoto {
  id: string
  file: File
  previewUrl: string
  /** Cached between retries so nothing is processed or uploaded twice. */
  prepared?: (PreparedImage & { duration?: undefined }) | PreparedVideo
  uploaded?: boolean
}

export interface SaveJob {
  memoryId: string
  isNew: boolean
  coupleId: string
  userId: string
  fields: MemoryFields
  photos: DraftPhoto[]
  /** Position of the first new photo (existing photos keep theirs). */
  startPosition: number
  /** Whether the first new photo becomes the cover. */
  setCover: boolean
  memorySaved?: boolean
  photosSaved?: boolean
}

export type SavePhase = 'preparing' | 'uploading' | 'saving'
export type ProgressFn = (phase: SavePhase, fraction: number) => void

const UPLOAD_CONCURRENCY = 2

/**
 * Upload files first, then write rows. The memory and its photos land in the
 * database back to back, so the partner never sees a half-saved memory.
 * Safe to call again with the same job after a failure: finished steps are skipped.
 */
export async function runSaveJob(job: SaveJob, onProgress: ProgressFn) {
  const { photos } = job

  // 1 · Prepare (decode, thumbnail, maybe re-encode)
  for (let i = 0; i < photos.length; i++) {
    onProgress('preparing', i / Math.max(photos.length, 1))
    const file = photos[i].file
    photos[i].prepared ??= isVideoFile(file) ? await prepareVideo(file) : await prepareImage(file)
  }

  // 2 · Upload with byte-level progress
  const totalBytes = photos.reduce((sum, p) => sum + p.prepared!.main.size + p.prepared!.thumb.size, 0)
  const loaded = new Map<string, number>()
  photos.filter((p) => p.uploaded).forEach((p) => loaded.set(p.id, p.prepared!.main.size + p.prepared!.thumb.size))
  const report = () => {
    const done = [...loaded.values()].reduce((a, b) => a + b, 0)
    onProgress('uploading', totalBytes ? done / totalBytes : 1)
  }
  report()

  const queue = photos.filter((p) => !p.uploaded)
  const worker = async () => {
    for (let photo = queue.shift(); photo; photo = queue.shift()) {
      const prepared = photo.prepared!
      const paths = photoPaths(job.coupleId, job.memoryId, photo.id, prepared.mainExt)
      await photoStorage.upload(paths.thumb, prepared.thumb, {
        contentType: 'image/jpeg',
        onProgress: (b) => (loaded.set(photo!.id, b), report()),
      })
      await photoStorage.upload(paths.main, prepared.main, {
        contentType: prepared.mainType,
        onProgress: (b) => (loaded.set(photo!.id, prepared.thumb.size + b), report()),
      })
      photo.uploaded = true
    }
  }
  await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, worker))

  // 3 · Rows
  onProgress('saving', 1)
  if (!job.memorySaved) {
    if (job.isNew) await insertMemory(job.memoryId, job.coupleId, job.userId, job.fields)
    else await updateMemory(job.memoryId, job.fields)
    job.memorySaved = true
  }

  if (!job.photosSaved && photos.length > 0) {
    const rows: NewPhotoRow[] = photos.map((p, i) => {
      const prepared = p.prepared!
      return {
        id: p.id,
        memory_id: job.memoryId,
        couple_id: job.coupleId,
        storage_path: photoPaths(job.coupleId, job.memoryId, p.id, prepared.mainExt).main,
        thumb_path: photoPaths(job.coupleId, job.memoryId, p.id, prepared.mainExt).thumb,
        original_filename: p.file.name.slice(0, 255),
        content_type: prepared.mainType,
        width: prepared.width,
        height: prepared.height,
        size_bytes: prepared.main.size,
        position: job.startPosition + i,
        media_type: prepared.duration === undefined ? 'image' : 'video',
        duration_seconds: prepared.duration === undefined ? null : Math.round(prepared.duration * 100) / 100,
        created_by: job.userId,
      }
    })
    await insertPhotos(rows)
    job.photosSaved = true
    // Whatever is first in the tray is the cover (a video's still frame works too).
    if (job.setCover) await setMemoryCover(job.memoryId, photos[0].id)
  }
}
