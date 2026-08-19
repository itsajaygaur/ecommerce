import type { Metadata, Viewport } from 'next'
import { Archivo, IBM_Plex_Mono } from 'next/font/google'
import NextTopLoader from 'nextjs-toploader'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { siteUrl } from '@/lib/env'
import './globals.css'

/**
 * One grotesk and one mono.
 *
 * Archivo is loaded as a variable font with its `wdth` axis, which is the whole
 * point: headings are *widened* (112–120%) rather than just bolded, and that is
 * what gives the storefront its editorial character. Body copy uses the same
 * face at normal width, so there is no second personality to manage.
 *
 * IBM Plex Mono carries every micro-label — kickers, category tags, table heads.
 * Both are self-hosted by `next/font`, so there is no render-blocking request to
 * Google and no layout shift when they swap in.
 */
const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
  axes: ['wdth'],
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'PATINA — Objects that outlast the season',
    template: '%s · PATINA',
  },
  description:
    'A short catalogue of well-made apparel, bags, footwear and home goods. Chosen for how they wear in, not how they photograph.',
  applicationName: 'PATINA',
  openGraph: {
    type: 'website',
    siteName: 'PATINA',
    url: siteUrl,
    title: 'PATINA — Objects that outlast the season',
    description:
      'A short catalogue of well-made apparel, bags, footwear and home goods. Chosen for how they wear in, not how they photograph.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PATINA — Objects that outlast the season',
    description: 'A short catalogue of well-made apparel, bags, footwear and home goods.',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  // Hand-copies of --background in each scheme; meta tags cannot read CSS vars.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0b0b' },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${archivo.variable} ${plexMono.variable}`}>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextTopLoader showSpinner={false} color="var(--signal)" height={2} shadow={false} />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
