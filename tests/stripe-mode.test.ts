import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isStripeConfigured, isStripeTestMode } from '@/lib/stripe'

/**
 * Test-mode detection.
 *
 * The storefront tells shoppers "no real payment is taken" based on this, so the
 * expensive direction to get wrong is a false positive: showing that notice next
 * to a live key would invite people to enter real cards believing they are safe.
 * Hence the prefix check rather than a "not live" check — anything that is not
 * demonstrably a test key is treated as live.
 *
 * `isStripeTestMode` reads `process.env` on every call rather than at import, so
 * these cases need no module reset — but CI does set `STRIPE_SECRET_KEY` in the
 * job environment, so each case must start from a cleared value.
 */

const ORIGINAL = process.env.STRIPE_SECRET_KEY

beforeEach(() => {
  delete process.env.STRIPE_SECRET_KEY
})

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.STRIPE_SECRET_KEY
  else process.env.STRIPE_SECRET_KEY = ORIGINAL
})

describe('isStripeTestMode', () => {
  it('is true for a test key', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc123'
    expect(isStripeTestMode()).toBe(true)
  })

  it('is false for a live key', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_abc123'
    expect(isStripeTestMode()).toBe(false)
  })

  it('is false when no key is configured', () => {
    expect(isStripeTestMode()).toBe(false)
  })

  it('is false for a restricted live key', () => {
    // Restricted keys start `rk_`, so neither prefix check applies. Falling back
    // to "not test" is the safe direction.
    process.env.STRIPE_SECRET_KEY = 'rk_live_abc123'
    expect(isStripeTestMode()).toBe(false)
  })

  it('does not treat a key that merely contains "sk_test_" as a test key', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_not_sk_test_really'
    expect(isStripeTestMode()).toBe(false)
  })
})

describe('isStripeConfigured', () => {
  it('is false when the key is absent', () => {
    expect(isStripeConfigured()).toBe(false)
  })

  it('is true for either mode, since checkout works in both', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc123'
    expect(isStripeConfigured()).toBe(true)

    process.env.STRIPE_SECRET_KEY = 'sk_live_abc123'
    expect(isStripeConfigured()).toBe(true)
  })
})
