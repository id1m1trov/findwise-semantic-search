import type { ProductResult } from '../api/searchApi.ts'
import { categoryCover, photoUrl, productPhotos } from '../data/productImages.ts'
import { ProductCard } from './ProductCard.tsx'

interface HomeViewProps {
  categories: string[]
  examples: string[]
  featured: ProductResult[] | null
  onExample: (query: string) => void
  onCategory: (category: string) => void
  onShopAll: () => void
  onOpenProduct: (product: ProductResult) => void
}

const HERO_PHOTO = productPhotos['OUT-007']

/** Store front page: introduction, categories, featured products and a nudge to try search. */
export function HomeView({ categories, examples, featured, onExample, onCategory, onShopAll, onOpenProduct }: HomeViewProps) {
  return (
    <div className="home">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-text">
          <p className="eyebrow">New season · Outdoors and home</p>
          <h1 id="hero-title">Good things for the trail, the kitchen and everything between</h1>
          <p>
            Thoughtfully chosen gear and everyday essentials. Can't remember what something is called? Describe it and
            our search will find it.
          </p>
          <div className="hero-actions">
            <button type="button" className="button-primary" onClick={onShopAll}>
              Shop all products
            </button>
            <button type="button" className="button-secondary" onClick={() => onCategory('Camping & Outdoors')}>
              Explore outdoors
            </button>
          </div>
        </div>
        <div className="hero-image">
          {/* This photo is the largest element on screen (LCP). Narrow screens show it in a 16:9
              frame, so they get 16:9 crops in small steps instead of the taller desktop image. */}
          <picture>
            <source
              media="(max-width: 880px)"
              srcSet={[480, 700, 1000].map((w) => `${photoUrl(HERO_PHOTO, w, Math.round((w * 9) / 16))} ${w}w`).join(', ')}
              sizes="(max-width: 720px) calc(100vw - 32px), calc(100vw - 48px)"
            />
            <img
              src={photoUrl(HERO_PHOTO, 900, 700)}
              srcSet={`${photoUrl(HERO_PHOTO, 600, 467)} 600w, ${photoUrl(HERO_PHOTO, 900, 700)} 900w, ${photoUrl(HERO_PHOTO, 1300, 1011)} 1300w`}
              sizes="560px"
              alt=""
              fetchPriority="high"
            />
          </picture>
        </div>
      </section>

      <section aria-labelledby="shop-by-category">
        <h2 id="shop-by-category" className="section-title">
          Shop by category
        </h2>
        <ul className="category-tiles">
          {categories.length === 0 &&
            // Reserve the space while categories load, so the page does not jump when they arrive.
            Array.from({ length: 6 }, (_, i) => (
              <li key={i} aria-hidden="true">
                <span className="category-tile-image" />
                <span className="category-tile-name">&nbsp;</span>
              </li>
            ))}
          {categories.map((category) => {
            const photo = productPhotos[categoryCover[category]]
            return (
              <li key={category}>
                <button type="button" onClick={() => onCategory(category)}>
                  <span className="category-tile-image">
                    {photo && <img src={photoUrl(photo, 400)} alt="" loading="lazy" decoding="async" />}
                  </span>
                  <span className="category-tile-name">
                    <span className="underline">{category}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="featured">
        <div className="section-heading">
          <h2 id="featured" className="section-title">
            Featured
          </h2>
          <button type="button" className="text-link" onClick={onShopAll}>
            View all products
          </button>
        </div>
        <div className="product-grid">
          {featured
            ? featured.map((product) => (
                <ProductCard key={product.sku} product={product} topMatch={false} priority={false} onOpen={onOpenProduct} headingLevel="h3" />
              ))
            : Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="product skeleton" aria-hidden="true">
                  <div className="product-image" />
                  <div className="product-body">
                    <span className="skeleton-line" />
                    <span className="skeleton-line short" />
                  </div>
                </div>
              ))}
        </div>
      </section>

      <section className="search-teaser" aria-labelledby="search-teaser">
        <h2 id="search-teaser" className="section-title">
          Search the way you talk
        </h2>
        <p>Our search understands what you mean, not just the words you type. Try one of these:</p>
        <ul className="popular-searches">
          {examples.map((example) => (
            <li key={example}>
              <button type="button" className="text-link" onClick={() => onExample(example)}>
                {example}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
