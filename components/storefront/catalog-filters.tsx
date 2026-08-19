'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { SlidersHorizontalIcon, XIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { formatMoney } from '@/lib/money'
import { SORT_OPTIONS, type SortKey } from '@/lib/catalog'
import { cn } from '@/lib/utils'

/**
 * Catalog filters, driven entirely by the URL.
 *
 * Keeping state in `searchParams` rather than component state means a filtered view
 * is shareable, survives a refresh, and works with the back button — and the server
 * can do the filtering, which is the point.
 */

export type CategoryOption = { id: number; name: string; slug: string; productCount: number }

type Props = {
  categories: CategoryOption[]
  priceRange: { min: number; max: number }
  currency: string
  total: number
}

function useFilterParams() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === '') params.delete(key)
        else params.set(key, value)
      }

      // Any filter change invalidates the current page number.
      params.delete('page')
      router.push(`/products?${params.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  return { searchParams, update }
}

export function CatalogToolbar({ total, sort }: { total: number; sort: SortKey }) {
  const { update } = useFilterParams()

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
      <p className="eyebrow" aria-live="polite">
        {total} {total === 1 ? 'item' : 'items'}
      </p>

      <div className="flex items-center gap-3">
        <Label htmlFor="sort" className="eyebrow hidden sm:block">
          Sort
        </Label>
        <Select
          value={sort}
          onValueChange={(value) => update({ sort: value === 'relevance' ? null : value })}
        >
          <SelectTrigger id="sort" size="sm" className="w-40 sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {Object.entries(SORT_OPTIONS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

/** Always-visible sidebar, desktop only. */
export function CatalogFilterSidebar(props: Props) {
  return (
    <aside className="hidden w-56 shrink-0 lg:block lg:border-r lg:pr-8" aria-label="Filters">
      <FilterControls {...props} />
    </aside>
  )
}

/**
 * Mobile filter trigger. Rendered inside the toolbar row rather than as a sibling
 * of the results grid — as a flex sibling it claimed a column of its own and
 * squeezed the product grid off the side of the screen.
 */
export function CatalogFilterSheet(props: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <SlidersHorizontalIcon />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="px-6 pb-6">
          <FilterControls {...props} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function FilterControls({ categories, priceRange, currency }: Props) {
  const { searchParams, update } = useFilterParams()

  const activeCategory = searchParams.get('category')
  const inStockOnly = searchParams.get('inStock') === '1'
  const activeMax = searchParams.get('maxPrice')

  // Four evenly-spaced price ceilings across the real catalog range, rounded to a
  // sensible unit so the labels are readable.
  const step = Math.max(1, Math.ceil((priceRange.max - priceRange.min) / 4 / 10000) * 10000)
  const priceBuckets = Array.from({ length: 4 }, (_, i) => priceRange.min + step * (i + 1)).filter(
    (value, index, all) => value <= priceRange.max + step && all.indexOf(value) === index,
  )

  const hasFilters = Boolean(activeCategory || inStockOnly || activeMax)

  return (
    <div className="space-y-8">
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => update({ category: null, inStock: null, maxPrice: null })}
        >
          <XIcon />
          Clear filters
        </Button>
      )}

      <fieldset>
        <legend className="eyebrow mb-4">Category</legend>
        <ul>
          <li>
            <button
              type="button"
              onClick={() => update({ category: null })}
              className={cn(
                'w-full border-l-2 border-transparent py-2 pl-3 text-left text-sm transition-colors hover:text-signal',
                !activeCategory && 'border-signal font-medium',
              )}
            >
              All products
            </button>
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => update({ category: category.slug })}
                aria-pressed={activeCategory === category.slug}
                className={cn(
                  'flex w-full items-center justify-between border-l-2 border-transparent py-2 pr-1 pl-3 text-left text-sm transition-colors hover:text-signal',
                  activeCategory === category.slug && 'border-signal font-medium',
                )}
              >
                <span>{category.name}</span>
                <span className="eyebrow">{category.productCount}</span>
              </button>
            </li>
          ))}
        </ul>
      </fieldset>

      <Separator />

      <fieldset>
        <legend className="eyebrow mb-4">Price up to</legend>
        <ul>
          {priceBuckets.map((ceiling) => (
            <li key={ceiling}>
              <button
                type="button"
                onClick={() =>
                  update({ maxPrice: activeMax === String(ceiling) ? null : String(ceiling) })
                }
                aria-pressed={activeMax === String(ceiling)}
                className={cn(
                  'w-full border-l-2 border-transparent py-2 pl-3 text-left text-sm transition-colors hover:text-signal',
                  activeMax === String(ceiling) && 'border-signal font-medium',
                )}
              >
                {formatMoney(ceiling, currency, { compact: true })}
              </button>
            </li>
          ))}
        </ul>
      </fieldset>

      <Separator />

      <div className="flex items-center gap-2">
        <Checkbox
          id="in-stock"
          checked={inStockOnly}
          onCheckedChange={(checked) => update({ inStock: checked ? '1' : null })}
        />
        <Label htmlFor="in-stock" className="text-sm font-normal">
          In stock only
        </Label>
      </div>
    </div>
  )
}

/** Removable chips summarising what is currently applied. */
export function ActiveFilterChips({
  categories,
  currency,
}: {
  categories: CategoryOption[]
  currency: string
}) {
  const { searchParams, update } = useFilterParams()

  const chips: { key: string; label: string; clear: Record<string, null> }[] = []

  const query = searchParams.get('q')
  if (query) chips.push({ key: 'q', label: `“${query}”`, clear: { q: null } })

  const category = searchParams.get('category')
  const categoryName = categories.find((c) => c.slug === category)?.name
  if (category && categoryName) {
    chips.push({ key: 'category', label: categoryName, clear: { category: null } })
  }

  const maxPrice = searchParams.get('maxPrice')
  if (maxPrice) {
    chips.push({
      key: 'maxPrice',
      label: `Under ${formatMoney(Number(maxPrice), currency, { compact: true })}`,
      clear: { maxPrice: null },
    })
  }

  if (searchParams.get('inStock') === '1') {
    chips.push({ key: 'inStock', label: 'In stock', clear: { inStock: null } })
  }

  if (chips.length === 0) return null

  return (
    <ul className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <li key={chip.key}>
          <Badge variant="outline" asChild>
            <button
              type="button"
              onClick={() => update(chip.clear)}
              className="cursor-pointer gap-1.5 transition-colors hover:border-foreground"
            >
              {chip.label}
              <XIcon className="size-3" />
              <span className="sr-only">Remove filter</span>
            </button>
          </Badge>
        </li>
      ))}
    </ul>
  )
}
