import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeftIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { getOrderByReference } from '@/lib/queries/orders'
import { formatMoney } from '@/lib/money'
import { imageUrl } from '@/lib/storage'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Order', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Params = Promise<{ reference: string }>

export default async function AdminOrderPage({ params }: { params: Params }) {
  const { reference } = await params
  const order = await getOrderByReference(reference)
  if (!order) notFound()

  const shipping = Math.max(0, order.amountTotalCents - order.amountSubtotalCents)
  const address = order.shippingAddress

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/orders"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
          Orders
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-display-3">{order.reference}</h1>
          <Badge
            variant={
              order.status === 'paid' || order.status === 'fulfilled' ? 'success' : 'secondary'
            }
          >
            {order.status}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Placed {formatDate(order.createdAt, { dateStyle: 'full', timeStyle: 'short' })}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-3 first:pt-0">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    <Image
                      src={imageUrl(item.imagePath)}
                      alt=""
                      aria-hidden
                      fill
                      sizes="3rem"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    {item.slug ? (
                      <Link
                        href={`/products/${item.slug}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium">{item.title}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(item.unitPriceCents, order.currency)} × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-medium tabular-nums">
                    {formatMoney(item.unitPriceCents * item.quantity, order.currency)}
                  </p>
                </li>
              ))}
            </ul>

            <Separator className="my-4" />

            <dl className="ml-auto max-w-xs space-y-2 text-sm">
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
              <div className="flex justify-between border-t pt-2 font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">
                  {formatMoney(order.amountTotalCents, order.currency)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {order.customerName && <p className="font-medium">{order.customerName}</p>}
              <p className="break-all text-muted-foreground">{order.email}</p>
              {order.phone && <p className="text-muted-foreground">{order.phone}</p>}
            </CardContent>
          </Card>

          {address && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping address</CardTitle>
              </CardHeader>
              <CardContent>
                <address className="text-sm text-muted-foreground not-italic">
                  {address.line1 && <div>{address.line1}</div>}
                  {address.line2 && <div>{address.line2}</div>}
                  <div>
                    {[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}
                  </div>
                  {address.country && <div>{address.country}</div>}
                </address>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div>
                <p className="text-muted-foreground">Stripe session</p>
                <p className="font-mono break-all">{order.stripeSessionId}</p>
              </div>
              {order.stripePaymentIntentId && (
                <div>
                  <p className="text-muted-foreground">Payment intent</p>
                  <p className="font-mono break-all">{order.stripePaymentIntentId}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
