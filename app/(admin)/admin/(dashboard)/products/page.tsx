import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { PackageIcon, PlusIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ProductRowActions } from '@/components/admin/product-row-actions'
import { ProductTableToolbar } from '@/components/admin/product-table-toolbar'
import {
  getProductStatusCounts,
  listAdminCategories,
  listAdminProducts,
  type AdminProductSort,
} from '@/lib/queries/admin-products'
import { formatMoney } from '@/lib/money'
import { imageUrl } from '@/lib/storage'
import { formatDate, parsePositiveInt } from '@/lib/utils'

export const metadata: Metadata = { title: 'Products', robots: { index: false } }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

const SORTS: AdminProductSort[] = ['newest', 'oldest', 'title', 'price-asc', 'price-desc', 'stock']

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams

  const query = first(params.q)?.trim() || undefined
  const statusParam = first(params.status)
  const status =
    statusParam === 'draft' || statusParam === 'active' || statusParam === 'archived'
      ? statusParam
      : undefined
  const sortParam = first(params.sort) as AdminProductSort | undefined
  const sort = sortParam && SORTS.includes(sortParam) ? sortParam : 'newest'
  const page = parsePositiveInt(first(params.page), 1)

  const [{ items, total, pageCount }, counts, categories] = await Promise.all([
    listAdminProducts({ query, status, sort, page }),
    getProductStatusCounts(),
    listAdminCategories(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Products</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {total} {total === 1 ? 'product' : 'products'}
            {status ? ` in ${status}` : ''}
            {query ? ` matching “${query}”` : ''}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <PlusIcon />
            Add product
          </Link>
        </Button>
      </div>

      <ProductTableToolbar counts={counts} categories={categories} />

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-20 text-center">
          <div className="bg-muted flex size-14 items-center justify-center rounded-full">
            <PackageIcon className="text-muted-foreground size-6" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">No products found</p>
            <p className="text-muted-foreground max-w-sm text-sm">
              {query || status
                ? 'Try clearing the search or status filter.'
                : 'Add your first product to get the storefront going.'}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/products/new">Add product</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              {/* Seven headers for seven cells. The previous table declared four
                  headers against five cells, so every row was misaligned. */}
              <TableRow>
                <TableHead className="w-[3.5rem]">
                  <span className="sr-only">Image</span>
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="w-[3rem]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="bg-muted relative size-10 overflow-hidden rounded-md">
                      <Image
                        src={imageUrl(product.imagePath)}
                        alt=""
                        aria-hidden
                        fill
                        sizes="2.5rem"
                        className="object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[18rem]">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {product.title}
                    </Link>
                    <p className="text-muted-foreground truncate text-xs">/{product.slug}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {product.categoryName ?? '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(product.priceCents, product.currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={product.stock === 0 ? 'text-destructive' : undefined}>
                      {product.stock}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        product.status === 'active'
                          ? 'success'
                          : product.status === 'draft'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                    {formatDate(product.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ProductRowActions
                      productId={product.id}
                      slug={product.slug}
                      title={product.title}
                      status={product.status}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination
        page={page}
        pageCount={pageCount}
        buildHref={(target) => {
          const next = new URLSearchParams()
          if (query) next.set('q', query)
          if (status) next.set('status', status)
          if (sort !== 'newest') next.set('sort', sort)
          if (target > 1) next.set('page', String(target))
          const qs = next.toString()
          return qs ? `/admin/products?${qs}` : '/admin/products'
        }}
      />
    </div>
  )
}
