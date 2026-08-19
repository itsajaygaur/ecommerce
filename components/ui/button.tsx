import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Buttons in the Ink & Signal system are square-cornered, flat and slightly
 * wide-tracked. Two things are deliberate and easy to undo by accident:
 *
 *  - No `shadow-*` on any variant. Weight and the hairline border carry the
 *    affordance; elevation belongs to floating overlays only.
 *  - No `uppercase`. Chromium computes accessible names from *rendered* text,
 *    so a CSS-uppercased button renames itself for screen readers and for every
 *    `getByRole('button', { name })` assertion. Caps stay on non-interactive
 *    micro-labels; buttons get tracking instead.
 *
 * Focus is left entirely to the single global `:focus-visible` outline in
 * globals.css — the old per-variant `ring-[3px]` competed with it.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium tracking-[0.01em] whitespace-nowrap transition-[color,background-color,border-color,opacity] outline-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Solid ink. The workhorse CTA — add to bag, checkout, save.
        default: 'bg-primary text-primary-foreground hover:opacity-88',
        // The one colour. Reserved for the single most important action on a view.
        signal: 'bg-signal text-signal-foreground hover:opacity-88',
        destructive: 'bg-destructive text-destructive-foreground hover:opacity-88',
        outline: 'border-border hover:border-foreground bg-transparent border',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-foreground decoration-signal underline underline-offset-[6px] hover:opacity-70',
      },
      size: {
        default: 'h-10 px-5 has-[>svg]:px-4',
        sm: 'h-8 gap-1.5 px-3 text-xs has-[>svg]:px-2.5',
        lg: 'h-12 px-7 text-[0.9375rem] has-[>svg]:px-6',
        icon: 'size-10',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
