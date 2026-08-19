import type Stripe from 'stripe'
import { siteUrl } from '@/lib/env'
import { imageUrl } from '@/lib/storage'

/**
 * Cart repricing.
 *
 * Kept separate from the Server Action (a `'use server'` module may only export
 * async functions) so this logic can be unit-tested directly. It is the single
 * place that decides what a customer is charged, and it only ever reads prices
 * from catalog rows — never from the request.
 */

export type CheckoutRequestLine = {
  productId: number
  quantity: number
}

export type CatalogRow = {
  id: number
  slug: string
  title: string
  priceCents: number
  currency: string
  stock: number
  status: 'draft' | 'active' | 'archived'
  imagePath: string | null
}

export type PricedLine = {
  productId: number
  slug: string
  title: string
  unitPriceCents: number
  currency: string
  quantity: number
  imagePath: string | null
}

export type PriceResolution =
  | { ok: true; lines: PricedLine[]; currency: string; subtotalCents: number }
  | { ok: false; message: string; unavailableProductIds: number[] }

export const MAX_LINE_QUANTITY = 99

/**
 * Collapses repeated ids and clamps quantities, so sending the same product twice
 * cannot be used to exceed the per-line cap.
 */
export function normaliseRequest(lines: CheckoutRequestLine[]): CheckoutRequestLine[] {
  const merged = new Map<number, number>()

  for (const line of lines) {
    const next = (merged.get(line.productId) ?? 0) + line.quantity
    merged.set(line.productId, Math.min(next, MAX_LINE_QUANTITY))
  }

  return [...merged].map(([productId, quantity]) => ({ productId, quantity }))
}

export function resolveCartPricing(
  requested: CheckoutRequestLine[],
  catalog: CatalogRow[],
): PriceResolution {
  if (requested.length === 0) {
    return { ok: false, message: 'Your cart is empty.', unavailableProductIds: [] }
  }

  const byId = new Map(catalog.map((row) => [row.id, row]))
  const lines: PricedLine[] = []
  const unavailable: number[] = []

  for (const line of requested) {
    const product = byId.get(line.productId)

    // Unknown, draft and archived products are all equally un-purchasable.
    if (!product || product.status !== 'active' || product.stock < line.quantity) {
      unavailable.push(line.productId)
      continue
    }

    lines.push({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      // The catalog price, always. This is the line that closes the tampering hole.
      unitPriceCents: product.priceCents,
      currency: product.currency,
      quantity: line.quantity,
      imagePath: product.imagePath,
    })
  }

  if (unavailable.length > 0) {
    return {
      ok: false,
      message:
        unavailable.length === requested.length
          ? 'Those items are no longer available.'
          : 'Some items in your cart are out of stock or no longer available.',
      unavailableProductIds: unavailable,
    }
  }

  // A Stripe session is single-currency; silently picking one would charge wrongly.
  const currencies = new Set(lines.map((line) => line.currency))
  if (currencies.size > 1) {
    return {
      ok: false,
      message: 'Your cart mixes currencies, which cannot be checked out together.',
      unavailableProductIds: [],
    }
  }

  return {
    ok: true,
    lines,
    currency: lines[0]?.currency ?? 'INR',
    subtotalCents: lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0),
  }
}

/** Stripe cannot fetch a relative path, so local images are made absolute. */
export function absoluteImageUrl(path: string | null): string | null {
  const url = imageUrl(path)
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (!siteUrl.startsWith('http')) return null
  return `${siteUrl}${url}`
}

export function toStripeLineItems(
  lines: PricedLine[],
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  return lines.map((line) => {
    const image = absoluteImageUrl(line.imagePath)

    return {
      price_data: {
        currency: line.currency.toLowerCase(),
        unit_amount: line.unitPriceCents,
        product_data: {
          name: line.title,
          ...(image ? { images: [image] } : {}),
          // Read back by the webhook to tie the payment to catalog rows without
          // relying on session metadata, which is capped at 500 characters.
          metadata: { productId: String(line.productId), slug: line.slug },
        },
      },
      quantity: line.quantity,
    }
  })
}
