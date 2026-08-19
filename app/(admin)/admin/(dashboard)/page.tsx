import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  IndianRupeeIcon,
  PackageIcon,
  ReceiptTextIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RevenueChart } from '@/components/admin/revenue-chart'
import { getDashboardMetrics } from '@/lib/queries/orders'
import { formatMoney } from '@/lib/money'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard', robots: { index: false } }
export const dynamic = 'force-dynamic'

/**
 * Dashboard.
 *
 * Everything here is computed from the `orders` table. The page it replaces showed
 * `$45,231.89` in revenue, a bar chart filled with `Math.floor(Math.random() * 5000)`
 * and five hardcoded customers — none of it connected to the shop at all.
 */
export default async function AdminDashboardPage() {
  const metrics = await getDashboardMetrics()
  const currency = metrics.currency

  const revenueDelta = percentChange(metrics.revenueCents30d, metrics.revenuePrev30dCents)
  const orderDelta = percentChange(metrics.orderCount30d, metrics.orderCountPrev30d)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {metrics.orderCount === 0
              ? 'No orders yet — figures will populate as sales come in.'
              : `Across ${metrics.orderCount} paid ${metrics.orderCount === 1 ? 'order' : 'orders'}.`}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">Add product</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Revenue"
          value={formatMoney(metrics.revenueCents, currency)}
          icon={<IndianRupeeIcon className="size-4" />}
          delta={revenueDelta}
          deltaLabel="vs previous 30 days"
        />
        <MetricCard
          label="Orders"
          value={String(metrics.orderCount)}
          icon={<ReceiptTextIcon className="size-4" />}
          delta={orderDelta}
          deltaLabel="vs previous 30 days"
        />
        <MetricCard
          label="Average order value"
          value={formatMoney(metrics.averageOrderValueCents, currency)}
          icon={<IndianRupeeIcon className="size-4" />}
        />
        <MetricCard
          label="Units sold"
          value={String(metrics.unitsSold)}
          icon={<PackageIcon className="size-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Last twelve months</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <RevenueChart data={metrics.revenueSeries} currency={currency} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
            <CardDescription>
              {metrics.recentOrders.length === 0 ? 'Nothing yet' : 'Most recent first'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.recentOrders.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Orders will appear here once a customer checks out.
              </p>
            ) : (
              <ul className="space-y-4">
                {metrics.recentOrders.map((order) => (
                  <li key={order.reference} className="flex items-center gap-3">
                    <div className="bg-secondary text-secondary-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                      {initials(order.customerName ?? order.email)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/orders/${order.reference}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {order.customerName ?? order.email}
                      </Link>
                      <p className="text-muted-foreground truncate text-xs">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums">
                      {formatMoney(order.amountTotalCents, order.currency)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {metrics.lowStock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TriangleAlertIcon className="text-warning size-4" />
              Low stock
            </CardTitle>
            <CardDescription>Active products with five or fewer units left.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {metrics.lowStock.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-4 py-2.5">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="truncate text-sm hover:underline"
                  >
                    {product.title}
                  </Link>
                  <Badge variant={product.stock === 0 ? 'destructive' : 'warning'}>
                    {product.stock === 0 ? 'Out of stock' : `${product.stock} left`}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/** Null when there is no prior period to compare against, rather than a fake +100%. */
function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

function initials(value: string): string {
  const parts = value
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean)
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0])
      .join('') ||
    value[0] ||
    '?'
  ).toUpperCase()
}

function MetricCard({
  label,
  value,
  icon,
  delta,
  deltaLabel,
}: {
  label: string
  value: string
  icon: React.ReactNode
  delta?: number | null
  deltaLabel?: string
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {delta !== undefined && delta !== null ? (
          <p className={cnDelta(delta)} title={deltaLabel}>
            {delta >= 0 ? (
              <ArrowUpRightIcon className="size-3.5" />
            ) : (
              <ArrowDownRightIcon className="size-3.5" />
            )}
            {Math.abs(delta)}% {deltaLabel}
          </p>
        ) : (
          <p className="text-muted-foreground mt-1 text-xs">&nbsp;</p>
        )}
      </CardContent>
    </Card>
  )
}

function cnDelta(delta: number): string {
  return `mt-1 flex items-center gap-1 text-xs ${delta >= 0 ? 'text-success' : 'text-destructive'}`
}
