'use client'

import { Suspense, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ShoppingBagIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckoutButton } from '@/components/storefront/checkout-button'
import { QuantityStepper } from '@/components/storefront/quantity-stepper'
import {
  selectSubtotalCents,
  selectTotalQuantity,
  useCart,
  useCartHydrated,
} from '@/hooks/use-cart'
import { formatMoney } from '@/lib/money'
import { imageUrl } from '@/lib/storage'

const FREE_SHIPPING_THRESHOLD_CENTS = 200_000
const SHIPPING_FEE_CENTS = 9900

function CartViewInner() {
  const hydrated = useCartHydrated()
  const searchParams = useSearchParams()

  const lines = useCart((state) => state.lines)
  const totalQuantity = useCart(selectTotalQuantity)
  const subtotal = useCart(selectSubtotalCents)
  const setQuantity = useCart((state) => state.setQuantity)
  const remove = useCart((state) => state.remove)

  // Stripe sends shoppers back here when they abandon the payment page.
  useEffect(() => {
    if (searchParams.get('checkout') === 'cancelled') {
      toast.info('Checkout cancelled', { description: 'Your bag is exactly as you left it.' })
    }
  }, [searchParams])

  if (!hydrated) return <CartSkeleton />

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-xl border border-dashed py-24 text-center">
        <div className="bg-muted flex size-16 items-center justify-center rounded-full">
          <ShoppingBagIcon className="text-muted-foreground size-7" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-medium">Your bag is empty</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            Have a look at the catalog — everything in it is chosen to last.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/products">Browse products</Link>
        </Button>
      </div>
    )
  }

  const currency = lines[0]?.snapshot.currency ?? 'INR'
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FEE_CENTS
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotal)

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_22rem]">
      <section aria-label="Bag contents">
        <ul className="divide-y border-y">
          {lines.map((line) => (
            <li key={line.productId} className="flex gap-5 py-6">
              <Link
                href={`/products/${line.snapshot.slug}`}
                className="bg-muted relative aspect-(--aspect-product) w-24 shrink-0 overflow-hidden rounded-md sm:w-28"
              >
                <Image
                  src={imageUrl(line.snapshot.imagePath)}
                  alt={line.snapshot.title}
                  fill
                  sizes="7rem"
                  className="object-cover"
                />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/products/${line.snapshot.slug}`}
                      className="font-medium hover:underline"
                    >
                      {line.snapshot.title}
                    </Link>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {formatMoney(line.snapshot.priceCents, line.snapshot.currency)} each
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums">
                    {formatMoney(line.snapshot.priceCents * line.quantity, line.snapshot.currency)}
                  </p>
                </div>

                <div className="mt-auto flex items-center gap-3">
                  <QuantityStepper
                    value={line.quantity}
                    min={1}
                    max={99}
                    onChange={(value) => setQuantity(line.productId, value)}
                    label={`quantity of ${line.snapshot.title}`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(line.productId)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2Icon />
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <aside aria-label="Order summary" className="lg:sticky lg:top-24 lg:self-start">
        <div className="bg-secondary/60 space-y-4 rounded-xl p-6">
          <h2 className="font-display text-xl">Summary</h2>

          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                Subtotal ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'})
              </dt>
              <dd className="tabular-nums">{formatMoney(subtotal, currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="tabular-nums">
                {shipping === 0 ? (
                  <span className="text-success font-medium">Free</span>
                ) : (
                  formatMoney(shipping, currency)
                )}
              </dd>
            </div>
          </dl>

          {remainingForFreeShipping > 0 && (
            <p className="text-muted-foreground bg-background rounded-md px-3 py-2 text-xs">
              Add {formatMoney(remainingForFreeShipping, currency)} more for free shipping.
            </p>
          )}

          <Separator />

          <div className="flex items-baseline justify-between">
            <span className="font-medium">Estimated total</span>
            <span className="text-lg font-semibold tabular-nums">
              {formatMoney(subtotal + shipping, currency)}
            </span>
          </div>

          <CheckoutButton lines={lines} size="lg" className="w-full" />

          <p className="text-muted-foreground text-center text-xs">
            Final shipping and taxes are confirmed at checkout.
          </p>
        </div>
      </aside>
    </div>
  )
}

/** Suspense boundary for `useSearchParams`, which reads the ?checkout= flag. */
export function CartView() {
  return (
    <Suspense fallback={<CartSkeleton />}>
      <CartViewInner />
    </Suspense>
  )
}

function CartSkeleton() {
  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex gap-5">
            <Skeleton className="aspect-(--aspect-product) w-24 sm:w-28" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}
