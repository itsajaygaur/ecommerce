import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export type Database = PostgresJsDatabase<typeof schema>

/**
 * A single pooled connection per process.
 *
 * In development Next.js re-evaluates modules on every hot reload, so the client is
 * stashed on `globalThis` to avoid leaking a new pool (and exhausting Postgres
 * connections) on each edit. The previous implementation did this too, but it also
 * connected eagerly at import time, which made any build without a reachable
 * database fail.
 */
declare global {
  var __mykartSql: ReturnType<typeof postgres> | undefined
  var __mykartDb: Database | undefined
}

export function createSqlClient(url = process.env.DATABASE_URL) {
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env.local and point it at a Postgres instance.',
    )
  }

  return postgres(url, {
    // Serverless platforms recycle instances aggressively; a small pool with a short
    // idle timeout avoids holding connections that will never be reused.
    max: process.env.NODE_ENV === 'production' ? 5 : 3,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
  })
}

/** Resolves (and memoises) the Drizzle client. Connects on first use, not on import. */
export function getDb(): Database {
  if (globalThis.__mykartDb) return globalThis.__mykartDb

  globalThis.__mykartSql ??= createSqlClient()
  globalThis.__mykartDb = drizzle(globalThis.__mykartSql, { schema, logger: false })
  return globalThis.__mykartDb
}

/**
 * Ergonomic `db.select()` access that still defers connecting until the first query.
 * Every property read resolves through `getDb()`, which is memoised, and methods are
 * bound to the real instance so `this` stays correct inside Drizzle.
 */
export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const instance = getDb()
    const value = Reflect.get(instance, prop) as unknown
    return typeof value === 'function' ? value.bind(instance) : value
  },
})

export { schema }
export default db
