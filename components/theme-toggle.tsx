'use client'

import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

/**
 * Two-state toggle rather than the previous light/dark/system dropdown: the default
 * is already `system`, so the control only needs to express an override, and one
 * click beats opening a menu.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <SunIcon className="size-[1.15rem] scale-100 rotate-0 transition-transform duration-300 dark:scale-0 dark:-rotate-90" />
      <MoonIcon className="absolute size-[1.15rem] scale-0 rotate-90 transition-transform duration-300 dark:scale-100 dark:rotate-0" />
    </Button>
  )
}
