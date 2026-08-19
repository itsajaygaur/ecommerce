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
    <div className="container-page flex min-h-svh flex-col items-center justify-center gap-6 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="text-4xl sm:text-5xl">That didn&apos;t work</h1>
      <p className="text-muted-foreground max-w-md">
        We hit an unexpected error. Trying again often clears it; if it keeps happening, the problem
        is on our side.
      </p>
      {error.digest && (
        <p className="text-muted-foreground font-mono text-xs">Reference: {error.digest}</p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  )
}
