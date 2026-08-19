import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The bag, order confirmations and the back office have nothing to index and
      // order references should never end up in a search result.
      disallow: ['/admin', '/admin/', '/api/', '/cart', '/orders/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
