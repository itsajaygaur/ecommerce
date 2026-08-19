import type { Metadata } from 'next'
import Link from 'next/link'
import { ReceiptTextIcon } from 'lucide-react'
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
        <h1 className="text-3xl">Orders</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {total} {total === 1 ? 'order' : 'orders'}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-20 text-center">
          <div className="bg-muted flex size-14 items-center justify-center rounded-full">
            <ReceiptTextIcon className="text-muted-foreground size-6" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">No orders yet</p>
            <p className="text-muted-foreground max-w-md text-sm">
              Orders are recorded by the Stripe webhook at{' '}
              <code className="bg-muted rounded px-1 py-0.5 text-xs">/api/webhooks/stripe</code>.
              Make sure that endpoint is registered for{' '}
              <code className="bg-muted rounded px-1 py-0.5 text-xs">
                checkout.session.completed
              </code>
              .
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border">
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
                    <p className="text-muted-foreground truncate text-xs">{order.email}</p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{order.itemCount}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatMoney(order.amountTotalCents, order.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
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
