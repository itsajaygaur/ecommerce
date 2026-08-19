import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { recordOrderFromSession } from '@/lib/orders/record'
import { stripe } from '@/lib/stripe'

/**
 * Stripe webhook.
 *
 * Without this endpoint the shop had no record of any sale — Stripe was the only
 * place an order existed. Every event is signature-verified against
 * STRIPE_WEBHOOK_SECRET before it is trusted, and order creation is idempotent, so
 * Stripe's at-least-once delivery cannot produce duplicate orders.
 *
 * Register it at <site>/api/webhooks/stripe for `checkout.session.completed`.
 * Locally: stripe listen --forward-to localhost:3000/api/webhooks/stripe
 */

// Signature verification needs the exact bytes Stripe signed, so this must run on
// the Node runtime where the raw body is available.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const payload = await request.text()

  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(payload, signature, secret)
  } catch (error) {
    // An unsigned or tampered payload never reaches the database.
    const message = error instanceof Error ? error.message : 'Invalid payload'
    console.error('[stripe-webhook] signature verification failed:', message)
    return NextResponse.json({ error: `Webhook signature verification failed` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        await recordOrderFromSession(event.data.object)
        break
      }

      default:
        // Unhandled event types are acknowledged so Stripe stops retrying them.
        break
    }
  } catch (error) {
    // A 500 tells Stripe to retry, which is what we want for a transient database
    // failure. Idempotency makes the retry safe.
    console.error(`[stripe-webhook] failed to handle ${event.type}`, error)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
