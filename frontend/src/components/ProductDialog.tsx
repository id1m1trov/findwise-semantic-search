import { useEffect, useRef, useState } from 'react'
import type { ProductResult } from '../api/searchApi.ts'
import { useCart } from '../cart/CartContext.tsx'
import { formatPrice } from '../lib/format.ts'
import { ProductImage } from './ProductImage.tsx'

interface ProductDialogProps {
  product: ProductResult | null
  onClose: () => void
  onViewCart: () => void
}

/**
 * Product details in a native modal <dialog>: the browser traps focus inside it, closes it on
 * Escape and returns focus to the button that opened it.
 */
export function ProductDialog({ product, onClose, onViewCart }: ProductDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const { add } = useCart()
  const [added, setAdded] = useState<string | null>(null) // sku just added, for the confirmation

  useEffect(() => {
    if (product && !dialog.current?.open) dialog.current?.showModal()
    if (!product && dialog.current?.open) dialog.current.close()
  }, [product])

  return (
    <dialog
      ref={dialog}
      className="dialog product-dialog"
      aria-labelledby="product-dialog-title"
      onClose={() => {
        setAdded(null)
        onClose()
      }}
      // A click on the backdrop lands on the <dialog> element itself, not on its content.
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
    >
      {product && (
        <div className="product-dialog-layout">
          <div className="product-dialog-image">
            <ProductImage sku={product.sku} width={1000} sizes="(max-width: 720px) 100vw, 480px" />
          </div>
          <div className="product-dialog-body">
            <p className="product-meta">{product.category}</p>
            <h2 id="product-dialog-title">{product.name}</h2>
            <p className="product-dialog-price">{formatPrice(product.price)}</p>
            <p className="product-dialog-description">{product.description}</p>
            <div className="product-dialog-actions">
              <button
                type="button"
                className="button-primary"
                onClick={() => {
                  add(product)
                  setAdded(product.sku)
                }}
              >
                Add to cart
              </button>
              {added === product.sku && (
                <p className="added-note">
                  Added.{' '}
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => {
                      dialog.current?.close()
                      onViewCart()
                    }}
                  >
                    View cart
                  </button>
                </p>
              )}
            </div>
            {product.similarity !== null && (
              <p className="product-dialog-note">
                Similarity to your search: {product.similarity.toFixed(2)} (a 0–1 score comparing meanings, not a
                percentage).
              </p>
            )}
          </div>
          <button type="button" className="dialog-close" aria-label="Close" onClick={() => dialog.current?.close()}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      )}
    </dialog>
  )
}
