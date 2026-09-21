import type { Photo } from '@/types/domain'

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`)

/** "3 fotos", "1 video", "2 fotos y 1 video" */
export function mediaLabel(photos: number, videos: number): string {
  const parts = [photos && plural(photos, 'foto', 'fotos'), videos && plural(videos, 'video', 'videos')].filter(Boolean)
  return parts.join(' y ')
}

export function countMedia(items: Pick<Photo, 'mediaType'>[]) {
  const videos = items.filter((p) => p.mediaType === 'video').length
  return { photos: items.length - videos, videos }
}

export const mediaLabelOf = (items: Pick<Photo, 'mediaType'>[]) => {
  const { photos, videos } = countMedia(items)
  return mediaLabel(photos, videos)
}
