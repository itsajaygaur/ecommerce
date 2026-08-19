import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { storageBaseUrl } from './env'

/**
 * Product image storage.
 *
 * Three problems with the previous implementation are fixed here:
 *
 * 1. Objects were keyed by the uploaded file's own name, so two products with a
 *    `shoe.jpg` collided and the second upload failed (or silently replaced the
 *    first). Keys are now random UUIDs.
 * 2. Nothing validated type or size on the server; the only check lived in the
 *    browser, where it can simply be skipped.
 * 3. `updateProduct` deleted the previous image *before* confirming the new upload
 *    had succeeded, so a failed upload destroyed the existing image. Deletion is
 *    now a separate call the caller makes only after the database commit.
 */

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
}

export const ACCEPTED_IMAGE_TYPES = Object.keys(ALLOWED_MIME_TYPES)

export type UploadResult = { ok: true; path: string } | { ok: false; message: string }

let client: SupabaseClient | null = null

function storageClient(): SupabaseClient {
  if (client) return client

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to upload images.')
  }

  client = createClient(url, key, { auth: { persistSession: false } })
  return client
}

function bucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || 'ecommerce'
}

/** Validates a browser-supplied file without touching the network. */
export function validateImage(file: File): { ok: true } | { ok: false; message: string } {
  if (!file || file.size === 0) return { ok: false, message: 'Choose an image file.' }

  if (!ALLOWED_MIME_TYPES[file.type]) {
    return {
      ok: false,
      message: `Unsupported image type. Use ${ACCEPTED_IMAGE_TYPES.map((t) => t.replace('image/', '')).join(', ')}.`,
    }
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      message: `Image is too large (max ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB).`,
    }
  }

  return { ok: true }
}

export async function uploadImage(file: File): Promise<UploadResult> {
  const validation = validateImage(file)
  if (!validation.ok) return validation

  // The extension comes from the validated MIME type, never from the supplied
  // filename, so a name like `../../evil.svg` cannot influence the object key.
  const extension = ALLOWED_MIME_TYPES[file.type]
  const path = `products/${randomUUID()}.${extension}`

  const { error } = await storageClient()
    .storage.from(bucket())
    .upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false })

  if (error) return { ok: false, message: error.message }
  return { ok: true, path }
}

/**
 * Best-effort removal. Storage cleanup must never fail the surrounding request —
 * an orphaned object is a housekeeping problem, a failed product save is a bug.
 */
export async function deleteImages(paths: string[]): Promise<void> {
  const targets = paths.filter(Boolean)
  if (targets.length === 0) return

  try {
    await storageClient().storage.from(bucket()).remove(targets)
  } catch (error) {
    console.error('[storage] failed to remove objects', targets, error)
  }
}

/** Resolves a stored object key to a public URL. */
export function imageUrl(path: string | null | undefined): string {
  if (!path) return '/placeholder-product.svg'
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) return path
  if (!storageBaseUrl) return '/placeholder-product.svg'
  return `${storageBaseUrl}/${path.replace(/^\/+/, '')}`
}
