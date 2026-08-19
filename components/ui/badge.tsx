import * as React from 'react'
import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Badges are the system's micro-labels made visible: square, 11px, mono,
 * wide-tracked, uppercase. Uppercase is safe here in a way it is not on a
 * button — no badge's text is ever an accessible name, and `textContent` (which
 * the admin specs read) is unaffected by `text-transform`.
 *
 * `outline` is the default because a Swiss status marker is a ruled label, not
 * a filled pill. Filled variants are for the few states that must interrupt.
 */
const badgeVariants = cva(
  'text-micro inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-none border px-2 py-1 font-mono font-medium whitespace-nowrap uppercase [&>svg]:size-3',
  {
    variants: {
      variant: {
        outline: 'border-border text-foreground',
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        signal: 'border-transparent bg-signal text-signal-foreground',
        'signal-quiet': 'border-signal text-signal bg-transparent',
        /*
         * Status labels are RULED, not filled. A table of fifteen products
         * showed fifteen solid green chips, which made the routine state the
         * loudest thing on the page and broke the one-colour rule outright.
         * The hue survives in the text and the border, where it reads as
         * information rather than as emphasis.
         */
        success: 'border-success/40 text-success bg-transparent',
        warning: 'border-warning/50 text-warning bg-transparent',
        /* The one state allowed to interrupt: something is actually wrong. */
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
      },
    },
    defaultVariants: { variant: 'outline' },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span'
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
