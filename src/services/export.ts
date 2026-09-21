import { Zip, ZipDeflate, ZipPassThrough, strToU8 } from 'fflate'
import { capitalize, monthName, parseISODate, todayISO } from '@/lib/dates'
import type { Letter, Memory, Profile } from '@/types/domain'
import { safeFileName, saveBlob } from '@/utils/download'
import { photoStorage } from './storage'

/**
 * Builds a portable copy of the archive:
 *
 *   Nuestra-Historia/
 *     LEEME.txt
 *     historia.json
 *     2026/09-Septiembre/11/foto-01.jpg
 *     2026/09-Septiembre/11/recuerdo.json
 *     Cartitas/2026-09-21 · De Mau para Favi.txt
 *
 * Months are prefixed with their number so folders sort chronologically.
 * Several memories on one day get their own sub-folder.
 */
export interface ExportProgress {
  done: number
  total: number
}

interface Sink {
  write(chunk: Uint8Array): Promise<void>
  close(): Promise<void>
}

type SaveFilePicker = (options: {
  suggestedName: string
  types: { description: string; accept: Record<string, string[]> }[]
}) => Promise<{ createWritable(): Promise<{ write(data: Uint8Array): Promise<void>; close(): Promise<void> }> }>

/** Streams straight to disk where supported (desktop Chromium); otherwise collects a Blob. */
async function openSink(filename: string): Promise<Sink> {
  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [{ description: 'Archivo ZIP', accept: { 'application/zip': ['.zip'] } }],
      })
      const writable = await handle.createWritable()
      return { write: (c) => writable.write(c), close: () => writable.close() }
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') throw error
    }
  }
  const parts: Uint8Array<ArrayBuffer>[] = []
  return {
    write: async (c) => void parts.push(new Uint8Array(c)),
    close: async () => saveBlob(new Blob(parts, { type: 'application/zip' }), filename),
  }
}

const nameOf = (profiles: Profile[], id: string | null) => {
  const p = profiles.find((x) => x.id === id)
  return p ? p.nickname || p.displayName : null
}

const ext = (path: string) => path.split('.').pop() ?? 'jpg'

function memoryJson(m: Memory, profiles: Profile[], files: string[], letters: Letter[]) {
  return {
    id: m.id,
    fecha: m.date,
    titulo: m.title,
    texto: m.body,
    ubicacion: m.location,
    estado: m.mood,
    creado_por: nameOf(profiles, m.createdBy),
    creado_el: m.createdAt,
    actualizado_el: m.updatedAt,
    favorito_de: m.favoritedBy.map((id) => nameOf(profiles, id)),
    fotos: m.photos.map((p, i) => ({
      archivo: files[i],
      nombre_original: p.originalFilename,
      ancho: p.width,
      alto: p.height,
      agregada_por: nameOf(profiles, p.createdBy),
      agregada_el: p.createdAt,
    })),
    cartitas: letters.filter((l) => l.memoryId === m.id).map((l) => l.id),
  }
}

function letterText(l: Letter, profiles: Profile[]) {
  const from = nameOf(profiles, l.authorId) ?? ''
  const to = nameOf(profiles, l.recipientId) ?? ''
  return `Para ${to}\n${l.date}\n\n${l.body}\n\nCon cariño,\n${from}\n`
}

const README = `Nuestra historia
================

Esta es una copia de los recuerdos guardados en Nuestro Lugar.

- Cada carpeta corresponde a un año, un mes y un día.
- Las fotografías están tal como se guardaron.
- recuerdo.json contiene la fecha, el título, el texto, el lugar,
  quién lo agregó y las fotografías de cada recuerdo.
- historia.json reúne todo en un solo archivo.
- La carpeta Cartitas contiene las cartas en texto plano.

Guarda esta copia en un lugar seguro.
`

export async function exportArchive(
  options: { memories: Memory[]; letters: Letter[]; profiles: Profile[]; filename?: string; includeLetters?: boolean },
  onProgress: (p: ExportProgress) => void,
  signal?: AbortSignal,
) {
  const { memories, letters, profiles } = options
  const includeLetters = options.includeLetters ?? true
  const sink = await openSink(options.filename ?? `Nuestra-Historia-${todayISO()}.zip`)

  // fflate emits synchronously; chain writes to keep them ordered and awaited.
  let writing = Promise.resolve()
  let zipError: Error | null = null
  let finished!: () => void
  const done = new Promise<void>((r) => (finished = r))
  const zip = new Zip((err, chunk, final) => {
    if (err) zipError = err
    else writing = writing.then(() => sink.write(chunk))
    if (final || err) finished()
  })

  const addFile = (path: string, data: Uint8Array, compress: boolean) => {
    const entry = compress ? new ZipDeflate(path, { level: 6 }) : new ZipPassThrough(path)
    zip.add(entry)
    entry.push(data, true)
  }

  const root = 'Nuestra-Historia'
  const total = memories.reduce((n, m) => n + m.photos.length, 0)
  let processed = 0
  onProgress({ done: 0, total })

  // Oldest first, so the archive reads like a story.
  const ordered = [...memories].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
  const perDay = new Map<string, Memory[]>()
  for (const m of ordered) perDay.set(m.date, [...(perDay.get(m.date) ?? []), m])

  const summary: unknown[] = []

  for (const [date, dayMemories] of perDay) {
    const d = parseISODate(date)
    const dayFolder = `${root}/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}-${capitalize(monthName(d.getMonth()))}/${String(d.getDate()).padStart(2, '0')}`

    for (const [index, memory] of dayMemories.entries()) {
      const folder =
        dayMemories.length === 1 ? dayFolder : `${dayFolder}/${index + 1}-${safeFileName(memory.title ?? 'recuerdo', 40)}`
      const files: string[] = []

      for (const [i, photo] of memory.photos.entries()) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
        const file = `foto-${String(i + 1).padStart(2, '0')}.${ext(photo.storagePath)}`
        const blob = await photoStorage.download(photo.storagePath)
        addFile(`${folder}/${file}`, new Uint8Array(await blob.arrayBuffer()), false)
        files.push(file)
        onProgress({ done: ++processed, total })
      }

      const json = memoryJson(memory, profiles, files, letters)
      summary.push({ ...json, carpeta: folder.slice(root.length + 1) })
      addFile(`${folder}/recuerdo.json`, strToU8(JSON.stringify(json, null, 2)), true)
    }
  }

  if (includeLetters) {
    for (const l of letters) {
      const from = nameOf(profiles, l.authorId) ?? 'alguien'
      const to = nameOf(profiles, l.recipientId) ?? 'alguien'
      addFile(`${root}/Cartitas/${l.date} · De ${safeFileName(from, 20)} para ${safeFileName(to, 20)} · ${l.id.slice(0, 4)}.txt`, strToU8(letterText(l, profiles)), true)
    }
  }

  const history = {
    exportado_el: new Date().toISOString(),
    recuerdos: summary,
    cartitas: includeLetters
      ? letters.map((l) => ({
          id: l.id,
          fecha: l.date,
          de: nameOf(profiles, l.authorId),
          para: nameOf(profiles, l.recipientId),
          texto: l.body,
          recuerdo: l.memoryId,
          creada_el: l.createdAt,
        }))
      : [],
  }
  addFile(`${root}/historia.json`, strToU8(JSON.stringify(history, null, 2)), true)
  addFile(`${root}/LEEME.txt`, strToU8(README), true)

  zip.end()
  await done
  await writing
  if (zipError) throw zipError
  await sink.close()
}
