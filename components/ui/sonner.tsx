'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

/**
 * Toasts.
 *
 * `richColors` is deliberately off. It paints success toasts a saturated green
 * and errors a saturated red, which put two more colours on screen next to the
 * one the system reserves for price and the primary action — a green "Added to
 * bag" panel was reliably the loudest thing on the page.
 *
 * Instead every toast is a hairline-ruled popover surface, and the severity is
 * carried by the icon colour alone, tinted through the existing tokens.
 */
function Toaster(props: ToasterProps) {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: 'border-border rounded-none border shadow-overlay',
          success: '[&_[data-icon]]:text-success',
          error: '[&_[data-icon]]:text-destructive',
          warning: '[&_[data-icon]]:text-warning',
          info: '[&_[data-icon]]:text-signal',
          title: 'text-sm font-medium',
          description: 'text-muted-foreground text-xs',
          actionButton: 'bg-primary text-primary-foreground rounded-none',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': '0px',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
