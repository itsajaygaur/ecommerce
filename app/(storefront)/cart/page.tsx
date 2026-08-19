import type { Metadata } from 'next'
import { CartView } from '@/components/storefront/cart-view'

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
      <h1 className="mb-10 text-4xl sm:text-5xl">Your bag</h1>
      <CartView />
    </div>
  )
}
