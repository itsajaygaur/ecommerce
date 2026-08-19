import 'server-only'
import { and, count, desc, eq, gte, sql } from 'drizzle-orm'
import { db } from '@/db'
import { orderItems, orders, products } from '@/db/schema'

/** Order reads for the confirmation page and the admin back office. */

export type OrderWithItems = {
  id: number
  reference: string
  email: string
  customerName: string | null
  phone: string | null
  amountSubtotalCents: number
  amountTotalCents: number
  currency: string
  status: 'pending' | 'paid' | 'fulfilled' | 'cancelled' | 'refunded'
  shippingAddress: {
    line1?: string | null
    line2?: string | null
    city?: string | null
    state?: string | null
    postalCode?: string | null
    country?: string | null
  } | null
  stripeSessionId: string
  stripePaymentIntentId: string | null
  createdAt: Date
  items: {
    id: number
    productId: number | null
    title: string
    slug: string | null
    imagePath: string | null
    unitPriceCents: number
    quantity: number
  }[]
}

export async function getOrderByReference(reference: string): Promise<OrderWithItems | null> {
  const [order] = await db.select().from(orders).where(eq(orders.reference, reference)).limit(1)
  if (!order) return null

  // Fall back to the product's current primary image when the order item did not
  // capture one, so confirmation emails and pages still show something.
  const items = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      title: orderItems.title,
      slug: orderItems.slug,
      unitPriceCents: orderItems.unitPriceCents,
      quantity: orderItems.quantity,
      // `order_items.*` spelled out: an interpolated `${'${orderItems.productId}'}`
      // emits a bare "product_id", which Postgres resolves against product_images
      // inside the subquery, making the condition trivially true.
      imagePath: sql<string | null>`coalesce(order_items.image_path, (
        SELECT pi.path FROM product_images pi
        WHERE pi.product_id = order_items.product_id
        ORDER BY pi.position ASC LIMIT 1
      ))`,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(orderItems.id)

  return { ...order, items } as OrderWithItems
}

export async function listOrders({
  page = 1,
  pageSize = 20,
}: { page?: number; pageSize?: number } = {}) {
  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: orders.id,
        reference: orders.reference,
        email: orders.email,
        customerName: orders.customerName,
        amountTotalCents: orders.amountTotalCents,
        currency: orders.currency,
        status: orders.status,
        createdAt: orders.createdAt,
        // `orders.id` in full: interpolating it emits a bare "id" that binds to
        // order_items.id inside the subquery, making the join condition wrong.
        itemCount: sql<number>`cast((
          SELECT coalesce(sum(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = orders.id
        ) as int)`,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),

    db.select({ total: count() }).from(orders),
  ])

  const total = totals?.total ?? 0
  return { items: rows, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) }
}

export type DashboardMetrics = {
  revenueCents: number
  revenueCents30d: number
  revenuePrev30dCents: number
  orderCount: number
  orderCount30d: number
  orderCountPrev30d: number
  unitsSold: number
  averageOrderValueCents: number
  currency: string
  revenueSeries: { month: string; revenueCents: number }[]
  recentOrders: {
    reference: string
    email: string
    customerName: string | null
    amountTotalCents: number
    currency: string
    createdAt: Date
  }[]
  lowStock: { id: number; title: string; slug: string; stock: number }[]
}

const PAID_STATUSES = ['paid', 'fulfilled'] as const

/**
 * Everything the admin dashboard shows, computed from real orders.
 * The previous dashboard rendered `Math.random()` bars and five hardcoded names.
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const paid = sql`${orders.status} in ('paid', 'fulfilled')`

  const [[totals], [window30], [windowPrev30], [units], series, recentOrders, lowStock] =
    await Promise.all([
      db
        .select({
          revenue: sql<number>`cast(coalesce(sum(${orders.amountTotalCents}), 0) as bigint)`,
          orders: sql<number>`cast(count(*) as int)`,
          currency: sql<string>`coalesce(max(${orders.currency}), 'INR')`,
        })
        .from(orders)
        .where(paid),

      db
        .select({
          revenue: sql<number>`cast(coalesce(sum(${orders.amountTotalCents}), 0) as bigint)`,
          orders: sql<number>`cast(count(*) as int)`,
        })
        .from(orders)
        .where(and(paid, gte(orders.createdAt, sql`now() - interval '30 days'`))),

      db
        .select({
          revenue: sql<number>`cast(coalesce(sum(${orders.amountTotalCents}), 0) as bigint)`,
          orders: sql<number>`cast(count(*) as int)`,
        })
        .from(orders)
        .where(
          and(
            paid,
            gte(orders.createdAt, sql`now() - interval '60 days'`),
            sql`${orders.createdAt} < now() - interval '30 days'`,
          ),
        ),

      db
        .select({ units: sql<number>`cast(coalesce(sum(${orderItems.quantity}), 0) as int)` })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(paid),

      // Twelve month buckets, generated so months with no sales still appear as zero
      // rather than collapsing the chart's x-axis.
      db.execute<{ month: string; revenue: number }>(sql`
      SELECT to_char(m.month, 'Mon') AS month,
             cast(coalesce(sum(o.amount_total_cents), 0) as bigint) AS revenue
      FROM generate_series(
        date_trunc('month', now()) - interval '11 months',
        date_trunc('month', now()),
        interval '1 month'
      ) AS m(month)
      LEFT JOIN orders o
        ON date_trunc('month', o.created_at) = m.month
       AND o.status IN ('paid', 'fulfilled')
      GROUP BY m.month
      ORDER BY m.month
    `),

      db
        .select({
          reference: orders.reference,
          email: orders.email,
          customerName: orders.customerName,
          amountTotalCents: orders.amountTotalCents,
          currency: orders.currency,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(6),

      db
        .select({
          id: products.id,
          title: products.title,
          slug: products.slug,
          stock: products.stock,
        })
        .from(products)
        .where(and(eq(products.status, 'active'), sql`${products.stock} <= 5`))
        .orderBy(products.stock)
        .limit(6),
    ])

  const revenueCents = Number(totals?.revenue ?? 0)
  const orderCount = Number(totals?.orders ?? 0)

  return {
    revenueCents,
    revenueCents30d: Number(window30?.revenue ?? 0),
    revenuePrev30dCents: Number(windowPrev30?.revenue ?? 0),
    orderCount,
    orderCount30d: Number(window30?.orders ?? 0),
    orderCountPrev30d: Number(windowPrev30?.orders ?? 0),
    unitsSold: Number(units?.units ?? 0),
    averageOrderValueCents: orderCount > 0 ? Math.round(revenueCents / orderCount) : 0,
    currency: totals?.currency ?? 'INR',
    revenueSeries: (series as unknown as { month: string; revenue: number }[]).map((row) => ({
      month: row.month.trim(),
      revenueCents: Number(row.revenue),
    })),
    recentOrders,
    lowStock,
  }
}

export { PAID_STATUSES }
