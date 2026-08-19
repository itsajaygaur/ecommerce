import { describe, expect, it } from 'vitest'
import {
  MAX_LINE_QUANTITY,
  normaliseRequest,
  resolveCartPricing,
  type CatalogRow,
} from '@/lib/checkout/pricing'

/**
 * The regression suite for the most serious bug in the original application:
 * `checkout()` built Stripe line items from prices supplied by the browser, so a
 * customer could edit localStorage and buy anything for ₹1.
 *
 * These tests assert the invariant that replaced it — the amount charged is always
 * the catalog price, whatever the request says.
 */

function product(overrides: Partial<CatalogRow> = {}): CatalogRow {
  return {
    id: 1,
    slug: 'leather-weekender',
    title: 'Leather Weekender',
    priceCents: 1_299_900,
    currency: 'INR',
    stock: 10,
    status: 'active',
    imagePath: 'products/weekender.svg',
    ...overrides,
  }
}

describe('resolveCartPricing', () => {
  it('prices from the catalog, ignoring anything the client claims', () => {
    // A tampered cart: the caller asserts the item costs ₹1.
    const tamperedRequest = [{ productId: 1, quantity: 1, priceCents: 100, title: 'Free stuff' }]

    const result = resolveCartPricing(tamperedRequest, [product()])

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.lines[0]!.unitPriceCents).toBe(1_299_900)
    expect(result.lines[0]!.title).toBe('Leather Weekender')
    expect(result.subtotalCents).toBe(1_299_900)
  })

  it('multiplies the catalog price by the requested quantity', () => {
    const result = resolveCartPricing([{ productId: 1, quantity: 3 }], [product()])

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.subtotalCents).toBe(3_899_700)
  })

  it('rejects a product that is not in the catalog', () => {
    const result = resolveCartPricing([{ productId: 999, quantity: 1 }], [product()])

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.unavailableProductIds).toEqual([999])
  })

  it.each(['draft', 'archived'] as const)('rejects a %s product', (status) => {
    const result = resolveCartPricing([{ productId: 1, quantity: 1 }], [product({ status })])

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.unavailableProductIds).toEqual([1])
  })

  it('rejects a quantity greater than the available stock', () => {
    const result = resolveCartPricing([{ productId: 1, quantity: 4 }], [product({ stock: 3 })])

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.unavailableProductIds).toEqual([1])
  })

  it('allows a quantity exactly equal to stock', () => {
    const result = resolveCartPricing([{ productId: 1, quantity: 3 }], [product({ stock: 3 })])
    expect(result.ok).toBe(true)
  })

  it('rejects an empty cart', () => {
    const result = resolveCartPricing([], [product()])
    expect(result.ok).toBe(false)
  })

  it('refuses to mix currencies in one session', () => {
    const result = resolveCartPricing(
      [
        { productId: 1, quantity: 1 },
        { productId: 2, quantity: 1 },
      ],
      [product(), product({ id: 2, slug: 'other', currency: 'USD' })],
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toMatch(/currenc/i)
  })

  it('reports every unavailable line, not just the first', () => {
    const result = resolveCartPricing(
      [
        { productId: 1, quantity: 1 },
        { productId: 2, quantity: 1 },
        { productId: 3, quantity: 1 },
      ],
      [
        product(),
        product({ id: 2, slug: 'b', status: 'archived' }),
        product({ id: 3, slug: 'c', stock: 0 }),
      ],
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.unavailableProductIds.sort()).toEqual([2, 3])
  })
})

describe('normaliseRequest', () => {
  it('merges duplicate ids into a single line', () => {
    expect(
      normaliseRequest([
        { productId: 1, quantity: 2 },
        { productId: 1, quantity: 3 },
      ]),
    ).toEqual([{ productId: 1, quantity: 5 }])
  })

  it('caps the merged quantity, so repeats cannot bypass the per-line limit', () => {
    const request = Array.from({ length: 50 }, () => ({ productId: 1, quantity: 10 }))
    expect(normaliseRequest(request)).toEqual([{ productId: 1, quantity: MAX_LINE_QUANTITY }])
  })

  it('keeps distinct products separate', () => {
    expect(
      normaliseRequest([
        { productId: 1, quantity: 1 },
        { productId: 2, quantity: 2 },
      ]),
    ).toEqual([
      { productId: 1, quantity: 1 },
      { productId: 2, quantity: 2 },
    ])
  })
})
