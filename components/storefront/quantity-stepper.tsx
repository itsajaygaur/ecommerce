'use client'

import { MinusIcon, PlusIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Accessible −/+ stepper. The live region announces changes to screen readers. */
export function QuantityStepper({
  value,
  min = 1,
  max = 99,
  onChange,
  label,
  className,
  size = 'default',
}: {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
  label: string
  className?: string
  size?: 'default' | 'sm'
}) {
  const buttonClass = cn(
    'text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors disabled:opacity-30 disabled:hover:text-muted-foreground',
    size === 'sm' ? 'size-7' : 'size-10',
  )

  return (
    <div
      className={cn(
        'inline-flex items-center justify-between border border-input',
        size === 'sm' ? 'h-8 px-0.5' : 'h-10 px-1',
        className,
      )}
    >
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Decrease ${label}`}
      >
        <MinusIcon className={size === 'sm' ? 'size-3.5' : 'size-4'} />
      </button>

      <span
        aria-live="polite"
        aria-label={label}
        className={cn('min-w-8 text-center tabular-nums', size === 'sm' ? 'text-xs' : 'text-sm')}
      >
        {value}
      </span>

      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`Increase ${label}`}
      >
        <PlusIcon className={size === 'sm' ? 'size-3.5' : 'size-4'} />
      </button>
    </div>
  )
}
