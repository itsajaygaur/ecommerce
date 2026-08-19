'use client'

import { useSyncExternalStore } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Client cart.
 *
 * The store deliberately holds only `{ productId, quantity }` plus a cached display
 * snapshot. Prices shown here are for rendering; they are never trusted by the
 * server. `lib/actions/checkout.ts` re-reads every price from the database, which
 * closes the hole where editing localStorage let you buy anything for ₹1.
 */

export type CartLine = {
  productId: number
  quantity: number
  /** Display-only snapshot, refreshed from the server whenever the cart renders. */
  snapshot: {
    slug: string
    title: string
    priceCents: number
    currency: string
    imagePath: string | null
  }
}

type CartState = {
  lines: CartLine[]
  add: (line: Omit<CartLine, 'quantity'>, quantity?: number) => void
  setQuantity: (productId: number, quantity: number) => void
  increment: (productId: number) => void
  decrement: (productId: number) => void
  remove: (productId: number) => void
  clear: () => void
}

export const MAX_LINE_QUANTITY = 99

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],

      add: (line, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.productId === line.productId)
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.productId === line.productId
                  ? {
                      ...l,
                      quantity: Math.min(l.quantity + quantity, MAX_LINE_QUANTITY),
                      snapshot: line.snapshot,
                    }
                  : l,
              ),
            }
          }
          return {
            lines: [...state.lines, { ...line, quantity: Math.min(quantity, MAX_LINE_QUANTITY) }],
          }
        }),

      setQuantity: (productId, quantity) =>
        set((state) => ({
          // Dropping to zero removes the line rather than leaving a 0-quantity row,
          // which the old implementation allowed and then priced as a full unit.
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.productId !== productId)
              : state.lines.map((l) =>
                  l.productId === productId
                    ? { ...l, quantity: Math.min(quantity, MAX_LINE_QUANTITY) }
                    : l,
                ),
        })),

      increment: (productId) =>
        set((state) => ({
          lines: state.lines.map((l) =>
            l.productId === productId
              ? { ...l, quantity: Math.min(l.quantity + 1, MAX_LINE_QUANTITY) }
              : l,
          ),
        })),

      decrement: (productId) =>
        set((state) => ({
          lines: state.lines.flatMap((l) =>
            l.productId === productId
              ? l.quantity <= 1
                ? []
                : [{ ...l, quantity: l.quantity - 1 }]
              : [l],
          ),
        })),

      remove: (productId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.productId !== productId) })),

      clear: () => set({ lines: [] }),
    }),
    {
      // Storage key, not a brand name. The store was renamed to PATINA but this
      // stays: renaming it orphans the localStorage entry of every shopper with
      // a bag in progress, and zustand's `migrate` cannot help because it only
      // runs for a key that is actually found.
      name: 'mykart.cart',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // v1 stored whole product objects under `cart`. Anything that shape is dropped
      // rather than migrated, because those records carried client-side prices.
      migrate: () => ({ lines: [] }),
    },
  ),
)

/** Total units, not distinct lines — the header badge previously showed the latter. */
export const selectTotalQuantity = (state: CartState) =>
  state.lines.reduce((sum, line) => sum + line.quantity, 0)

export const selectSubtotalCents = (state: CartState) =>
  state.lines.reduce((sum, line) => sum + line.snapshot.priceCents * line.quantity, 0)

/**
 * Guards against hydration mismatch: the server renders with an empty cart while
 * the browser rehydrates from localStorage. Components read `hydrated` and render
 * a neutral placeholder until the persisted state has actually landed.
 */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(subscribeToHydration, getHydrationSnapshot, () => false)
}

function subscribeToHydration(onStoreChange: () => void): () => void {
  // When storage is unavailable — which is the case during SSR — zustand's persist
  // middleware returns early and never attaches its `persist` API at all, so guard
  // rather than assuming it exists.
  const persistApi = useCart.persist
  if (!persistApi) return () => {}
  return persistApi.onFinishHydration(onStoreChange)
}

function getHydrationSnapshot(): boolean {
  return useCart.persist?.hasHydrated() ?? true
}

/** Drawer open state, kept separate so cart mutations do not re-render the drawer shell. */
type CartDrawerState = { open: boolean; setOpen: (open: boolean) => void }

export const useCartDrawer = create<CartDrawerState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
