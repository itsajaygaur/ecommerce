import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="container-page flex min-h-svh flex-col items-center justify-center gap-6 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="text-4xl sm:text-5xl">We couldn&apos;t find that page</h1>
      <p className="text-muted-foreground max-w-md">
        The link may be out of date, or the product may have been retired from the catalog.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/products">Browse the catalog</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  )
}
