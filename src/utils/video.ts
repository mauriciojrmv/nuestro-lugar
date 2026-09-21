import { AppError } from '@/lib/errors'

/** Supabase's free plan accepts single uploads up to 50 MB (≈ 30 s of phone video). */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024

const EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
}

export const isVideoFile = (f: File) => f.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(f.name)

export interface PreparedVideo {
  main: Blob
  mainType: string
  mainExt: string
  thumb: Blob
  width: number
  height: number
  duration: number
}

const THUMB_SHORT_SIDE = 600

function once<T extends keyof HTMLVideoElementEventMap>(el: HTMLVideoElement, event: T, timeoutMs = 15000) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new AppError('No pudimos leer este video en este dispositivo.')), timeoutMs)
    el.addEventListener(event, () => (clearTimeout(t), resolve()), { once: true })
    el.addEventListener('error', () => (clearTimeout(t), reject(new AppError('No pudimos leer este video en este dispositivo.'))), { once: true })
  })
}

/**
 * Videos are uploaded as they are (no re-encoding in the browser), with a
 * still frame as the thumbnail for grids, the calendar and the timeline.
 */
export async function prepareVideo(file: File): Promise<PreparedVideo> {
  if (file.size > MAX_VIDEO_BYTES) {
    throw new AppError('Este video es muy largo. Recórtalo a unos 30 segundos (máx. 50 MB) y vuelve a intentarlo.')
  }
  const type = file.type || 'video/mp4'
  const ext = EXT[type] ?? file.name.split('.').pop()?.toLowerCase() ?? 'mp4'

  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url
  try {
    await once(video, 'loadeddata')
    const duration = Number.isFinite(video.duration) ? video.duration : 0
    // A frame a little in, so it isn't a black first frame.
    video.currentTime = Math.min(0.6, duration / 3 || 0)
    await once(video, 'seeked').catch(() => undefined)

    const w = video.videoWidth || 1080
    const h = video.videoHeight || 1920
    const scale = Math.min(1, THUMB_SHORT_SIDE / Math.min(w, h))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#151518'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    } catch {
      // Some formats can't be drawn; the dark frame still works as a poster.
    }
    const thumb = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new AppError('No pudimos preparar este video.'))), 'image/jpeg', 0.8),
    )
    return { main: file, mainType: type, mainExt: ext, thumb, width: w, height: h, duration }
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}

/** "0:27" */
export function formatDuration(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(seconds ?? 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
