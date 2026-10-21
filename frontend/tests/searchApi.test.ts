// API client: request URLs, merging per-category results, and readable error messages.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, browseProducts, buildSearchParams, searchProducts } from '../src/api/searchApi.ts'

const noFilters = { category: '', minPrice: '', maxPrice: '' }

describe('buildSearchParams', () => {
  it('leaves out empty values and trims the query', () => {
    expect(buildSearchParams({ query: '  thermos ', filters: noFilters }).toString()).toBe('q=thermos&limit=50')
  })

  it('encodes categories with special characters', () => {
    const params = buildSearchParams({ query: '', filters: { ...noFilters, category: 'Kitchen & Drinkware' } })
    expect(params.toString()).toBe('category=Kitchen+%26+Drinkware&limit=50')
  })

  it('includes price bounds', () => {
    const params = buildSearchParams({ query: 'mug', filters: { category: '', minPrice: '5', maxPrice: '20.50' } })
    expect(Object.fromEntries(params)).toEqual({ q: 'mug', minPrice: '5', maxPrice: '20.50', limit: '50' })
  })
})

describe('browseProducts', () => {
  afterEach(() => vi.unstubAllGlobals())

  const product = (sku: string, name: string, category: string) => ({ sku, name, category, description: '', price: 10, similarity: null, relevance: null })
  const page = (results: ReturnType<typeof product>[]) => ({
    results,
    meta: { mode: 'browse', outcome: results.length ? 'results' : 'no_filter_matches', matchingFilters: results.length, relevantCount: results.length, returned: results.length, minSimilarity: 0.3, tookMs: 2 },
  })

  it('fetches every category for "all", merges A–Z and adds up the counts', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(url)
      const category = new URL(url, 'http://x').searchParams.get('category')
      const data = category === 'Home' ? [product('HOM-1', 'Pillow', 'Home')] : [product('FIT-1', 'Kettlebell', 'Fitness'), product('FIT-2', 'Yoga Mat', 'Fitness')]
      return new Response(JSON.stringify(page(data)))
    })
    const result = await browseProducts({ category: '', minPrice: '', maxPrice: '25' }, ['Fitness', 'Home'])
    expect(result.results.map((p) => p.name)).toEqual(['Kettlebell', 'Pillow', 'Yoga Mat'])
    expect(result.meta).toMatchObject({ mode: 'browse', outcome: 'results', matchingFilters: 3, returned: 3 })
    expect(urls.every((u) => u.includes('maxPrice=25') && u.includes('limit=50') && !u.includes('q='))).toBe(true)
  })

  it('makes a single request when a category is selected', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(page([]))))
    vi.stubGlobal('fetch', fetchMock)
    const result = await browseProducts({ category: 'Home', minPrice: '', maxPrice: '' }, ['Fitness', 'Home'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.meta.outcome).toBe('no_filter_matches')
  })
})

describe('searchProducts', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('surfaces the validation message from a 400 response', async () => {
    vi.stubGlobal('fetch', async () =>
      new Response(JSON.stringify({ error: 'Invalid search parameters', details: [{ field: 'minPrice', message: 'minPrice must not be greater than maxPrice' }] }), { status: 400 }),
    )
    await expect(searchProducts({ query: 'x', filters: noFilters })).rejects.toEqual(
      new ApiError('minPrice must not be greater than maxPrice', 400),
    )
  })

  it('explains a proxy error (backend down behind the dev server)', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 502 }))
    await expect(searchProducts({ query: 'x', filters: noFilters })).rejects.toThrow(/unavailable/)
  })

  it('explains when the backend cannot be reached', async () => {
    vi.stubGlobal('fetch', async () => Promise.reject(new TypeError('Failed to fetch')))
    await expect(searchProducts({ query: 'x', filters: noFilters })).rejects.toThrow(/backend running/)
  })
})
