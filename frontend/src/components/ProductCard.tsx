import type { ProductResult } from '../api/searchApi.ts'
import { formatPrice } from '../lib/format.ts'

const relevanceLabel = { strong: 'Strong match', good: 'Good match' } as const

export function ProductCard({ product }: { product: ProductResult }) {
  return (
    <article className="card">
      <div className="card-top">
        <span className="tag">{product.category}</span>
        {product.relevance && (
          <span className={`badge badge-${product.relevance}`}>{relevanceLabel[product.relevance]}</span>
        )}
      </div>
      <h3 className="card-title">{product.name}</h3>
      <p className="card-description">{product.description}</p>
      <div className="card-bottom">
        <span className="price">{formatPrice(product.price)}</span>
        {product.similarity !== null && (
          <span
            className="similarity"
            title="Cosine similarity between your search and this product's description (0 = unrelated, 1 = same meaning). It is not a percentage or a probability."
          >
            similarity {product.similarity.toFixed(2)}
          </span>
        )}
      </div>
    </article>
  )
}
