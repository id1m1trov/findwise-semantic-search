import { useEffect, useRef } from 'react'
import type { SearchFilters } from '../api/searchApi.ts'
import { formatPriceRange, hasActiveFilters } from '../lib/format.ts'

interface ActiveFiltersProps {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
}

const NO_FILTERS: SearchFilters = { category: '', minPrice: '', maxPrice: '' }

/**
 * The filters currently applied, each removable on its own, plus "Clear all". Only filters are
 * cleared: the search query and the page stay as they are.
 */
export function ActiveFilters({ filters, onChange }: ActiveFiltersProps) {
  const list = useRef<HTMLUListElement>(null)
  const refocus = useRef(false)

  // After removing one filter its button is gone; keep keyboard focus in the bar by moving it
  // to the first remaining button. (If the bar disappears, App moves focus to the results.)
  useEffect(() => {
    if (!refocus.current) return
    refocus.current = false
    list.current?.querySelector('button')?.focus()
  }, [filters])

  if (!hasActiveFilters(filters)) return null
  const price = formatPriceRange(filters.minPrice, filters.maxPrice)
  const remove = (patch: Partial<SearchFilters>) => {
    refocus.current = true
    onChange({ ...filters, ...patch })
  }

  const tags: { label: string; clear: Partial<SearchFilters> }[] = []
  if (filters.category) tags.push({ label: filters.category, clear: { category: '' } })
  if (price) tags.push({ label: price, clear: { minPrice: '', maxPrice: '' } })

  return (
    <div className="active-filters">
      <span className="active-filters-label" id="active-filters-label">
        Filtered by:
      </span>
      <ul aria-labelledby="active-filters-label" ref={list}>
        {tags.map((tag) => (
          <li key={tag.label}>
            <button type="button" className="filter-tag" onClick={() => remove(tag.clear)} aria-label={`Remove filter: ${tag.label}`}>
              {tag.label}
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 7l10 10M17 7 7 17" />
              </svg>
            </button>
          </li>
        ))}
        <li>
          <button type="button" className="text-link clear-all" onClick={() => onChange(NO_FILTERS)}>
            Clear all
          </button>
        </li>
      </ul>
    </div>
  )
}
