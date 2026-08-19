/**
 * `server-only` is resolved by Next's bundler, which throws at build time if a
 * Client Component imports a module that includes it. Vitest has no such concept,
 * so it is aliased to this empty module for tests.
 */
export {}
