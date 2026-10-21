import type { FormEvent } from 'react'
import { useCart } from '../cart/CartContext.tsx'

interface SiteHeaderProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onHome: () => void
  onOpenCart: () => void
}

export function SiteHeader({ value, onChange, onSubmit, onHome, onOpenCart }: SiteHeaderProps) {
  const { count } = useCart()
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <button type="button" className="wordmark" onClick={onHome}>
          Marlow &amp; Co.<span className="visually-hidden">, home</span>
        </button>
        <form className="search" role="search" onSubmit={handleSubmit}>
          <label htmlFor="search-input" className="visually-hidden">
            Search products
          </label>
          <input
            id="search-input"
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Describe what you're looking for"
            maxLength={200}
            autoComplete="off"
          />
          <button type="submit" className="search-button" aria-label="Search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>
        </form>
        <button
          type="button"
          className="cart-button"
          onClick={onOpenCart}
          aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 7h12l-1 13H7L6 7Z" />
            <path d="M9 7V6a3 3 0 0 1 6 0v1" />
          </svg>
          {count > 0 && (
            <span className="cart-count" aria-hidden="true">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
