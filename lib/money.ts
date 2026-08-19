/**
 * Money helpers.
 *
 * Amounts are integer minor units (paise for INR) everywhere — in the database, in
 * Stripe payloads and in the cart. Floating-point rupees are never stored, because
 * `0.1 + 0.2` problems in a total are indistinguishable from a pricing bug.
 */

export const DEFAULT_CURRENCY = 'INR'

/** Currencies Stripe treats as zero-decimal, where the amount is already the major unit. */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
])

export function minorUnitFactor(currency: string = DEFAULT_CURRENCY): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 1 : 100
}

function localeFor(currency: string): string {
  return currency.toUpperCase() === 'INR' ? 'en-IN' : 'en-US'
}

/**
 * Abbreviated amounts, computed by hand rather than with `notation: 'compact'`.
 *
 * `Intl` compact notation is not portable: for `en-IN`, Node's ICU renders 2500 as
 * "₹2.5K" while Chromium renders "₹2.5T" (the Indian short scale for thousand).
 * Rendering that on the server and again on the client produced a React hydration
 * mismatch on every catalog page. Doing the arithmetic ourselves keeps the two
 * environments in agreement — and lakh/crore is the more natural reading for an
 * INR storefront anyway.
 */
function formatCompact(amountInMajorUnits: number, currency: string): string {
  const symbol = new Intl.NumberFormat(localeFor(currency), {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  })
    .formatToParts(0)
    .find((part) => part.type === 'currency')?.value

  const prefix = symbol ?? ''
  const tiers =
    currency.toUpperCase() === 'INR'
      ? ([
          [10_000_000, 'Cr'],
          [100_000, 'L'],
          [1_000, 'K'],
        ] as const)
      : ([
          [1_000_000_000, 'B'],
          [1_000_000, 'M'],
          [1_000, 'K'],
        ] as const)

  for (const [threshold, suffix] of tiers) {
    if (amountInMajorUnits >= threshold) {
      const scaled = amountInMajorUnits / threshold
      // One decimal only when it changes the reading: 2.5K, but 5K not 5.0K.
      const rounded = Math.round(scaled * 10) / 10
      return `${prefix}${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}${suffix}`
    }
  }

  return `${prefix}${Math.round(amountInMajorUnits)}`
}

/** Formats minor units for display, e.g. 149900 -> "₹1,499". */
export function formatMoney(
  amountInMinorUnits: number,
  currency: string = DEFAULT_CURRENCY,
  options: { locale?: string; compact?: boolean } = {},
): string {
  const { locale = localeFor(currency), compact = false } = options
  const factor = minorUnitFactor(currency)
  const major = amountInMinorUnits / factor

  if (compact) return formatCompact(major, currency)

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    // Whole amounts read better without a trailing ".00" in dense UI.
    minimumFractionDigits: amountInMinorUnits % factor === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(major)
}

/**
 * Parses user-entered price text ("1,499", "1499.50", "₹1499") into minor units.
 * Returns null when the input is not a usable, non-negative amount.
 */
export function parsePriceToMinorUnits(
  input: string | number,
  currency: string = DEFAULT_CURRENCY,
): number | null {
  const raw = typeof input === 'number' ? String(input) : input
  const cleaned = raw.replace(/[^\d.-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null

  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0) return null

  // Round rather than truncate so 19.999 becomes 2000 rather than 1999.
  return Math.round(value * minorUnitFactor(currency))
}

/** Renders minor units as a plain decimal string for populating form inputs. */
export function minorUnitsToInput(
  amountInMinorUnits: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  const factor = minorUnitFactor(currency)
  if (factor === 1) return String(amountInMinorUnits)
  return (amountInMinorUnits / factor).toFixed(amountInMinorUnits % factor === 0 ? 0 : 2)
}

/** Percentage saved when a compare-at price is present and genuinely higher. */
export function discountPercent(
  priceCents: number,
  compareAtPriceCents: number | null | undefined,
): number | null {
  if (!compareAtPriceCents || compareAtPriceCents <= priceCents) return null
  return Math.round(((compareAtPriceCents - priceCents) / compareAtPriceCents) * 100)
}
