'use client'

import { Suspense, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckoutButton } from '@/components/storefront/checkout-button'
import { QuantityStepper } from '@/components/storefront/quantity-stepper'
import { TestModeNote } from '@/components/storefront/test-mode-note'
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

function CartViewInner({ testMode }: { testMode: boolean }) {
  const hydrated = useCartHydrated()
  const searchParams = useSearchParams()

  const lines = useCart((state) => state.lines)
  const totalQuantity = useCart(selectTotalQuantity)
  const subtotal = useCart(selectSubtotalCents)
  const setQuantity = useCart((state) => state.setQuantity)
  const remove = useCart((state) => state.remove)

  // Stripe sends shoppers back here on both of its unhappy paths.
  useEffect(() => {
    const outcome = searchParams.get('checkout')

    if (outcome === 'cancelled') {
      toast.info('Checkout cancelled', { description: 'Your bag is exactly as you left it.' })
    }

    /*
     * The order could not be written after payment. Note the wording: failing to
     * *record* an order does not mean the charge failed, so this must never read
     * as "try again" — that invites a double payment on what may well be a
     * successful purchase.
     */
    if (outcome === 'incomplete') {
      toast.error('We could not confirm your order', {
        description:
          'Your payment may still have gone through. Please get in touch before trying again.',
        duration: 12_000,
      })
    }
  }, [searchParams])

  if (!hydrated) return <CartSkeleton />

  if (lines.length === 0) {
    return (
      <div className="border-y py-24">
        <p className="eyebrow mb-4">Empty</p>
        <p className="text-display-3">Your bag is empty</p>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Have a look at the catalogue — everything in it is chosen to last.
        </p>
        <Button asChild size="lg" className="mt-8">
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
                className="relative aspect-(--aspect-product) w-24 shrink-0 overflow-hidden bg-muted sm:w-28"
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
                      className="font-medium transition-colors hover:text-signal"
                    >
                      {line.snapshot.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatMoney(line.snapshot.priceCents, line.snapshot.currency)} each
                    </p>
                  </div>
                  <p className="price shrink-0">
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
        <div className="space-y-5 border-t border-border-strong pt-5">
          <h2 className="eyebrow-strong">Summary</h2>

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
                  <span className="font-medium text-success">Free</span>
                ) : (
                  formatMoney(shipping, currency)
                )}
              </dd>
            </div>
          </dl>

          {remainingForFreeShipping > 0 && (
            <div>
              {/* A hairline track with a signal fill — the same rule vocabulary
                  as everything else, rather than a tinted notice box. */}
              <div className="h-0.5 w-full bg-muted">
                <div
                  className="h-full bg-signal transition-[width] duration-500"
                  style={{
                    width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD_CENTS) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Add {formatMoney(remainingForFreeShipping, currency)} more for free shipping.
              </p>
            </div>
          )}

          <div className="flex items-baseline justify-between border-t pt-4">
            <span className="font-medium">Estimated total</span>
            <span className="price text-display-4">
              {formatMoney(subtotal + shipping, currency)}
            </span>
          </div>

          <CheckoutButton lines={lines} size="lg" className="w-full" />

          <p className="text-xs text-muted-foreground">
            Final shipping and taxes are confirmed at checkout.
          </p>

          {testMode && <TestModeNote />}
        </div>
      </aside>
    </div>
  )
}

/** Suspense boundary for `useSearchParams`, which reads the ?checkout= flag. */
export function CartView({ testMode = false }: { testMode?: boolean }) {
  return (
    <Suspense fallback={<CartSkeleton />}>
      <CartViewInner testMode={testMode} />
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
      <Skeleton className="h-72" />
    </div>
  )
}
