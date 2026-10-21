import { describe, expect, it } from 'vitest'
import { PAGE_SIZE_DESKTOP, PAGE_SIZE_MOBILE, pageInfo } from '../src/lib/pagination.ts'

describe('pageInfo', () => {
  it('shows one page at first', () => {
    expect(pageInfo(72, 1, PAGE_SIZE_DESKTOP)).toEqual({ shown: 12, hasMore: true, nextBatch: 12 })
    expect(pageInfo(72, 1, PAGE_SIZE_MOBILE)).toEqual({ shown: 6, hasMore: true, nextBatch: 6 })
  })

  it('adds a page per click and announces a smaller final batch', () => {
    expect(pageInfo(30, 2, 12)).toEqual({ shown: 24, hasMore: true, nextBatch: 6 })
    expect(pageInfo(30, 3, 12)).toEqual({ shown: 30, hasMore: false, nextBatch: 0 })
  })

  it('never shows more than exist, and handles short or empty lists', () => {
    expect(pageInfo(5, 1, 12)).toEqual({ shown: 5, hasMore: false, nextBatch: 0 })
    expect(pageInfo(12, 1, 12)).toEqual({ shown: 12, hasMore: false, nextBatch: 0 })
    expect(pageInfo(0, 1, 12)).toEqual({ shown: 0, hasMore: false, nextBatch: 0 })
  })

  it('treats a page count below one as the first page', () => {
    expect(pageInfo(72, 0, 12).shown).toBe(12)
  })
})
