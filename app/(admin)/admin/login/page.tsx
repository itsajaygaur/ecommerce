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
        <div className="mb-8 text-center">
          <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
            MyKart
          </Link>
          <p className="text-muted-foreground mt-2 text-sm">Sign in to the back office</p>
        </div>

        {/* `next` is validated in the form: only same-origin paths are honoured. */}
        <LoginForm next={next} />

        <p className="text-muted-foreground mt-6 text-center text-xs">
          <Link href="/" className="hover:text-foreground underline-offset-4 hover:underline">
            Back to the storefront
          </Link>
        </p>
      </div>
    </div>
  )
}
