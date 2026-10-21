import { type ReactNode, useEffect, useRef, useState } from 'react'
import type { ProductResult, SearchResponse } from '../api/searchApi.ts'
import { useMediaQuery } from '../hooks/useMediaQuery.ts'
import { resultsHeading, searchDetails } from '../lib/format.ts'
import { PAGE_SIZE_DESKTOP, PAGE_SIZE_MOBILE, pageInfo } from '../lib/pagination.ts'
import { ProductCard } from './ProductCard.tsx'

interface ResultsGridProps {
  data: SearchResponse
  query: string
  loading: boolean // a newer search is on its way; these results are shown dimmed meanwhile
  onOpenProduct: (product: ProductResult) => void
  filterBar?: ReactNode // applied filters, shown between the heading and the products
}

/**
 * Shows the results a page at a time with a "Load more" button. Everything is already loaded;
 * the button only reveals more of it, so fewer cards and images are rendered up front.
 */
export function ResultsGrid({ data, query, loading, onOpenProduct, filterBar }: ResultsGridProps) {
  const pageSize = useMediaQuery('(max-width: 720px)') ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP

  // The page count is stored together with the results it belongs to. A new search, filter or
  // category brings a new results object, so the count goes back to one page by itself. (Resetting
  // it in an effect would briefly show the old count first.)
  const [paging, setPaging] = useState({ data, pages: 1 })
  const pages = paging.data === data ? paging.pages : 1
  const { results, meta } = data
  const { shown, hasMore, nextBatch } = pageInfo(results.length, pages, pageSize)

  // After "Load more", move keyboard focus to the first newly shown product, so keyboard and
  // screen-reader users continue where the new products start instead of on a moved button.
  const grid = useRef<HTMLDivElement>(null)
  const focusIndex = useRef<number | null>(null)
  const [announcement, setAnnouncement] = useState('')
  useEffect(() => {
    if (focusIndex.current === null) return
    grid.current?.querySelectorAll<HTMLButtonElement>('.product-link')[focusIndex.current]?.focus()
    focusIndex.current = null
  }, [shown])

  const loadMore = () => {
    focusIndex.current = shown
    setPaging({ data, pages: pages + 1 })
    setAnnouncement(`Showing ${Math.min(shown + pageSize, results.length)} of ${results.length} products`)
  }

  return (
    <div className={loading ? 'results is-loading' : 'results'} aria-busy={loading}>
      <div className="results-header">
        <h1>{resultsHeading(meta, query)}</h1>
        <p className="results-details">{searchDetails(meta)}</p>
      </div>
      {filterBar}
      <div className="product-grid" ref={grid}>
        {results.slice(0, shown).map((product, i) => (
          <ProductCard
            key={product.sku}
            product={product}
            topMatch={meta.mode === 'semantic' && i === 0}
            priority={i < 4}
            onOpen={onOpenProduct}
          />
        ))}
      </div>
      {results.length > pageSize && (
        <div className="load-more">
          <p className="load-more-count">
            Showing {shown} of {results.length} products
          </p>
          {hasMore && (
            <button type="button" className="button-secondary" onClick={loadMore}>
              Load {nextBatch} more
            </button>
          )}
        </div>
      )}
      <p className="visually-hidden" aria-live="polite">
        {paging.data === data ? announcement : ''}
      </p>
    </div>
  )
}
