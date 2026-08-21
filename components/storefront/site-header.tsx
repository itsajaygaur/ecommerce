import Link from 'next/link'
import { MenuIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/theme-toggle'
import { CartDrawer } from '@/components/storefront/cart-drawer'
import { SearchField } from '@/components/storefront/search-field'
import { listCategories } from '@/lib/queries/products'
import { isStripeTestMode } from '@/lib/stripe'

/**
 * Site chrome.
 *
 * The backdrop-blur bar this replaces was elevation in disguise — a translucent
 * pane floating over the page. Here the header is opaque paper divided from the
 * content by one hairline, and the navigation is a row of mono micro-labels
 * rather than a strip of hoverable pills.
 */
export async function SiteHeader() {
  const categories = await listCategories()
  const navCategories = categories.filter((category) => category.productCount > 0).slice(0, 5)

  return (
    <>
      <div className="on-ink">
        <p className="container-page eyebrow py-2.5 text-center">
          Complimentary shipping over ₹2,000 · 30-day returns
        </p>
      </div>

      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container-page flex h-16 items-center gap-4">
          {/* Mobile navigation */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="-ml-2 lg:hidden"
                aria-label="Open menu"
              >
                <MenuIcon className="size-[1.15rem]" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader className="border-b">
                <SheetTitle className="font-display text-display-4">PATINA</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col">
                <Link
                  href="/products"
                  className="border-b px-6 py-4 text-sm font-medium transition-colors hover:text-signal"
                >
                  All products
                </Link>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/products?category=${category.slug}`}
                    className="flex items-center justify-between border-b px-6 py-4 text-sm transition-colors hover:text-signal"
                  >
                    {category.name}
                    <span className="eyebrow">{category.productCount}</span>
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          {/*
           * The wordmark. Widened hard and tracked open — at this size the
           * letterforms are the logo, so there is no mark to draw.
           */}
          <Link
            href="/"
            className="shrink-0 font-display text-[1.375rem] leading-none font-semibold tracking-[0.14em]"
            style={{ fontStretch: '122%' }}
          >
            PATINA
          </Link>

          <nav aria-label="Categories" className="ml-8 hidden items-center gap-7 lg:flex">
            <Link href="/products" className="eyebrow transition-colors hover:text-foreground">
              All
            </Link>
            {navCategories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="eyebrow transition-colors hover:text-foreground"
              >
                {category.name}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <SearchField className="hidden w-52 md:block xl:w-64" />
            <ThemeToggle />
            <CartDrawer testMode={isStripeTestMode()} />
          </div>
        </div>

        <div className="container-page pb-3 md:hidden">
          <SearchField />
        </div>
      </header>
    </>
  )
}
