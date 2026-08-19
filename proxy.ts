import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session'

/**
 * Next.js 16 replaces the `middleware.ts` convention with `proxy.ts`.
 *
 * This is a *navigation* gate only — it keeps signed-out visitors off admin screens
 * and signed-in admins off the login screen. It is explicitly not the authorisation
 * boundary: every admin Server Action and query calls `requireAdmin()` itself,
 * because actions are reachable without ever matching a route here.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value)
  const isLoginRoute = pathname === '/admin/login'

  if (isLoginRoute) {
    if (!session) return NextResponse.next()
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  if (!session) {
    const loginUrl = new URL('/admin/login', request.url)
    // Preserve where they were headed so login can send them back afterwards.
    if (pathname !== '/admin') loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
