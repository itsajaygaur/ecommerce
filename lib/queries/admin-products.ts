import 'server-only'
import { and, asc, count, desc, eq, ilike, sql, type SQL } from 'drizzle-orm'
import { db } from '@/db'
import { categories, productImages, products } from '@/db/schema'

/**
 * Admin catalog reads. Unlike the storefront queries these include drafts and
 * archived rows, and they sort and filter in Postgres rather than in the page.
 */

export const ADMIN_PAGE_SIZE = 15

export type AdminProductSort = 'newest' | 'oldest' | 'title' | 'price-asc' | 'price-desc' | 'stock'

export type AdminProductFilters = {
  query?: string
  status?: 'draft' | 'active' | 'archived'
  categoryId?: number
  sort?: AdminProductSort
  page?: number
}

function orderFor(sort: AdminProductSort | undefined) {
  switch (sort) {
    case 'oldest':
      return [asc(products.createdAt)]
    case 'title':
      return [asc(products.title)]
    case 'price-asc':
      return [asc(products.priceCents)]
    case 'price-desc':
      return [desc(products.priceCents)]
    case 'stock':
      return [asc(products.stock)]
    default:
      return [desc(products.createdAt), desc(products.id)]
  }
}

export async function listAdminProducts(filters: AdminProductFilters = {}) {
  const page = Math.max(1, filters.page ?? 1)
  const conditions: SQL[] = []

  if (filters.query?.trim()) {
    conditions.push(ilike(products.title, `%${filters.query.trim()}%`))
  }
  if (filters.status) conditions.push(eq(products.status, filters.status))
  if (filters.categoryId) conditions.push(eq(products.categoryId, filters.categoryId))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: products.id,
        slug: products.slug,
        title: products.title,
        priceCents: products.priceCents,
        currency: products.currency,
        stock: products.stock,
        status: products.status,
        featured: products.featured,
        createdAt: products.createdAt,
        categoryName: categories.name,
        // `products.id` spelled out: interpolating it would emit an unqualified
        // "id" that Postgres binds to product_images.id inside the subquery.
        imagePath: sql<string | null>`(
          SELECT pi.path FROM product_images pi
          WHERE pi.product_id = products.id
          ORDER BY pi.position ASC, pi.id ASC LIMIT 1
        )`,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(where)
      .orderBy(...orderFor(filters.sort))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),

    db.select({ total: count() }).from(products).where(where),
  ])

  const total = totals?.total ?? 0

  return {
    items: rows,
    total,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  }
}

export async function getAdminProduct(id: number) {
  const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1)
  if (!row) return null

  const images = await db
    .select({ id: productImages.id, path: productImages.path, alt: productImages.alt })
    .from(productImages)
    .where(eq(productImages.productId, id))
    .orderBy(asc(productImages.position), asc(productImages.id))

  return { ...row, images }
}

export async function listAdminCategories() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      position: categories.position,
      // `categories.id` in full — an interpolated reference would emit a bare "id"
      // that Postgres binds to the subquery's own products table.
      productCount: sql<number>`cast((
        SELECT count(*) FROM products p WHERE p.category_id = categories.id
      ) as int)`,
    })
    .from(categories)
    .orderBy(asc(categories.position), asc(categories.name))
}

/** Counts per status, used for the filter chips above the products table. */
export async function getProductStatusCounts() {
  const rows = await db
    .select({ status: products.status, total: count() })
    .from(products)
    .groupBy(products.status)

  const counts = { draft: 0, active: 0, archived: 0, all: 0 }
  for (const row of rows) {
    counts[row.status] = row.total
    counts.all += row.total
  }
  return counts
}
