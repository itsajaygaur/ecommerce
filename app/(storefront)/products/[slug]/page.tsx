import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckIcon } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { AddToCart } from '@/components/storefront/add-to-cart'
import { ProductCard, ProductCardSkeleton } from '@/components/storefront/product-card'
import { ProductGallery } from '@/components/storefront/product-gallery'
import { siteUrl } from '@/lib/env'
import { discountPercent, formatMoney } from '@/lib/money'
import { getProductBySlug, getRelatedProducts, listActiveSlugs } from '@/lib/queries/products'
import { imageUrl } from '@/lib/storage'

/**
 * Product detail.
 *
 * Replaces a page that took `params.slug` (typed `any`), treated it as a numeric id,
 * rendered one un-sized image, and shipped no metadata. Pages are now
 * slug-addressed, pre-rendered at build time and revalidated hourly.
 */

// Statically rendered and refreshed hourly; admin mutations also call
// `revalidatePath` for an immediate update.
export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  const slugs = await listActiveSlugs().catch(() => [])
  return slugs.slice(0, 100).map(({ slug }) => ({ slug }))
}

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) return { title: 'Product not found' }

  const description = product.description.slice(0, 160) || `${product.title} at PATINA.`
  const image = imageUrl(product.imagePath)

  return {
    title: product.title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: 'website',
      title: product.title,
      description,
      url: `${siteUrl}/products/${product.slug}`,
      images: [{ url: image, width: 900, height: 1200, alt: product.title }],
    },
    twitter: { card: 'summary_large_image', title: product.title, description, images: [image] },
  }
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  // A missing product now renders the 404 page rather than a bare paragraph.
  if (!product || product.status !== 'active') notFound()

  const discount = discountPercent(product.priceCents, product.compareAtPriceCents)
  const soldOut = product.stock <= 0

  // Search engines read this to render price and availability in results.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.images.map((image) => imageUrl(image.path)),
    sku: `MK-${product.id}`,
    ...(product.categoryName ? { category: product.categoryName } : {}),
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/products/${product.slug}`,
      priceCurrency: product.currency,
      price: (product.priceCents / 100).toFixed(2),
      availability: soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  }

  return (
    <div className="container-page py-10">
      <script
        type="application/ld+json"
        // Serialised server-side from our own database, never from user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb className="mb-10">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/products">Products</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {product.categoryName && product.categorySlug && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/products?category=${product.categorySlug}`}>
                    {product.categoryName}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{product.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
        <ProductGallery images={product.images} title={product.title} />

        <div className="lg:sticky lg:top-24 lg:self-start lg:py-2">
          {product.categoryName && <p className="eyebrow mb-3">{product.categoryName}</p>}

          <h1 className="text-display-3">{product.title}</h1>

          {/* Price is the signal's headline job on this page. */}
          <div className="mt-6 flex flex-wrap items-baseline gap-3 border-b pb-6">
            <span data-testid="product-price" className="price text-display-4">
              {formatMoney(product.priceCents, product.currency)}
            </span>
            {product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents && (
              <span className="text-muted-foreground tabular-nums line-through">
                {formatMoney(product.compareAtPriceCents, product.currency)}
              </span>
            )}
            {discount !== null && <span className="eyebrow text-signal">Save {discount}%</span>}
          </div>

          <div className="mt-5">
            {soldOut ? (
              <Badge variant="secondary">Sold out</Badge>
            ) : product.stock <= 5 ? (
              <Badge variant="outline">Only {product.stock} left in stock</Badge>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckIcon className="size-4 text-success" aria-hidden />
                In stock, ready to ship
              </span>
            )}
          </div>

          <p className="mt-6 text-[0.9375rem] leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          <div className="mt-8">
            <AddToCart product={product} />
          </div>

          {/*
           * A ruled spec table rather than an icon list — same information, and
           * it reuses the rule system instead of importing three more glyphs.
           */}
          <dl className="mt-10 border-t text-sm">
            {[
              ['Shipping', 'Free over ₹2,000'],
              ['Returns', '30 days, unworn with tags'],
              ['Dispatch', 'Within two working days'],
            ].map(([term, detail]) => (
              <div key={term} className="flex items-baseline justify-between gap-6 border-b py-3">
                <dt className="eyebrow">{term}</dt>
                <dd className="text-right">{detail}</dd>
              </div>
            ))}
          </dl>

          <Accordion type="single" collapsible defaultValue="details" className="mt-10">
            <AccordionItem value="details">
              <AccordionTrigger>Product details</AccordionTrigger>
              <AccordionContent className="leading-relaxed text-muted-foreground">
                {product.description}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="shipping">
              <AccordionTrigger>Shipping &amp; returns</AccordionTrigger>
              <AccordionContent className="space-y-2 leading-relaxed text-muted-foreground">
                <p>
                  Orders placed before 2pm are dispatched the next working day. Delivery typically
                  takes two to five days depending on your location.
                </p>
                <p>
                  Returns are accepted within 30 days provided the item is unworn and still has its
                  tags attached.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="care">
              <AccordionTrigger>Care</AccordionTrigger>
              <AccordionContent className="leading-relaxed text-muted-foreground">
                Wash cool and dry flat where applicable. Leather goods should be conditioned once or
                twice a year; waxed cotton can be re-waxed at home.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <section className="pt-section" aria-labelledby="related-heading">
        <p className="eyebrow mb-4">Related</p>
        <div className="mb-8 flex items-end gap-6">
          <h2 id="related-heading" className="shrink-0 text-display-3">
            You might also like
          </h2>
          <div className="mb-2 hidden h-px flex-1 border-t border-border sm:block" />
        </div>
        <Suspense fallback={<RelatedSkeleton />}>
          <Related productId={product.id} categoryId={product.categoryId} />
        </Suspense>
      </section>
    </div>
  )
}

async function Related({
  productId,
  categoryId,
}: {
  productId: number
  categoryId: number | null
}) {
  const related = await getRelatedProducts(productId, categoryId, 4)
  if (related.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
      {related.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

function RelatedSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  )
}
