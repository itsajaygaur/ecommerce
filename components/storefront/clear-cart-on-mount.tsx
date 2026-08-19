'use client'

import { useEffect } from 'react'
import { useCart } from '@/hooks/use-cart'

/** Empties the bag once, after a confirmed order. */
export function ClearCartOnMount() {
  const clear = useCart((state) => state.clear)

  useEffect(() => {
    clear()
    // `clear` is a stable zustand action, so this runs exactly once on mount.
  }, [clear])

  return null
}
