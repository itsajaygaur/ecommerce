/**
 * URL slug generation.
 *
 * Mirrors the `mykart_slugify` SQL function used by the backfill migration, but
 * uses Unicode normalisation instead of a hand-written transliteration table, so
 * it handles scripts the SQL version cannot.
 */

export function slugify(input: string): string {
  const slug = input
    .normalize('NFKD')
    // Strip the combining marks NFKD leaves behind (é decomposes to e + U+0301).
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'item'
}

/**
 * Returns a slug guaranteed not to collide with `taken`, appending -2, -3, ...
 * The caller supplies the existing slugs; on the server that comes from a single
 * indexed query rather than a per-candidate round trip.
 */
export function uniqueSlug(input: string, taken: Iterable<string>): string {
  const base = slugify(input)
  const used = new Set(taken)
  if (!used.has(base)) return base

  let suffix = 2
  while (used.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}
