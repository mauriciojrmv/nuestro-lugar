import { supabase } from '@/lib/supabase'
import { env } from '@/lib/env'
import { AppError } from '@/lib/errors'
import type { PhotoStorage, UploadOptions } from './types'

const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/')

export function createSupabaseStorage(bucket: string): PhotoStorage {
  const api = () => supabase.storage.from(bucket)

  return {
    // supabase-js doesn't expose upload progress, so we call the REST endpoint with XHR.
    async upload(path, data, { contentType, onProgress, signal }: UploadOptions) {
      const { data: auth } = await supabase.auth.getSession()
      const token = auth.session?.access_token
      if (!token) throw new AppError('Tu sesión expiró. Vuelve a entrar.')

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${env.supabaseUrl}/storage/v1/object/${bucket}/${encodePath(path)}`)
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        xhr.setRequestHeader('apikey', env.supabaseAnonKey)
        xhr.setRequestHeader('Content-Type', contentType)
        xhr.setRequestHeader('Cache-Control', 'max-age=31536000')
        xhr.setRequestHeader('x-upsert', 'false')
        xhr.upload.onprogress = (e) => onProgress?.(e.loaded)
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) return resolve()
          // A previous attempt already stored this exact object.
          if (/duplicate|already exists/i.test(xhr.responseText)) return resolve()
          reject(new Error(`upload_failed ${xhr.status}: ${xhr.responseText}`))
        }
        xhr.onerror = () => reject(new TypeError('Failed to fetch'))
        xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'))
        signal?.addEventListener('abort', () => xhr.abort(), { once: true })
        xhr.send(data)
      })
      onProgress?.(data.size)
    },

    async signUrls(paths, expiresInSeconds) {
      if (paths.length === 0) return {}
      const { data, error } = await api().createSignedUrls(paths, expiresInSeconds)
      if (error) throw error
      const out: Record<string, string> = {}
      for (const item of data ?? []) {
        if (item.path && item.signedUrl && !item.error) out[item.path] = item.signedUrl
      }
      return out
    },

    async download(path) {
      const { data, error } = await api().download(path)
      if (error || !data) throw error ?? new Error('download_failed')
      return data
    },

    async remove(paths) {
      if (paths.length === 0) return
      const { error } = await api().remove(paths)
      if (error) throw error
    },
  }
}
