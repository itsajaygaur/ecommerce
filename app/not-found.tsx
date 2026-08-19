import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[70svh] flex-col justify-center py-20">
      {/*
       * The numeral is decoration; the sentence stays the heading. Screen
       * readers (and the e2e suite) get "We couldn't find that page", not "404".
       */}
      <p className="display-hero text-muted-foreground/25 select-none" aria-hidden>
        404
      </p>
      <h1 className="mt-4 border-t pt-8 text-display-2">We couldn&apos;t find that page</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
        The link may be out of date, or the product may have been retired from the catalogue.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/products">Browse the catalogue</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  )
}
