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
      <aside className="bg-secondary/40 hidden w-60 shrink-0 flex-col border-r lg:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/admin" className="font-display text-lg font-semibold tracking-tight">
            MyKart
          </Link>
          <span className="text-muted-foreground ml-2 text-xs">admin</span>
        </div>

        <NavList className="flex-1 p-3" />

        <div className="border-t p-3">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{email}</p>
            <p className="text-muted-foreground text-xs capitalize">{role}</p>
          </div>
          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:bg-secondary hover:text-foreground flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors"
          >
            <ExternalLinkIcon className="size-4" />
            View storefront
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="text-muted-foreground hover:bg-secondary hover:text-foreground flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors"
            >
              <LogOutIcon className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/85 supports-[backdrop-filter]:bg-background/65 sticky top-0 z-30 flex h-16 items-center gap-2 border-b px-4 backdrop-blur lg:px-8">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <SheetHeader>
                <SheetTitle className="font-display">MyKart admin</SheetTitle>
              </SheetHeader>
              <NavList className="p-3" />
              <form action={logout} className="mt-auto border-t p-3">
                <button
                  type="submit"
                  className="text-muted-foreground hover:bg-secondary flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm"
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
    <nav className={cn('flex flex-col gap-1', className)}>
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-background text-foreground font-medium shadow-xs'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
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
