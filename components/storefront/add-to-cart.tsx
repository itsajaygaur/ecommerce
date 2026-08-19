'use client'

import { useState } from 'react'
import { ShoppingBagIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from '@/components/storefront/quantity-stepper'
import { useCart, useCartDrawer } from '@/hooks/use-cart'
import type { ProductDetail } from '@/lib/catalog'

/** Quantity picker plus add-to-bag for the product detail page. */
export function AddToCart({ product }: { product: ProductDetail }) {
  const [quantity, setQuantity] = useState(1)
  const add = useCart((state) => state.add)
  const setDrawerOpen = useCartDrawer((state) => state.setOpen)

  const soldOut = product.stock <= 0

  if (soldOut) {
    return (
      <Button size="lg" className="w-full" disabled>
        Sold out
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <QuantityStepper
        value={quantity}
        min={1}
        max={Math.min(product.stock, 99)}
        onChange={setQuantity}
        label={`Quantity of ${product.title}`}
        className="h-12 sm:w-36"
      />

      <Button
        size="lg"
        className="flex-1"
        onClick={() => {
          add(
            {
              productId: product.id,
              snapshot: {
                slug: product.slug,
                title: product.title,
                priceCents: product.priceCents,
                currency: product.currency,
                imagePath: product.imagePath,
              },
            },
            quantity,
          )

          setDrawerOpen(true)
          toast.success('Added to bag', { description: `${quantity} × ${product.title}` })
        }}
      >
        <ShoppingBagIcon />
        Add to bag
      </Button>
    </div>
  )
}
