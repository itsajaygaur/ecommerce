import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckIcon, PackageIcon, RotateCcwIcon, TruckIcon } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
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

  const description = product.description.slice(0, 160) || `${product.title} at MyKart.`
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
    <div className="container-page py-8">
      <script
        type="application/ld+json"
        // Serialised server-side from our own database, never from user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb className="mb-8">
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

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery images={product.images} title={product.title} />

        <div className="lg:py-4">
          {product.categoryName && <p className="eyebrow mb-3">{product.categoryName}</p>}

          <h1 className="text-3xl leading-tight sm:text-4xl">{product.title}</h1>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-2xl font-semibold">
              {formatMoney(product.priceCents, product.currency)}
            </span>
            {product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents && (
              <span className="text-muted-foreground text-lg line-through">
                {formatMoney(product.compareAtPriceCents, product.currency)}
              </span>
            )}
            {discount !== null && <Badge variant="subtle">Save {discount}%</Badge>}
          </div>

          <div className="mt-4">
            {soldOut ? (
              <Badge variant="secondary">Sold out</Badge>
            ) : product.stock <= 5 ? (
              <Badge variant="warning">Only {product.stock} left in stock</Badge>
            ) : (
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
                <CheckIcon className="text-success size-4" aria-hidden />
                In stock, ready to ship
              </span>
            )}
          </div>

          <p className="text-muted-foreground mt-6 leading-relaxed">{product.description}</p>

          <div className="mt-8">
            <AddToCart product={product} />
          </div>

          <ul className="text-muted-foreground mt-8 grid gap-3 text-sm">
            <li className="flex items-center gap-2.5">
              <TruckIcon className="size-4 shrink-0" aria-hidden />
              Free shipping on orders over ₹2,000
            </li>
            <li className="flex items-center gap-2.5">
              <RotateCcwIcon className="size-4 shrink-0" aria-hidden />
              30-day returns, unworn with tags
            </li>
            <li className="flex items-center gap-2.5">
              <PackageIcon className="size-4 shrink-0" aria-hidden />
              Dispatched within two working days
            </li>
          </ul>

          <Separator className="my-8" />

          <Accordion type="single" collapsible defaultValue="details">
            <AccordionItem value="details">
              <AccordionTrigger>Product details</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {product.description}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="shipping">
              <AccordionTrigger>Shipping &amp; returns</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2 leading-relaxed">
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
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Wash cool and dry flat where applicable. Leather goods should be conditioned once or
                twice a year; waxed cotton can be re-waxed at home.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <section className="mt-24" aria-labelledby="related-heading">
        <h2 id="related-heading" className="mb-8 text-2xl sm:text-3xl">
          You might also like
        </h2>
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
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
      {related.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

function RelatedSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  )
}
