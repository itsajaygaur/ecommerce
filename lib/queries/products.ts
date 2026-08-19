import 'server-only'
import { and, asc, count, desc, eq, gte, inArray, lte, ne, sql, type SQL } from 'drizzle-orm'
import { db } from '@/db'
import { categories, productImages, products } from '@/db/schema'
import { tolerateDatabaseFailureAtBuild } from '@/lib/queries/prerender'
import {
  PAGE_SIZE,
  type CatalogFilters,
  type CategorySummary,
  type ProductDetail,
  type ProductListItem,
  type SortKey,
} from '@/lib/catalog'

/**
 * Catalog reads.
 *
 * Everything filters, sorts and paginates in Postgres. The previous storefront
 * loaded every row with `db.select().from(products)` and then ran
 * `Array.filter(title.includes(q))` in Node, which meant the whole catalog crossed
 * the wire on every keystroke and search only ever matched titles.
 */

export {
  PAGE_SIZE,
  SORT_OPTIONS,
  type CatalogFilters,
  type CategorySummary,
  type ProductDetail,
  type ProductListItem,
  type SortKey,
} from '@/lib/catalog'

/**
 * The primary image, as a correlated subquery rather than a join, so a product with
 * several images still produces exactly one catalog row.
 *
 * The outer column is spelled out as `products.id` instead of being interpolated
 * with `${'${products.id}'}`. Inside a raw `sql` fragment Drizzle emits column
 * references *unqualified*, so the interpolated form becomes a bare `"id"` which
 * Postgres resolves against the subquery's own table — silently turning the
 * correlation into `pi.product_id = pi.id` and returning an arbitrary row.
 */
const primaryImagePath = sql<string | null>`(
  SELECT pi.path FROM product_images pi
  WHERE pi.product_id = products.id
  ORDER BY pi.position ASC, pi.id ASC
  LIMIT 1
)`

function buildWhere(filters: CatalogFilters): SQL | undefined {
  const conditions: SQL[] = [eq(products.status, 'active')]

  if (filters.query?.trim()) {
    const term = filters.query.trim()
    conditions.push(
      // Full-text match on the generated tsvector, with a prefix/substring fallback
      // so short or partial words ("oxf") still find something.
      sql`(${products.searchVector} @@ websearch_to_tsquery('english', ${term})
           OR ${products.title} ILIKE ${'%' + term + '%'})`,
    )
  }

  if (filters.category) {
    conditions.push(eq(categories.slug, filters.category))
  }

  if (typeof filters.minPriceCents === 'number') {
    conditions.push(gte(products.priceCents, filters.minPriceCents))
  }

  if (typeof filters.maxPriceCents === 'number') {
    conditions.push(lte(products.priceCents, filters.maxPriceCents))
  }

  if (filters.inStockOnly) {
    conditions.push(gte(products.stock, 1))
  }

  return and(...conditions)
}

function buildOrderBy(sort: SortKey | undefined, query: string | undefined) {
  switch (sort) {
    case 'price-asc':
      return [asc(products.priceCents), asc(products.id)]
    case 'price-desc':
      return [desc(products.priceCents), asc(products.id)]
    case 'name':
      return [asc(products.title), asc(products.id)]
    case 'newest':
      return [desc(products.createdAt), desc(products.id)]
    default:
      // With a search term, rank by text relevance; without one there is nothing
      // to rank against, so fall back to featured-then-newest.
      return query?.trim()
        ? [
            desc(
              sql`ts_rank(${products.searchVector}, websearch_to_tsquery('english', ${query.trim()}))`,
            ),
            desc(products.createdAt),
          ]
        : [desc(products.featured), desc(products.createdAt), desc(products.id)]
  }
}

export async function listProducts(filters: CatalogFilters = {}) {
  const pageSize = filters.pageSize ?? PAGE_SIZE
  const page = Math.max(1, filters.page ?? 1)
  const where = buildWhere(filters)

  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: products.id,
        slug: products.slug,
        title: products.title,
        priceCents: products.priceCents,
        compareAtPriceCents: products.compareAtPriceCents,
        currency: products.currency,
        stock: products.stock,
        featured: products.featured,
        categoryName: categories.name,
        categorySlug: categories.slug,
        imagePath: primaryImagePath,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(where)
      .orderBy(...buildOrderBy(filters.sort, filters.query))
      .limit(pageSize)
      .offset((page - 1) * pageSize),

    db
      .select({ total: count() })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(where),
  ])

  const total = totals?.total ?? 0

  return {
    items: rows as ProductListItem[],
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const [row] = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      description: products.description,
      priceCents: products.priceCents,
      compareAtPriceCents: products.compareAtPriceCents,
      currency: products.currency,
      stock: products.stock,
      status: products.status,
      featured: products.featured,
      categoryId: products.categoryId,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.slug, slug), ne(products.status, 'archived')))
    .limit(1)

  if (!row) return null

  const images = await db
    .select({ id: productImages.id, path: productImages.path, alt: productImages.alt })
    .from(productImages)
    .where(eq(productImages.productId, row.id))
    .orderBy(asc(productImages.position), asc(productImages.id))

  return {
    ...row,
    images,
    imagePath: images[0]?.path ?? null,
  }
}

/** Resolves a legacy numeric product id to its slug so old URLs can redirect. */
export async function getSlugById(id: number): Promise<string | null> {
  const [row] = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.id, id))
    .limit(1)

  return row?.slug ?? null
}

/** Same category first, then anything else, so the rail is never short. */
export async function getRelatedProducts(
  productId: number,
  categoryId: number | null,
  limit = 4,
): Promise<ProductListItem[]> {
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      priceCents: products.priceCents,
      compareAtPriceCents: products.compareAtPriceCents,
      currency: products.currency,
      stock: products.stock,
      featured: products.featured,
      categoryName: categories.name,
      categorySlug: categories.slug,
      imagePath: primaryImagePath,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.status, 'active'), ne(products.id, productId)))
    .orderBy(
      desc(sql`(${products.categoryId} IS NOT DISTINCT FROM ${categoryId})`),
      desc(products.featured),
      desc(products.createdAt),
    )
    .limit(limit)

  return rows as ProductListItem[]
}

export async function getFeaturedProducts(limit = 4): Promise<ProductListItem[]> {
  return tolerateDatabaseFailureAtBuild(
    () => getFeaturedProductsUncached(limit),
    [],
    'getFeaturedProducts',
  )
}

async function getFeaturedProductsUncached(limit: number): Promise<ProductListItem[]> {
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      priceCents: products.priceCents,
      compareAtPriceCents: products.compareAtPriceCents,
      currency: products.currency,
      stock: products.stock,
      featured: products.featured,
      categoryName: categories.name,
      categorySlug: categories.slug,
      imagePath: primaryImagePath,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.status, 'active'), gte(products.stock, 1)))
    .orderBy(desc(products.featured), desc(products.createdAt))
    .limit(limit)

  return rows as ProductListItem[]
}

export async function listCategories(): Promise<CategorySummary[]> {
  return tolerateDatabaseFailureAtBuild(listCategoriesUncached, [], 'listCategories')
}

async function listCategoriesUncached(): Promise<CategorySummary[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      productCount: sql<number>`cast(count(${products.id}) as int)`,
      // `categories.id` written out in full — see the note on primaryImagePath.
      imagePath: sql<string | null>`(
        SELECT pi.path FROM product_images pi
        JOIN products p ON p.id = pi.product_id
        WHERE p.category_id = categories.id AND p.status = 'active'
        ORDER BY p.featured DESC, pi.position ASC
        LIMIT 1
      )`,
    })
    .from(categories)
    .leftJoin(products, and(eq(products.categoryId, categories.id), eq(products.status, 'active')))
    .groupBy(categories.id)
    .orderBy(asc(categories.position), asc(categories.name))

  return rows
}

/** Price bounds across the active catalog, used to seed the price filter. */
export async function getPriceRange(): Promise<{ min: number; max: number }> {
  return tolerateDatabaseFailureAtBuild(getPriceRangeUncached, { min: 0, max: 0 }, 'getPriceRange')
}

async function getPriceRangeUncached(): Promise<{ min: number; max: number }> {
  const [row] = await db
    .select({
      min: sql<number>`cast(coalesce(min(${products.priceCents}), 0) as int)`,
      max: sql<number>`cast(coalesce(max(${products.priceCents}), 0) as int)`,
    })
    .from(products)
    .where(eq(products.status, 'active'))

  return { min: row?.min ?? 0, max: row?.max ?? 0 }
}

/**
 * Authoritative pricing for checkout. Returns the live database rows for the given
 * ids — never trust prices or titles that arrived from the browser.
 */
export async function getProductsForCheckout(ids: number[]) {
  if (ids.length === 0) return []

  return db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      priceCents: products.priceCents,
      currency: products.currency,
      stock: products.stock,
      status: products.status,
      imagePath: primaryImagePath,
    })
    .from(products)
    .where(inArray(products.id, ids))
}

/** Lightweight list of every active slug, for `generateStaticParams` and the sitemap. */
export async function listActiveSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return db
    .select({ slug: products.slug, updatedAt: products.updatedAt })
    .from(products)
    .where(eq(products.status, 'active'))
    .orderBy(desc(products.updatedAt))
}

/** Products the browser is holding in its cart, resolved fresh for display. */
export async function getCartProducts(ids: number[]) {
  if (ids.length === 0) return []

  return db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      priceCents: products.priceCents,
      compareAtPriceCents: products.compareAtPriceCents,
      currency: products.currency,
      stock: products.stock,
      status: products.status,
      imagePath: primaryImagePath,
    })
    .from(products)
    .where(and(inArray(products.id, ids), eq(products.status, 'active')))
}
