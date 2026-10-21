// Cart state as pure functions, so it can be tested without React or a browser.

export interface CartItem {
  sku: string
  name: string
  category: string
  price: number // EUR, as shown when the item was added
  quantity: number
}

export type CartAction =
  | { type: 'add'; item: Omit<CartItem, 'quantity'>; quantity?: number }
  | { type: 'setQuantity'; sku: string; quantity: number }
  | { type: 'remove'; sku: string }
  | { type: 'clear' }

export const MAX_QUANTITY = 99
export const STORAGE_KEY = 'marlow-cart-v1'

const clamp = (n: number) => Math.min(MAX_QUANTITY, Math.max(0, Math.floor(n)))

export function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'add': {
      const add = clamp(action.quantity ?? 1)
      const existing = items.find((i) => i.sku === action.item.sku)
      if (existing) return items.map((i) => (i === existing ? { ...i, quantity: clamp(i.quantity + add) } : i))
      return add > 0 ? [...items, { ...action.item, quantity: add }] : items
    }
    case 'setQuantity': {
      const quantity = clamp(action.quantity)
      if (quantity === 0) return items.filter((i) => i.sku !== action.sku)
      return items.map((i) => (i.sku === action.sku ? { ...i, quantity } : i))
    }
    case 'remove':
      return items.filter((i) => i.sku !== action.sku)
    case 'clear':
      return []
  }
}

export const cartCount = (items: CartItem[]): number => items.reduce((sum, i) => sum + i.quantity, 0)

/** Summed in whole cents so 0.1 + 0.2 style float errors never reach the total. */
export const cartTotal = (items: CartItem[]): number =>
  items.reduce((sum, i) => sum + Math.round(i.price * 100) * i.quantity, 0) / 100

/** Reads a saved cart, ignoring anything malformed (old formats, manual edits, other apps). */
export function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return []
  try {
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.filter(
      (i): i is CartItem =>
        typeof i?.sku === 'string' &&
        typeof i.name === 'string' &&
        typeof i.category === 'string' &&
        typeof i.price === 'number' &&
        Number.isFinite(i.price) &&
        i.price >= 0 &&
        Number.isInteger(i.quantity) &&
        i.quantity > 0 &&
        i.quantity <= MAX_QUANTITY,
    )
  } catch {
    return []
  }
}
