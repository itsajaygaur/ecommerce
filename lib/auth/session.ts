import { jwtVerify, SignJWT } from 'jose'

/**
 * Session token signing and verification.
 *
 * This module is deliberately free of `next/headers`, `"use server"` and any Node
 * built-in, so `proxy.ts` (which runs on the Edge runtime) can import it. Cookie
 * reading and writing lives in `lib/auth/cookies.ts`, which is Node-only.
 */

export const SESSION_COOKIE = 'mykart_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12

export type SessionPayload = {
  /** Admin user id. */
  sub: string
  email: string
  role: 'owner' | 'staff'
}

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET is missing or too short (needs 32+ characters). Generate one with `openssl rand -base64 48`.',
    )
  }
  return new TextEncoder().encode(secret)
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer('mykart')
    .setAudience('mykart-admin')
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey())
}

/**
 * Returns the session payload, or null for any token that is missing, malformed,
 * expired, or signed with a different key. Never throws, so callers can treat a
 * null result as "not signed in" without a try/catch.
 */
export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ['HS256'],
      issuer: 'mykart',
      audience: 'mykart-admin',
    })

    if (!payload.sub || typeof payload.email !== 'string') return null
    const role = payload.role === 'owner' ? 'owner' : 'staff'

    return { sub: payload.sub, email: payload.email, role }
  } catch {
    return null
  }
}
