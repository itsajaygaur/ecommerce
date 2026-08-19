import Link from 'next/link'
import { listCategories } from '@/lib/queries/products'

export async function SiteFooter() {
  const categories = await listCategories()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <p
            className="font-display text-[1.375rem] leading-none font-semibold tracking-[0.14em]"
            style={{ fontStretch: '122%' }}
          >
            PATINA
          </p>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            A deliberately short catalogue. Everything here is chosen for how it wears in rather
            than how it photographs.
          </p>
        </div>

        <nav aria-labelledby="footer-shop">
          <h2 id="footer-shop" className="eyebrow mb-4">
            Shop
          </h2>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link
                href="/products"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                All products
              </Link>
            </li>
            {categories.slice(0, 5).map((category) => (
              <li key={category.id}>
                <Link
                  href={`/products?category=${category.slug}`}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-help">
          <h2 id="footer-help" className="eyebrow mb-4">
            Help
          </h2>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li>Shipping &amp; returns</li>
            <li>Size guide</li>
            <li>Care instructions</li>
            <li>Contact</li>
          </ul>
        </nav>

        <div>
          <h2 className="eyebrow mb-4">Details</h2>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li>Free shipping over ₹2,000</li>
            <li>30-day returns</li>
            <li>Secure payments by Stripe</li>
          </ul>
        </div>
      </div>

      <div className="border-t">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} PATINA. All rights reserved.</p>
          <p>Prices include applicable taxes.</p>
        </div>
      </div>
    </footer>
  )
}
