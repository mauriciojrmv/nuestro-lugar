/**
 * Provider-agnostic contract for photo storage.
 * The app only ever talks to this interface, so moving files to
 * Cloudflare R2 (or anything else) means writing one new adapter.
 */
export interface UploadOptions {
  contentType: string
  onProgress?: (loadedBytes: number) => void
  signal?: AbortSignal
}

export interface PhotoStorage {
  /** Uploads a file. Uploading to a path that already exists is treated as success (safe retries). */
  upload(path: string, data: Blob, options: UploadOptions): Promise<void>
  /** Returns short-lived URLs keyed by path. Paths that can't be signed are omitted. */
  signUrls(paths: string[], expiresInSeconds: number): Promise<Record<string, string>>
  download(path: string): Promise<Blob>
  remove(paths: string[]): Promise<void>
}
