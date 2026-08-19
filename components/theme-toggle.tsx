'use client'

import { useSyncExternalStore } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

/**
 * Two-state toggle rather than the previous light/dark/system dropdown: the default
 * is already `system`, so the control only needs to express an override, and one
 * click beats opening a menu.
 *
 * `resolvedTheme` is undefined until next-themes has read the DOM, so rendering
 * the label straight from it produced a hydration mismatch on every page for
 * anyone whose resolved theme was dark. Until mounted the control announces
 * itself neutrally and the icons sit in their CSS-driven state.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  // false during SSR and the first client render, true thereafter — the same
  // hydration-safe pattern `search-field.tsx` uses.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={mounted ? `Switch to ${isDark ? 'light' : 'dark'} theme` : 'Switch theme'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <SunIcon className="size-[1.15rem] scale-100 rotate-0 transition-transform duration-300 dark:scale-0 dark:-rotate-90" />
      <MoonIcon className="absolute size-[1.15rem] scale-0 rotate-90 transition-transform duration-300 dark:scale-100 dark:rotate-0" />
    </Button>
  )
}
