import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Legacy environment variable names.
 *
 * The rewrite renamed `DB_URL` → `DATABASE_URL` and `JWT_SECRET` → `SESSION_SECRET`.
 * The first production deploy built green — the build tolerates an unreachable
 * database on purpose — and then threw on every request that touched the catalog,
 * because the platform still held the old names. These tests pin the fallback that
 * closes that gap.
 *
 * `lib/env` memoises its parsed environment, so each case imports it fresh.
 */

const ORIGINAL_ENV = { ...process.env }

async function freshEnvModule() {
  vi.resetModules()
  return import('@/lib/env')
}

// Every variable any case here reads, cleared before each one. These tests are about
// what happens when a name is *absent*, so they must not inherit an ambient value —
// CI sets `STRIPE_WEBHOOK_SECRET` in the job environment, which a local run does not.
const MANAGED_KEYS = [
  'DATABASE_URL',
  'DB_URL',
  'SESSION_SECRET',
  'JWT_SECRET',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_WEBHOOK',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
]

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  for (const key of MANAGED_KEYS) delete process.env[key]
})

afterEach(() => {
  vi.restoreAllMocks()
  process.env = { ...ORIGINAL_ENV }
})

const SECRET = 'a'.repeat(48)
const LEGACY_SECRET = 'b'.repeat(48)

describe('readEnv', () => {
  it('reads the current name', async () => {
    process.env.DATABASE_URL = 'postgres://current'
    const { readEnv } = await freshEnvModule()
    expect(readEnv('DATABASE_URL')).toBe('postgres://current')
  })

  it('falls back to the legacy name', async () => {
    process.env.DB_URL = 'postgres://legacy'
    const { readEnv } = await freshEnvModule()
    expect(readEnv('DATABASE_URL')).toBe('postgres://legacy')
  })

  it('prefers the current name when both are set', async () => {
    process.env.DATABASE_URL = 'postgres://current'
    process.env.DB_URL = 'postgres://legacy'
    const { readEnv } = await freshEnvModule()
    expect(readEnv('DATABASE_URL')).toBe('postgres://current')
  })

  it('returns undefined when neither is set', async () => {
    const { readEnv } = await freshEnvModule()
    expect(readEnv('DATABASE_URL')).toBeUndefined()
  })

  it('aliases only the two mapped names, not anything legacy-looking', async () => {
    // A plausible old name for a variable that has no alias. Nothing should infer a
    // mapping from resemblance — only the explicit table is honoured.
    process.env.STRIPE_WEBHOOK = 'whsec_legacy_shaped'
    const { readEnv } = await freshEnvModule()

    expect(readEnv('STRIPE_WEBHOOK_SECRET')).toBeUndefined()
  })

  it('does not alias SUPABASE_ANON_KEY to the service role key', async () => {
    // Deliberately not aliased: different privileges, and the anon key cannot write
    // to Storage. Aliasing it would look like it worked and then fail on upload.
    process.env.SUPABASE_ANON_KEY = 'anon-key'
    const { readEnv } = await freshEnvModule()

    expect(readEnv('SUPABASE_SERVICE_ROLE_KEY')).toBeUndefined()
  })

  it('warns once per aliased variable rather than on every read', async () => {
    process.env.DB_URL = 'postgres://legacy'
    const { readEnv } = await freshEnvModule()

    readEnv('DATABASE_URL')
    readEnv('DATABASE_URL')
    readEnv('DATABASE_URL')

    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(vi.mocked(console.warn).mock.calls[0]?.[0]).toContain('DB_URL')
  })
})

describe('serverEnv', () => {
  it('validates successfully against legacy names alone', async () => {
    process.env.DB_URL = 'postgres://legacy'
    process.env.JWT_SECRET = LEGACY_SECRET

    const { serverEnv } = await freshEnvModule()
    const env = serverEnv()

    expect(env.DATABASE_URL).toBe('postgres://legacy')
    expect(env.SESSION_SECRET).toBe(LEGACY_SECRET)
  })

  it('prefers current names over legacy ones', async () => {
    process.env.DATABASE_URL = 'postgres://current'
    process.env.DB_URL = 'postgres://legacy'
    process.env.SESSION_SECRET = SECRET
    process.env.JWT_SECRET = LEGACY_SECRET

    const { serverEnv } = await freshEnvModule()
    const env = serverEnv()

    expect(env.DATABASE_URL).toBe('postgres://current')
    expect(env.SESSION_SECRET).toBe(SECRET)
  })

  it('still fails loudly when neither name is present', async () => {
    const { serverEnv } = await freshEnvModule()
    expect(() => serverEnv()).toThrow(/DATABASE_URL is required/)
  })

  it('rejects a legacy secret that is too short, rather than accepting it unchecked', async () => {
    process.env.DB_URL = 'postgres://legacy'
    process.env.JWT_SECRET = 'too-short'

    const { serverEnv } = await freshEnvModule()
    expect(() => serverEnv()).toThrow(/SESSION_SECRET must be at least 32 characters/)
  })
})

describe('session signing', () => {
  // `lib/auth/session.ts` is Edge-safe and so reads both names as static
  // `process.env.X` references rather than through `readEnv()` — the Edge runtime
  // inlines literal references and returns undefined for dynamic lookups.
  it('signs and verifies using the legacy JWT_SECRET', async () => {
    process.env.JWT_SECRET = LEGACY_SECRET
    vi.resetModules()
    const { signSession, verifySession } = await import('@/lib/auth/session')

    const token = await signSession({ sub: '1', email: 'a@example.com', role: 'owner' })
    await expect(verifySession(token)).resolves.toMatchObject({
      sub: '1',
      email: 'a@example.com',
      role: 'owner',
    })
  })

  it('does not verify a token signed with a different secret', async () => {
    process.env.JWT_SECRET = LEGACY_SECRET
    vi.resetModules()
    const signer = await import('@/lib/auth/session')
    const token = await signer.signSession({
      sub: '1',
      email: 'a@example.com',
      role: 'owner',
    })

    process.env.SESSION_SECRET = SECRET
    vi.resetModules()
    const verifier = await import('@/lib/auth/session')
    await expect(verifier.verifySession(token)).resolves.toBeNull()
  })
})

describe('createSqlClient', () => {
  it('accepts the legacy DB_URL', async () => {
    process.env.DB_URL = 'postgres://legacy@localhost:5432/db'
    vi.resetModules()
    const { createSqlClient } = await import('@/db')

    // Constructing the client does not connect; it only has to resolve a URL.
    expect(() => createSqlClient().end()).not.toThrow()
  })

  it('throws with actionable guidance when no name is set', async () => {
    vi.resetModules()
    const { createSqlClient } = await import('@/db')
    expect(() => createSqlClient()).toThrow(/DATABASE_URL is not set/)
  })
})
