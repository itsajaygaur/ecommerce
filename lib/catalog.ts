/**
 * Catalog constants and shapes shared by the server queries and the client filter
 * UI.
 *
 * These deliberately live outside `lib/queries/products.ts`: that module imports the
 * database client, so a Client Component reading a value from it would pull
 * `postgres` into the browser bundle.
 */

export const SORT_OPTIONS = {
  relevance: 'Most relevant',
  newest: 'Newest',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  name: 'Name: A–Z',
} as const

export type SortKey = keyof typeof SORT_OPTIONS

export const PAGE_SIZE = 12

export type ProductListItem = {
  id: number
  slug: string
  title: string
  priceCents: number
  compareAtPriceCents: number | null
  currency: string
  stock: number
  featured: boolean
  categoryName: string | null
  categorySlug: string | null
  imagePath: string | null
}

export type ProductDetail = ProductListItem & {
  description: string
  status: 'draft' | 'active' | 'archived'
  categoryId: number | null
  createdAt: Date
  updatedAt: Date
  images: { id: number; path: string; alt: string | null }[]
}

export type CategorySummary = {
  id: number
  name: string
  slug: string
  description: string | null
  productCount: number
  imagePath: string | null
}

export type CatalogFilters = {
  query?: string
  category?: string
  minPriceCents?: number
  maxPriceCents?: number
  inStockOnly?: boolean
  sort?: SortKey
  page?: number
  pageSize?: number
}
