import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/env'
import { listActiveSlugs, listCategories } from '@/lib/queries/products'

/** Generated from the live catalog; the site previously had no sitemap at all. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/products`, changeFrequency: 'daily', priority: 0.9 },
  ]

  // A build without a database should still emit a valid sitemap rather than fail.
  const [products, categories] = await Promise.all([
    listActiveSlugs().catch(() => []),
    listCategories().catch(() => []),
  ])

  return [
    ...staticRoutes,
    ...categories.map((category) => ({
      url: `${siteUrl}/products?category=${category.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: `${siteUrl}/products/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
