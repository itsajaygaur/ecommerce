import { beforeEach, describe, expect, it } from 'vitest'
import {
  MAX_LINE_QUANTITY,
  selectSubtotalCents,
  selectTotalQuantity,
  useCart,
  type CartLine,
} from '@/hooks/use-cart'

function line(productId: number, priceCents = 100_000): Omit<CartLine, 'quantity'> {
  return {
    productId,
    snapshot: {
      slug: `product-${productId}`,
      title: `Product ${productId}`,
      priceCents,
      currency: 'INR',
      imagePath: null,
    },
  }
}

describe('cart store', () => {
  beforeEach(() => useCart.setState({ lines: [] }))

  it('adds a new line with quantity one', () => {
    useCart.getState().add(line(1))
    expect(useCart.getState().lines).toHaveLength(1)
    expect(useCart.getState().lines[0]!.quantity).toBe(1)
  })

  it('increments an existing line instead of duplicating it', () => {
    useCart.getState().add(line(1))
    useCart.getState().add(line(1))
    expect(useCart.getState().lines).toHaveLength(1)
    expect(useCart.getState().lines[0]!.quantity).toBe(2)
  })

  it('respects an explicit quantity', () => {
    useCart.getState().add(line(1), 4)
    expect(useCart.getState().lines[0]!.quantity).toBe(4)
  })

  it('caps quantities at the per-line maximum', () => {
    useCart.getState().add(line(1), 500)
    expect(useCart.getState().lines[0]!.quantity).toBe(MAX_LINE_QUANTITY)
  })

  it('removes a line when its quantity drops to zero', () => {
    useCart.getState().add(line(1))
    useCart.getState().setQuantity(1, 0)
    expect(useCart.getState().lines).toHaveLength(0)
  })

  it('removes rather than going to zero when decrementing the last unit', () => {
    useCart.getState().add(line(1))
    useCart.getState().decrement(1)
    expect(useCart.getState().lines).toHaveLength(0)
  })

  it('decrements normally above one', () => {
    useCart.getState().add(line(1), 3)
    useCart.getState().decrement(1)
    expect(useCart.getState().lines[0]!.quantity).toBe(2)
  })

  it('clears every line', () => {
    useCart.getState().add(line(1))
    useCart.getState().add(line(2))
    useCart.getState().clear()
    expect(useCart.getState().lines).toHaveLength(0)
  })

  /**
   * The old header badge rendered `items.length`, so three of the same shirt read
   * as "1". The selector counts units.
   */
  it('counts total units, not distinct lines', () => {
    useCart.getState().add(line(1), 3)
    useCart.getState().add(line(2), 2)
    expect(selectTotalQuantity(useCart.getState())).toBe(5)
    expect(useCart.getState().lines).toHaveLength(2)
  })

  it('computes a subtotal across lines and quantities', () => {
    useCart.getState().add(line(1, 149_900), 2)
    useCart.getState().add(line(2, 429_900), 1)
    expect(selectSubtotalCents(useCart.getState())).toBe(729_700)
  })

  it('reports zero for an empty cart', () => {
    expect(selectTotalQuantity(useCart.getState())).toBe(0)
    expect(selectSubtotalCents(useCart.getState())).toBe(0)
  })
})
