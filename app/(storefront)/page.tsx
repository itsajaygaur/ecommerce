import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRightIcon,
  PackageIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  TruckIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductCard, ProductCardSkeleton } from '@/components/storefront/product-card'
import { getFeaturedProducts, listCategories } from '@/lib/queries/products'
import { imageUrl } from '@/lib/storage'

/**
 * Home.
 *
 * Previously this page was a bare four-column grid of every product in the database,
 * fetched with no pagination. It is now an actual landing page: a hero, category
 * entry points, a curated rail and the trust signals a shopper looks for before
 * entering a card number.
 */

// The catalog changes rarely, so the page is statically rendered and refreshed in
// the background. Admin mutations call `revalidatePath('/')` for immediate updates.
export const revalidate = 3600

const VALUE_PROPS = [
  {
    icon: TruckIcon,
    title: 'Free shipping over ₹2,000',
    body: 'Dispatched within two working days.',
  },
  { icon: RotateCcwIcon, title: '30-day returns', body: 'Unworn, with tags, no questions asked.' },
  {
    icon: ShieldCheckIcon,
    title: 'Secure checkout',
    body: 'Card details never touch our servers.',
  },
  { icon: PackageIcon, title: 'Plastic-free packing', body: 'Recycled board and paper tape only.' },
]

export default function HomePage() {
  return (
    <>
      <Hero />

      <section className="container-page py-16 sm:py-20" aria-labelledby="categories-heading">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Browse</p>
            <h2 id="categories-heading" className="text-3xl sm:text-4xl">
              Shop by category
            </h2>
          </div>
          <Button asChild variant="ghost" className="hidden shrink-0 sm:inline-flex">
            <Link href="/products">
              View everything <ArrowRightIcon />
            </Link>
          </Button>
        </div>

        <Suspense fallback={<CategoryGridSkeleton />}>
          <CategoryGrid />
        </Suspense>
      </section>

      <section className="border-y">
        <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-3">
              <Icon className="text-accent mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-muted-foreground mt-0.5 text-sm">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-16 sm:py-20" aria-labelledby="featured-heading">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Selected</p>
            <h2 id="featured-heading" className="text-3xl sm:text-4xl">
              Worth a closer look
            </h2>
          </div>
          <Button asChild variant="ghost" className="hidden shrink-0 sm:inline-flex">
            <Link href="/products?sort=newest">
              See what&apos;s new <ArrowRightIcon />
            </Link>
          </Button>
        </div>

        <Suspense fallback={<FeaturedSkeleton />}>
          <FeaturedRail />
        </Suspense>
      </section>

      <section className="container-page pb-20">
        <div className="bg-primary text-primary-foreground rounded-2xl px-8 py-14 text-center sm:px-16">
          <h2 className="font-display mx-auto max-w-2xl text-3xl sm:text-4xl">
            Built to be repaired, not replaced
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed opacity-80">
            Every item is chosen because it can be resoled, rewaxed, darned or re-oiled. Buy once,
            then look after it.
          </p>
          <Button asChild variant="accent" size="lg" className="mt-8">
            <Link href="/products">Browse the catalog</Link>
          </Button>
        </div>
      </section>
    </>
  )
}

function Hero() {
  return (
    <section className="container-page pt-12 pb-4 sm:pt-16">
      <div className="bg-secondary relative overflow-hidden rounded-2xl">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="animate-fade-up px-8 py-14 sm:px-12 lg:py-20">
            <p className="eyebrow mb-4">New season</p>
            <h1 className="text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
              Considered goods,
              <br />
              built to last
            </h1>
            <p className="text-muted-foreground mt-6 max-w-md text-base leading-relaxed">
              A short catalog of apparel, bags, footwear and home goods — the kind of things that
              look better in year five than they did on day one.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/products">Shop all</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/products?sort=newest">New arrivals</Link>
              </Button>
            </div>
          </div>

          <div className="relative hidden aspect-4/3 lg:block">
            <Image
              src="/products/weekender.svg"
              alt=""
              aria-hidden
              fill
              // The LCP element on the home page, so it is fetched eagerly.
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

async function CategoryGrid() {
  const categories = (await listCategories()).filter((category) => category.productCount > 0)

  if (categories.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No categories yet. Add products in the admin to populate the storefront.
      </p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category, index) => (
        <Link
          key={category.id}
          href={`/products?category=${category.slug}`}
          className="group focus-visible:ring-ring relative flex aspect-16/10 items-end overflow-hidden rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <Image
            src={imageUrl(category.imagePath)}
            alt=""
            aria-hidden
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            priority={index < 3}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
          <div className="relative p-6 text-white">
            <h3 className="font-display text-2xl">{category.name}</h3>
            <p className="mt-1 text-xs opacity-85">
              {category.productCount} {category.productCount === 1 ? 'item' : 'items'}
            </p>
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
      <p className="text-muted-foreground text-sm">Nothing in stock right now — check back soon.</p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

function CategoryGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="bg-muted aspect-16/10 animate-pulse rounded-xl" />
      ))}
    </div>
  )
}

function FeaturedSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  )
}
