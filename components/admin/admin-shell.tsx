'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ExternalLinkIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  PackageIcon,
  ReceiptTextIcon,
  TagsIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/theme-toggle'
import { logout } from '@/lib/actions/auth'
import { cn } from '@/lib/utils'

/**
 * Admin chrome: fixed sidebar on desktop, a sheet on mobile.
 *
 * The previous sidebar highlighted with `path.startsWith(item.href)`, so
 * `/admin/products` stayed lit while on `/admin/products/new` *and* the dashboard
 * link matched anything under `/admin`. Matching is explicit here.
 */

const NAV = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboardIcon, exact: true },
  { title: 'Products', href: '/admin/products', icon: PackageIcon },
  { title: 'Orders', href: '/admin/orders', icon: ReceiptTextIcon },
  { title: 'Categories', href: '/admin/categories', icon: TagsIcon },
]

export function AdminShell({
  children,
  email,
  role,
}: {
  children: React.ReactNode
  email: string
  role: string
}) {
  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-background lg:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Link
            href="/admin"
            className="font-display text-lg leading-none font-semibold tracking-[0.14em]"
            style={{ fontStretch: '122%' }}
          >
            PATINA
          </Link>
          <span className="eyebrow ml-2.5">admin</span>
        </div>

        <NavList className="flex-1 p-3" />

        <div className="border-t p-3">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{email}</p>
            <p className="text-xs text-muted-foreground capitalize">{role}</p>
          </div>
          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLinkIcon className="size-4" />
            View storefront
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOutIcon className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background px-4 lg:px-8">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <SheetHeader>
                <SheetTitle className="font-display tracking-[0.1em]">PATINA admin</SheetTitle>
              </SheetHeader>
              <NavList className="p-3" />
              <form action={logout} className="mt-auto border-t p-3">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <LogOutIcon className="size-4" />
                  Sign out
                </button>
              </form>
            </SheetContent>
          </Sheet>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  )
}

function NavList({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav className={cn('flex flex-col', className)}>
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 border-l-2 py-2 pl-3 text-sm transition-colors',
              active
                ? 'border-signal font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
            {item.title}
          </Link>
        )
      })}
    </nav>
  )
}
