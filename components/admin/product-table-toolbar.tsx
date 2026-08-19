'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { SearchIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

/** Search, status chips and sort for the products table — all URL-driven. */

const SORT_LABELS = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  title: 'Title A–Z',
  'price-asc': 'Price low to high',
  'price-desc': 'Price high to low',
  stock: 'Lowest stock',
} as const

const STATUSES = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'draft', label: 'Draft' },
  { key: 'archived', label: 'Archived' },
] as const

export function ProductTableToolbar({
  counts,
  categories,
}: {
  counts: { all: number; active: number; draft: number; archived: number }
  categories: { id: number; name: string }[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentStatus = searchParams.get('status') ?? ''
  const currentSort = searchParams.get('sort') ?? 'newest'
  const initialQuery = searchParams.get('q') ?? ''

  const [query, setQuery] = useState(initialQuery)
  const [appliedQuery, setAppliedQuery] = useState(initialQuery)
  const navigatingAway = useRef(false)

  // Adopt the query from the URL during render rather than in an effect. This page
  // is dynamically rendered, so the server already saw the same searchParams and
  // there is no hydration mismatch to avoid.
  if (initialQuery !== appliedQuery) {
    setAppliedQuery(initialQuery)
    setQuery(initialQuery)
  }

  function apply(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (!value) params.delete(key)
      else params.set(key, value)
    }
    params.delete('page')
    router.push(`/admin/products?${params.toString()}`)
  }

  // A queued search navigation must not hijack a click the user has already made.
  // The debounce fires ~300ms after the last keystroke; if someone types and then
  // clicks a result inside that window, the navigation lands *after* the click and
  // supersedes it, bouncing them back to the list. Treat a click on any link as
  // intent to leave, and drop the pending search.
  useEffect(() => {
    const onLinkClick = (event: MouseEvent) => {
      if ((event.target as HTMLElement | null)?.closest('a')) navigatingAway.current = true
    }
    document.addEventListener('click', onLinkClick, true)
    return () => document.removeEventListener('click', onLinkClick, true)
  }, [])

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    if (query === appliedQuery) return
    navigatingAway.current = false
    const timer = setTimeout(() => {
      if (navigatingAway.current) return
      apply({ q: query || null })
    }, 300)
    return () => clearTimeout(timer)
    // `apply` closes over searchParams and is recreated each render; depending on
    // it would restart the timer on every keystroke's re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, appliedQuery])

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-56 flex-1">
        <Label htmlFor="admin-product-search" className="sr-only">
          Search products
        </Label>
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="admin-product-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by title"
          className="pl-9"
        />
      </div>

      <div role="group" aria-label="Filter by status" className="flex border">
        {STATUSES.map((status) => (
          <button
            key={status.key || 'all'}
            type="button"
            aria-pressed={currentStatus === status.key}
            onClick={() => apply({ status: status.key || null })}
            className={cn(
              'border-border px-3 py-1.5 text-sm transition-colors not-first:border-l',
              currentStatus === status.key
                ? 'bg-foreground font-medium text-background'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {status.label}
            <span className="ml-1.5 font-mono text-[0.6875rem] tabular-nums opacity-70">
              {status.key === '' ? counts.all : counts[status.key]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="admin-product-sort" className="text-sm text-muted-foreground">
          Sort
        </Label>
        <Select
          value={currentSort}
          onValueChange={(value) => apply({ sort: value === 'newest' ? null : value })}
        >
          <SelectTrigger id="admin-product-sort" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {categories.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No categories yet — products will show as uncategorised.
        </p>
      )}
    </div>
  )
}
