import { describe, expect, it } from 'vitest'
import { paginationRange } from '@/components/ui/pagination'

/**
 * The previous paginator rendered one link per page with no truncation, so a
 * catalog of 400 products produced 40 numbered links in a row.
 */
describe('paginationRange', () => {
  it('lists every page when they all fit', () => {
    expect(paginationRange(1, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('truncates on the right when near the start', () => {
    expect(paginationRange(1, 40)).toEqual([1, 2, 'ellipsis', 40])
  })

  it('truncates on the left when near the end', () => {
    expect(paginationRange(40, 40)).toEqual([1, 'ellipsis', 39, 40])
  })

  it('truncates on both sides in the middle', () => {
    expect(paginationRange(20, 40)).toEqual([1, 'ellipsis', 19, 20, 21, 'ellipsis', 40])
  })

  it('always includes the first and last page', () => {
    for (const current of [1, 7, 25, 40]) {
      const tokens = paginationRange(current, 40)
      expect(tokens[0]).toBe(1)
      expect(tokens.at(-1)).toBe(40)
    }
  })

  it('always includes the current page', () => {
    for (const current of [1, 2, 3, 19, 20, 38, 39, 40]) {
      expect(paginationRange(current, 40)).toContain(current)
    }
  })

  it('stays bounded regardless of how many pages exist', () => {
    expect(paginationRange(500, 1000).length).toBeLessThanOrEqual(7)
  })

  it('handles a single page', () => {
    expect(paginationRange(1, 1)).toEqual([1])
  })
})
