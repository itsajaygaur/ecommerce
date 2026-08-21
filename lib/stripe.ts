import 'server-only'
import Stripe from 'stripe'

/**
 * Stripe client.
 *
 * The API version is pinned so a Stripe-side release cannot silently change the
 * shape of what checkout and the webhook receive. Construction is lazy so builds
 * and non-commerce routes work without a key configured.
 */

let cached: Stripe | null = null

export function stripe(): Stripe {
  if (cached) return cached

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set — checkout is unavailable.')
  }

  cached = new Stripe(key, {
    apiVersion: '2026-07-29.dahlia',
    typescript: true,
    appInfo: { name: 'PATINA', version: '1.0.0' },
  })

  return cached
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

/**
 * True when the configured key is a Stripe test key.
 *
 * Derived from the key prefix rather than a hand-set `NEXT_PUBLIC_DEMO_MODE`
 * flag: a separate flag can drift out of sync with the key it describes, and
 * telling a shopper "no real payment is taken" while holding a live key is the
 * one way that mistake actually costs someone money. Reading the key means the
 * notice removes itself the moment a live key is swapped in.
 */
export function isStripeTestMode(): boolean {
  return process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ?? false
}
