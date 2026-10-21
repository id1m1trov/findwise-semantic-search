import type { Ref } from 'react'
import { useCart } from '../cart/CartContext.tsx'
import { MAX_QUANTITY } from '../lib/cart.ts'
import { formatPrice } from '../lib/format.ts'
import { ProductImage } from './ProductImage.tsx'

/** The cart as a side panel, built on the browser's <dialog> (keeps focus inside, closes on Escape). */
export function CartDrawer({ ref }: { ref: Ref<HTMLDialogElement> }) {
  const { items, count, total, setQuantity, remove } = useCart()

  return (
    <dialog
      ref={ref}
      className="dialog drawer"
      aria-labelledby="cart-title"
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
    >
      <form method="dialog" className="drawer-header">
        <h2 id="cart-title">
          Your cart{count > 0 && <span className="drawer-count"> ({count})</span>}
        </h2>
        <button type="submit" className="dialog-close" aria-label="Close cart">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </form>

      {items.length === 0 ? (
        <div className="drawer-empty">
          <p>Your cart is empty.</p>
          <form method="dialog">
            <button type="submit" className="button-secondary">
              Continue shopping
            </button>
          </form>
        </div>
      ) : (
        <>
          <ul className="cart-items">
            {items.map((item) => (
              <li key={item.sku} className="cart-item">
                <div className="cart-item-image">
                  <ProductImage sku={item.sku} width={160} />
                </div>
                <div className="cart-item-body">
                  <p className="cart-item-name">{item.name}</p>
                  <p className="cart-item-price">{formatPrice(item.price)}</p>
                  <div className="cart-item-actions">
                    <div className="stepper" role="group" aria-label={`Quantity of ${item.name}`}>
                      <button
                        type="button"
                        onClick={() => setQuantity(item, item.quantity - 1)}
                        aria-label={item.quantity === 1 ? `Remove ${item.name}` : `Decrease quantity of ${item.name}`}
                      >
                        −
                      </button>
                      <span className="stepper-value">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(item, item.quantity + 1)}
                        aria-label={`Increase quantity of ${item.name}`}
                        aria-disabled={item.quantity >= MAX_QUANTITY || undefined}
                      >
                        +
                      </button>
                    </div>
                    <button type="button" className="text-link cart-remove" onClick={() => remove(item)}>
                      Remove<span className="visually-hidden"> {item.name}</span>
                    </button>
                  </div>
                </div>
                <p className="cart-item-total">{formatPrice(item.price * item.quantity)}</p>
              </li>
            ))}
          </ul>
          <div className="drawer-footer">
            <p className="drawer-total">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </p>
            <p className="drawer-note">This is a demo store, so checkout isn't available. Your cart is saved on this device.</p>
          </div>
        </>
      )}
    </dialog>
  )
}
