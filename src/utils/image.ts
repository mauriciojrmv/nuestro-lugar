import { AppError } from '@/lib/errors'

/**
 * Prepares a picked photo for upload.
 *
 * - main:  the original file when it's already a reasonable size (quality and
 *          metadata untouched); otherwise re-encoded at a generous 3072px / q0.88.
 * - thumb: short side ~600px, used by grids, calendar and timeline.
 */
export interface PreparedImage {
  main: Blob
  mainType: string
  mainExt: string
  thumb: Blob
  width: number
  height: number
}

const KEEP_ORIGINAL_MAX_BYTES = 5 * 1024 * 1024
const KEEP_ORIGINAL_MAX_SIDE = 4096
const MAIN_MAX_SIDE = 3072
const MAIN_QUALITY = 0.88
const THUMB_SHORT_SIDE = 600
const THUMB_QUALITY = 0.8

const KEEPABLE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

type Drawable = ImageBitmap | HTMLImageElement

async function decode(file: Blob): Promise<{ source: Drawable; width: number; height: number; release: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() }
    } catch {
      // Fall through to <img>, which some browsers decode more formats with.
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) }
  } catch {
    URL.revokeObjectURL(url)
    throw new AppError('No pudimos leer esta imagen en este dispositivo.')
  }
}

function encode(source: Drawable, width: number, height: number, quality: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new AppError('No pudimos preparar esta imagen.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        canvas.width = canvas.height = 0 // free memory early on iOS
        if (blob) resolve(blob)
        else reject(new AppError('No pudimos preparar esta imagen.'))
      },
      'image/jpeg',
      quality,
    )
  })
}

function scaleTo(width: number, height: number, factor: number) {
  return { w: Math.max(1, Math.round(width * factor)), h: Math.max(1, Math.round(height * factor)) }
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const { source, width, height, release } = await decode(file)
  try {
    const longSide = Math.max(width, height)
    const shortSide = Math.min(width, height)

    const thumbSize = scaleTo(width, height, Math.min(1, THUMB_SHORT_SIDE / shortSide))
    const thumb = await encode(source, thumbSize.w, thumbSize.h, THUMB_QUALITY)

    const keepExt = KEEPABLE[file.type]
    if (keepExt && file.size <= KEEP_ORIGINAL_MAX_BYTES && longSide <= KEEP_ORIGINAL_MAX_SIDE) {
      return { main: file, mainType: file.type, mainExt: keepExt, thumb, width, height }
    }

    const mainSize = scaleTo(width, height, Math.min(1, MAIN_MAX_SIDE / longSide))
    const main = await encode(source, mainSize.w, mainSize.h, MAIN_QUALITY)
    return { main, mainType: 'image/jpeg', mainExt: 'jpg', thumb, width: mainSize.w, height: mainSize.h }
  } finally {
    release()
  }
}

/** A quick camera shot for a notita: light, since it's seen once and deleted. */
export async function prepareSnapshot(file: File): Promise<Blob> {
  const { source, width, height, release } = await decode(file)
  try {
    const { w, h } = scaleTo(width, height, Math.min(1, 1600 / Math.max(width, height)))
    return await encode(source, w, h, 0.82)
  } finally {
    release()
  }
}

/** Small square avatar. */
export async function prepareAvatar(file: File): Promise<Blob> {
  const { source, width, height, release } = await decode(file)
  try {
    const side = Math.min(width, height)
    const size = Math.min(512, side)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new AppError('No pudimos preparar esta imagen.')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, (width - side) / 2, (height - side) / 2, side, side, 0, 0, size, size)
    return await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new AppError('No pudimos preparar esta imagen.'))), 'image/jpeg', 0.86),
    )
  } finally {
    release()
  }
}
