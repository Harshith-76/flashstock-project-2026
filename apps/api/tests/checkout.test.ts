import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { SqliteD1Adapter } from './d1-adapter'
import { ProductService } from '../src/services/product.service'
import { AuthService } from '../src/services/auth.service'
import { CartService } from '../src/services/cart.service'
import { CheckoutService } from '../src/services/checkout.service'
import { PaymentService } from '../src/services/payment.service'

describe('Checkout and Idempotency Suite', () => {
  let adapter: SqliteD1Adapter
  let productService: ProductService
  let authService: AuthService
  let cartService: CartService
  let checkoutService: CheckoutService
  let userId: string

  beforeEach(async () => {
    adapter = new SqliteD1Adapter(':memory:')
    adapter.initSchema()
    productService = new ProductService(adapter as any)
    authService = new AuthService(adapter as any)
    cartService = new CartService(adapter as any)
    checkoutService = new CheckoutService(adapter as any)

    const user = await authService.register({
      name: 'Checkout User',
      email: 'checkout@user.com',
      password: 'password123'
    })
    userId = user.user.id
  })

  test('Direct checkout creates order and reservation', async () => {
    const prod = await productService.createProduct({
      name: 'Desk Mat',
      sku: 'FS-MAT-001',
      price: 99900,
      initialStock: 10
    })

    const res = await checkoutService.processCheckout({
      userId,
      idempotencyKey: 'IDEMP-KEY-001',
      items: [{ productId: prod.id, quantity: 2 }],
      shippingAddress: { fullName: 'Checkout User', addressLine1: '12 Test Road', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'India' }
    })

    assert.ok(res.order.id)
    assert.equal(res.order.totalAmount, 99900 * 2)
    assert.ok(res.reservation.id)
    assert.equal(res.isDuplicate, undefined)
    const savedAddress = adapter.db.prepare('SELECT shipping_address FROM orders WHERE id = ?').get(res.order.id) as any
    assert.equal(JSON.parse(savedAddress.shipping_address).postalCode, '560001')
  })

  test('Idempotency: Replaying checkout with same idempotency key returns existing result without duplicate reservations', async () => {
    const prod = await productService.createProduct({
      name: 'Desk Lamp',
      sku: 'FS-LMP-001',
      price: 149900,
      initialStock: 10
    })

    const idempotencyKey = 'IDEMP-REPEAT-KEY'

    // First checkout
    const firstRes = await checkoutService.processCheckout({
      userId,
      idempotencyKey,
      items: [{ productId: prod.id, quantity: 2 }]
    })

    // Second checkout with identical payload
    const secondRes = await checkoutService.processCheckout({
      userId,
      idempotencyKey,
      items: [{ productId: prod.id, quantity: 2 }]
    })

    assert.equal(firstRes.order.id, secondRes.order.id)
    assert.equal(secondRes.isDuplicate, true)

    // Verify stock was only reserved once (reserved: 2, not 4!)
    const inv = adapter.db.prepare('SELECT on_hand, reserved FROM inventory WHERE product_id = ?').get(prod.id) as any
    assert.equal(inv.reserved, 2)
  })

  test('Idempotency: Reusing same idempotency key with DIFFERENT payload throws 409 Conflict', async () => {
    const prodA = await productService.createProduct({
      name: 'Item 1',
      sku: 'SKU-001',
      price: 1000,
      initialStock: 10
    })

    const prodB = await productService.createProduct({
      name: 'Item 2',
      sku: 'SKU-002',
      price: 2000,
      initialStock: 10
    })

    const idempotencyKey = 'IDEMP-REUSE-KEY'

    // First checkout with Item A
    await checkoutService.processCheckout({
      userId,
      idempotencyKey,
      items: [{ productId: prodA.id, quantity: 1 }]
    })

    // Second checkout attempting to reuse the same key with Item B
    await assert.rejects(
      async () => {
        await checkoutService.processCheckout({
          userId,
          idempotencyKey,
          items: [{ productId: prodB.id, quantity: 1 }]
        })
      },
      (err: any) => {
        assert.equal(err.statusCode, 409)
        assert.ok(err.message.includes('Conflict'))
        return true
      }
    )
  })

  test('Cart checkout keeps items until payment succeeds, then converts the cart', async () => {
    const prod = await productService.createProduct({
      name: 'Gaming Headset',
      sku: 'FS-HS-001',
      price: 249900,
      initialStock: 5
    })

    await cartService.addItem(userId, prod.id, 2)
    const cart = await cartService.getCart(userId)
    assert.equal(cart.items.length, 1)

    const res = await checkoutService.processCheckout({
      userId,
      idempotencyKey: 'IDEMP-CART-001',
      cartId: cart.id
    })

    assert.ok(res.order.id)

    // A reservation alone must not discard the customer's cart.
    const heldItems = adapter.db.prepare('SELECT COUNT(*) AS count FROM cart_items WHERE cart_id = ?').get(cart.id) as any
    assert.equal(heldItems.count, 1)
    const beforePayment = adapter.db.prepare('SELECT status FROM carts WHERE id = ?').get(cart.id) as any
    assert.equal(beforePayment.status, 'active')

    await new PaymentService(adapter as any).simulatePayment({ orderId: res.order.id, outcome: 'success' })
    const updatedCart = adapter.db.prepare('SELECT status FROM carts WHERE id = ?').get(cart.id) as any
    assert.equal(updatedCart.status, 'converted')
    const clearedItems = adapter.db.prepare('SELECT COUNT(*) AS count FROM cart_items WHERE cart_id = ?').get(cart.id) as any
    assert.equal(clearedItems.count, 0)
  })

  test('Clear cart removes every item by cart ID', async () => {
    const prod = await productService.createProduct({ name: 'Desk Stand', sku: 'FS-STN-002', price: 12000, initialStock: 3 })
    await cartService.addItem(userId, prod.id, 2)
    await cartService.clearCart(userId)
    assert.equal((await cartService.getCart(userId)).items.length, 0)
  })
})
