// Price formatting, price-range validation and the wording of result headings.
import { describe, expect, it } from 'vitest'
import type { SearchMeta } from '../src/api/searchApi.ts'
import {
  formatPrice,
  formatPriceRange,
  hasActiveFilters,
  priceRangeError,
  resultsHeading,
  searchDetails,
} from '../src/lib/format.ts'

const filters = (minPrice = '', maxPrice = '', category = '') => ({ category, minPrice, maxPrice })

const meta = (overrides: Partial<SearchMeta>): SearchMeta => ({
  mode: 'semantic',
  outcome: 'results',
  matchingFilters: 72,
  relevantCount: 6,
  returned: 6,
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

describe('formatPriceRange', () => {
  it('describes exactly the bounds that are applied', () => {
    expect(formatPriceRange('25', '49.99')).toBe('€25.00 – €49.99')
    expect(formatPriceRange('', '24.99')).toBe('Up to €24.99')
    expect(formatPriceRange('100', '')).toBe('€100.00 and up')
    expect(formatPriceRange('', '')).toBeNull()
  })
})

describe('resultsHeading', () => {
  it('names the query and the number of products', () => {
    expect(resultsHeading(meta({}), ' gift for a coffee lover ')).toBe('6 products for “gift for a coffee lover”')
  })

  it('says when only the top results are shown', () => {
    expect(resultsHeading(meta({ relevantCount: 30, returned: 24 }), 'mug')).toBe('Top 24 of 30 for “mug”')
  })

  it('counts filtered products when browsing', () => {
    expect(resultsHeading(meta({ mode: 'browse', matchingFilters: 1 }), '')).toBe('1 product')
  })
})

describe('searchDetails', () => {
  it('explains the order without implying confidence', () => {
    expect(searchDetails(meta({}))).toBe('Most relevant first · 72 searched by meaning · 8 ms')
    expect(searchDetails(meta({ mode: 'browse' }))).toBe('Sorted A–Z')
  })
})
