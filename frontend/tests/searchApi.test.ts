import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, buildSearchParams, searchProducts } from '../src/api/searchApi.ts'

const noFilters = { category: '', minPrice: '', maxPrice: '' }

describe('buildSearchParams', () => {
  it('leaves out empty values and trims the query', () => {
    expect(buildSearchParams({ query: '  thermos ', filters: noFilters }).toString()).toBe('q=thermos&limit=24')
  })

  it('encodes categories with special characters', () => {
    const params = buildSearchParams({ query: '', filters: { ...noFilters, category: 'Kitchen & Drinkware' } })
    expect(params.toString()).toBe('category=Kitchen+%26+Drinkware&limit=24')
  })

  it('includes price bounds', () => {
    const params = buildSearchParams({ query: 'mug', filters: { category: '', minPrice: '5', maxPrice: '20.50' } })
    expect(Object.fromEntries(params)).toEqual({ q: 'mug', minPrice: '5', maxPrice: '20.50', limit: '24' })
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
