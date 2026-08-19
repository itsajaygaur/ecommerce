'use client'

import { useState } from 'react'
import { CheckIcon, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useCart, useCartDrawer } from '@/hooks/use-cart'
import type { ProductListItem } from '@/lib/catalog'

/** Adds one unit straight from a catalog tile, without leaving the grid. */
export function QuickAddButton({ product }: { product: ProductListItem }) {
  const add = useCart((state) => state.add)
  const setDrawerOpen = useCartDrawer((state) => state.setOpen)
  const [justAdded, setJustAdded] = useState(false)

  return (
    <Button
      type="button"
      size="sm"
      variant="default"
      // Flush to the frame edge: full width, square, no gap. The bar IS the
      // bottom of the image, not a floating chip inside it.
      className="h-10 w-full rounded-none"
      onClick={(event) => {
        // The card is a stretched link; without this the click navigates away.
        event.preventDefault()
        event.stopPropagation()

        add({
          productId: product.id,
          snapshot: {
            slug: product.slug,
            title: product.title,
            priceCents: product.priceCents,
            currency: product.currency,
            imagePath: product.imagePath,
          },
        })

        setJustAdded(true)
        setTimeout(() => setJustAdded(false), 1600)

        toast.success('Added to bag', {
          description: product.title,
          action: { label: 'View bag', onClick: () => setDrawerOpen(true) },
        })
      }}
    >
      {justAdded ? <CheckIcon /> : <PlusIcon />}
      {justAdded ? 'Added' : 'Quick add'}
    </Button>
  )
}
