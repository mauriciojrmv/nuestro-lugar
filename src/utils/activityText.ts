import type { Activity } from '@/types/domain'

const photos = (n: number) => (n === 1 ? 'una foto' : `${n} fotos`)

/** Quiet line for the Home feed: "Favi agregó 3 fotos." / "Agregaste un recuerdo." */
export function activityLine(a: Activity, actorName: string, isMe: boolean): string {
  switch (a.kind) {
    case 'memory':
      if (a.photoCount > 0)
        return isMe ? `Guardaste un recuerdo con ${photos(a.photoCount)}.` : `${actorName} guardó un recuerdo con ${photos(a.photoCount)}.`
      return isMe ? 'Guardaste un recuerdo.' : `${actorName} guardó un recuerdo.`
    case 'photos':
      return isMe ? `Agregaste ${photos(a.photoCount)}.` : `${actorName} agregó ${photos(a.photoCount)}.`
    case 'favorite':
      return isMe ? 'Marcaste un momento como favorito.' : `${actorName} marcó un momento como favorito.`
    case 'letter':
      return isMe ? 'Escribiste una cartita.' : `${actorName} te escribió una cartita.`
  }
}

/** Live notice when the partner does something right now. */
export function liveLine(a: Activity, actorName: string): string {
  switch (a.kind) {
    case 'memory':
      return a.photoCount > 0
        ? `${actorName} acaba de guardar un recuerdo con ${photos(a.photoCount)}.`
        : `${actorName} acaba de guardar un recuerdo.`
    case 'photos':
      return `${actorName} acaba de agregar ${photos(a.photoCount)}.`
    case 'favorite':
      return `${actorName} marcó un momento como favorito.`
    case 'letter':
      return `${actorName} te escribió una cartita.`
  }
}
