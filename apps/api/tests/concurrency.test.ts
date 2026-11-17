import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { SqliteD1Adapter } from './d1-adapter'
import { ProductService } from '../src/services/product.service'
import { AuthService } from '../src/services/auth.service'
import { ReservationService } from '../src/services/reservation.service'

describe('High-Concurrency Inventory Reservation Engine Suite', () => {
  let adapter: SqliteD1Adapter
  let productService: ProductService
  let authService: AuthService
  let reservationService: ReservationService
  let buyerUserIds: string[] = []

  beforeEach(async () => {
    adapter = new SqliteD1Adapter(':memory:')
    adapter.initSchema()
    productService = new ProductService(adapter as any)
    authService = new AuthService(adapter as any)
    reservationService = new ReservationService(adapter as any)

    // Pre-create buyer users for concurrent simulation
    buyerUserIds = []
    for (let i = 0; i < 100; i++) {
      const u = await authService.register({
        name: `Buyer ${i}`,
        email: `buyer_${i}_${Date.now()}@concurrent.test`,
        password: 'password123'
      })
      buyerUserIds.push(u.user.id)
    }
  })

  test('100 simultaneous purchase attempts for 10 available units: exactly 10 succeed, 90 rejected, zero overselling', async () => {
    // 1. Create limited stock product with EXACTLY 10 units
    const product = await productService.createProduct({
      name: 'Limited Edition Mechanical Keyboard',
      sku: 'FS-CONCUR-KB-001',
      price: 499900,
      initialStock: 10
    })

    const initialInv = adapter.db
      .prepare('SELECT on_hand, reserved, (on_hand - reserved) AS available FROM inventory WHERE product_id = ?')
      .get(product.id) as any

    assert.equal(initialInv.on_hand, 10)
    assert.equal(initialInv.reserved, 0)
    assert.equal(initialInv.available, 10)

    // 2. Fire 100 simultaneous reservation attempts concurrently
    const attempts = buyerUserIds.map((userId, index) => {
      return reservationService.createReservation({
        userId,
        items: [{ productId: product.id, quantity: 1 }],
        idempotencyKey: `CONCURRENT-KEY-${index}-${Date.now()}`
      })
    })

    const results = await Promise.allSettled(attempts)

    // 3. Count outcomes
    let successes = 0
    let rejections = 0

    for (const r of results) {
      if (r.status === 'fulfilled') {
        successes++
        assert.equal(r.value.order.status, 'pending')
        assert.equal(r.value.reservation.status, 'active')
      } else {
        rejections++
        const err = r.reason
        assert.ok(
          err.statusCode === 409 ||
          String(err.message).includes('Insufficient') ||
          String(err.message).includes('CHECK constraint') ||
          String(err.message).includes('INSUFFICIENT_STOCK'),
          `Unexpected rejection reason: ${err.message}`
        )
      }
    }

    // 4. Critical Invariant Assertions
    assert.equal(successes, 10, `Expected exactly 10 successful reservations, but got ${successes}`)
    assert.equal(rejections, 90, `Expected exactly 90 rejected reservations, but got ${rejections}`)

    // 5. Database State Verification
    const finalInv = adapter.db
      .prepare('SELECT on_hand, reserved, (on_hand - reserved) AS available FROM inventory WHERE product_id = ?')
      .get(product.id) as any

    assert.equal(finalInv.on_hand, 10, 'On-hand stock must remain unchanged during reservation')
    assert.equal(finalInv.reserved, 10, 'Reserved stock must equal exactly 10')
    assert.equal(finalInv.available, 0, 'Available stock must equal exactly 0')
    assert.ok(finalInv.reserved <= finalInv.on_hand, 'Reserved stock must NEVER exceed on-hand stock')

    // 6. Verify exactly 10 orders and active reservations exist in database
    const ordersCount = adapter.db
      .prepare("SELECT COUNT(*) AS count FROM orders WHERE status = 'pending'")
      .get() as any
    assert.equal(ordersCount.count, 10)

    const reservationsCount = adapter.db
      .prepare("SELECT COUNT(*) AS count FROM reservations WHERE status = 'active'")
      .get() as any
    assert.equal(reservationsCount.count, 10)
  })
})
