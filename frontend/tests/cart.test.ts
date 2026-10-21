import { describe, expect, it } from 'vitest'
import { type CartItem, cartCount, cartReducer, cartTotal, MAX_QUANTITY, parseStoredCart } from '../src/lib/cart.ts'

const mug = { sku: 'KIT-001', name: 'Travel Mug', category: 'Kitchen & Drinkware', price: 24.99 }
const knife = { sku: 'KIT-012', name: 'Chef Knife', category: 'Kitchen & Drinkware', price: 49 }

const add = (items: CartItem[], item = mug, quantity?: number) => cartReducer(items, { type: 'add', item, quantity })

describe('cartReducer', () => {
  it('adds a new item with quantity 1', () => {
    expect(add([])).toEqual([{ ...mug, quantity: 1 }])
  })

  it('merges repeated adds of the same product', () => {
    expect(add(add([]), mug, 2)).toEqual([{ ...mug, quantity: 3 }])
  })

  it('sets a quantity and removes the item at zero', () => {
    const items = add(add([]), knife)
    expect(cartReducer(items, { type: 'setQuantity', sku: 'KIT-001', quantity: 4 })[0].quantity).toBe(4)
    expect(cartReducer(items, { type: 'setQuantity', sku: 'KIT-001', quantity: 0 }).map((i) => i.sku)).toEqual(['KIT-012'])
  })

  it('caps quantities at the maximum', () => {
    expect(add([], mug, 500)[0].quantity).toBe(MAX_QUANTITY)
    expect(cartReducer(add([]), { type: 'setQuantity', sku: 'KIT-001', quantity: 1000 })[0].quantity).toBe(MAX_QUANTITY)
  })

  it('removes and clears', () => {
    const items = add(add([]), knife)
    expect(cartReducer(items, { type: 'remove', sku: 'KIT-012' })).toHaveLength(1)
    expect(cartReducer(items, { type: 'clear' })).toEqual([])
  })
})

describe('cart totals', () => {
  it('counts items and sums prices in whole cents', () => {
    const items = add(add([], mug, 3), knife)
    expect(cartCount(items)).toBe(4)
    expect(cartTotal(items)).toBe(123.97) // 3 × 24.99 + 49, with no floating-point leftovers
    expect(cartTotal([{ ...mug, price: 0.1, quantity: 1 }, { ...knife, price: 0.2, quantity: 1 }])).toBe(0.3)
  })
})

describe('parseStoredCart', () => {
  it('restores a valid saved cart', () => {
    const items = add([], mug, 2)
    expect(parseStoredCart(JSON.stringify(items))).toEqual(items)
  })

  it('ignores missing, broken or tampered data', () => {
    expect(parseStoredCart(null)).toEqual([])
    expect(parseStoredCart('{not json')).toEqual([])
    expect(parseStoredCart('{"sku":"x"}')).toEqual([])
    expect(
      parseStoredCart(
        JSON.stringify([
          { ...mug, quantity: -1 },
          { ...mug, quantity: 1.5 },
          { ...mug, price: 'free', quantity: 1 },
          { ...knife, quantity: 2 },
        ]),
      ),
    ).toEqual([{ ...knife, quantity: 2 }])
  })
})
