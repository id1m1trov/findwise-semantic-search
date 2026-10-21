import { useEffect, useMemo, useRef, useState } from 'react'
import { browseProducts, fetchCategories, type ProductResult, type SearchFilters } from './api/searchApi.ts'
import { CartProvider, useCart } from './cart/CartContext.tsx'
import { CartDrawer } from './components/CartDrawer.tsx'
import { CategoryNav } from './components/CategoryNav.tsx'
import { FilterPanel } from './components/FilterPanel.tsx'
import { HomeView } from './components/HomeView.tsx'
import { HowItWorksDialog } from './components/HowItWorksDialog.tsx'
import { ProductDialog } from './components/ProductDialog.tsx'
import { SearchResults } from './components/SearchResults.tsx'
import { SiteFooter } from './components/SiteFooter.tsx'
import { SiteHeader } from './components/SiteHeader.tsx'
import { useDebouncedValue } from './hooks/useDebouncedValue.ts'
import { type ShopRequest, useProductSearch } from './hooks/useProductSearch.ts'
import { hasActiveFilters, priceRangeError } from './lib/format.ts'

const EXAMPLES = [
  'something to keep my drink hot on a camping trip',
  'water bottle for the gym',
  'light for my tent at night',
  'stay cool while running in summer',
  'gift for a coffee lover',
]

const FEATURED_SKUS = ['OUT-001', 'KIT-005', 'ELE-001', 'CLO-005', 'HOM-002', 'FIT-003', 'OUT-004', 'KIT-002']

const NO_FILTERS: SearchFilters = { category: '', minPrice: '', maxPrice: '' }

export default function App() {
  return (
    <CartProvider>
      <Shop />
    </CartProvider>
  )
}

function Shop() {
  const [view, setView] = useState<'home' | 'shop'>('home')
  const [input, setInput] = useState('') // what is in the search box
  const [query, setQuery] = useState('') // what was last submitted
  const [filters, setFilters] = useState<SearchFilters>(NO_FILTERS)
  const [categories, setCategories] = useState<string[]>([])
  const [featured, setFeatured] = useState<ProductResult[] | null>(null)
  const [openProduct, setOpenProduct] = useState<ProductResult | null>(null)
  const { announcement } = useCart()
  const howItWorks = useRef<HTMLDialogElement>(null)
  const mobileFilters = useRef<HTMLDialogElement>(null)
  const cartDrawer = useRef<HTMLDialogElement>(null)
  const main = useRef<HTMLElement>(null)

  // The backend can still be starting (loading the model) when the page opens, so a failed
  // load is retried every 2 s for a while. "Try again" after a failed search also bumps it.
  const [categoriesAttempt, setCategoriesAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    fetchCategories(controller.signal)
      .then(setCategories)
      .catch(() => {
        if (controller.signal.aborted || categoriesAttempt >= 15) return // the search reports lasting problems
        retryTimer = setTimeout(() => setCategoriesAttempt((n) => n + 1), 2000)
      })
    return () => {
      controller.abort()
      clearTimeout(retryTimer)
    }
  }, [categoriesAttempt])

  // Featured products for the home page, once the categories are known.
  useEffect(() => {
    if (categories.length === 0) return
    const controller = new AbortController()
    browseProducts(NO_FILTERS, categories, controller.signal)
      .then(({ results }) => {
        const bySku = new Map(results.map((p) => [p.sku, p]))
        setFeatured(FEATURED_SKUS.flatMap((sku) => bySku.get(sku) ?? []))
      })
      .catch(() => {}) // the section keeps its placeholders; browsing still reports errors
    return () => controller.abort()
  }, [categories])

  // The category applies immediately; typed prices wait until the user pauses.
  // (Two strings, not one object: a new object on every render would keep restarting the wait.)
  const minPrice = useDebouncedValue(filters.minPrice, 400)
  const maxPrice = useDebouncedValue(filters.maxPrice, 400)
  const activeFilters = useMemo(
    () => ({ category: filters.category, minPrice, maxPrice }),
    [filters.category, minPrice, maxPrice],
  )
  const priceError = priceRangeError(filters)

  // On the shop page, empty search text lists the (filtered) products; null = nothing to load yet.
  const request = useMemo<ShopRequest | null>(() => {
    if (view !== 'shop' || priceRangeError(activeFilters)) return null
    const browsingAll = !query.trim() && !activeFilters.category
    if (browsingAll && categories.length === 0) return null // wait for the category list
    return { query, filters: activeFilters, categories: browsingAll ? categories : [] }
  }, [view, query, activeFilters, categories])

  const { state, retry } = useProductSearch(request)

  // Choosing a popular search, a category tile or "Clear all" removes the button that had
  // focus, which would send keyboard and screen-reader users back to the top of the page.
  // Only in that case, move focus to the main content. (Typing in the search box is untouched.)
  useEffect(() => {
    if (document.activeElement === document.body) main.current?.focus({ preventScroll: true })
  }, [view, filters, query])

  const shop = (patch: Partial<SearchFilters> = {}) => {
    setFilters((current) => ({ ...current, ...patch }))
    setView('shop')
    window.scrollTo({ top: 0 })
  }
  const runExample = (example: string) => {
    setInput(example)
    setQuery(example)
    setView('shop')
    window.scrollTo({ top: 0 })
  }
  const goHome = () => {
    setInput('')
    setQuery('')
    setFilters(NO_FILTERS)
    setView('home')
  }
  // The category bar, footer links and home tiles navigate: they leave any search and browse the
  // chosen category (or everything). The sidebar filters refine the current search instead.
  const browse = (category: string) => {
    setInput('')
    setQuery('')
    shop({ ...NO_FILTERS, category })
  }
  const shopAll = () => browse('')
  const activeFilterCount = Number(Boolean(filters.category)) + Number(Boolean(filters.minPrice || filters.maxPrice))

  return (
    <div className="page">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader
        value={input}
        onChange={setInput}
        onSubmit={() => {
          setQuery(input)
          setView('shop')
        }}
        onHome={goHome}
        onOpenCart={() => cartDrawer.current?.showModal()}
      />
      <CategoryNav
        categories={categories}
        active={view === 'shop' ? filters.category : null}
        onSelect={browse}
      />

      <main className="main" id="main" ref={main} tabIndex={-1}>
        {view === 'home' ? (
          <HomeView
            categories={categories}
            examples={EXAMPLES}
            featured={featured}
            onExample={runExample}
            onCategory={browse}
            onShopAll={shopAll}
            onOpenProduct={setOpenProduct}
          />
        ) : (
          <div className="shop-layout">
            <aside className="sidebar" aria-label="Filters">
              <FilterPanel idPrefix="side" categories={categories} filters={filters} onChange={setFilters} priceError={priceError} />
            </aside>
            <div>
              <button type="button" className="button-secondary mobile-filter-button" onClick={() => mobileFilters.current?.showModal()}>
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>
              <SearchResults
                state={state}
                query={query}
                filters={filters}
                filtered={hasActiveFilters(activeFilters)}
                invalidFilters={priceError !== null}
                onFiltersChange={setFilters}
                onRetry={() => {
                  retry()
                  if (categories.length === 0) setCategoriesAttempt((n) => n + 1)
                }}
                examples={EXAMPLES}
                onExample={runExample}
                onOpenProduct={setOpenProduct}
              />
            </div>
          </div>
        )}
      </main>

      <SiteFooter
        categories={categories}
        onShop={browse}
        onHowItWorks={() => howItWorks.current?.showModal()}
      />

      <dialog ref={mobileFilters} className="dialog sheet" aria-label="Filters">
        <form method="dialog">
          <FilterPanel idPrefix="sheet" categories={categories} filters={filters} onChange={setFilters} priceError={priceError} />
          <button type="submit" className="button-primary">
            Show results
          </button>
        </form>
      </dialog>
      <ProductDialog product={openProduct} onClose={() => setOpenProduct(null)} onViewCart={() => cartDrawer.current?.showModal()} />
      <CartDrawer ref={cartDrawer} />
      <HowItWorksDialog ref={howItWorks} />
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </div>
  )
}
