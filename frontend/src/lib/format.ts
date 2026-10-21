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

/** Label for the active price filter, describing exactly what is applied (bounds inclusive). */
export function formatPriceRange(minPrice: string, maxPrice: string): string | null {
  const min = minPrice.trim() === '' ? null : Number(minPrice)
  const max = maxPrice.trim() === '' ? null : Number(maxPrice)
  if (min !== null && max !== null) return `${formatPrice(min)} – ${formatPrice(max)}`
  if (max !== null) return `Up to ${formatPrice(max)}`
  if (min !== null) return `${formatPrice(min)} and up`
  return null
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** Heading above the results, e.g. "6 products for “gift for a coffee lover”". */
export function resultsHeading(meta: SearchMeta, query: string): string {
  if (meta.mode === 'browse') return plural(meta.matchingFilters, 'product')
  const shown = meta.relevantCount > meta.returned ? `Top ${meta.returned} of ${meta.relevantCount}` : plural(meta.returned, 'product')
  return `${shown} for “${query.trim()}”`
}

/** A short note next to the results about what the search did, e.g. how many products it compared. */
export function searchDetails(meta: SearchMeta): string {
  if (meta.mode === 'browse') return 'Sorted A–Z'
  return `Most relevant first · ${meta.matchingFilters} searched by meaning · ${meta.tookMs} ms`
}
