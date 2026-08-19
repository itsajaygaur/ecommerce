import { expect, test } from '@playwright/test'

/**
 * Storefront smoke tests: the browse → filter → product → bag path a customer
 * actually walks. Checkout itself stops at the Stripe redirect, which is as far as
 * a test can go without live keys.
 */

test('home page presents the catalog', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /outlast the season/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /shop by category/i })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Shop all' })).toBeVisible()
})

test('search narrows the catalog and is reflected in the URL', async ({ page }) => {
  await page.goto('/products')

  const initialCount = await page.locator('article').count()
  expect(initialCount).toBeGreaterThan(1)

  // The debounced search only reacts once the field is hydrated.
  await page.waitForLoadState('networkidle')
  await page.getByPlaceholder('Search products').first().fill('leather')
  await page.waitForURL(/q=leather/, { timeout: 15_000 })

  await expect(page.getByRole('heading', { level: 1 })).toContainText('leather')
  await expect.poll(() => page.locator('article').count()).toBeLessThan(initialCount)
})

test('category filter is shareable via the URL', async ({ page }) => {
  await page.goto('/products?category=footwear')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Footwear')
  const cards = page.locator('article')
  await expect(cards.first()).toBeVisible()

  for (const text of await cards.allTextContents()) {
    expect(text.toUpperCase()).toContain('FOOTWEAR')
  }
})

test('sorting by price ascending really orders the results', async ({ page }) => {
  await page.goto('/products?sort=price-asc')

  // Anchored on a data-testid rather than a utility class. The previous selector
  // read `.font-semibold`, so a restyle that changed the price's font weight made
  // every card fall through to '0' — and a list of zeroes is trivially sorted, so
  // the test would have gone on passing while checking nothing.
  const prices = await page.locator('article').evaluateAll((cards) =>
    cards.map((card) => {
      const el = card.querySelector('[data-testid="product-price"]')
      if (!el) throw new Error('product card is missing [data-testid="product-price"]')
      return Number((el.textContent ?? '').replace(/[^\d.]/g, ''))
    }),
  )

  expect(prices.length).toBeGreaterThan(1)
  expect(prices.every((price) => price > 0)).toBe(true)
  expect([...prices].sort((a, b) => a - b)).toEqual(prices)
})

test('a product page shows price, stock and structured data', async ({ page }) => {
  await page.goto('/products/leather-weekender')

  await expect(page.getByRole('heading', { name: 'Leather Weekender', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: /add to bag/i })).toBeEnabled()

  const jsonLd = await page.locator('script[type="application/ld+json"]').textContent()
  const parsed = JSON.parse(jsonLd ?? '{}')
  expect(parsed['@type']).toBe('Product')
  expect(parsed.offers.priceCurrency).toBe('INR')
  expect(parsed.offers.availability).toContain('InStock')
})

test('a sold-out product cannot be added to the bag', async ({ page }) => {
  await page.goto('/products/brass-desk-lamp')

  await expect(page.getByRole('button', { name: /sold out/i })).toBeDisabled()
})

test('adding to the bag updates the count, totals and persists across a reload', async ({
  page,
}) => {
  await page.goto('/products/leather-weekender')

  await page.getByRole('button', { name: /increase quantity/i }).click()
  await page.getByRole('button', { name: /add to bag/i }).click()

  // The drawer opens on add.
  const drawer = page.getByRole('dialog')
  await expect(drawer).toBeVisible()
  await expect(drawer.getByText('2 items')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()

  // Badge counts units, not lines.
  await expect(page.getByRole('button', { name: /open bag, 2 items/i })).toBeVisible()

  await page.goto('/cart')
  await expect(page.getByRole('heading', { name: 'Your bag' })).toBeVisible()
  await expect(page.getByText('Subtotal (2 items)')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Checkout' })).toBeEnabled()

  // Persisted in localStorage, so a reload keeps it.
  await page.reload()
  await expect(page.getByText('Subtotal (2 items)')).toBeVisible()
})

test('search still works without JavaScript', async ({ browser }) => {
  // Progressive enhancement: the form has a real GET action, so a submit before
  // (or without) hydration still reaches the catalog rather than doing nothing.
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()

  await page.goto('/products')
  await page.getByPlaceholder('Search products').first().fill('leather')
  await page.keyboard.press('Enter')

  await page.waitForURL(/\/products\?q=leather/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 1 })).toContainText('leather')

  await context.close()
})

test('an empty bag offers a way back to the catalog', async ({ page }) => {
  await page.goto('/cart')

  await expect(page.getByText('Your bag is empty')).toBeVisible()
  await page.getByRole('link', { name: 'Browse products' }).click()
  await expect(page).toHaveURL(/\/products/)
})

test('legacy /product/<id> URLs redirect to the slug', async ({ page }) => {
  const response = await page.goto('/product/5')

  expect(response?.status()).toBe(200)
  expect(page.url()).toMatch(/\/products\/[a-z0-9-]+$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('an unknown product renders the 404 page', async ({ page }) => {
  const response = await page.goto('/products/does-not-exist')

  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: /couldn't find that page/i })).toBeVisible()
})

test('filters with no matches show an empty state rather than a blank grid', async ({ page }) => {
  await page.goto('/products?q=zzzznotathing')

  await expect(page.getByText('Nothing matched those filters')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Reset filters' })).toBeVisible()
})
