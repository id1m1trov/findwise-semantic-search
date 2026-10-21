import type { ProductResult, SearchFilters, SearchResponse } from '../api/searchApi.ts'
import type { SearchState } from '../hooks/useProductSearch.ts'
import { resultsHeading } from '../lib/format.ts'
import { ActiveFilters } from './ActiveFilters.tsx'
import { EmptyState } from './EmptyState.tsx'
import { ResultsGrid } from './ResultsGrid.tsx'

interface SearchResultsProps {
  state: SearchState
  query: string
  filters: SearchFilters
  filtered: boolean
  invalidFilters: boolean
  onFiltersChange: (filters: SearchFilters) => void
  onRetry: () => void
  examples: string[]
  onExample: (query: string) => void
  onOpenProduct: (product: ProductResult) => void
}

const noFilters: SearchFilters = { category: '', minPrice: '', maxPrice: '' }

export function SearchResults(props: SearchResultsProps) {
  const { state, query, filters, filtered, invalidFilters, onFiltersChange, onRetry, examples, onExample, onOpenProduct } = props
  const clearFilters = () => onFiltersChange(noFilters)

  const suggestions = (
    <p>
      Try different words, or one of these:{' '}
      {examples.slice(0, 3).map((example, i) => (
        <span key={example}>
          {i > 0 && ', '}
          <button type="button" className="text-link" onClick={() => onExample(example)}>
            {example}
          </button>
        </span>
      ))}
      .
    </p>
  )

  // With results, the applied filters sit between the heading and the products; otherwise
  // (empty, error, loading) above the message, where removing a filter matters most.
  const filterBar = <ActiveFilters filters={filters} onChange={onFiltersChange} />
  let filterBarInContent = false
  let content
  let announcement = ''
  if (invalidFilters) {
    announcement = 'Check the price range'
    content = (
      <EmptyState title="Check the price range" action={{ label: 'Clear price', onClick: () => onFiltersChange({ ...filters, minPrice: '', maxPrice: '' }) }}>
        <p>Results will appear again as soon as the price range is valid.</p>
      </EmptyState>
    )
  } else if (state.status === 'error') {
    content = (
      <EmptyState tone="error" title="Search isn't available right now" action={{ label: 'Try again', onClick: onRetry }}>
        <p>{state.message}</p>
      </EmptyState>
    )
  } else if (state.status === 'idle' || (state.status === 'loading' && !state.previous)) {
    announcement = 'Loading products'
    content = (
      <div className="product-grid" aria-busy="true" aria-label="Loading products">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="product skeleton">
            <div className="product-image" />
            <div className="product-body">
              <span className="skeleton-line" />
              <span className="skeleton-line short" />
            </div>
          </div>
        ))}
      </div>
    )
  } else if (state.status === 'loading' || state.status === 'success') {
    // While a new search loads, keep showing the previous results (dimmed).
    const data: SearchResponse = state.status === 'loading' ? state.previous! : state.data
    const loading = state.status === 'loading'
    const { meta } = data

    if (meta.outcome === 'no_filter_matches') {
      announcement = 'No products match these filters'
      content = (
        <EmptyState title="No products match these filters" action={{ label: 'Clear filters', onClick: clearFilters }}>
          <p>Try another category or a wider price range.</p>
        </EmptyState>
      )
    } else if (meta.outcome === 'no_relevant_matches') {
      announcement = `No close matches for “${query.trim()}”`
      content = (
        <EmptyState
          title={`No close matches for “${query.trim()}”`}
          action={filtered ? { label: 'Search all products', onClick: clearFilters } : undefined}
        >
          {suggestions}
        </EmptyState>
      )
    } else {
      if (!loading) announcement = resultsHeading(meta, query)
      content = (
        <ResultsGrid
          data={data}
          query={query}
          loading={loading}
          onOpenProduct={onOpenProduct}
          filterBar={filterBar}
        />
      )
      filterBarInContent = true
    }
  }

  return (
    <section className="results-area" aria-label="Search results">
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
      {!filterBarInContent && filterBar}
      {content}
    </section>
  )
}
