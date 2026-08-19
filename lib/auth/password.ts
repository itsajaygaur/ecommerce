import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>

/**
 * Password hashing.
 *
 * The previous implementation hashed with a single unsalted SHA-512 pass, which is
 * both fast enough to brute-force offline and identical for identical passwords
 * across accounts. This uses scrypt with a per-password random salt; parameters are
 * stored alongside the hash so they can be raised later without invalidating
 * existing credentials.
 */

const KEY_LENGTH = 64
const PARAMS = { N: 16384, r: 8, p: 1 }
// scrypt needs roughly 128 * N * r bytes; Node's 32 MB default is not enough at N=16384.
const MAX_MEM = 64 * 1024 * 1024

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, {
    ...PARAMS,
    maxmem: MAX_MEM,
  })

  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64'),
    derived.toString('base64'),
  ].join('$')
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false

  const [, nRaw, rRaw, pRaw, saltB64, hashB64] = parts
  const N = Number(nRaw)
  const r = Number(rRaw)
  const p = Number(pRaw)
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false

  let expected: Buffer
  try {
    expected = Buffer.from(hashB64!, 'base64')
  } catch {
    return false
  }
  if (expected.length === 0) return false

  const derived = await scrypt(
    password.normalize('NFKC'),
    Buffer.from(saltB64!, 'base64'),
    expected.length,
    {
      N,
      r,
      p,
      maxmem: MAX_MEM,
    },
  )

  // Length is equal by construction, but timingSafeEqual throws if it ever is not.
  if (derived.length !== expected.length) return false
  return timingSafeEqual(derived, expected)
}
