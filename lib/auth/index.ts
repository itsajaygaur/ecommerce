import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSession, verifySession } from './session'
import type { SessionPayload } from './session'

/**
 * Node-only session helpers: cookie read/write plus the guards that every admin
 * Server Action and admin query must call.
 *
 * Why the guards matter: `proxy.ts` only gates *navigation*. Server Actions are
 * POST endpoints reachable from any route once their action id is known, so
 * relying on the proxy alone left `addProduct`, `updateProduct` and
 * `deleteProduct` open to anyone. Authorisation belongs next to the mutation.
 */

export { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSession, verifySession }
export type { SessionPayload }

/** Thrown by `requireAdmin()`. Callers convert it into a user-facing failure. */
export class AuthorizationError extends Error {
  constructor(message = 'You must be signed in as an administrator to do that.') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export async function createSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload)
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // `lax` still allows the cookie on top-level navigations back from Stripe,
    // while blocking it on cross-site POSTs (the CSRF shape that matters here).
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export async function destroySessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

/** Current admin session, or null. Safe to call from any Server Component. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  return verifySession(cookieStore.get(SESSION_COOKIE)?.value)
}

/**
 * Guard for admin pages: redirects to the login screen when unauthenticated.
 * Use in Server Components and page loaders.
 */
export async function requireAdminPage(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) redirect('/admin/login')
  return session
}

/**
 * Guard for Server Actions and route handlers. Throws instead of redirecting, so a
 * forged request fails outright rather than receiving a 200 with a redirect body.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) throw new AuthorizationError()
  return session
}
