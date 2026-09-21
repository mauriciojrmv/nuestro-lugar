import type { Activity } from '@/types/domain'
import { mediaLabel } from './media'

/** "una foto", "un video", "3 fotos", "2 fotos y 1 video" */
function media(a: Activity) {
  if (a.photoCount === 1 && !a.videoCount) return 'una foto'
  if (a.videoCount === 1 && !a.photoCount) return 'un video'
  return mediaLabel(a.photoCount, a.videoCount)
}

const hasMedia = (a: Activity) => a.photoCount + a.videoCount > 0

/** Quiet line for the Home feed: "Favi agregó 3 fotos." / "Guardaste un recuerdo." */
export function activityLine(a: Activity, actorName: string, isMe: boolean): string {
  switch (a.kind) {
    case 'memory':
      if (hasMedia(a))
        return isMe ? `Guardaste un recuerdo con ${media(a)}.` : `${actorName} guardó un recuerdo con ${media(a)}.`
      return isMe ? 'Guardaste un recuerdo.' : `${actorName} guardó un recuerdo.`
    case 'photos':
      return isMe ? `Agregaste ${media(a)}.` : `${actorName} agregó ${media(a)}.`
    case 'favorite':
      return isMe ? 'Marcaste un momento como favorito.' : `${actorName} marcó un momento como favorito.`
    case 'letter':
      return isMe ? 'Escribiste una cartita.' : `${actorName} te escribió una cartita.`
    case 'note':
      return isMe ? 'Dejaste una notita.' : `${actorName} te dejó una notita.`
    case 'note_seen':
      return isMe ? 'Viste una notita.' : `${actorName} vio tu notita.`
    case 'comment':
      return isMe ? 'Respondiste a un recuerdo.' : `${actorName} respondió a un recuerdo.`
  }
}

/** Live notice when the partner does something right now. */
export function liveLine(a: Activity, actorName: string): string {
  switch (a.kind) {
    case 'memory':
      return hasMedia(a)
        ? `${actorName} acaba de guardar un recuerdo con ${media(a)}.`
        : `${actorName} acaba de guardar un recuerdo.`
    case 'photos':
      return `${actorName} acaba de agregar ${media(a)}.`
    case 'favorite':
      return `${actorName} marcó un momento como favorito.`
    case 'letter':
      return `${actorName} te escribió una cartita.`
    case 'note':
      return `${actorName} te dejó una notita.`
    case 'note_seen':
      return `${actorName} vio tu notita.`
    case 'comment':
      return `${actorName} respondió a un recuerdo.`
  }
}
