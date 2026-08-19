import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { discountPercent, formatMoney } from '@/lib/money'
import { imageUrl } from '@/lib/storage'
import { Badge } from '@/components/ui/badge'
import type { ProductListItem } from '@/lib/catalog'
import { QuickAddButton } from './quick-add-button'

/**
 * Catalog tile.
 *
 * Changes from the previous card: the title is no longer wrapped in a tooltip
 * (unusable on touch, and it hid the very text it was explaining), the whole card
 * is one link target instead of a bare image, `sizes` is set so phones do not
 * download a 375×563 image at desktop resolution, and price/stock state is legible
 * without hovering.
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
      <div className="bg-muted relative aspect-(--aspect-product) overflow-hidden rounded-lg">
        <Image
          src={imageUrl(product.imagePath)}
          alt={product.title}
          fill
          sizes={sizes}
          priority={priority}
          className={cn(
            'object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]',
            soldOut && 'opacity-60 saturate-50',
          )}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          {discount !== null && !soldOut ? (
            <Badge variant="accent" className="shadow-sm">
              {discount}% off
            </Badge>
          ) : (
            <span />
          )}
          {soldOut ? (
            <Badge variant="secondary" className="shadow-sm">
              Sold out
            </Badge>
          ) : product.stock <= 5 ? (
            <Badge variant="warning" className="shadow-sm">
              Only {product.stock} left
            </Badge>
          ) : null}
        </div>

        {/* Quick add sits above the image but below the title link's click target. */}
        {!soldOut && (
          <div className="absolute inset-x-3 bottom-3 z-10 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 focus-within:translate-y-0 focus-within:opacity-100 max-sm:translate-y-0 max-sm:opacity-100">
            <QuickAddButton product={product} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 pt-3">
        {product.categoryName && (
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            {product.categoryName}
          </p>
        )}

        <h3 className="font-sans text-sm leading-snug font-medium">
          {/* Stretched link: the whole card is clickable, but only the title is in
              the accessibility tree as the link. */}
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0">
            {product.title}
          </Link>
        </h3>

        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="text-sm font-semibold">
            {formatMoney(product.priceCents, product.currency)}
          </span>
          {product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents && (
            <span className="text-muted-foreground text-xs line-through">
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
    <div className="flex flex-col gap-3">
      <div className="bg-muted aspect-(--aspect-product) animate-pulse rounded-lg" />
      <div className="bg-muted h-3 w-1/3 animate-pulse rounded" />
      <div className="bg-muted h-4 w-4/5 animate-pulse rounded" />
      <div className="bg-muted h-4 w-1/4 animate-pulse rounded" />
    </div>
  )
}
