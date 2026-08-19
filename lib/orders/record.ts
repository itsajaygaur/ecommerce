import 'server-only'
import { randomBytes } from 'node:crypto'
import { asc, eq, inArray, sql } from 'drizzle-orm'
import type Stripe from 'stripe'
import { db } from '@/db'
import { orderItems, orders, productImages, products } from '@/db/schema'
import { stripe } from '@/lib/stripe'

/**
 * Turns a paid Stripe Checkout session into an order.
 *
 * Previously nothing was written anywhere: Stripe redirected to /success, the
 * browser cleared its own cart, and the shop had no record that a sale happened.
 *
 * This function is the single writer, shared by two callers:
 *   - the webhook (`checkout.session.completed`), which is authoritative, and
 *   - the confirmation page, which runs the same path so the customer sees their
 *     order immediately even if the webhook is still in flight.
 *
 * That makes concurrent execution the normal case, so it must be idempotent. It is,
 * via the unique index on `orders.stripe_session_id`: the second writer's insert
 * hits the conflict, writes nothing, and reads back the row the first one created.
 */

export type RecordedOrder = { reference: string; created: boolean }

/** URL-safe, unguessable handle. Order pages are addressed by this, not by id. */
function generateReference(): string {
  return `MK-${randomBytes(5).toString('hex').toUpperCase()}`
}

function normaliseAddress(address: Stripe.Address | null | undefined) {
  if (!address) return null
  return {
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postal_code,
    country: address.country,
  }
}

type ResolvedLine = {
  productId: number | null
  title: string
  slug: string | null
  imagePath: string | null
  unitPriceCents: number
  quantity: number
}

/**
 * Reads the purchased lines back from Stripe. The `productId` set on each price's
 * product at checkout time is what links a payment back to catalog rows.
 */
async function resolveLines(sessionId: string): Promise<ResolvedLine[]> {
  const lineItems = await stripe().checkout.sessions.listLineItems(sessionId, {
    limit: 100,
    expand: ['data.price.product'],
  })

  const lines = lineItems.data.map((item) => {
    const product = item.price?.product
    const metadata =
      product && typeof product === 'object' && 'metadata' in product ? product.metadata : null

    const parsedId = Number(metadata?.productId)
    const quantity = item.quantity ?? 1

    return {
      productId: Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null,
      title: item.description ?? 'Item',
      slug: metadata?.slug ?? null,
      imagePath: null as string | null,
      // Prefer the per-unit amount; fall back to dividing the total when Stripe
      // only reports an aggregate.
      unitPriceCents: item.price?.unit_amount ?? Math.round((item.amount_total ?? 0) / quantity),
      quantity,
    }
  })

  // Snapshot the imagery alongside the title and price. An order is a historical
  // record: it must still render correctly after the product is renamed, re-shot
  // or deleted outright.
  const productIds = lines.map((line) => line.productId).filter((id): id is number => id !== null)

  if (productIds.length > 0) {
    const images = await db
      .select({ productId: productImages.productId, path: productImages.path })
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.productId), asc(productImages.position), asc(productImages.id))

    const primary = new Map<number, string>()
    for (const image of images) {
      if (!primary.has(image.productId)) primary.set(image.productId, image.path)
    }

    for (const line of lines) {
      if (line.productId !== null) line.imagePath = primary.get(line.productId) ?? null
    }
  }

  return lines
}

export async function recordOrderFromSession(
  session: Stripe.Checkout.Session,
): Promise<RecordedOrder | null> {
  // Only completed payments become orders. Anything else (expired, unpaid) is
  // ignored rather than written in a half state.
  if (session.payment_status !== 'paid' && session.status !== 'complete') return null

  const email =
    session.customer_details?.email ??
    (typeof session.customer_email === 'string' ? session.customer_email : null)
  if (!email) return null

  const existing = await db
    .select({ reference: orders.reference })
    .from(orders)
    .where(eq(orders.stripeSessionId, session.id))
    .limit(1)

  if (existing[0]) return { reference: existing[0].reference, created: false }

  const lines = await resolveLines(session.id)
  const reference = generateReference()

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null)

  const result = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(orders)
      .values({
        reference,
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        email,
        customerName: session.customer_details?.name ?? null,
        phone: session.customer_details?.phone ?? null,
        amountSubtotalCents: session.amount_subtotal ?? session.amount_total ?? 0,
        amountTotalCents: session.amount_total ?? 0,
        currency: (session.currency ?? 'inr').toUpperCase(),
        status: 'paid',
        shippingAddress: normaliseAddress(
          session.collected_information?.shipping_details?.address ??
            session.customer_details?.address,
        ),
      })
      // The race guard. A concurrent webhook + confirmation page both reach here;
      // exactly one insert wins and the other returns nothing.
      .onConflictDoNothing({ target: orders.stripeSessionId })
      .returning({ id: orders.id, reference: orders.reference })

    const order = inserted[0]
    if (!order) return null

    if (lines.length > 0) {
      await tx.insert(orderItems).values(
        lines.map((line) => ({
          orderId: order.id,
          productId: line.productId,
          title: line.title,
          slug: line.slug,
          imagePath: line.imagePath,
          unitPriceCents: line.unitPriceCents,
          quantity: line.quantity,
        })),
      )

      // Decrement stock in the same transaction as the order. `greatest(..., 0)`
      // keeps a race between two buyers from driving stock negative.
      for (const line of lines) {
        if (!line.productId) continue
        await tx
          .update(products)
          .set({
            stock: sql`greatest(${products.stock} - ${line.quantity}, 0)`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, line.productId))
      }
    }

    return order
  })

  if (result) return { reference: result.reference, created: true }

  // Lost the race: the other writer created it, so read its reference back.
  const [row] = await db
    .select({ reference: orders.reference })
    .from(orders)
    .where(eq(orders.stripeSessionId, session.id))
    .limit(1)

  return row ? { reference: row.reference, created: false } : null
}
