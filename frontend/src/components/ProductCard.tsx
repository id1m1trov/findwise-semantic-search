import { memo } from 'react'
import type { ProductResult } from '../api/searchApi.ts'
import { photoUrl, productPhotos } from '../data/productImages.ts'
import { formatPrice } from '../lib/format.ts'
import { ProductImage } from './ProductImage.tsx'

interface ProductCardProps {
  product: ProductResult
  topMatch: boolean
  priority: boolean // first row: load the image straight away instead of lazily
  onOpen: (product: ProductResult) => void
  headingLevel?: 'h2' | 'h3' // h3 where the cards sit under a section heading (home page)
}

// memo: typing in the search box re-renders the whole app, but a card only needs to re-render
// when its own product changes. This keeps typing smooth with many cards on screen.
export const ProductCard = memo(function ProductCard({ product, topMatch, priority, onOpen, headingLevel = 'h2' }: ProductCardProps) {
  const photo = productPhotos[product.sku]
  const Heading = headingLevel

  return (
    <article className="product">
      <div className="product-image">
        {photo ? (
          <img
            src={photoUrl(photo, 480)}
            srcSet={`${photoUrl(photo, 240)} 240w, ${photoUrl(photo, 480)} 480w, ${photoUrl(photo, 800)} 800w`}
            sizes="(max-width: 720px) 96px, 260px"
            alt="" // decorative: the product name is right next to it
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
          />
        ) : (
          <ProductImage sku={product.sku} />
        )}
      </div>
      <div className="product-body">
        <p className="product-meta">{topMatch ? 'Top match' : product.category}</p>
        <Heading className="product-name">
          {/* One button per card, stretched over the whole card so the image is clickable too.
              Keyboard users only have to tab past one element per card. */}
          <button type="button" className="product-link" onClick={() => onOpen(product)} aria-haspopup="dialog">
            <span className="underline">{product.name}</span>
          </button>
        </Heading>
        <p className="product-description">{product.description}</p>
        <p className="product-price">{formatPrice(product.price)}</p>
      </div>
    </article>
  )
})
