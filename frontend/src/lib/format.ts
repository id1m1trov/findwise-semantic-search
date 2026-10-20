import type { SearchFilters, SearchMeta } from '../api/searchApi.ts'

const euro = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' })

export const formatPrice = (price: number): string => euro.format(price)

export const hasActiveFilters = (filters: SearchFilters): boolean =>
  Boolean(filters.category || filters.minPrice.trim() || filters.maxPrice.trim())

/** Client-side check so we don't send a request the backend would reject. */
export function priceRangeError(filters: SearchFilters): string | null {
  const min = filters.minPrice.trim() === '' ? null : Number(filters.minPrice)
  const max = filters.maxPrice.trim() === '' ? null : Number(filters.maxPrice)
  if ((min !== null && (Number.isNaN(min) || min < 0)) || (max !== null && (Number.isNaN(max) || max < 0))) {
    return 'Prices must be positive numbers.'
  }
  if (min !== null && max !== null && min > max) return 'Minimum price is higher than maximum price.'
  return null
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** One-line explanation of what the pipeline did, shown above the results. */
export function describeSearch(meta: SearchMeta, filtered: boolean): string {
  const scope = filtered
    ? `${plural(meta.matchingFilters, 'product')} ${meta.matchingFilters === 1 ? 'matches' : 'match'} your filters`
    : `${plural(meta.matchingFilters, 'product')} searched`
  if (meta.mode === 'browse') {
    return `${scope} · sorted A–Z · describe what you need to rank them by meaning`
  }
  const shown = meta.returned < meta.relevantCount ? ` · showing the top ${meta.returned}` : ''
  return `${scope} · ranked by meaning · ${meta.relevantCount} relevant${shown} · ${meta.tookMs} ms`
}
