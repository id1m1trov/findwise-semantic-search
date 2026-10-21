export const PAGE_SIZE_DESKTOP = 12
export const PAGE_SIZE_MOBILE = 6

export interface PageInfo {
  shown: number // products currently visible
  hasMore: boolean
  nextBatch: number // how many the next "Load more" adds (for the button label)
}

/** How many of `total` results are visible after `pages` clicks' worth of `pageSize`. */
export function pageInfo(total: number, pages: number, pageSize: number): PageInfo {
  const shown = Math.min(total, Math.max(1, pages) * pageSize)
  return { shown, hasMore: shown < total, nextBatch: Math.min(pageSize, total - shown) }
}
