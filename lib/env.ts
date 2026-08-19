import { z } from 'zod'

/**
 * Environment access, validated once and typed.
 *
 * Two rules shape this module:
 *
 * 1. `NEXT_PUBLIC_*` variables must be referenced as literal `process.env.NEXT_PUBLIC_X`
 *    expressions so the Next.js compiler can inline them into the client bundle.
 *    Dynamic lookups (`process.env[name]`) silently produce `undefined` in the browser.
 *
 * 2. Server variables are validated lazily rather than at import time, so that
 *    `next build` (which imports modules without a full runtime environment) does not
 *    fail on a missing secret. Anything that actually needs a secret asks for it at
 *    request time and gets a clear error if it is absent.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default('http://localhost:3000'),
  NEXT_PUBLIC_SUPABASE_STORAGE_URL: z.string().optional(),
})

const parsedClientEnv = clientSchema.safeParse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_STORAGE_URL: process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL,
})

export const clientEnv = parsedClientEnv.success
  ? parsedClientEnv.data
  : { NEXT_PUBLIC_SITE_URL: 'http://localhost:3000', NEXT_PUBLIC_SUPABASE_STORAGE_URL: undefined }

/** Canonical origin, without a trailing slash. Never derived from client input. */
export const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')

export const storageBaseUrl = (clientEnv.NEXT_PUBLIC_SUPABASE_STORAGE_URL ?? '').replace(/\/$/, '')

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z
    .string()
    .min(
      32,
      'SESSION_SECRET must be at least 32 characters — generate with `openssl rand -base64 48`',
    ),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('ecommerce'),
})

export type ServerEnv = z.infer<typeof serverSchema>

let cachedServerEnv: ServerEnv | null = null

export function serverEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv

  const parsed = serverSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid server environment:\n${issues}`)
  }

  cachedServerEnv = parsed.data
  return cachedServerEnv
}

/**
 * Reads a variable that only some deployments configure. Returns null instead of
 * throwing so callers can degrade gracefully (e.g. checkout disabled without Stripe).
 */
export function optionalServerEnv<K extends keyof ServerEnv>(key: K): ServerEnv[K] | null {
  const value = process.env[key]
  return value ? (value as ServerEnv[K]) : null
}

export const isProduction = process.env.NODE_ENV === 'production'
