// Typed client for the backend API. These types mirror the JSON the backend returns.

export type Relevance = 'strong' | 'good'

export interface ProductResult {
  sku: string
  name: string
  description: string
  category: string
  price: number // EUR
  similarity: number | null // null when browsing without a query
  relevance: Relevance | null
}

export type SearchOutcome = 'results' | 'no_filter_matches' | 'no_relevant_matches'

export interface SearchMeta {
  mode: 'semantic' | 'browse'
  outcome: SearchOutcome
  matchingFilters: number
  relevantCount: number
  returned: number
  minSimilarity: number
  tookMs: number
}

export interface SearchResponse {
  results: ProductResult[]
  meta: SearchMeta
}

/** Filter values as typed in the form: empty string means "not set". */
export interface SearchFilters {
  category: string
  minPrice: string
  maxPrice: string
}

export interface SearchRequest {
  query: string
  filters: SearchFilters
}

// Both use the API maximum. Results are revealed a page at a time in the UI ("Load more"),
// so asking for more costs only a few KB of JSON; images load only for visible cards.
export const RESULT_LIMIT = 50
export const BROWSE_LIMIT = 50 // every category has fewer products than this

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Builds the query string, leaving out anything that is empty. */
export function buildSearchParams({ query, filters }: SearchRequest, limit = RESULT_LIMIT): URLSearchParams {
  const params = new URLSearchParams()
  if (query.trim()) params.set('q', query.trim())
  if (filters.category) params.set('category', filters.category)
  if (filters.minPrice.trim()) params.set('minPrice', filters.minPrice.trim())
  if (filters.maxPrice.trim()) params.set('maxPrice', filters.maxPrice.trim())
  params.set('limit', String(limit))
  return params
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('Could not reach the search service. Is the backend running?', 0)
  }
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    // Our backend always answers with JSON { error, details? }. A 5xx without it comes from a
    // proxy in between (e.g. the Vite dev server when the backend is not running).
    if (!body?.error && response.status >= 500) {
      throw new ApiError('The search service is unavailable. Is the backend running?', response.status)
    }
    const message = body?.details?.[0]?.message ?? body?.error ?? `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }
  return body as T
}

export function searchProducts(request: SearchRequest, signal?: AbortSignal, limit = RESULT_LIMIT): Promise<SearchResponse> {
  return getJson<SearchResponse>(`/api/search?${buildSearchParams(request, limit)}`, signal)
}

/**
 * Lists products without a search query, alphabetically. The API has no paging and returns at
 * most 50 products, so "all categories" is fetched one category at a time (each has far fewer
 * than 50) and merged. Filtering still happens in the backend's SQL; nothing is re-implemented here.
 */
export async function browseProducts(
  filters: SearchFilters,
  categories: string[],
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const browse = (category: string) =>
    searchProducts({ query: '', filters: { ...filters, category } }, signal, BROWSE_LIMIT)
  if (filters.category) return browse(filters.category)

  const responses = await Promise.all(categories.map(browse))
  const results = responses
    .flatMap((r) => r.results)
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
  const matching = responses.reduce((sum, r) => sum + r.meta.matchingFilters, 0)
  return {
    results,
    meta: {
      mode: 'browse',
      outcome: results.length ? 'results' : 'no_filter_matches',
      matchingFilters: matching,
      relevantCount: matching,
      returned: results.length,
      minSimilarity: responses[0]?.meta.minSimilarity ?? 0,
      tookMs: Math.max(0, ...responses.map((r) => r.meta.tookMs)),
    },
  }
}

export async function fetchCategories(signal?: AbortSignal): Promise<string[]> {
  return (await getJson<{ categories: string[] }>('/api/categories', signal)).categories
}
