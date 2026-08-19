import { describe, expect, it } from 'vitest'
import {
  discountPercent,
  formatMoney,
  minorUnitFactor,
  minorUnitsToInput,
  parsePriceToMinorUnits,
} from '@/lib/money'

describe('parsePriceToMinorUnits', () => {
  it('converts whole rupees to paise', () => {
    expect(parsePriceToMinorUnits('1499')).toBe(149_900)
  })

  it('handles decimals', () => {
    expect(parsePriceToMinorUnits('1499.50')).toBe(149_950)
  })

  it('strips grouping separators and currency symbols', () => {
    expect(parsePriceToMinorUnits('₹1,499.50')).toBe(149_950)
  })

  it('rounds rather than truncates, so 19.999 does not become 19.99', () => {
    expect(parsePriceToMinorUnits('19.999')).toBe(2000)
  })

  it('rejects blank, negative and non-numeric input', () => {
    expect(parsePriceToMinorUnits('')).toBeNull()
    expect(parsePriceToMinorUnits('-5')).toBeNull()
    expect(parsePriceToMinorUnits('abc')).toBeNull()
    expect(parsePriceToMinorUnits('.')).toBeNull()
  })

  it('accepts zero', () => {
    expect(parsePriceToMinorUnits('0')).toBe(0)
  })

  it('treats zero-decimal currencies as already being in major units', () => {
    expect(parsePriceToMinorUnits('1499', 'JPY')).toBe(1499)
    expect(minorUnitFactor('JPY')).toBe(1)
    expect(minorUnitFactor('INR')).toBe(100)
  })
})

describe('formatMoney', () => {
  it('omits the fractional part for whole amounts', () => {
    expect(formatMoney(149_900)).toBe('₹1,499')
  })

  it('shows paise when they are non-zero', () => {
    expect(formatMoney(149_950)).toBe('₹1,499.50')
  })

  /**
   * Guards the hydration bug this replaced: `Intl` compact notation is not portable
   * (Node renders "₹2.5K" for en-IN where Chromium renders "₹2.5T"), so rendering it
   * on the server and again on the client tore the React tree apart. Compact output
   * is computed by hand now and must be stable regardless of the host's ICU build.
   */
  it('produces runtime-independent compact output', () => {
    expect(formatMoney(250_000, 'INR', { compact: true })).toBe('₹2.5K')
    expect(formatMoney(500_000, 'INR', { compact: true })).toBe('₹5K')
    expect(formatMoney(1_00_00_000 * 100, 'INR', { compact: true })).toBe('₹1Cr')
    expect(formatMoney(15_00_000 * 100, 'INR', { compact: true })).toBe('₹15L')
    expect(formatMoney(50_000, 'INR', { compact: true })).toBe('₹500')
  })
})

describe('minorUnitsToInput', () => {
  it('renders a value suitable for a form field', () => {
    expect(minorUnitsToInput(149_900)).toBe('1499')
    expect(minorUnitsToInput(149_950)).toBe('1499.50')
    expect(minorUnitsToInput(1499, 'JPY')).toBe('1499')
  })

  it('round-trips through parsePriceToMinorUnits', () => {
    for (const cents of [0, 1, 99, 100, 149_950, 12_999_00]) {
      expect(parsePriceToMinorUnits(minorUnitsToInput(cents))).toBe(cents)
    }
  })
})

describe('discountPercent', () => {
  it('computes the saving when the compare-at price is higher', () => {
    expect(discountPercent(1_299_900, 1_549_900)).toBe(16)
  })

  it('returns null when there is nothing to compare against', () => {
    expect(discountPercent(1000, null)).toBeNull()
    expect(discountPercent(1000, undefined)).toBeNull()
  })

  it('returns null rather than a negative discount when compare-at is lower or equal', () => {
    expect(discountPercent(1000, 900)).toBeNull()
    expect(discountPercent(1000, 1000)).toBeNull()
  })
})
