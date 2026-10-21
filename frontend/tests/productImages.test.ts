import { describe, expect, it } from 'vitest'
import catalog from '../../backend/data/products.json'
import { categoryCover, photoPageUrl, photoUrl, productPhotos } from '../src/data/productImages.ts'

const skus = new Set(catalog.map((p) => p.sku))

describe('productPhotos', () => {
  it('only maps SKUs that exist in the catalog', () => {
    for (const sku of Object.keys(productPhotos)) expect(skus, sku).toContain(sku)
  })

  it('uses well-formed photo ids for each source and credits a photographer', () => {
    for (const [sku, photo] of Object.entries(productPhotos)) {
      if (photo.source === 'unsplash') {
        expect(photo.photo, sku).toMatch(/^photo-\d+-[0-9a-f]+$/)
        expect(photo.id, sku).toMatch(/^[A-Za-z0-9_-]{11}$/)
      } else {
        expect(photo.id, sku).toMatch(/^\d+$/)
        expect(photo.page, sku).toMatch(new RegExp(`^/photo/[a-z0-9-]+-${photo.id}/$`))
      }
      expect(photo.author.trim(), sku).not.toBe('')
    }
  })

  it('leaves products without an honest match on a placeholder', () => {
    const withoutPhoto = [...skus].filter((sku) => !productPhotos[sku]).sort()
    expect(withoutPhoto).toEqual(['FIT-010', 'FIT-012', 'HOM-003', 'OUT-010'])
  })

  it('has a cover photo for every category', () => {
    for (const category of new Set(catalog.map((p) => p.category))) {
      expect(productPhotos[categoryCover[category]], category).toBeDefined()
    }
  })

  it('builds CDN and credit URLs for both sources', () => {
    expect(photoUrl(productPhotos['OUT-001'], 400)).toBe(
      'https://images.unsplash.com/photo-1613645540553-d98859ffeec5?w=400&h=300&fit=crop&auto=format&q=70',
    )
    expect(photoPageUrl(productPhotos['OUT-001'])).toBe('https://unsplash.com/photos/l4VPAybei94')
    expect(photoUrl(productPhotos['FIT-007'], 400)).toBe(
      'https://images.pexels.com/photos/6207519/pexels-photo-6207519.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
    )
    expect(photoPageUrl(productPhotos['FIT-007'])).toBe('https://www.pexels.com/photo/foam-textured-roller-prepared-for-massage-6207519/')
  })
})
