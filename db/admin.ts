import { randomBytes } from 'node:crypto'
import { loadEnvConfig } from '@next/env'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { hashPassword } from '../lib/auth/password'
import * as schema from './schema'

loadEnvConfig(process.cwd())

/**
 * Creates an administrator, or resets an existing one's password.
 *
 * Admin credentials live in `admin_users` as scrypt hashes, so they cannot be
 * changed with a SQL UPDATE — the hash has to be derived. This is the supported
 * way to add a colleague or rotate your own password.
 *
 *   npm run db:admin -- you@example.com                 # generate a password
 *   npm run db:admin -- you@example.com "my password"   # set a specific one
 *   npm run db:admin -- you@example.com --role staff
 */

function generatePassword(): string {
  // Ambiguous glyphs (0/O, 1/l/I) omitted so the password can be read aloud.
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(randomBytes(24), (byte) => alphabet[byte % alphabet.length]).join('')
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL is not set.')
    process.exit(1)
  }

  const args = process.argv.slice(2)
  const roleIndex = args.indexOf('--role')
  const role = roleIndex >= 0 ? args[roleIndex + 1] : 'owner'
  const positional = args.filter((arg, i) => !arg.startsWith('--') && i !== roleIndex + 1)

  const email = positional[0]?.trim().toLowerCase()
  if (!email || !email.includes('@')) {
    console.error('Usage: npm run db:admin -- <email> [password] [--role owner|staff]')
    process.exit(1)
  }

  if (role !== 'owner' && role !== 'staff') {
    console.error(`Unknown role "${role}". Use owner or staff.`)
    process.exit(1)
  }

  const password = positional[1] ?? generatePassword()
  const generated = positional[1] === undefined

  const sql = postgres(url, { max: 1, onnotice: () => {} })
  const db = drizzle(sql, { schema })

  try {
    const passwordHash = await hashPassword(password)

    const [existing] = await db
      .select({ id: schema.adminUsers.id })
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.email, email))
      .limit(1)

    if (existing) {
      await db
        .update(schema.adminUsers)
        .set({ passwordHash, role })
        .where(eq(schema.adminUsers.id, existing.id))
      console.log(`Reset the password for ${email} (role: ${role}).`)
    } else {
      await db.insert(schema.adminUsers).values({ email, passwordHash, role })
      console.log(`Created administrator ${email} (role: ${role}).`)
    }

    // Clear any throttle so a locked-out account can sign in immediately.
    await db.delete(schema.loginAttempts).where(eq(schema.loginAttempts.identifier, email))

    if (generated) {
      console.log(`\n  Password: ${password}\n`)
      console.log('Store it somewhere safe — it is not recoverable from the database.')
    }
  } finally {
    await sql.end()
  }
}

main().catch((error) => {
  console.error('\nFailed:')
  console.error(error)
  process.exit(1)
})
