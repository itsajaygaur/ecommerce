import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeftIcon, ExternalLinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductForm } from '@/components/admin/product-form'
import { getAdminProduct, listAdminCategories } from '@/lib/queries/admin-products'
import { requireAdminPage } from '@/lib/auth'

export const metadata: Metadata = { title: 'Edit product', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string }>

export default async function EditProductPage({ params }: { params: Params }) {
  await requireAdminPage()

  const { id } = await params
  const productId = Number(id)
  if (!Number.isInteger(productId) || productId <= 0) notFound()

  const [product, categories] = await Promise.all([
    getAdminProduct(productId),
    listAdminCategories(),
  ])

  if (!product) notFound()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/admin/products"
            className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm"
          >
            <ChevronLeftIcon className="size-4" />
            Products
          </Link>
          <h1 className="text-3xl">{product.title}</h1>
        </div>
        <Button asChild variant="outline">
          <Link href={`/products/${product.slug}`} target="_blank" rel="noreferrer">
            <ExternalLinkIcon />
            View on storefront
          </Link>
        </Button>
      </div>

      <ProductForm product={product} categories={categories} />
    </div>
  )
}
