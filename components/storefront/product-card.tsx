import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { discountPercent, formatMoney } from '@/lib/money'
import { imageUrl } from '@/lib/storage'
import type { ProductListItem } from '@/lib/catalog'
import { QuickAddButton } from './quick-add-button'

/**
 * Catalog tile.
 *
 * Square media on a neutral well, then a hairline, then the text block: mono
 * category, title, cobalt price. The discount is a bare `−22%` in the signal
 * rather than a filled pill — in a four-up grid the pills were the loudest
 * thing on the page and the price was not.
 *
 * Two contracts the e2e suite depends on, both worth keeping on their own merits:
 * the root stays an `<article>`, and `categoryName` stays inside it.
 */
export function ProductCard({
  product,
  priority = false,
  className,
  sizes = '(min-width: 1280px) 20rem, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw',
}: {
  product: ProductListItem
  priority?: boolean
  className?: string
  sizes?: string
}) {
  const discount = discountPercent(product.priceCents, product.compareAtPriceCents)
  const soldOut = product.stock <= 0

  return (
    <article className={cn('group relative flex flex-col', className)}>
      <div className="relative aspect-(--aspect-product) overflow-hidden bg-muted">
        <Image
          src={imageUrl(product.imagePath)}
          alt={product.title}
          fill
          sizes={sizes}
          priority={priority}
          className={cn(
            'object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]',
            soldOut && 'opacity-45 saturate-0',
          )}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          {discount !== null && !soldOut ? (
            <span className="eyebrow bg-background px-1.5 py-1 text-signal">−{discount}%</span>
          ) : (
            <span />
          )}
          {soldOut ? (
            <span className="eyebrow-strong bg-background px-1.5 py-1">Sold out</span>
          ) : product.stock <= 5 ? (
            // Compact on purpose: "Only N left in stock" wrapped out of the
            // frame at 390px. The full sentence lives on the product page.
            <span className="eyebrow-strong bg-background px-1.5 py-1">{product.stock} left</span>
          ) : null}
        </div>

        {/*
         * Quick add rises as a full-width ink bar flush to the base of the
         * frame — no inset, no radius, so it reads as part of the image edge.
         * Above the image, below the title link's click target.
         */}
        {!soldOut && (
          <div className="absolute inset-x-0 bottom-0 z-10 translate-y-full opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 focus-within:translate-y-0 focus-within:opacity-100 max-sm:translate-y-0 max-sm:opacity-100">
            <QuickAddButton product={product} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col border-t pt-3">
        {product.categoryName && <p className="eyebrow mb-2">{product.categoryName}</p>}

        <h3 className="font-sans text-sm leading-snug font-medium transition-colors group-hover:text-signal">
          {/* Stretched link: the whole card is clickable, but only the title is in
              the accessibility tree as the link. */}
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0">
            {product.title}
          </Link>
        </h3>

        <div className="mt-auto flex items-baseline gap-2 pt-3">
          <span data-testid="product-price" className="price text-sm">
            {formatMoney(product.priceCents, product.currency)}
          </span>
          {product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents && (
            <span className="text-xs text-muted-foreground tabular-nums line-through">
              {formatMoney(product.compareAtPriceCents, product.currency)}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="aspect-(--aspect-product) animate-pulse bg-muted" />
      <div className="flex flex-col gap-3 border-t pt-3">
        <div className="h-2.5 w-1/3 animate-pulse bg-muted" />
        <div className="h-4 w-4/5 animate-pulse bg-muted" />
        <div className="h-4 w-1/4 animate-pulse bg-muted" />
      </div>
    </div>
  )
}
