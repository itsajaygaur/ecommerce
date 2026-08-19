import { redirect } from 'next/navigation'
import { recordOrderFromSession } from '@/lib/orders/record'
import { stripe } from '@/lib/stripe'

/**
 * Post-payment landing.
 *
 * Stripe returns the shopper here with `?session_id=`. Rather than rendering from
 * the session (which leaves no record anywhere), this finalises the order through
 * the same idempotent writer the webhook uses, then redirects to the order's own
 * permanent URL.
 *
 * Doing the work here as well as in the webhook means the customer never sees a
 * "your order is processing" placeholder just because webhook delivery is a second
 * behind — and the unique index on `stripe_session_id` guarantees only one order is
 * ever created no matter which arrives first.
 */
export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ session_id?: string }>

export default async function ConfirmationPage({ searchParams }: { searchParams: SearchParams }) {
  const { session_id: sessionId } = await searchParams

  if (!sessionId) redirect('/')

  let reference: string | null = null

  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId)
    const result = await recordOrderFromSession(session)
    reference = result?.reference ?? null
  } catch (error) {
    console.error('[confirmation] could not finalise order', error)
  }

  // An unknown or unpaid session should not reveal anything; send them home.
  if (!reference) redirect('/?checkout=incomplete')

  redirect(`/orders/${reference}?new=1`)
}
