import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductCard, ProductCardSkeleton } from '@/components/storefront/product-card'
import { getFeaturedProducts, listCategories } from '@/lib/queries/products'
import { imageUrl } from '@/lib/storage'

/**
 * Home.
 *
 * Rebuilt around the Ink & Signal language rather than restyled. The pieces that
 * were carrying a generic "modern template" feel are gone rather than recoloured:
 * the rounded tinted hero panel, the photo tiles with black gradient scrims and
 * text floated on top, the icon-and-caption trust row, the rounded CTA card.
 *
 * What replaces them is one idea applied consistently — a page assembled from
 * hairline-ruled cells, with the type doing the work and colour reserved for
 * price and the primary action.
 */

// The catalog changes rarely, so the page is statically rendered and refreshed in
// the background. Admin mutations call `revalidatePath('/')` for immediate updates.
export const revalidate = 3600

const PROMISES = [
  { title: 'Free shipping', body: 'On orders over ₹2,000, dispatched in two working days.' },
  { title: '30-day returns', body: 'Unworn, with tags. No questions asked.' },
  { title: 'Secure checkout', body: 'Card details never touch our servers.' },
  { title: 'Plastic-free packing', body: 'Recycled board and paper tape only.' },
]

export default function HomePage() {
  return (
    <>
      <Hero />

      <SectionHeading
        id="categories-heading"
        kicker="Index"
        title="Shop by category"
        href="/products"
        linkLabel="View everything"
      />
      <section className="container-page pb-section" aria-labelledby="categories-heading">
        <Suspense fallback={<CategoryGridSkeleton />}>
          <CategoryGrid />
        </Suspense>
      </section>

      {/*
       * The promise band. Four ruled cells sharing hairlines, numbered rather
       * than iconed — a row of lucide glyphs was the most generic element on
       * the page and carried no information the numeral doesn't.
       */}
      <section className="border-y" aria-label="What to expect">
        <div className="container-page grid sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map(({ title, body }, index) => (
            <div
              key={title}
              className="border-border py-8 pr-8 not-last:border-b sm:not-last:border-b-0 lg:pl-8 lg:not-first:border-l lg:first:pl-0"
            >
              <p className="eyebrow mb-3 text-signal">{String(index + 1).padStart(2, '0')}</p>
              <p className="text-sm font-medium">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <SectionHeading
        id="featured-heading"
        kicker="Selected"
        title="Worth a closer look"
        href="/products?sort=newest"
        linkLabel="See what's new"
      />
      <section className="container-page pb-section" aria-labelledby="featured-heading">
        <Suspense fallback={<FeaturedSkeleton />}>
          <FeaturedRail />
        </Suspense>
      </section>

      <Manifesto />
    </>
  )
}

function Hero() {
  return (
    <section className="border-b">
      <div className="container-page grid items-stretch lg:grid-cols-[1fr_minmax(0,44%)]">
        <div className="flex animate-fade-up flex-col justify-center py-16 lg:py-28 lg:pr-16">
          <p className="eyebrow mb-6 text-signal">New season — 01</p>
          <h1 className="display-hero">
            Objects that
            <br />
            outlast the
            <br />
            season
          </h1>
          <p className="mt-8 max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground">
            A short catalogue of considered goods — apparel, bags, footwear and home. Chosen for how
            they wear in, not for how they photograph.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-8">
            <Button asChild size="lg" variant="signal">
              <Link href="/products">Shop all</Link>
            </Button>
            <Link
              href="/products?sort=newest"
              className="group inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-signal"
            >
              New arrivals
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/*
         * The media breaks the page gutter and runs to the viewport edge — the
         * single move that most separates this from a boxed-hero template.
         */}
        <div className="relative -mr-5 min-h-[22rem] bg-muted sm:-mr-8 lg:-mr-12 lg:min-h-[38rem]">
          <Image
            src="/products/weekender.svg"
            alt=""
            aria-hidden
            fill
            // The LCP element on the home page, so it is fetched eagerly.
            priority
            sizes="(min-width: 1024px) 44vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  )
}

/**
 * The recurring section masthead: kicker, title, a rule that runs to the link.
 * The rule is what ties the page together — it appears at every section break.
 */
function SectionHeading({
  id,
  kicker,
  title,
  href,
  linkLabel,
}: {
  id: string
  kicker: string
  title: string
  href: string
  linkLabel: string
}) {
  return (
    <div className="container-page pt-section pb-8">
      <p className="eyebrow mb-4">{kicker}</p>
      <div className="flex items-end gap-6">
        <h2 id={id} className="shrink-0 text-display-2">
          {title}
        </h2>
        <div className="mb-2 hidden h-px flex-1 border-t border-border sm:block" />
        <Link
          href={href}
          className="group mb-1 hidden shrink-0 items-center gap-2 text-sm font-medium transition-colors hover:text-signal sm:inline-flex"
        >
          {linkLabel}
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  )
}

async function CategoryGrid() {
  const categories = (await listCategories()).filter((category) => category.productCount > 0)

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No categories yet. Add products in the admin to populate the storefront.
      </p>
    )
  }

  return (
    <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category, index) => (
        <Link
          key={category.id}
          href={`/products?category=${category.slug}`}
          className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <div className="relative aspect-4/5 overflow-hidden bg-muted">
            <Image
              src={imageUrl(category.imagePath)}
              alt=""
              aria-hidden
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              priority={index < 3}
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          </div>
          {/*
           * The caption is lifted out of the image. Text over a black gradient
           * scrim is the default everyone reaches for; a ruled caption below
           * the frame reads as a catalogue index instead.
           */}
          <div className="mt-4 flex items-baseline gap-3 border-t pt-4">
            <span className="eyebrow text-signal">{String(index + 1).padStart(2, '0')}</span>
            <h3 className="text-display-4 transition-colors group-hover:text-signal">
              {category.name}
            </h3>
            <span className="eyebrow ml-auto">
              {category.productCount} {category.productCount === 1 ? 'item' : 'items'}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}

async function FeaturedRail() {
  const products = await getFeaturedProducts(4)

  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nothing in stock right now — check back soon.</p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

/**
 * The closing statement. A full-bleed ink band — `.on-ink` re-derives the token
 * set inside it, so the signal lifts to a value that actually passes contrast on
 * near-black instead of the 2.95:1 the light-mode cobalt would give.
 */
function Manifesto() {
  return (
    <section className="on-ink">
      <div className="container-page py-20 lg:py-28">
        <p className="eyebrow mb-6 text-signal">Our one rule</p>
        <h2 className="max-w-3xl text-display-2">Built to be repaired, not replaced</h2>
        <p className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-muted-foreground">
          Every item here is chosen because it can be resoled, rewaxed, darned or re-oiled. Buy
          once, then look after it.
        </p>
        <Button asChild size="lg" className="mt-10">
          <Link href="/products">Browse the catalogue</Link>
        </Button>
      </div>
    </section>
  )
}

function CategoryGridSkeleton() {
  return (
    <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index}>
          <div className="aspect-4/5 animate-pulse bg-muted" />
          <div className="mt-4 border-t pt-4">
            <div className="h-5 w-32 animate-pulse bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

function FeaturedSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  )
}
