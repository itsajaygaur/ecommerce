import { expect, test } from '@playwright/test'

/**
 * Back-office smoke tests, including the authorisation checks that were missing
 * from the original application entirely.
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@mykart.local'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'admin12345'

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/admin/login')
  await page.fill('#email', ADMIN_EMAIL)
  await page.fill('#password', ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 20_000 })
}

test.describe('access control', () => {
  test('signed-out visitors are sent to the login page', async ({ page }) => {
    await page.goto('/admin/products')

    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fproducts/)
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  test('every admin route is gated', async ({ page }) => {
    for (const path of ['/admin', '/admin/orders', '/admin/categories', '/admin/products/new']) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/admin\/login/)
    }
  })

  test('a wrong password is rejected without revealing whether the account exists', async ({
    page,
  }) => {
    await page.goto('/admin/login')
    await page.fill('#email', ADMIN_EMAIL)
    await page.fill('#password', 'definitely-not-the-password')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.locator('form').getByRole('alert')).toHaveText('Incorrect email or password.')
    await expect(page).toHaveURL(/\/admin\/login/)

    // An unknown address produces exactly the same message.
    await page.fill('#email', 'nobody@example.com')
    await page.fill('#password', 'whatever')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.locator('form').getByRole('alert')).toHaveText('Incorrect email or password.')
  })

  test('a failed attempt keeps the email so only the password is retyped', async ({ page }) => {
    await page.goto('/admin/login')
    await page.fill('#email', ADMIN_EMAIL)
    await page.fill('#password', 'wrong')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.locator('form').getByRole('alert')).toHaveText('Incorrect email or password.')
    await expect(page.locator('#email')).toHaveValue(ADMIN_EMAIL)
  })
})

test.describe('signed in', () => {
  test.beforeEach(async ({ page }) => signIn(page))

  test('the dashboard reports real figures', async ({ page }) => {
    await page.goto('/admin')

    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
    for (const label of ['Revenue', 'Orders', 'Average order value', 'Units sold']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
    }
  })

  test('products can be searched and filtered by status', async ({ page }) => {
    await page.goto('/admin/products')

    const allRows = await page.locator('tbody tr').count()
    expect(allRows).toBeGreaterThan(0)

    await page.getByPlaceholder('Search by title').fill('watch')
    await page.waitForURL(/q=watch/, { timeout: 10_000 })
    await expect.poll(() => page.locator('tbody tr').count()).toBeLessThan(allRows)

    // Every row under the draft filter really is a draft (the set may be empty).
    await page.goto('/admin/products?status=draft')
    const statuses = await page.locator('tbody tr td:nth-child(6)').allTextContents()
    for (const status of statuses) expect(status.trim()).toBe('draft')
  })

  test('the products table has one header per column', async ({ page }) => {
    await page.goto('/admin/products')

    const headers = await page.locator('thead th').count()
    const cells = await page.locator('tbody tr').first().locator('td').count()
    expect(headers).toBe(cells)
  })

  test('a product can be created, edited and deleted', async ({ page }) => {
    const title = `E2E Test Product ${Date.now()}`

    await page.goto('/admin/products/new')
    await page.fill('#title', title)
    await page.fill('#description', 'Created by the end-to-end suite.')
    await page.fill('#price', '1234.50')
    await page.fill('#stock', '7')
    await page.getByRole('button', { name: 'Create product' }).click()

    await page.waitForURL(/\/admin\/products$/, { timeout: 20_000 })
    await page.getByPlaceholder('Search by title').fill(title)
    await expect(page.getByRole('link', { name: title })).toBeVisible({ timeout: 10_000 })

    // Price round-trips through minor units without losing the paise.
    await page.getByRole('link', { name: title }).click()
    await expect(page.locator('#price')).toHaveValue('1234.50')

    await page.fill('#stock', '3')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await page.waitForURL(/\/admin\/products$/, { timeout: 20_000 })

    await page.getByPlaceholder('Search by title').fill(title)
    await expect(page.getByRole('link', { name: title })).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: `Actions for ${title}` }).click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(page.getByRole('link', { name: title })).toBeHidden({ timeout: 15_000 })
  })

  test('a draft product is hidden from the storefront', async ({ page }) => {
    const title = `E2E Draft ${Date.now()}`

    await page.goto('/admin/products/new')
    await page.fill('#title', title)
    await page.fill('#price', '500')
    await page.getByRole('button', { name: 'Create product' }).click()
    await page.waitForURL(/\/admin\/products$/, { timeout: 20_000 })

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const response = await page.goto(`/products/${slug}`)
    expect(response?.status()).toBe(404)
  })

  test('categories can be created and deleted', async ({ page }) => {
    const name = `E2E Category ${Date.now()}`

    await page.goto('/admin/categories')
    await page.fill('#new-category-name', name)
    await page.getByRole('button', { name: 'Add category' }).click()

    const entry = page.getByRole('button', { name: `Delete ${name}` })
    await expect(entry).toBeVisible({ timeout: 15_000 })

    await entry.click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(entry).toBeHidden({ timeout: 15_000 })
  })

  test('signing out ends the session', async ({ page }) => {
    await page.goto('/admin')
    await page.getByRole('button', { name: 'Sign out' }).first().click()

    await expect(page).toHaveURL(/\/admin\/login/)

    await page.goto('/admin/products')
    await expect(page).toHaveURL(/\/admin\/login/)
  })
})
