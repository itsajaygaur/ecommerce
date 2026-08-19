import postgres from 'postgres'

/**
 * Clears the sign-in throttle before the suite runs.
 *
 * `lib/actions/auth.ts` locks an email out after eight failed attempts in fifteen
 * minutes. Several specs deliberately submit bad passwords, so without this the
 * suite poisons itself on a re-run against the same database.
 */
export default async function globalSetup() {
  const url = process.env.DATABASE_URL
  if (!url) return

  const sql = postgres(url, { max: 1, onnotice: () => {} })
  try {
    await sql`DELETE FROM login_attempts`
  } catch {
    // A database without the table yet is not a reason to fail the whole run.
  } finally {
    await sql.end()
  }
}
