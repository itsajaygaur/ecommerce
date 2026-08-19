'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Catalog search.
 *
 * The header form the original app shipped posted a Server Action that redirected
 * to `/?q=…` on every submit, and the query was then matched against product titles
 * in application memory. This drives the URL directly — so results are shareable and
 * the back button works — and hits the Postgres full-text index.
 *
 * Two deliberate choices:
 *
 * 1. The current query is read from `window.location` through
 *    `useSyncExternalStore`, not from `useSearchParams()`. That hook opts the whole
 *    subtree out of static rendering unless it is wrapped in Suspense, and a
 *    Suspense fallback never resolves without JavaScript — which left the field
 *    stuck as a skeleton for crawlers and no-JS visitors. The header is on every
 *    page, so that matters.
 *
 * 2. The form has a real `action="/products"` GET target, so pressing Enter works
 *    before hydration and with scripting disabled. The debounce is an enhancement
 *    on top, not the only way to search.
 */

type SearchFieldProps = { className?: string; autoFocus?: boolean }

function subscribeToUrl(onChange: () => void): () => void {
  // Covers the back/forward buttons. Navigations this component initiates are
  // handled by the render-phase adjustment below.
  window.addEventListener('popstate', onChange)
  return () => window.removeEventListener('popstate', onChange)
}

function readUrlQuery(): string {
  return new URLSearchParams(window.location.search).get('q') ?? ''
}

export function SearchField({ className, autoFocus = false }: SearchFieldProps) {
  const router = useRouter()

  // The address bar is external state; the server snapshot is empty because there
  // is no `window` during SSR.
  const urlQuery = useSyncExternalStore(subscribeToUrl, readUrlQuery, () => '')

  const [draft, setDraft] = useState(urlQuery)
  const [appliedQuery, setAppliedQuery] = useState(urlQuery)
  // The last query this component navigated to, so its own URL change is not
  // mistaken for someone else navigating. State rather than a ref, because it is
  // read during render.
  const [selfNavigatedTo, setSelfNavigatedTo] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigatingAway = useRef(false)

  // Derived-state adjustment during render — the pattern React documents for
  // "reset state when an input changes", and cheaper than an effect because it
  // re-renders before the browser paints rather than after.
  if (urlQuery !== appliedQuery) {
    setAppliedQuery(urlQuery)
    // Don't clobber what the user is mid-way through typing when the URL change
    // is the one this field just made.
    if (urlQuery !== selfNavigatedTo) setDraft(urlQuery)
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

  useEffect(() => {
    if (draft === appliedQuery) return
    navigatingAway.current = false

    const timer = setTimeout(() => {
      if (navigatingAway.current) return

      const params = new URLSearchParams(window.location.search)
      if (draft.trim()) params.set('q', draft.trim())
      else params.delete('q')
      // A new query always restarts paging; page 4 of the old results is meaningless.
      params.delete('page')

      // Written from inside the timeout, not the effect body, so this is a
      // response to an event rather than a synchronous cascade.
      setSelfNavigatedTo(draft.trim())
      const query = params.toString()
      router.replace(query ? `/products?${query}` : '/products', { scroll: false })
    }, 300)

    return () => clearTimeout(timer)
  }, [draft, appliedQuery, router])

  return (
    <form
      role="search"
      action="/products"
      method="get"
      className={cn('relative', className)}
      onSubmit={(event) => {
        event.preventDefault()
        const params = new URLSearchParams()
        if (draft.trim()) params.set('q', draft.trim())
        setSelfNavigatedTo(draft.trim())
        router.push(params.toString() ? `/products?${params.toString()}` : '/products')
      }}
    >
      <label htmlFor="catalog-search" className="sr-only">
        Search products
      </label>
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id="catalog-search"
        ref={inputRef}
        type="search"
        name="q"
        value={draft}
        autoFocus={autoFocus}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Search products"
        className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {draft && (
        <button
          type="button"
          onClick={() => {
            setDraft('')
            inputRef.current?.focus()
          }}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </form>
  )
}
