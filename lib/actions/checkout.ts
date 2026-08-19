'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { siteUrl } from '@/lib/env'
import { isStripeConfigured, stripe } from '@/lib/stripe'
import { getProductsForCheckout } from '@/lib/queries/products'
import {
  MAX_LINE_QUANTITY,
  normaliseRequest,
  resolveCartPricing,
  toStripeLineItems,
  type CatalogRow,
} from '@/lib/checkout/pricing'

/**
 * Starts a Stripe Checkout session.
 *
 * The client may only say *which product* and *how many*. Prices, titles and
 * imagery are read from the database by `resolveCartPricing`, and the success and
 * cancel URLs come from server configuration. Previously all of those arrived from
 * the browser, which meant any cart could be repriced before submission.
 */

const checkoutInput = z.array(
  z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
  }),
)

export type CheckoutFailure = {
  ok: false
  message: string
  /** Product ids that could not be fulfilled, so the cart can flag them inline. */
  unavailableProductIds?: number[]
}

export async function startCheckout(requestedLines: unknown): Promise<CheckoutFailure> {
  const parsed = checkoutInput.safeParse(requestedLines)
  if (!parsed.success) {
    return { ok: false, message: 'That cart could not be read. Please refresh and try again.' }
  }

  if (!isStripeConfigured()) {
    return { ok: false, message: 'Payments are not configured on this deployment.' }
  }

  const normalised = normaliseRequest(parsed.data)
  const catalog = (await getProductsForCheckout(
    normalised.map((line) => line.productId),
  )) as CatalogRow[]

  const pricing = resolveCartPricing(normalised, catalog)
  if (!pricing.ok) {
    return {
      ok: false,
      message: pricing.message,
      unavailableProductIds: pricing.unavailableProductIds,
    }
  }

  let checkoutUrl: string | null = null

  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: toStripeLineItems(pricing.lines),
      success_url: `${siteUrl}/orders/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart?checkout=cancelled`,
      billing_address_collection: 'required',
      shipping_address_collection: { allowed_countries: ['IN'] },
      phone_number_collection: { enabled: true },
    })

    checkoutUrl = session.url
  } catch (error) {
    console.error('[checkout] failed to create Stripe session', error)
    return { ok: false, message: 'We could not start checkout. Please try again shortly.' }
  }

  if (!checkoutUrl) {
    return { ok: false, message: 'We could not start checkout. Please try again shortly.' }
  }

  // `redirect` throws, so this call never returns on success — the function only
  // produces a value when checkout could not be started.
  redirect(checkoutUrl)
}
