'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * Root error boundary. Without one, any thrown error in a Server Component showed
 * the framework's default screen — and in production, a blank page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app] unhandled error', error)
  }, [error])

  return (
    <div className="container-page flex min-h-[70svh] flex-col justify-center py-20">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-4 border-t pt-8 text-display-2">That didn&apos;t work</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
        We hit an unexpected error. Trying again often clears it; if it keeps happening, the problem
        is on our side.
      </p>
      {error.digest && (
        <p className="mt-4 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  )
}
