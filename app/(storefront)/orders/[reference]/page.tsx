import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2Icon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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

      <div className="text-center">
        <CheckCircle2Icon className="text-success mx-auto size-14" aria-hidden />
        <h1 className="mt-6 text-4xl">
          Thank you{order.customerName ? `, ${order.customerName.split(' ')[0]}` : ''}
        </h1>
        <p className="text-muted-foreground mt-3">
          Your order is confirmed. We&apos;ve sent a receipt to{' '}
          <span className="text-foreground font-medium">{order.email}</span>.
        </p>
      </div>

      <div className="bg-secondary/60 mt-10 flex flex-wrap items-center justify-between gap-4 rounded-xl px-6 py-4 text-sm">
        <div>
          <p className="text-muted-foreground text-xs tracking-wide uppercase">Order</p>
          <p className="font-mono font-medium">{order.reference}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs tracking-wide uppercase">Placed</p>
          <p className="font-medium">{formatDate(order.createdAt)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs tracking-wide uppercase">Status</p>
          <Badge
            variant={
              order.status === 'paid' || order.status === 'fulfilled' ? 'success' : 'secondary'
            }
          >
            {order.status}
          </Badge>
        </div>
      </div>

      <section className="mt-10" aria-labelledby="items-heading">
        <h2 id="items-heading" className="mb-4 text-xl">
          Items
        </h2>
        <ul className="divide-y border-y">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 py-4">
              <div className="bg-muted relative aspect-(--aspect-product) w-16 shrink-0 overflow-hidden rounded-md">
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
                  <Link href={`/products/${item.slug}`} className="font-medium hover:underline">
                    {item.title}
                  </Link>
                ) : (
                  <p className="font-medium">{item.title}</p>
                )}
                <p className="text-muted-foreground mt-0.5 text-sm">
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
          <Separator />
          <div className="flex justify-between text-base font-semibold">
            <dt>Total paid</dt>
            <dd className="tabular-nums">{formatMoney(order.amountTotalCents, order.currency)}</dd>
          </div>
        </dl>
      </section>

      {address && (
        <section className="mt-10" aria-labelledby="shipping-heading">
          <h2 id="shipping-heading" className="mb-3 text-xl">
            Shipping to
          </h2>
          <address className="text-muted-foreground text-sm not-italic">
            {order.customerName && (
              <div className="text-foreground font-medium">{order.customerName}</div>
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

      <div className="mt-12 flex justify-center">
        <Button asChild size="lg" variant="outline">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    </div>
  )
}
