import type { Metadata } from 'next'
import { CategoryManager } from '@/components/admin/category-manager'
import { listAdminCategories } from '@/lib/queries/admin-products'
import { requireAdminPage } from '@/lib/auth'

export const metadata: Metadata = { title: 'Categories', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  await requireAdminPage()
  const categories = await listAdminCategories()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Categories</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Categories drive storefront navigation and filtering. Deleting one leaves its products
          uncategorised rather than removing them.
        </p>
      </div>

      <CategoryManager categories={categories} />
    </div>
  )
}
