'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { imageUrl } from '@/lib/storage'

/**
 * Product gallery.
 *
 * The old PDP rendered exactly one image at a fixed 400×400 with no `sizes`. This
 * shows the full set with keyboard-navigable thumbnails, and falls back to a single
 * static image when a product only has one — no controls where there is no choice.
 */
export function ProductGallery({
  images,
  title,
}: {
  images: { id: number; path: string; alt: string | null }[]
  title: string
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = images[activeIndex] ?? images[0]

  return (
    <div className="flex flex-col-reverse gap-4 sm:flex-row">
      {images.length > 1 && (
        <ul
          className="no-scrollbar flex gap-3 overflow-x-auto sm:flex-col sm:overflow-visible"
          role="tablist"
          aria-label={`${title} images`}
        >
          {images.map((image, index) => (
            <li key={image.id} className="shrink-0">
              <button
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                aria-label={`View image ${index + 1} of ${images.length}`}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'bg-muted focus-visible:ring-ring relative aspect-(--aspect-product) w-16 overflow-hidden rounded-md border-2 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2',
                  index === activeIndex
                    ? 'border-foreground'
                    : 'hover:border-border border-transparent',
                )}
              >
                <Image
                  src={imageUrl(image.path)}
                  alt=""
                  aria-hidden
                  fill
                  sizes="4rem"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="bg-muted relative aspect-(--aspect-product) flex-1 overflow-hidden rounded-xl">
        <Image
          key={active?.id ?? 'placeholder'}
          src={imageUrl(active?.path)}
          alt={active?.alt ?? title}
          fill
          // The PDP hero image — the LCP element on this route.
          priority
          sizes="(min-width: 1024px) 42rem, (min-width: 640px) 55vw, 100vw"
          className="animate-fade-up object-cover"
        />
      </div>
    </div>
  )
}
