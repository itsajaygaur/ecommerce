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
    appInfo: { name: 'MyKart', version: '1.0.0' },
  })

  return cached
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}
