'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingBagIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { QuantityStepper } from '@/components/storefront/quantity-stepper'
import { CheckoutButton } from '@/components/storefront/checkout-button'
import {
  selectSubtotalCents,
  selectTotalQuantity,
  useCart,
  useCartDrawer,
  useCartHydrated,
} from '@/hooks/use-cart'
import { formatMoney } from '@/lib/money'
import { imageUrl } from '@/lib/storage'

/**
 * Slide-over bag.
 *
 * The trigger badge counts total *units*; the previous header showed
 * `items.length`, so three of the same shirt read as "1". The count is also hidden
 * until the persisted store has hydrated, which removes the server/client mismatch
 * that made React discard and re-render the header on first paint.
 */
export function CartDrawer() {
  const { open, setOpen } = useCartDrawer()
  const hydrated = useCartHydrated()

  const lines = useCart((state) => state.lines)
  const totalQuantity = useCart(selectTotalQuantity)
  const subtotal = useCart(selectSubtotalCents)
  const setQuantity = useCart((state) => state.setQuantity)
  const remove = useCart((state) => state.remove)
  const clear = useCart((state) => state.clear)

  const currency = lines[0]?.snapshot.currency ?? 'INR'

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Open bag, ${hydrated ? totalQuantity : 0} items`}
        >
          <ShoppingBagIcon className="size-[1.15rem]" />
          {hydrated && totalQuantity > 0 && (
            <span className="bg-accent text-accent-foreground absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full text-[0.625rem] font-semibold tabular-nums">
              {totalQuantity > 99 ? '99+' : totalQuantity}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Your bag</SheetTitle>
          <SheetDescription>
            {hydrated && totalQuantity > 0
              ? `${totalQuantity} ${totalQuantity === 1 ? 'item' : 'items'}`
              : 'Nothing here yet'}
          </SheetDescription>
        </SheetHeader>

        {!hydrated ? (
          <div className="flex-1" />
        ) : lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="bg-muted flex size-16 items-center justify-center rounded-full">
              <ShoppingBagIcon className="text-muted-foreground size-7" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Your bag is empty</p>
              <p className="text-muted-foreground text-sm">
                Once you add something, it will wait for you here.
              </p>
            </div>
            <Button asChild variant="outline" onClick={() => setOpen(false)}>
              <Link href="/products">Browse the catalog</Link>
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <ul className="divide-y">
                {lines.map((line) => (
                  <li key={line.productId} className="flex gap-4 p-6">
                    <Link
                      href={`/products/${line.snapshot.slug}`}
                      onClick={() => setOpen(false)}
                      className="bg-muted relative aspect-(--aspect-product) w-20 shrink-0 overflow-hidden rounded-md"
                    >
                      <Image
                        src={imageUrl(line.snapshot.imagePath)}
                        alt={line.snapshot.title}
                        fill
                        sizes="5rem"
                        className="object-cover"
                      />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/products/${line.snapshot.slug}`}
                          onClick={() => setOpen(false)}
                          className="text-sm leading-snug font-medium hover:underline"
                        >
                          {line.snapshot.title}
                        </Link>
                        <button
                          type="button"
                          onClick={() => remove(line.productId)}
                          aria-label={`Remove ${line.snapshot.title} from bag`}
                          className="text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                        >
                          <Trash2Icon className="size-4" />
                        </button>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-2">
                        <QuantityStepper
                          size="sm"
                          value={line.quantity}
                          min={1}
                          max={99}
                          onChange={(value) => setQuantity(line.productId, value)}
                          label={`quantity of ${line.snapshot.title}`}
                        />
                        <span className="text-sm font-semibold tabular-nums">
                          {formatMoney(
                            line.snapshot.priceCents * line.quantity,
                            line.snapshot.currency,
                          )}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>

            <div className="space-y-4 border-t p-6">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(subtotal, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-muted-foreground">Calculated at checkout</span>
                </div>
              </div>

              <Separator />

              <CheckoutButton lines={lines} className="w-full" size="lg" />

              <div className="flex items-center justify-between text-xs">
                <Link
                  href="/cart"
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  View full bag
                </Link>
                <button
                  type="button"
                  onClick={clear}
                  className="text-muted-foreground hover:text-destructive underline-offset-4 hover:underline"
                >
                  Empty bag
                </button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
