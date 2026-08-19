'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMoney } from '@/lib/money'

/**
 * Monthly revenue.
 *
 * Real figures from the `orders` table, unlike the chart this replaces, which
 * generated twelve random values on every render. Months with no sales are still
 * plotted as zero so the x-axis stays a stable twelve-month window.
 */
export function RevenueChart({
  data,
  currency,
}: {
  data: { month: string; revenueCents: number }[]
  currency: string
}) {
  const hasRevenue = data.some((point) => point.revenueCents > 0)

  if (!hasRevenue) {
    return (
      <div className="text-muted-foreground flex h-[300px] items-center justify-center text-sm">
        No revenue recorded yet.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          stroke="var(--muted-foreground)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(value: number) => formatMoney(value, currency, { compact: true })}
        />
        <Tooltip
          cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
          contentStyle={{
            background: 'var(--popover)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
          }}
          labelStyle={{ color: 'var(--popover-foreground)' }}
          formatter={(value) => [formatMoney(Number(value), currency), 'Revenue']}
        />
        <Bar dataKey="revenueCents" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  )
}
