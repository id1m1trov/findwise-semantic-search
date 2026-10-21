import type { SearchFilters } from '../api/searchApi.ts'

export interface PricePreset {
  label: string
  minPrice: string
  maxPrice: string
}

// Non-overlapping ranges. The API treats both bounds as inclusive, so each range ends one
// cent below where the next one starts: a 50.00 product belongs to exactly one range.
export const PRICE_PRESETS: PricePreset[] = [
  { label: 'Under €25', minPrice: '', maxPrice: '24.99' },
  { label: '€25 – €49.99', minPrice: '25', maxPrice: '49.99' },
  { label: '€50 – €99.99', minPrice: '50', maxPrice: '99.99' },
  { label: '€100 and up', minPrice: '100', maxPrice: '' },
]

export const ANY_PRICE: PricePreset = { label: 'Any price', minPrice: '', maxPrice: '' }

export const isPresetActive = (preset: PricePreset, filters: SearchFilters): boolean =>
  filters.minPrice.trim() === preset.minPrice && filters.maxPrice.trim() === preset.maxPrice
