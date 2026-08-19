'use server'

import { and, eq, gte, lt, sql } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/db'
import { adminUsers, loginAttempts } from '@/db/schema'
import { createSessionCookie, destroySessionCookie } from '@/lib/auth'
import { verifyPassword } from '@/lib/auth/password'

/**
 * Admin sign-in.
 *
 * Replaces the previous single hardcoded account whose password was compared as an
 * unsalted SHA-512 digest held in an environment variable. Credentials now live in
 * `admin_users` with per-user scrypt hashes, and failed attempts are throttled.
 */

const loginSchema = z.object({
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Enter your password'),
})

export type LoginState = {
  ok: boolean
  message?: string
  fieldErrors?: Partial<Record<'email' | 'password', string>>
}

const MAX_ATTEMPTS = 8
const WINDOW_MINUTES = 15

async function recentFailures(identifier: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`cast(count(*) as int)` })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.identifier, identifier),
        gte(loginAttempts.createdAt, sql`now() - ${`${WINDOW_MINUTES} minutes`}::interval`),
      ),
    )

  return row?.total ?? 0
}

async function recordFailure(identifier: string): Promise<void> {
  await db.insert(loginAttempts).values({ identifier })
  // Opportunistic cleanup so the table does not grow without bound.
  await db
    .delete(loginAttempts)
    .where(lt(loginAttempts.createdAt, sql`now() - ${'1 day'}::interval`))
}

export async function login(
  _prevState: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    const fieldErrors: LoginState['fieldErrors'] = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (key === 'email' || key === 'password') fieldErrors[key] = issue.message
    }
    return { ok: false, fieldErrors }
  }

  const { email, password } = parsed.data

  try {
    if ((await recentFailures(email)) >= MAX_ATTEMPTS) {
      return {
        ok: false,
        message: `Too many failed attempts. Try again in ${WINDOW_MINUTES} minutes.`,
      }
    }

    const [user] = await db
      .select({
        id: adminUsers.id,
        email: adminUsers.email,
        role: adminUsers.role,
        passwordHash: adminUsers.passwordHash,
      })
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1)

    // Same generic message whether the account is unknown or the password is wrong,
    // so the form cannot be used to enumerate valid admin addresses.
    const invalid: LoginState = { ok: false, message: 'Incorrect email or password.' }

    if (!user) {
      await recordFailure(email)
      return invalid
    }

    if (!(await verifyPassword(password, user.passwordHash))) {
      await recordFailure(email)
      return invalid
    }

    await createSessionCookie({ sub: String(user.id), email: user.email, role: user.role })
    await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, user.id))

    // Clear the throttle once the credentials check out.
    await db.delete(loginAttempts).where(eq(loginAttempts.identifier, email))

    return { ok: true }
  } catch (error) {
    console.error('[auth] login failed', error)
    return { ok: false, message: 'Something went wrong. Please try again.' }
  }
}

export async function logout(): Promise<void> {
  await destroySessionCookie()
  redirect('/admin/login')
}
