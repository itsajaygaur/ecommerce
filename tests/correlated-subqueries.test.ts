import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Guards a whole class of silent data bug.
 *
 * Inside a raw `sql` fragment, Drizzle emits column references **unqualified**:
 * `${products.id}` becomes `"id"`, not `"products"."id"`. In a correlated
 * subquery Postgres then resolves that bare name against the *subquery's* table,
 * so
 *
 *     SELECT pi.path FROM product_images pi WHERE pi.product_id = ${products.id}
 *
 * silently compiles to `WHERE pi.product_id = pi.id` and returns an arbitrary
 * row. It does not error, and with sequentially-seeded data the two ids often
 * coincide — so it looks correct right up until someone adds a second image.
 *
 * This bit the catalog, the admin table, category counts, order line images and
 * the order item counts. Rather than trusting review to catch a recurrence, the
 * source is scanned for the pattern.
 */

const FILES = ['lib/queries/products.ts', 'lib/queries/orders.ts', 'lib/queries/admin-products.ts']

/** Captures each `sql`...`` template literal in a source file. */
function sqlTemplates(source: string): string[] {
  const templates: string[] = []
  const pattern = /sql(?:<[^>]*>)?`/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(source)) !== null) {
    let depth = 0
    let index = match.index + match[0].length
    const start = index

    for (; index < source.length; index += 1) {
      const char = source[index]
      if (char === '\\') {
        index += 1
        continue
      }
      if (char === '$' && source[index + 1] === '{') {
        depth += 1
        index += 1
        continue
      }
      if (char === '}' && depth > 0) {
        depth -= 1
        continue
      }
      if (char === '`' && depth === 0) break
    }

    templates.push(source.slice(start, index))
    pattern.lastIndex = index
  }

  return templates
}

describe('raw SQL fragments', () => {
  it.each(FILES)('%s never interpolates a column inside a subquery', (file) => {
    const source = readFileSync(join(process.cwd(), file), 'utf8')
    const offenders: string[] = []

    for (const template of sqlTemplates(source)) {
      // Only fragments containing a nested SELECT can be correlated subqueries.
      if (!/\bSELECT\b/i.test(template)) continue

      // `${something.column}` — a Drizzle column reference, which will be emitted
      // without its table prefix.
      const interpolations = template.match(/\$\{\s*\w+\.\w+\s*\}/g) ?? []
      offenders.push(...interpolations)
    }

    expect(
      offenders,
      `Interpolated column reference inside a subquery in ${file}. ` +
        'Drizzle emits these unqualified, so Postgres binds them to the inner table. ' +
        'Write the qualified name out in full (e.g. `products.id`) instead.',
    ).toEqual([])
  })

  it('detects the pattern it is meant to catch', () => {
    // A guard on the guard: the scanner must actually flag a known-bad fragment.
    const bad =
      'const x = sql<string>`(SELECT pi.path FROM product_images pi WHERE pi.product_id = ${products.id})`'
    const templates = sqlTemplates(bad)

    expect(templates).toHaveLength(1)
    expect(templates[0]).toMatch(/\$\{\s*products\.id\s*\}/)
  })

  it('does not flag interpolation outside a subquery', () => {
    const fine = 'const x = sql`${products.stock} <= 5`'
    const templates = sqlTemplates(fine)

    expect(templates).toHaveLength(1)
    expect(/\bSELECT\b/i.test(templates[0]!)).toBe(false)
  })
})
