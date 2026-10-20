import { useEffect, useMemo, useState } from 'react'
import { type SearchFilters, type SearchRequest, fetchCategories } from './api/searchApi.ts'
import { FilterBar } from './components/FilterBar.tsx'
import { HowItWorks } from './components/HowItWorks.tsx'
import { SearchBar } from './components/SearchBar.tsx'
import { SearchResults } from './components/SearchResults.tsx'
import { useDebouncedValue } from './hooks/useDebouncedValue.ts'
import { useProductSearch } from './hooks/useProductSearch.ts'
import { hasActiveFilters, priceRangeError } from './lib/format.ts'

const EXAMPLES = [
  'something to keep my drink hot on a camping trip',
  'water bottle for the gym',
  'light for my tent at night',
  'stay cool while running in summer',
  'gift for a coffee lover',
]

const NO_FILTERS: SearchFilters = { category: '', minPrice: '', maxPrice: '' }

function App() {
  const [input, setInput] = useState('') // what is in the search box
  const [query, setQuery] = useState('') // what was last submitted
  const [filters, setFilters] = useState<SearchFilters>(NO_FILTERS)
  const [categories, setCategories] = useState<string[]>([])

  // Bumped by "Try again" so the categories reload too if the backend was down at page load.
  const [categoriesAttempt, setCategoriesAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    fetchCategories(controller.signal)
      .then(setCategories)
      .catch(() => {}) // the search itself reports connection problems
    return () => controller.abort()
  }, [categoriesAttempt])

  // The category applies immediately; typed prices wait until the user pauses.
  // (Strings, not an object: a new object every render would restart the debounce forever.)
  const minPrice = useDebouncedValue(filters.minPrice, 400)
  const maxPrice = useDebouncedValue(filters.maxPrice, 400)
  const activeFilters = useMemo(
    () => ({ category: filters.category, minPrice, maxPrice }),
    [filters.category, minPrice, maxPrice],
  )
  const priceError = priceRangeError(filters)

  // null = nothing to search yet (no query and no filters), or the price range is invalid.
  const request = useMemo<SearchRequest | null>(() => {
    if (priceRangeError(activeFilters)) return null
    if (!query.trim() && !hasActiveFilters(activeFilters)) return null
    return { query, filters: activeFilters }
  }, [query, activeFilters])

  const { state, retry } = useProductSearch(request)

  const runExample = (example: string) => {
    setInput(example)
    setQuery(example)
  }

  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="brand-icon">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
            <path d="M8.5 11h5M11 8.5v5" />
          </svg>
          <div>
            <h1>Semantic Product Search</h1>
            <p className="tagline">Describe what you need. Results are matched by meaning, not keywords.</p>
          </div>
        </div>
        <span className="poc-tag">Proof of concept</span>
      </header>

      <main className="main">
        <SearchBar
          value={input}
          onChange={setInput}
          onSubmit={() => setQuery(input)}
          examples={EXAMPLES}
          onExample={runExample}
        />
        <FilterBar
          categories={categories}
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters(NO_FILTERS)}
          error={priceError}
        />
        <HowItWorks minSimilarity={state.status === 'success' ? state.data.meta.minSimilarity : undefined} />
        <SearchResults
          state={state}
          query={query}
          filtered={hasActiveFilters(activeFilters)}
          invalidFilters={priceError !== null}
          onClearFilters={() => setFilters(NO_FILTERS)}
          onRetry={() => {
            retry()
            if (categories.length === 0) setCategoriesAttempt((n) => n + 1)
          }}
        />
      </main>

      <footer className="footer">72 demo products · local MiniLM embeddings · SQLite filters · HNSW vector index</footer>
    </div>
  )
}

export default App
