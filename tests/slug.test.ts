import { describe, expect, it } from 'vitest'
import { slugify, uniqueSlug } from '@/lib/slug'

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Leather Weekender Bag')).toBe('leather-weekender-bag')
  })

  it('folds accents to ASCII instead of dropping them', () => {
    expect(slugify('Ünïcode Tee')).toBe('unicode-tee')
    expect(slugify('Café Crème')).toBe('cafe-creme')
  })

  it('collapses punctuation runs and trims separators', () => {
    expect(slugify('  Symbols!! & Stuff --- ')).toBe('symbols-stuff')
    expect(slugify("Men's Clothing")).toBe('men-s-clothing')
  })

  it('falls back rather than producing an empty slug', () => {
    expect(slugify('!!!')).toBe('item')
    expect(slugify('')).toBe('item')
  })
})

describe('uniqueSlug', () => {
  it('returns the base slug when it is free', () => {
    expect(uniqueSlug('Oxford Shirt', [])).toBe('oxford-shirt')
  })

  it('appends a numeric suffix on collision', () => {
    expect(uniqueSlug('Oxford Shirt', ['oxford-shirt'])).toBe('oxford-shirt-2')
  })

  it('skips over suffixes that are already taken', () => {
    expect(uniqueSlug('Oxford Shirt', ['oxford-shirt', 'oxford-shirt-2', 'oxford-shirt-3'])).toBe(
      'oxford-shirt-4',
    )
  })

  it('ignores unrelated slugs', () => {
    expect(uniqueSlug('Oxford Shirt', ['linen-throw'])).toBe('oxford-shirt')
  })
})
