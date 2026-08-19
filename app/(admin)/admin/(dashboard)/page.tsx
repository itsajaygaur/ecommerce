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
          <p className="eyebrow mb-3">Overview</p>
          <h1 className="text-display-3">Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {metrics.orderCount === 0
              ? 'No orders yet — figures will populate as sales come in.'
              : `Across ${metrics.orderCount} paid ${metrics.orderCount === 1 ? 'order' : 'orders'}.`}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">Add product</Link>
        </Button>
      </div>

      <div className="grid border-y sm:grid-cols-2 xl:grid-cols-4">
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
          <CardHeader className="border-b">
            <CardTitle className="eyebrow-strong">Revenue</CardTitle>
            <CardDescription>Last twelve months</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 pl-0">
            <RevenueChart data={metrics.revenueSeries} currency={currency} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="border-b">
            <CardTitle className="eyebrow-strong">Recent orders</CardTitle>
            <CardDescription>
              {metrics.recentOrders.length === 0 ? 'Nothing yet' : 'Most recent first'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {metrics.recentOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Orders will appear here once a customer checks out.
              </p>
            ) : (
              <ul className="space-y-4">
                {metrics.recentOrders.map((order) => (
                  <li key={order.reference} className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center bg-secondary font-mono text-[0.625rem] font-medium text-secondary-foreground">
                      {initials(order.customerName ?? order.email)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/orders/${order.reference}`}
                        className="block truncate text-sm font-medium transition-colors hover:text-signal"
                      >
                        {order.customerName ?? order.email}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <p className="price shrink-0 text-sm">
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
          <CardHeader className="border-b">
            <CardTitle className="eyebrow-strong flex items-center gap-2">
              <TriangleAlertIcon className="size-4 text-warning" />
              Low stock
            </CardTitle>
            <CardDescription>Active products with five or fewer units left.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="divide-y">
              {metrics.lowStock.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-4 py-2.5">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="truncate text-sm transition-colors hover:text-signal"
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
    <div className="border-border py-6 pr-6 not-last:border-b sm:not-first:border-l sm:not-first:pl-6 sm:not-last:border-b-0 sm:nth-3:border-l-0 sm:nth-3:pl-0 xl:nth-3:border-l xl:nth-3:pl-6">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-3 text-display-3 tabular-nums">{value}</p>
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
        <p className="mt-2 text-xs text-muted-foreground">&nbsp;</p>
      )}
    </div>
  )
}

function cnDelta(delta: number): string {
  return `mt-2 flex items-center gap-1 text-xs ${delta >= 0 ? 'text-success' : 'text-destructive'}`
}
