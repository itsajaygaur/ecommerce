import { NextResponse, type NextRequest } from 'next/server'
import { getSlugById } from '@/lib/queries/products'

/**
 * Legacy URL bridge.
 *
 * The original storefront linked products as `/product/<numeric id>` (the route was
 * even named `[slug]` while being handed an id). Those URLs are in search indexes
 * and in people's history, so they resolve the id and 308 to the slug rather than
 * 404ing. A 308 preserves the method and tells crawlers the move is permanent.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const numericId = Number(id)

  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.redirect(new URL('/products', _request.url), 308)
  }

  const slug = await getSlugById(numericId).catch(() => null)

  return NextResponse.redirect(new URL(slug ? `/products/${slug}` : '/products', _request.url), 308)
}
