import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeftIcon } from 'lucide-react'
import { ProductForm } from '@/components/admin/product-form'
import { listAdminCategories } from '@/lib/queries/admin-products'
import { requireAdminPage } from '@/lib/auth'

export const metadata: Metadata = { title: 'New product', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function NewProductPage() {
  await requireAdminPage()
  const categories = await listAdminCategories()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/products"
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeftIcon className="size-4" />
          Products
        </Link>
        <h1 className="text-3xl">New product</h1>
      </div>

      <ProductForm categories={categories} />
    </div>
  )
}
