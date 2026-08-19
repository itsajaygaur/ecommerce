import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { SearchXIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import {
  ActiveFilterChips,
  CatalogFilters,
  CatalogToolbar,
} from '@/components/storefront/catalog-filters'
import { ProductCard, ProductCardSkeleton } from '@/components/storefront/product-card'
import { SORT_OPTIONS, type SortKey } from '@/lib/catalog'
import { getPriceRange, listCategories, listProducts } from '@/lib/queries/products'
import { parsePositiveInt } from '@/lib/utils'

/**
 * Catalog.
 *
 * All filtering, sorting and paging happens in Postgres and is expressed in the URL.
 * The page this replaces fetched every row and filtered titles in memory.
 */

export const metadata: Metadata = {
  title: 'All products',
  description:
    'Browse the full MyKart catalog — apparel, bags, footwear, home goods and accessories.',
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams

  const query = first(params.q)?.trim() || undefined
  const category = first(params.category) || undefined
  const rawSort = first(params.sort)
  const sort: SortKey = rawSort && rawSort in SORT_OPTIONS ? (rawSort as SortKey) : 'relevance'
  const page = parsePositiveInt(first(params.page), 1)
  const maxPrice = Number(first(params.maxPrice))
  const inStockOnly = first(params.inStock) === '1'

  const [categories, priceRange] = await Promise.all([listCategories(), getPriceRange()])
  const currency = 'INR'

  const filters = {
    query,
    category,
    sort,
    page,
    inStockOnly,
    maxPriceCents: Number.isFinite(maxPrice) && maxPrice > 0 ? maxPrice : undefined,
  }

  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <p className="eyebrow mb-2">Catalog</p>
        <h1 className="text-4xl sm:text-5xl">
          {query
            ? `Results for “${query}”`
            : (categories.find((c) => c.slug === category)?.name ?? 'All products')}
        </h1>
      </header>

      <div className="flex gap-10">
        <CatalogFilters
          categories={categories}
          priceRange={priceRange}
          currency={currency}
          total={0}
        />

        <div className="min-w-0 flex-1 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ActiveFilterChips categories={categories} currency={currency} />
          </div>

          {/* The grid streams in separately so filters and chrome paint immediately. */}
          <Suspense key={JSON.stringify(filters)} fallback={<ResultsSkeleton />}>
            <Results filters={filters} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

async function Results({ filters }: { filters: Parameters<typeof listProducts>[0] }) {
  const { items, total, page, pageCount } = await listProducts(filters)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-20 text-center">
        <div className="bg-muted flex size-14 items-center justify-center rounded-full">
          <SearchXIcon className="text-muted-foreground size-6" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">Nothing matched those filters</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            Try a broader price range, a different category, or clear the search term.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/products">Reset filters</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <CatalogToolbar total={total} sort={filters?.sort ?? 'relevance'} />

      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 xl:grid-cols-4">
        {items.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            // Only the first row is above the fold; eagerly loading more wastes bandwidth.
            priority={index < 4}
          />
        ))}
      </div>

      <Pagination
        className="pt-6"
        page={page}
        pageCount={pageCount}
        buildHref={(target) => {
          const params = new URLSearchParams()
          if (filters?.query) params.set('q', filters.query)
          if (filters?.category) params.set('category', filters.category)
          if (filters?.sort && filters.sort !== 'relevance') params.set('sort', filters.sort)
          if (filters?.maxPriceCents) params.set('maxPrice', String(filters.maxPriceCents))
          if (filters?.inStockOnly) params.set('inStock', '1')
          if (target > 1) params.set('page', String(target))
          const qs = params.toString()
          return qs ? `/products?${qs}` : '/products'
        }}
      />
    </>
  )
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  )
}
