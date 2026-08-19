import { SiteFooter } from '@/components/storefront/site-footer'
import { SiteHeader } from '@/components/storefront/site-header'

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      {/* Skip link — the previous storefront had no keyboard bypass for the header. */}
      <a
        href="#main"
        className="sr-only rounded-md bg-background px-4 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
