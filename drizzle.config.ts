import { loadEnvConfig } from '@next/env'
import { defineConfig } from 'drizzle-kit'

loadEnvConfig(process.cwd())

/**
 * `drizzle-kit generate` is available for diffing the schema, but migrations are
 * applied by `npm run db:migrate` (see db/migrate.ts) because the hand-written
 * files contain `DO $$ ... $$` blocks and data backfills.
 */
export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
})
