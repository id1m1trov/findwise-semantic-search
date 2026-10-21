import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import type { ProductResult } from '../api/searchApi.ts'
import { type CartItem, cartCount, cartReducer, cartTotal, parseStoredCart, STORAGE_KEY } from '../lib/cart.ts'

interface CartContextValue {
  items: CartItem[]
  count: number
  total: number
  add: (product: ProductResult, quantity?: number) => void
  setQuantity: (item: CartItem, quantity: number) => void
  remove: (item: CartItem) => void
  /** Last cart change, for the screen-reader live region. */
  announcement: string
}

const CartContext = createContext<CartContextValue | null>(null)

function loadCart(): CartItem[] {
  try {
    return parseStoredCart(localStorage.getItem(STORAGE_KEY))
  } catch {
    return [] // storage blocked (private mode, disabled cookies): start empty
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, loadCart)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // storage full or blocked: the cart still works for this visit
    }
  }, [items])

  const add = useCallback((product: ProductResult, quantity = 1) => {
    const { sku, name, category, price } = product
    dispatch({ type: 'add', item: { sku, name, category, price }, quantity })
    setAnnouncement(`Added ${name} to your cart`)
  }, [])

  const setQuantity = useCallback((item: CartItem, quantity: number) => {
    dispatch({ type: 'setQuantity', sku: item.sku, quantity })
    setAnnouncement(quantity <= 0 ? `Removed ${item.name} from your cart` : `${item.name}: quantity ${quantity}`)
  }, [])

  const remove = useCallback((item: CartItem) => {
    dispatch({ type: 'remove', sku: item.sku })
    setAnnouncement(`Removed ${item.name} from your cart`)
  }, [])

  const value = useMemo(
    () => ({ items, count: cartCount(items), total: cartTotal(items), add, setQuantity, remove, announcement }),
    [items, add, setQuantity, remove, announcement],
  )
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// oxlint-disable-next-line react/only-export-components -- the hook belongs with its provider
export function useCart(): CartContextValue {
  const cart = useContext(CartContext)
  if (!cart) throw new Error('useCart must be used inside <CartProvider>')
  return cart
}
