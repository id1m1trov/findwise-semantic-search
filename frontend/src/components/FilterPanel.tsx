import { useRef } from 'react'
import type { SearchFilters } from '../api/searchApi.ts'
import { hasActiveFilters } from '../lib/format.ts'
import { ANY_PRICE, isPresetActive, PRICE_PRESETS } from '../lib/pricePresets.ts'

interface FilterPanelProps {
  idPrefix: string // the panel is rendered twice (sidebar + mobile sheet); ids must stay unique
  categories: string[]
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  priceError: string | null
}

const NO_FILTERS: SearchFilters = { category: '', minPrice: '', maxPrice: '' }

export function FilterPanel({ idPrefix, categories, filters, onChange, priceError }: FilterPanelProps) {
  const set = (patch: Partial<SearchFilters>) => onChange({ ...filters, ...patch })
  const firstOption = useRef<HTMLInputElement>(null)

  const clearAll = () => {
    onChange(NO_FILTERS)
    // The "Clear all" button disappears with the filters; continue from the top of the panel.
    firstOption.current?.focus()
  }

  return (
    <div className="filter-panel">
      <div className="filter-panel-header">
        {/* Plain text, not a heading: the panel is already a labelled "Filters" region, and a
            heading here would come before the page's h1. */}
        <p className="filter-panel-title">Filters</p>
        {hasActiveFilters(filters) && (
          <button type="button" className="text-link clear-all" onClick={clearAll}>
            Clear all<span className="visually-hidden"> filters</span>
          </button>
        )}
      </div>

      <fieldset>
        <legend>Category</legend>
        {['', ...categories].map((category, i) => (
          <label key={category || 'all'} className="option">
            <input
              ref={i === 0 ? firstOption : undefined}
              type="radio"
              name={`${idPrefix}-category`}
              checked={filters.category === category}
              onChange={() => set({ category })}
            />
            <span className="underline">{category || 'All categories'}</span>
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Price</legend>
        {/* One choice at a time, so a radio group (arrow keys move between options). Typing a
            custom range below leaves no preset selected. */}
        {[ANY_PRICE, ...PRICE_PRESETS].map((preset) => (
          <label key={preset.label} className="option">
            <input
              type="radio"
              name={`${idPrefix}-price`}
              checked={isPresetActive(preset, filters)}
              onChange={() => set({ minPrice: preset.minPrice, maxPrice: preset.maxPrice })}
            />
            <span className="underline">{preset.label}</span>
          </label>
        ))}
        <div className="price-inputs">
          <label htmlFor={`${idPrefix}-min`} className="visually-hidden">
            Minimum price in euros
          </label>
          <div className="price-input">
            <span aria-hidden="true">€</span>
            <input
              id={`${idPrefix}-min`}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => set({ minPrice: e.target.value })}
              aria-invalid={priceError ? true : undefined}
            />
          </div>
          <span aria-hidden="true">–</span>
          <label htmlFor={`${idPrefix}-max`} className="visually-hidden">
            Maximum price in euros
          </label>
          <div className="price-input">
            <span aria-hidden="true">€</span>
            <input
              id={`${idPrefix}-max`}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => set({ maxPrice: e.target.value })}
              aria-invalid={priceError ? true : undefined}
            />
          </div>
        </div>
        {priceError && (
          <p className="field-error" role="alert">
            {priceError}
          </p>
        )}
      </fieldset>
    </div>
  )
}
