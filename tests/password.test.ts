import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/auth/password'

/**
 * The scheme this replaces was a single unsalted SHA-512 pass, so identical
 * passwords produced identical digests across accounts and an offline attacker
 * could test billions of candidates per second.
 */
describe('password hashing', () => {
  it('accepts the correct password', async () => {
    const hash = await hashPassword('correct horse battery staple')
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true)
  })

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct horse battery staple')
    await expect(verifyPassword('Correct horse battery staple', hash)).resolves.toBe(false)
    await expect(verifyPassword('', hash)).resolves.toBe(false)
  })

  it('salts, so the same password never produces the same hash twice', async () => {
    const [a, b] = await Promise.all([hashPassword('same-password'), hashPassword('same-password')])
    expect(a).not.toBe(b)
    await expect(verifyPassword('same-password', a)).resolves.toBe(true)
    await expect(verifyPassword('same-password', b)).resolves.toBe(true)
  })

  it('records its parameters so they can be raised later', async () => {
    const hash = await hashPassword('x')
    expect(hash.split('$').slice(0, 4)).toEqual(['scrypt', '16384', '8', '1'])
  })

  it('normalises Unicode, so the same characters entered differently still match', async () => {
    // "é" as a single code point vs. "e" + combining acute.
    const hash = await hashPassword('café')
    await expect(verifyPassword('café', hash)).resolves.toBe(true)
  })

  it('returns false for a malformed or legacy hash instead of throwing', async () => {
    await expect(verifyPassword('x', 'not-a-hash')).resolves.toBe(false)
    await expect(verifyPassword('x', '')).resolves.toBe(false)
    // A bare base64 SHA-512 digest, the format used by the old implementation.
    await expect(verifyPassword('x', 'a'.repeat(88))).resolves.toBe(false)
    await expect(verifyPassword('x', 'scrypt$16384$8$1$c2FsdA==$')).resolves.toBe(false)
  })
})
