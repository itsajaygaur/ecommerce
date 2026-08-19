import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClearCartOnMount } from '@/components/storefront/clear-cart-on-mount'
import { getOrderByReference } from '@/lib/queries/orders'
import { formatMoney } from '@/lib/money'
import { imageUrl } from '@/lib/storage'
import { formatDate } from '@/lib/utils'

/**
 * Order confirmation.
 *
 * Reads the persisted order rather than re-deriving everything from Stripe, so the
 * page still works on a refresh, days later, or from a different device. The
 * reference is a random unguessable handle, which is why the order can be addressed
 * by URL without a login.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Order confirmation',
  robots: { index: false, follow: false },
}

type Params = Promise<{ reference: string }>
type SearchParams = Promise<{ new?: string }>

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { reference } = await params
  const { new: isNew } = await searchParams

  const order = await getOrderByReference(reference)
  if (!order) notFound()

  const shipping = Math.max(0, order.amountTotalCents - order.amountSubtotalCents)
  const address = order.shippingAddress

  return (
    <div className="container-page max-w-3xl py-16">
      {/* Only wipe the bag when arriving straight from checkout, so revisiting an
          old order later does not silently empty a bag someone is filling. */}
      {isNew === '1' && <ClearCartOnMount />}

      {/*
       * Composed as a receipt rather than a confirmation card — mono meta in a
       * ruled row, ruled line items, totals right-aligned under a heavier rule.
       * It is the surface this design language suits most naturally, so the
       * centred tick-in-a-circle is gone.
       */}
      <p className="eyebrow text-signal">Order confirmed</p>
      <h1 className="mt-4 text-display-2">
        Thank you{order.customerName ? `, ${order.customerName.split(' ')[0]}` : ''}
      </h1>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted-foreground">
        Your order is confirmed. We&apos;ve sent a receipt to{' '}
        <span className="font-medium text-foreground">{order.email}</span>.
      </p>

      <dl className="mt-10 grid grid-cols-2 border-y sm:grid-cols-3">
        <div className="border-border py-4 pr-6 sm:border-r">
          <dt className="eyebrow mb-2">Order</dt>
          <dd className="font-mono text-sm font-medium">{order.reference}</dd>
        </div>
        <div className="border-border py-4 pr-6 sm:border-r sm:pl-6">
          <dt className="eyebrow mb-2">Placed</dt>
          <dd className="text-sm font-medium">{formatDate(order.createdAt)}</dd>
        </div>
        <div className="col-span-2 border-t py-4 sm:col-span-1 sm:border-t-0 sm:pl-6">
          <dt className="eyebrow mb-2">Status</dt>
          <dd>
            <Badge
              variant={
                order.status === 'paid' || order.status === 'fulfilled' ? 'success' : 'secondary'
              }
            >
              {order.status}
            </Badge>
          </dd>
        </div>
      </dl>

      <section className="mt-10" aria-labelledby="items-heading">
        <h2 id="items-heading" className="eyebrow-strong mb-4">
          Items
        </h2>
        <ul className="divide-y border-y">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 py-4">
              <div className="relative aspect-(--aspect-product) w-16 shrink-0 overflow-hidden bg-muted">
                <Image
                  src={imageUrl(item.imagePath)}
                  alt=""
                  aria-hidden
                  fill
                  sizes="4rem"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                {item.slug ? (
                  <Link
                    href={`/products/${item.slug}`}
                    className="font-medium transition-colors hover:text-signal"
                  >
                    {item.title}
                  </Link>
                ) : (
                  <p className="font-medium">{item.title}</p>
                )}
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {formatMoney(item.unitPriceCents, order.currency)} × {item.quantity}
                </p>
              </div>
              <p className="font-medium tabular-nums">
                {formatMoney(item.unitPriceCents * item.quantity, order.currency)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-6 ml-auto max-w-xs space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">
              {formatMoney(order.amountSubtotalCents, order.currency)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd className="tabular-nums">
              {shipping === 0 ? 'Free' : formatMoney(shipping, order.currency)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border-strong pt-3 text-base font-medium">
            <dt>Total paid</dt>
            <dd className="price">{formatMoney(order.amountTotalCents, order.currency)}</dd>
          </div>
        </dl>
      </section>

      {address && (
        <section className="mt-10 border-t pt-8" aria-labelledby="shipping-heading">
          <h2 id="shipping-heading" className="eyebrow-strong mb-4">
            Shipping to
          </h2>
          <address className="text-sm text-muted-foreground not-italic">
            {order.customerName && (
              <div className="font-medium text-foreground">{order.customerName}</div>
            )}
            {address.line1 && <div>{address.line1}</div>}
            {address.line2 && <div>{address.line2}</div>}
            <div>
              {[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}
            </div>
            {address.country && <div>{address.country}</div>}
          </address>
        </section>
      )}

      <div className="mt-12 border-t pt-8">
        <Button asChild size="lg" variant="outline">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    </div>
  )
}
