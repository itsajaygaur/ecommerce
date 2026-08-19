import { createHmac } from 'node:crypto'
import { beforeAll, describe, expect, it, vi } from 'vitest'

/**
 * Webhook signature verification.
 *
 * The application previously had no webhook at all, so a paid order left no trace.
 * Now that one exists it is a public, unauthenticated endpoint — the signature is
 * the only thing standing between an anonymous POST and a fabricated order.
 *
 * `constructEvent` is pure HMAC, so these run entirely offline.
 */

const WEBHOOK_SECRET = 'whsec_test_secret_for_unit_tests'

process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET

const recordOrderFromSession = vi.fn(async () => ({ reference: 'MK-TEST01', created: true }))

// The handler's database and Stripe API work is exercised separately; here we only
// care which payloads make it past the signature check.
vi.mock('@/lib/orders/record', () => ({
  recordOrderFromSession: (...args: unknown[]) => recordOrderFromSession(...(args as [])),
}))

let POST: (request: Request) => Promise<Response>

beforeAll(async () => {
  ;({ POST } = (await import('@/app/api/webhooks/stripe/route')) as unknown as {
    POST: (request: Request) => Promise<Response>
  })
})

function sign(payload: string, secret = WEBHOOK_SECRET, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')
  return `t=${timestamp},v1=${signature}`
}

function event(sessionId = 'cs_test_123') {
  return JSON.stringify({
    id: 'evt_test_1',
    object: 'event',
    type: 'checkout.session.completed',
    api_version: '2026-07-29.dahlia',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: sessionId,
        object: 'checkout.session',
        payment_status: 'paid',
        status: 'complete',
        amount_total: 1_299_900,
        currency: 'inr',
        customer_details: { email: 'buyer@example.com', name: 'Test Buyer' },
      },
    },
  })
}

function post(body: string, headers: Record<string, string> = {}) {
  return POST(
    new Request('http://localhost/api/webhooks/stripe', { method: 'POST', body, headers }),
  )
}

describe('POST /api/webhooks/stripe', () => {
  it('rejects a payload with no signature header', async () => {
    const response = await post(event())
    expect(response.status).toBe(400)
    expect(recordOrderFromSession).not.toHaveBeenCalled()
  })

  it('rejects a payload signed with the wrong secret', async () => {
    const payload = event()
    const response = await post(payload, {
      'stripe-signature': sign(payload, 'whsec_wrong_secret'),
    })

    expect(response.status).toBe(400)
    expect(recordOrderFromSession).not.toHaveBeenCalled()
  })

  it('rejects a payload that was modified after signing', async () => {
    const original = event()
    const signature = sign(original)
    // Same signature, different body — exactly the attack the check exists for.
    const tampered = original.replace('1299900', '1')

    const response = await post(tampered, { 'stripe-signature': signature })
    expect(response.status).toBe(400)
    expect(recordOrderFromSession).not.toHaveBeenCalled()
  })

  it('rejects a replayed signature outside the tolerance window', async () => {
    const payload = event()
    const hourAgo = Math.floor(Date.now() / 1000) - 3600
    const response = await post(payload, {
      'stripe-signature': sign(payload, WEBHOOK_SECRET, hourAgo),
    })

    expect(response.status).toBe(400)
    expect(recordOrderFromSession).not.toHaveBeenCalled()
  })

  it('accepts a correctly signed payload and records the order', async () => {
    recordOrderFromSession.mockClear()
    const payload = event()

    const response = await post(payload, { 'stripe-signature': sign(payload) })

    expect(response.status).toBe(200)
    expect(recordOrderFromSession).toHaveBeenCalledTimes(1)
  })

  it('acknowledges event types it does not handle without recording anything', async () => {
    recordOrderFromSession.mockClear()
    const payload = JSON.stringify({
      id: 'evt_test_2',
      object: 'event',
      type: 'payment_intent.created',
      api_version: '2026-07-29.dahlia',
      created: Math.floor(Date.now() / 1000),
      data: { object: { id: 'pi_test', object: 'payment_intent' } },
    })

    const response = await post(payload, { 'stripe-signature': sign(payload) })

    expect(response.status).toBe(200)
    expect(recordOrderFromSession).not.toHaveBeenCalled()
  })
})
