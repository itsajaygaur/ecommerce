import { AdminShell } from '@/components/admin/admin-shell'
import { requireAdminPage } from '@/lib/auth'

/**
 * Authenticated back-office shell.
 *
 * `requireAdminPage()` runs here as well as in `proxy.ts`, and again inside every
 * action: the proxy is a convenience redirect, not the security boundary.
 */
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage()

  return (
    <AdminShell email={session.email} role={session.role}>
      {children}
    </AdminShell>
  )
}
