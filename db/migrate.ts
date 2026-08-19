import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadEnvConfig } from '@next/env'
import { readEnv } from '@/lib/env'
import postgres from 'postgres'

loadEnvConfig(process.cwd())

/**
 * Applies the hand-written SQL migrations in `drizzle/` in filename order.
 *
 * These migrations are hand-written rather than generated because reshaping the
 * original `product` table has to preserve live data (rupees -> paise, slug
 * derivation, category promotion). They also use `DO $$ ... $$` blocks, whose
 * embedded semicolons defeat naive statement splitting — so each file is sent
 * whole using Postgres' simple query protocol.
 *
 * Applied migrations are recorded in `_mykart_migrations` and never re-run.
 */

const MIGRATIONS_DIR = join(process.cwd(), 'drizzle')

async function main() {
  const url = readEnv('DATABASE_URL')
  if (!url) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env.local first.')
    process.exit(1)
  }

  const sql = postgres(url, { max: 1, onnotice: () => {} })

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS _mykart_migrations (
        name text PRIMARY KEY,
        applied_at timestamp with time zone NOT NULL DEFAULT now()
      )
    `

    const applied = new Set(
      (await sql<{ name: string }[]>`SELECT name FROM _mykart_migrations`).map((row) => row.name),
    )

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort()

    let count = 0

    for (const file of files) {
      if (applied.has(file)) continue

      const contents = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
      process.stdout.write(`applying ${file} ... `)

      // Each migration runs in its own transaction: a failure leaves the database
      // on the last good migration rather than half-way through this one.
      await sql.begin(async (tx) => {
        await tx.unsafe(contents).simple()
        await tx`INSERT INTO _mykart_migrations (name) VALUES (${file})`
      })

      console.log('ok')
      count += 1
    }

    console.log(count === 0 ? 'Database already up to date.' : `Applied ${count} migration(s).`)
  } finally {
    await sql.end()
  }
}

main().catch((error) => {
  console.error('\nMigration failed:')
  console.error(error)
  process.exit(1)
})
