import type { NextConfig } from 'next'

/**
 * The storefront serves product imagery from Supabase Storage. The host is derived from
 * the configured storage URL rather than hardcoded, so pointing the app at a different
 * project (or a local Supabase) needs no code change.
 */
function storageRemotePattern() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL
  if (!raw) return []
  try {
    const url = new URL(raw)
    return [
      {
        protocol: url.protocol.replace(':', '') as 'http' | 'https',
        hostname: url.hostname,
        port: url.port || undefined,
      },
    ]
  } catch {
    return []
  }
}

/**
 * Conservative baseline headers. The storefront loads Stripe's redirect flow only via
 * top-level navigation, so no frame-src exception is needed.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: storageRemotePattern(),
  },

  experimental: {
    // Only ship the icons that are actually imported instead of the whole set.
    optimizePackageImports: ['lucide-react', 'recharts', 'radix-ui'],
  },

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },

  async redirects() {
    return [
      // The old catalog used /product/<numeric id>. Product URLs are slug-based now;
      // the route handler at /product/[id] resolves the id and 308s to the slug, but
      // the bare /product listing never existed, so send it to the new catalog.
      { source: '/product', destination: '/products', permanent: true },
    ]
  },
}

export default nextConfig
