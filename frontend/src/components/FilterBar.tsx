import type { SearchFilters } from '../api/searchApi.ts'
import { hasActiveFilters } from '../lib/format.ts'

interface FilterBarProps {
  categories: string[]
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  onClear: () => void
  error: string | null
}

export function FilterBar({ categories, filters, onChange, onClear, error }: FilterBarProps) {
  const set = (patch: Partial<SearchFilters>) => onChange({ ...filters, ...patch })

  return (
    <fieldset className="filters">
      <legend className="visually-hidden">Filters</legend>
      <div className="field">
        <label htmlFor="category">Category</label>
        <select id="category" value={filters.category} onChange={(e) => set({ category: e.target.value })}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="field price-field">
        <label htmlFor="min-price">Min price</label>
        <div className="input-prefix">
          <span aria-hidden="true">€</span>
          <input
            id="min-price"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            placeholder="0"
            value={filters.minPrice}
            onChange={(e) => set({ minPrice: e.target.value })}
            aria-invalid={error ? true : undefined}
          />
        </div>
      </div>
      <div className="field price-field">
        <label htmlFor="max-price">Max price</label>
        <div className="input-prefix">
          <span aria-hidden="true">€</span>
          <input
            id="max-price"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            placeholder="Any"
            value={filters.maxPrice}
            onChange={(e) => set({ maxPrice: e.target.value })}
            aria-invalid={error ? true : undefined}
          />
        </div>
      </div>
      {hasActiveFilters(filters) && (
        <button type="button" className="button-ghost" onClick={onClear}>
          Clear filters
        </button>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}
