'use client'

import { useTransition } from 'react'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { startCheckout } from '@/lib/actions/checkout'
import { useCart, type CartLine } from '@/hooks/use-cart'

/**
 * Sends only `{ productId, quantity }` to the server. Prices are re-read from the
 * database by the action, so what is displayed here can never influence the charge.
 */
export function CheckoutButton({
  lines,
  className,
  size = 'default',
}: {
  lines: CartLine[]
  className?: string
  size?: 'default' | 'lg'
}) {
  const [pending, startTransition] = useTransition()
  const remove = useCart((state) => state.remove)

  function checkout() {
    startTransition(async () => {
      const result = await startCheckout(
        lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      )

      // A successful checkout redirects and never returns a value; reaching here
      // means the server declined.
      if (result?.unavailableProductIds?.length) {
        for (const id of result.unavailableProductIds) remove(id)
        toast.error(result.message, {
          description: 'Unavailable items were removed from your bag.',
        })
        return
      }

      toast.error(result?.message ?? 'Checkout could not be started.')
    })
  }

  return (
    <Button
      onClick={checkout}
      disabled={pending || lines.length === 0}
      size={size}
      className={className}
    >
      {pending && <Loader2Icon className="animate-spin" />}
      {pending ? 'Redirecting…' : 'Checkout'}
    </Button>
  )
}
