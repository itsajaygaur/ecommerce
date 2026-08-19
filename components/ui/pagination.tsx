import * as React from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

/**
 * Paginator with ellipsis.
 *
 * The previous implementation rendered one link per page with no truncation, so a
 * catalog of 400 products produced 40 numbered links in a single row.
 */

export type PaginationToken = number | 'ellipsis'

/**
 * Produces at most `siblings * 2 + 5` tokens: first, last, the current page and its
 * neighbours, with ellipses standing in for the gaps.
 */
export function paginationRange(
  current: number,
  pageCount: number,
  siblings = 1,
): PaginationToken[] {
  const totalSlots = siblings * 2 + 5
  if (pageCount <= totalSlots) {
    return Array.from({ length: pageCount }, (_, i) => i + 1)
  }

  const left = Math.max(current - siblings, 1)
  const right = Math.min(current + siblings, pageCount)
  const showLeftEllipsis = left > 2
  const showRightEllipsis = right < pageCount - 1

  const tokens: PaginationToken[] = [1]
  if (showLeftEllipsis) tokens.push('ellipsis')

  for (let page = Math.max(left, 2); page <= Math.min(right, pageCount - 1); page += 1) {
    tokens.push(page)
  }

  if (showRightEllipsis) tokens.push('ellipsis')
  tokens.push(pageCount)

  return tokens
}

export function Pagination({
  page,
  pageCount,
  buildHref,
  className,
}: {
  page: number
  pageCount: number
  /** Maps a page number to a URL, so callers keep their other search params. */
  buildHref: (page: number) => string
  className?: string
}) {
  if (pageCount <= 1) return null

  const tokens = paginationRange(page, pageCount)
  const linkClass = (active: boolean) =>
    cn(
      buttonVariants({ variant: active ? 'default' : 'ghost', size: 'icon-sm' }),
      'min-w-8',
      active && 'pointer-events-none',
    )

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-1', className)}
    >
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          rel="prev"
          aria-label="Previous page"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
        >
          <ChevronLeftIcon />
        </Link>
      ) : (
        <span
          aria-hidden
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'opacity-40')}
        >
          <ChevronLeftIcon />
        </span>
      )}

      {tokens.map((token, index) =>
        token === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            aria-hidden
            className="text-muted-foreground flex size-8 items-center justify-center"
          >
            <MoreHorizontalIcon className="size-4" />
          </span>
        ) : (
          <Link
            key={token}
            href={buildHref(token)}
            aria-label={`Page ${token}`}
            aria-current={token === page ? 'page' : undefined}
            className={linkClass(token === page)}
          >
            {token}
          </Link>
        ),
      )}

      {page < pageCount ? (
        <Link
          href={buildHref(page + 1)}
          rel="next"
          aria-label="Next page"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
        >
          <ChevronRightIcon />
        </Link>
      ) : (
        <span
          aria-hidden
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'opacity-40')}
        >
          <ChevronRightIcon />
        </span>
      )}
    </nav>
  )
}
