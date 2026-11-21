import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { SqliteD1Adapter } from './d1-adapter'
import { ProductService } from '../src/services/product.service'
import { AuthService } from '../src/services/auth.service'
import { ReservationService } from '../src/services/reservation.service'
import { PaymentService } from '../src/services/payment.service'

describe('Payment Simulation Suite', () => {
  let adapter: SqliteD1Adapter
  let productService: ProductService
  let authService: AuthService
  let reservationService: ReservationService
  let paymentService: PaymentService
  let userId: string

  beforeEach(async () => {
    adapter = new SqliteD1Adapter(':memory:')
    adapter.initSchema()
    productService = new ProductService(adapter as any)
    authService = new AuthService(adapter as any)
    reservationService = new ReservationService(adapter as any)
    paymentService = new PaymentService(adapter as any)

    const user = await authService.register({
      name: 'Payer',
      email: 'payer@example.com',
      password: 'password123'
    })
    userId = user.user.id
  })

  test('Successful payment confirms reservation, deducts on_hand and clears reserved', async () => {
    const prod = await productService.createProduct({
      name: 'Wireless Speaker',
      sku: 'FS-SPK-001',
      price: 349900,
      initialStock: 10
    })

    const { order } = await reservationService.createReservation({
      userId,
      items: [{ productId: prod.id, quantity: 2 }]
    })

    const res = await paymentService.simulatePayment({
      orderId: order.id,
      outcome: 'success'
    })

    assert.equal(res.payment.status, 'succeeded')
    assert.equal(res.orderStatus, 'confirmed')

    const inv = adapter.db.prepare('SELECT on_hand, reserved, (on_hand - reserved) AS available FROM inventory WHERE product_id = ?').get(prod.id) as any
    assert.equal(inv.on_hand, 8) // 10 - 2
    assert.equal(inv.reserved, 0)
    assert.equal(inv.available, 8)
  })

  test('Failed payment releases reserved stock back to available inventory', async () => {
    const prod = await productService.createProduct({
      name: 'Microphone',
      sku: 'FS-MIC-001',
      price: 499900,
      initialStock: 5
    })

    const { order } = await reservationService.createReservation({
      userId,
      items: [{ productId: prod.id, quantity: 2 }]
    })

    const res = await paymentService.simulatePayment({
      orderId: order.id,
      outcome: 'failure'
    })

    assert.equal(res.payment.status, 'failed')
    assert.equal(res.orderStatus, 'payment_failed')

    const inv = adapter.db.prepare('SELECT on_hand, reserved, (on_hand - reserved) AS available FROM inventory WHERE product_id = ?').get(prod.id) as any
    assert.equal(inv.on_hand, 5)
    assert.equal(inv.reserved, 0)
    assert.equal(inv.available, 5)
  })

  test('Late payment for expired reservation is rejected and stock released', async () => {
    const prod = await productService.createProduct({
      name: 'USB Hub',
      sku: 'FS-HUB-001',
      price: 129900,
      initialStock: 4
    })

    const { order, reservation } = await reservationService.createReservation({
      userId,
      items: [{ productId: prod.id, quantity: 2 }]
    })

    // Manually expire reservation in DB
    const pastTime = new Date(Date.now() - 60000).toISOString()
    adapter.db.prepare('UPDATE reservations SET expires_at = ? WHERE id = ?').run(pastTime, reservation.id)

    await assert.rejects(
      async () => {
        await paymentService.simulatePayment({
          orderId: order.id,
          outcome: 'success'
        })
      },
      (err: any) => {
        assert.equal(err.statusCode, 410)
        assert.ok(err.message.includes('expired'))
        return true
      }
    )

    // Verify stock was released
    const inv = adapter.db.prepare('SELECT on_hand, reserved, (on_hand - reserved) AS available FROM inventory WHERE product_id = ?').get(prod.id) as any
    assert.equal(inv.on_hand, 4)
    assert.equal(inv.reserved, 0)
    assert.equal(inv.available, 4)
  })

  test('Duplicate payment callback is idempotent and does not double-deduct stock', async () => {
    const prod = await productService.createProduct({
      name: 'Power Bank',
      sku: 'FS-PWR-001',
      price: 199900,
      initialStock: 6
    })

    const { order } = await reservationService.createReservation({
      userId,
      items: [{ productId: prod.id, quantity: 2 }]
    })

    // First payment
    const res1 = await paymentService.simulatePayment({
      orderId: order.id,
      outcome: 'success'
    })
    assert.equal(res1.payment.status, 'succeeded')

    // Second duplicate payment callback
    const res2 = await paymentService.simulatePayment({
      orderId: order.id,
      outcome: 'success'
    })
    assert.equal(res2.payment.status, 'succeeded')
    assert.ok(res2.message.includes('already processed'))

    // Verify stock was deducted only once: 6 - 2 = 4
    const inv = adapter.db.prepare('SELECT on_hand, reserved, (on_hand - reserved) AS available FROM inventory WHERE product_id = ?').get(prod.id) as any
    assert.equal(inv.on_hand, 4)
    assert.equal(inv.reserved, 0)
  })

  test('Concurrent successful callbacks deduct stock and write movements only once', async () => {
    const prod = await productService.createProduct({
      name: 'Concurrent Callback Item',
      sku: 'FS-CALLBACK-001',
      price: 2000,
      initialStock: 5
    })
    const { order } = await reservationService.createReservation({
      userId,
      items: [{ productId: prod.id, quantity: 2 }]
    })

    const results = await Promise.all(Array.from({ length: 8 }, () => paymentService.simulatePayment({
      orderId: order.id,
      outcome: 'success'
    })))

    assert.ok(results.every(result => result.payment.status === 'succeeded'))
    const inv = adapter.db.prepare('SELECT on_hand, reserved FROM inventory WHERE product_id = ?').get(prod.id) as any
    assert.equal(inv.on_hand, 3)
    assert.equal(inv.reserved, 0)
    const movements = adapter.db.prepare("SELECT COUNT(*) AS count FROM inventory_movements WHERE product_id = ? AND reference_id = ? AND movement_type = 'stock_sold'").get(prod.id, order.id) as any
    assert.equal(movements.count, 1)
    const payments = adapter.db.prepare('SELECT COUNT(*) AS count FROM payments WHERE order_id = ?').get(order.id) as any
    assert.equal(payments.count, 1)
  })

  test('Concurrent failed callbacks release stock and write movements only once', async () => {
    const prod = await productService.createProduct({
      name: 'Concurrent Failure Item',
      sku: 'FS-CALLBACK-002',
      price: 2000,
      initialStock: 5
    })
    const { order } = await reservationService.createReservation({
      userId,
      items: [{ productId: prod.id, quantity: 2 }]
    })

    const results = await Promise.all(Array.from({ length: 8 }, () => paymentService.simulatePayment({
      orderId: order.id,
      outcome: 'failure'
    })))

    assert.ok(results.every(result => result.payment.status === 'failed'))
    const inv = adapter.db.prepare('SELECT on_hand, reserved FROM inventory WHERE product_id = ?').get(prod.id) as any
    assert.equal(inv.on_hand, 5)
    assert.equal(inv.reserved, 0)
    const movements = adapter.db.prepare("SELECT COUNT(*) AS count FROM inventory_movements WHERE product_id = ? AND reference_id = ? AND movement_type = 'reservation_released'").get(prod.id, order.id) as any
    assert.equal(movements.count, 1)
    const payments = adapter.db.prepare('SELECT COUNT(*) AS count FROM payments WHERE order_id = ?').get(order.id) as any
    assert.equal(payments.count, 1)
  })
})
