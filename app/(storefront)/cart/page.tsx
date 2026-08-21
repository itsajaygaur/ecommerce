import type { Metadata } from 'next'
import { CartView } from '@/components/storefront/cart-view'
import { isStripeTestMode } from '@/lib/stripe'

export const metadata: Metadata = {
  title: 'Your bag',
  robots: { index: false, follow: false },
}

/**
 * Full-page bag, for when the slide-over is too small to review an order —
 * and so the cart has a URL people can return to.
 */
export default function CartPage() {
  return (
    <div className="container-page py-12">
      <header className="mb-10 border-b pb-8">
        <p className="eyebrow mb-4">Bag</p>
        <h1 className="text-display-2">Your bag</h1>
      </header>
      <CartView testMode={isStripeTestMode()} />
    </div>
  )
}
