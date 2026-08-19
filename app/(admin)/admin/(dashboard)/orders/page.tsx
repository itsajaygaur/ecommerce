import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { listOrders } from '@/lib/queries/orders'
import { formatMoney } from '@/lib/money'
import { formatDate, parsePositiveInt } from '@/lib/utils'

export const metadata: Metadata = { title: 'Orders', robots: { index: false } }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ page?: string }>

const STATUS_VARIANT = {
  paid: 'success',
  fulfilled: 'success',
  pending: 'secondary',
  cancelled: 'outline',
  refunded: 'warning',
} as const

/** Order list. There was no order screen at all before, because orders were never stored. */
export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const { page: pageParam } = await searchParams
  const page = parsePositiveInt(pageParam, 1)

  const { items, total, pageCount } = await listOrders({ page })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-3">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} {total === 1 ? 'order' : 'orders'}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="border-y py-20">
          <p className="eyebrow mb-3">Empty</p>
          <p className="text-display-4">No orders yet</p>
          <div className="mt-2">
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Orders are recorded by the Stripe webhook at{' '}
              <code className="bg-muted px-1 py-0.5 font-mono text-xs">/api/webhooks/stripe</code>.
              Make sure that endpoint is registered for{' '}
              <code className="bg-muted px-1 py-0.5 font-mono text-xs">
                checkout.session.completed
              </code>
              .
            </p>
          </div>
        </div>
      ) : (
        <div className="border-y">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Placed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/admin/orders/${order.reference}`}
                      className="font-mono text-sm font-medium hover:underline"
                    >
                      {order.reference}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[16rem]">
                    <p className="truncate text-sm">{order.customerName ?? '—'}</p>
                    <p className="truncate text-xs text-muted-foreground">{order.email}</p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{order.itemCount}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatMoney(order.amountTotalCents, order.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(order.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination
        page={page}
        pageCount={pageCount}
        buildHref={(target) => (target > 1 ? `/admin/orders?page=${target}` : '/admin/orders')}
      />
    </div>
  )
}
