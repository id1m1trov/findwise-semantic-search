import type { SearchResponse } from '../api/searchApi.ts'
import type { SearchState } from '../hooks/useProductSearch.ts'
import { describeSearch } from '../lib/format.ts'
import { ProductCard } from './ProductCard.tsx'
import { StateMessage } from './StateMessage.tsx'

interface SearchResultsProps {
  state: SearchState
  query: string
  filtered: boolean
  invalidFilters: boolean
  onClearFilters: () => void
  onRetry: () => void
}

export function SearchResults({ state, query, filtered, invalidFilters, onClearFilters, onRetry }: SearchResultsProps) {
  if (invalidFilters) {
    return (
      <StateMessage title="Check the price range" action={{ label: 'Clear filters', onClick: onClearFilters }}>
        <p>Results will appear again as soon as the price range is valid.</p>
      </StateMessage>
    )
  }

  if (state.status === 'idle') {
    return (
      <StateMessage title="Search by meaning, not just keywords">
        <p>
          Describe what you need in your own words, pick one of the examples above, or choose a category to browse.
        </p>
      </StateMessage>
    )
  }

  if (state.status === 'error') {
    return (
      <StateMessage tone="error" title="Search failed" action={{ label: 'Try again', onClick: onRetry }}>
        <p>{state.message}</p>
      </StateMessage>
    )
  }

  if (state.status === 'loading' && !state.previous) {
    return (
      <div className="results-grid" aria-busy="true" aria-label="Loading results">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="card skeleton" />
        ))}
      </div>
    )
  }

  // While a new search is loading, keep showing the previous results (dimmed).
  const data: SearchResponse = state.status === 'loading' ? state.previous! : state.data
  const loading = state.status === 'loading'
  const { meta, results } = data

  if (meta.outcome === 'no_filter_matches') {
    return (
      <StateMessage title="No products match these filters" action={{ label: 'Clear filters', onClick: onClearFilters }}>
        <p>Try another category or a wider price range.</p>
      </StateMessage>
    )
  }

  if (meta.outcome === 'no_relevant_matches') {
    return (
      <StateMessage
        title="No relevant products found"
        action={filtered ? { label: 'Clear filters', onClick: onClearFilters } : undefined}
      >
        <p>
          Nothing in {filtered ? 'the filtered catalog' : 'the catalog'} is a close enough match for “{query.trim()}”.
          Try describing it differently or pick one of the examples.
        </p>
      </StateMessage>
    )
  }

  return (
    <section className={loading ? 'results is-loading' : 'results'} aria-busy={loading}>
      <div className="results-header">
        <p className="results-summary" role="status">
          {describeSearch(meta, filtered)}
        </p>
        {meta.mode === 'semantic' && (
          <p className="results-legend">
            <span className="badge badge-strong">Strong match</span>
            <span className="badge badge-good">Good match</span>
            based on closeness in meaning
          </p>
        )}
      </div>
      <div className="results-grid">
        {results.map((product) => (
          <ProductCard key={product.sku} product={product} />
        ))}
      </div>
    </section>
  )
}
