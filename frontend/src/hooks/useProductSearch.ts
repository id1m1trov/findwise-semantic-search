import { useCallback, useEffect, useState } from 'react'
import { browseProducts, type SearchRequest, type SearchResponse, searchProducts } from '../api/searchApi.ts'

/** What the shop page shows: a semantic search when there is a query, otherwise a browse. */
export interface ShopRequest extends SearchRequest {
  categories: string[] // needed to browse "all categories" (see browseProducts)
}

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; previous: SearchResponse | null }
  | { status: 'success'; data: SearchResponse }
  | { status: 'error'; message: string }

/** The last finished request, tagged with the request it answered. */
type Settled = { requestId: string; data: SearchResponse } | { requestId: string; error: string }

const run = ({ query, filters, categories }: ShopRequest, signal: AbortSignal) =>
  query.trim() ? searchProducts({ query, filters }, signal) : browseProducts(filters, categories, signal)

/**
 * Runs a search or browse whenever `request` changes (null = nothing to show yet).
 * A newer request aborts the older one, so a slow response can never overwrite a newer result.
 * Loading is derived, not stored: if the last answer belongs to a different request, we are loading.
 */
export function useProductSearch(request: ShopRequest | null) {
  const [settled, setSettled] = useState<Settled | null>(null)
  const [attempt, setAttempt] = useState(0) // bumping this re-runs the same request ("Try again")
  const key = request ? JSON.stringify(request) : null
  const requestId = key ? `${attempt}:${key}` : null

  useEffect(() => {
    if (!key || !requestId) return
    const controller = new AbortController()
    run(JSON.parse(key) as ShopRequest, controller.signal)
      .then((data) => setSettled({ requestId, data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setSettled({ requestId, error: error instanceof Error ? error.message : 'Something went wrong.' })
      })
    return () => controller.abort()
  }, [key, requestId])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  let state: SearchState
  if (!requestId) state = { status: 'idle' }
  else if (settled?.requestId !== requestId) {
    state = { status: 'loading', previous: settled && 'data' in settled ? settled.data : null }
  } else if ('error' in settled) state = { status: 'error', message: settled.error }
  else state = { status: 'success', data: settled.data }

  return { state, retry }
}
