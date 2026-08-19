import Link from 'next/link'
import { MenuIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/theme-toggle'
import { CartDrawer } from '@/components/storefront/cart-drawer'
import { SearchField } from '@/components/storefront/search-field'
import { listCategories } from '@/lib/queries/products'

/**
 * Site chrome.
 *
 * The previous header was a single flex row with a bare bag icon, a search box and a
 * theme dropdown — no navigation at all, and no way to reach a category. This adds
 * the announcement bar, category navigation, a mobile menu and a real wordmark.
 */
export async function SiteHeader() {
  const categories = await listCategories()
  const navCategories = categories.filter((category) => category.productCount > 0).slice(0, 5)

  return (
    <>
      <div className="bg-primary text-primary-foreground">
        <p className="container-page py-2 text-center text-xs tracking-wide">
          Complimentary shipping on orders over ₹2,000 · 30-day returns
        </p>
      </div>

      <header className="bg-background/85 supports-[backdrop-filter]:bg-background/65 sticky top-0 z-40 border-b backdrop-blur">
        <div className="container-page flex h-16 items-center gap-3">
          {/* Mobile navigation */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <MenuIcon className="size-[1.15rem]" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-display text-xl">MyKart</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-6">
                <Link
                  href="/products"
                  className="hover:bg-secondary rounded-md px-3 py-2 text-sm font-medium"
                >
                  All products
                </Link>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/products?category=${category.slug}`}
                    className="hover:bg-secondary flex items-center justify-between rounded-md px-3 py-2 text-sm"
                  >
                    {category.name}
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {category.productCount}
                    </span>
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <Link
            href="/"
            className="font-display shrink-0 text-xl leading-none font-semibold tracking-tight"
          >
            MyKart
          </Link>

          <nav aria-label="Categories" className="ml-6 hidden items-center gap-1 lg:flex">
            <Link
              href="/products"
              className="hover:bg-secondary rounded-md px-3 py-2 text-sm font-medium transition-colors"
            >
              All
            </Link>
            {navCategories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="hover:bg-secondary rounded-md px-3 py-2 text-sm transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <SearchField className="hidden w-56 md:block xl:w-72" />
            <ThemeToggle />
            <CartDrawer />
          </div>
        </div>

        <div className="container-page pb-3 md:hidden">
          <SearchField />
        </div>
      </header>
    </>
  )
}
