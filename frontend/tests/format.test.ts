import { describe, expect, it } from 'vitest'
import type { SearchMeta } from '../src/api/searchApi.ts'
import { describeSearch, formatPrice, hasActiveFilters, priceRangeError } from '../src/lib/format.ts'

const filters = (minPrice = '', maxPrice = '', category = '') => ({ category, minPrice, maxPrice })

const meta = (overrides: Partial<SearchMeta>): SearchMeta => ({
  mode: 'semantic',
  outcome: 'results',
  matchingFilters: 72,
  relevantCount: 16,
  returned: 16,
  minSimilarity: 0.3,
  tookMs: 8,
  ...overrides,
})

describe('formatPrice', () => {
  it('formats euros with two decimals', () => {
    expect(formatPrice(34.99)).toBe('€34.99')
    expect(formatPrice(149)).toBe('€149.00')
  })
})

describe('priceRangeError', () => {
  it('accepts empty and valid ranges', () => {
    expect(priceRangeError(filters())).toBeNull()
    expect(priceRangeError(filters('10', '10'))).toBeNull()
  })

  it('rejects a minimum above the maximum and negative prices', () => {
    expect(priceRangeError(filters('50', '10'))).toMatch(/higher than maximum/)
    expect(priceRangeError(filters('-1'))).toMatch(/positive/)
  })
})

describe('hasActiveFilters', () => {
  it('ignores whitespace-only prices', () => {
    expect(hasActiveFilters(filters(' ', ''))).toBe(false)
    expect(hasActiveFilters(filters('', '', 'Home'))).toBe(true)
  })
})

describe('describeSearch', () => {
  it('summarises a semantic search', () => {
    expect(describeSearch(meta({}), false)).toBe('72 products searched · ranked by meaning · 16 relevant · 8 ms')
  })

  it('mentions when only the top results are shown', () => {
    expect(describeSearch(meta({ relevantCount: 30, returned: 24 }), false)).toContain('showing the top 24')
  })

  it('summarises browse mode with filters', () => {
    expect(describeSearch(meta({ mode: 'browse', matchingFilters: 1 }), true)).toBe(
      '1 product matches your filters · sorted A–Z · describe what you need to rank them by meaning',
    )
  })
})
