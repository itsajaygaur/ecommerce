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

/**
 * Names this app used before the rewrite, still present in existing deployments.
 *
 * Renaming `DB_URL` → `DATABASE_URL` and `JWT_SECRET` → `SESSION_SECRET` is a breaking
 * change to an environment nobody edits during a deploy, and it fails at *request*
 * time rather than at build time — the first production deploy came up green and then
 * threw on every catalog page. Reading the old name is a cheap safety net for a
 * rename that shipped without one.
 *
 * The new name always wins; the fallback warns once so a stale variable is visible in
 * the logs rather than silently permanent.
 */
const LEGACY_ALIASES: Record<string, string> = {
  DATABASE_URL: 'DB_URL',
  SESSION_SECRET: 'JWT_SECRET',
}

const warnedAliases = new Set<string>()

function withLegacyAliases(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const resolved = { ...source }

  for (const [current, legacy] of Object.entries(LEGACY_ALIASES)) {
    if (resolved[current] || !source[legacy]) continue

    resolved[current] = source[legacy]
    if (!warnedAliases.has(current)) {
      warnedAliases.add(current)
      console.warn(
        `[env] ${current} is not set; falling back to the legacy ${legacy}. ` +
          `Rename it to ${current} — the fallback will be removed.`,
      )
    }
  }

  return resolved
}

const serverSchema = z.object({
  // The `error` override covers the *missing* case too: Zod's type check fires before
  // `.min()`, so a plain refinement message never reaches an unset variable — which is
  // the one case this error actually has to explain.
  DATABASE_URL: z.string({ error: 'DATABASE_URL is required' }).min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z
    .string({
      error:
        'SESSION_SECRET must be at least 32 characters — generate with `openssl rand -base64 48`',
    })
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

  const parsed = serverSchema.safeParse(withLegacyAliases(process.env))
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
  const value = readEnv(key)
  return value ? (value as ServerEnv[K]) : null
}

/**
 * Single server variable, honouring the legacy aliases above. Used by callers that
 * need one value without validating the whole environment — notably the database
 * client, which must be constructible from `db/migrate.ts` and `db/seed.ts` where no
 * session secret exists.
 */
export function readEnv(name: string): string | undefined {
  return process.env[name] ?? withLegacyAliases(process.env)[name]
}

export const isProduction = process.env.NODE_ENV === 'production'
