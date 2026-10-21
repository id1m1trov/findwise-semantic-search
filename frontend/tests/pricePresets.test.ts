import { describe, expect, it } from 'vitest'
import { ANY_PRICE, isPresetActive, PRICE_PRESETS } from '../src/lib/pricePresets.ts'

// The backend treats both bounds as inclusive and converts euros to whole cents.
const toCents = (euros: string) => (euros === '' ? null : Math.round(Number(euros) * 100))

describe('PRICE_PRESETS', () => {
  it('covers every price exactly once (no gaps, no overlaps)', () => {
    for (let cents = 0; cents <= 30000; cents++) {
      const matches = PRICE_PRESETS.filter((p) => {
        const min = toCents(p.minPrice)
        const max = toCents(p.maxPrice)
        return (min === null || cents >= min) && (max === null || cents <= max)
      })
      expect(matches.length, `price ${cents / 100}`).toBe(1)
    }
  })

  it('puts boundary prices in the range their label promises', () => {
    const rangeFor = (euros: number) =>
      PRICE_PRESETS.find((p) => (p.minPrice === '' || euros >= Number(p.minPrice)) && (p.maxPrice === '' || euros <= Number(p.maxPrice)))!.label
    expect(rangeFor(24.99)).toBe('Under €25')
    expect(rangeFor(25)).toBe('€25 – €49.99')
    expect(rangeFor(50)).toBe('€50 – €99.99')
    expect(rangeFor(100)).toBe('€100 and up')
  })

  it('recognises the active preset from the filter values', () => {
    expect(isPresetActive(PRICE_PRESETS[1], { category: '', minPrice: '25', maxPrice: '49.99' })).toBe(true)
    expect(isPresetActive(PRICE_PRESETS[1], { category: '', minPrice: '25', maxPrice: '50' })).toBe(false)
  })

  it('treats "Any price" as no price filter, and a custom range as no preset', () => {
    expect(isPresetActive(ANY_PRICE, { category: 'Home', minPrice: '', maxPrice: '' })).toBe(true)
    const custom = { category: '', minPrice: '10', maxPrice: '30' }
    expect([ANY_PRICE, ...PRICE_PRESETS].some((p) => isPresetActive(p, custom))).toBe(false)
  })
})
