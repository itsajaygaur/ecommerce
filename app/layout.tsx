import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import NextTopLoader from 'nextjs-toploader'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { siteUrl } from '@/lib/env'
import './globals.css'

/**
 * Two faces: a variable serif for display headings and Inter for everything else.
 * Both are self-hosted by `next/font`, so there is no render-blocking request to
 * Google and no layout shift when they swap in.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'MyKart — Considered goods, built to last',
    template: '%s · MyKart',
  },
  description:
    'A small catalog of well-made apparel, bags, footwear and home goods. Chosen for how they wear in, not how they photograph.',
  applicationName: 'MyKart',
  openGraph: {
    type: 'website',
    siteName: 'MyKart',
    url: siteUrl,
    title: 'MyKart — Considered goods, built to last',
    description:
      'A small catalog of well-made apparel, bags, footwear and home goods. Chosen for how they wear in, not how they photograph.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MyKart — Considered goods, built to last',
    description: 'A small catalog of well-made apparel, bags, footwear and home goods.',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fdfcfa' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1a18' },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextTopLoader showSpinner={false} color="var(--accent)" height={2} shadow={false} />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
