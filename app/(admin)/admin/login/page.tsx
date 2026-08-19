import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from '@/components/admin/login-form'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
}

type SearchParams = Promise<{ next?: string }>

export default async function AdminLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 border-b pb-8">
          <Link
            href="/"
            className="font-display text-2xl leading-none font-semibold tracking-[0.14em]"
            style={{ fontStretch: '122%' }}
          >
            PATINA
          </Link>
          <p className="eyebrow mt-4">Sign in to the back office</p>
        </div>

        {/* `next` is validated in the form: only same-origin paths are honoured. */}
        <LoginForm next={next} />

        <p className="mt-8 text-xs text-muted-foreground">
          <Link href="/" className="underline-offset-4 hover:text-foreground hover:underline">
            Back to the storefront
          </Link>
        </p>
      </div>
    </div>
  )
}
