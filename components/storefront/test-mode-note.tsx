import { cn } from '@/lib/utils'

/**
 * Test-mode notice, shown at the point of payment.
 *
 * This deployment runs on Stripe test keys, so Checkout looks entirely real but
 * takes no money. Without saying so, a visitor reaches a convincing payment page
 * with no way of knowing they are allowed to complete it — the most interesting
 * part of the build goes unseen.
 *
 * Purely presentational and free of client hooks, so it renders from either a
 * server or a client parent. Whether to show it is decided by `isStripeTestMode()`
 * in a server component; this only draws it.
 */
export function TestModeNote({ className }: { className?: string }) {
  return (
    <div className={cn('border-t pt-4', className)}>
      <p className="eyebrow mb-2 text-signal">Demo · Test mode</p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        No real payment is taken. Pay with card{' '}
        <span className="font-mono text-foreground tabular-nums">4242 4242 4242 4242</span>, any
        future expiry date and any CVC.
      </p>
    </div>
  )
}
