import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { SqliteD1Adapter } from './d1-adapter'
import { ProductService } from '../src/services/product.service'
import { AuthService } from '../src/services/auth.service'
import { ReservationService } from '../src/services/reservation.service'
import { FlashSaleService } from '../src/services/flash-sale.service'

describe('Reservation Engine Suite', () => {
  let adapter: SqliteD1Adapter
  let productService: ProductService
  let authService: AuthService
  let reservationService: ReservationService
  let userId: string

  beforeEach(async () => {
    adapter = new SqliteD1Adapter(':memory:')
    adapter.initSchema()
    productService = new ProductService(adapter as any)
    authService = new AuthService(adapter as any)
    reservationService = new ReservationService(adapter as any)

    const user = await authService.register({
      name: 'Test Buyer',
      email: 'buyer@test.com',
      password: 'password123'
    })
    userId = user.user.id
  })

  test('Create reservation increments reserved stock and creates active reservation', async () => {
    const prod = await productService.createProduct({
      name: 'Mechanical Keyboard',
      sku: 'FS-KB-001',
      price: 499900,
      initialStock: 10
    })

    const { order, reservation } = await reservationService.createReservation({
      userId,
      items: [{ productId: prod.id, quantity: 3 }]
    })

    assert.ok(order.id)
    assert.equal(order.status, 'pending')
    assert.equal(order.totalAmount, 499900 * 3)

    assert.ok(reservation.id)
    assert.equal(reservation.status, 'active')

    // Check inventory in DB
    const inv = adapter.db.prepare('SELECT on_hand, reserved, (on_hand - reserved) AS available FROM inventory WHERE product_id = ?').get(prod.id) as any
    assert.equal(inv.on_hand, 10)
    assert.equal(inv.reserved, 3)
    assert.equal(inv.available, 7)
  })

  test('Insufficient inventory fails reservation and preserves stock', async () => {
    const prod = await productService.createProduct({
      name: 'Mechanical Keyboard',
      sku: 'FS-KB-001',
      price: 499900,
      initialStock: 2
    })

    await assert.rejects(
      async () => {
        await reservationService.createReservation({
          userId,
          items: [{ productId: prod.id, quantity: 5 }]
        })
      },
      (err: any) => {
        assert.equal(err.statusCode, 409)
        return true
      }
    )

    const inv = adapter.db.prepare('SELECT on_hand, reserved FROM inventory WHERE product_id = ?').get(prod.id) as any
    assert.equal(inv.on_hand, 2)
    assert.equal(inv.reserved, 0)
  })

  test('Multi-product atomic rollback when one item is out of stock', async () => {
    const prodA = await productService.createProduct({
      name: 'Available Item A',
      sku: 'ITEM-A',
      price: 1000,
      initialStock: 10
    })

    const prodB = await productService.createProduct({
      name: 'Scarce Item B',
      sku: 'ITEM-B',
      price: 2000,
      initialStock: 1
    })

    // Request 2 of A and 2 of B (B only has 1!)
    await assert.rejects(
      async () => {
        await reservationService.createReservation({
          userId,
          items: [
            { productId: prodA.id, quantity: 2 },
            { productId: prodB.id, quantity: 2 }
          ]
        })
      },
      (err: any) => {
        assert.equal(err.statusCode, 409)
        return true
      }
    )

    // Neither product should have reserved stock
    const invA = adapter.db.prepare('SELECT reserved FROM inventory WHERE product_id = ?').get(prodA.id) as any
    const invB = adapter.db.prepare('SELECT reserved FROM inventory WHERE product_id = ?').get(prodB.id) as any
    assert.equal(invA.reserved, 0)
    assert.equal(invB.reserved, 0)

    // No pending orders created
    const ordersCount = adapter.db.prepare('SELECT COUNT(*) AS c FROM orders').get() as any
    assert.equal(ordersCount.c, 0)
  })

  test('Release reservation restores reserved stock to available pool', async () => {
    const prod = await productService.createProduct({
      name: 'Headphones',
      sku: 'FS-HP-001',
      price: 199900,
      initialStock: 5
    })

    const { order } = await reservationService.createReservation({
      userId,
      items: [{ productId: prod.id, quantity: 2 }]
    })

    let inv = adapter.db.prepare('SELECT on_hand, reserved FROM inventory WHERE product_id = ?').get(prod.id) as any
    assert.equal(inv.reserved, 2)

    await reservationService.releaseReservation(order.id, 'cancelled')

    inv = adapter.db.prepare('SELECT on_hand, reserved, (on_hand - reserved) AS available FROM inventory WHERE product_id = ?').get(prod.id) as any
    assert.equal(inv.on_hand, 5)
    assert.equal(inv.reserved, 0)
    assert.equal(inv.available, 5)

    const updatedOrder = adapter.db.prepare('SELECT status FROM orders WHERE id = ?').get(order.id) as any
    assert.equal(updatedOrder.status, 'cancelled')
  })

  test('Confirm reservation deducts on_hand stock and clears reserved', async () => {
    const prod = await productService.createProduct({
      name: 'Webcam',
      sku: 'FS-CAM-001',
      price: 299900,
      initialStock: 8
    })

    const { order } = await reservationService.createReservation({
      userId,
      items: [{ productId: prod.id, quantity: 3 }]
    })

    await reservationService.confirmReservation(order.id)

    const inv = adapter.db.prepare('SELECT on_hand, reserved, (on_hand - reserved) AS available FROM inventory WHERE product_id = ?').get(prod.id) as any
    assert.equal(inv.on_hand, 5) // 8 - 3
    assert.equal(inv.reserved, 0)
    assert.equal(inv.available, 5)

    const updatedOrder = adapter.db.prepare('SELECT status FROM orders WHERE id = ?').get(order.id) as any
    assert.equal(updatedOrder.status, 'confirmed')

    const movement = adapter.db.prepare("SELECT * FROM inventory_movements WHERE product_id = ? AND movement_type = 'stock_sold'").get(prod.id) as any
    assert.ok(movement)
    assert.equal(movement.quantity, 3)
  })

  test('Expiration sweep releases a reservation using ISO timestamps', async () => {
    const prod = await productService.createProduct({ name: 'Desk Lamp', sku: 'FS-LMP-002', price: 5000, initialStock: 4 })
    const { order, reservation } = await reservationService.createReservation({ userId, items: [{ productId: prod.id, quantity: 2 }] })
    adapter.db.prepare('UPDATE reservations SET expires_at = ? WHERE id = ?')
      .run(new Date(Date.now() - 60_000).toISOString(), reservation.id)

    assert.equal(await reservationService.expireStaleReservations(), 1)
    const inventory = adapter.db.prepare('SELECT on_hand, reserved FROM inventory WHERE product_id = ?').get(prod.id) as any
    const result = adapter.db.prepare('SELECT status FROM reservations WHERE id = ?').get(reservation.id) as any
    assert.equal(inventory.on_hand, 4)
    assert.equal(inventory.reserved, 0)
    assert.equal(result.status, 'expired')
    assert.equal((adapter.db.prepare('SELECT status FROM orders WHERE id = ?').get(order.id) as any).status, 'cancelled')
  })

  test('Released reservation returns its flash-sale allocation', async () => {
    const prod = await productService.createProduct({ name: 'Sale Mouse', sku: 'FS-MSE-002', price: 20_000, initialStock: 5 })
    const sale = await new FlashSaleService(adapter as any).createFlashSale({
      productId: prod.id, discountPrice: 15_000, saleStockLimit: 3,
      startTime: new Date(Date.now() - 60_000).toISOString(),
      endTime: new Date(Date.now() + 60 * 60_000).toISOString(), status: 'active'
    })
    const { order } = await reservationService.createReservation({ userId, items: [{ productId: prod.id, quantity: 2 }] })
    assert.equal((adapter.db.prepare('SELECT allocated_stock AS n FROM flash_sales WHERE id = ?').get(sale.id) as any).n, 2)
    await reservationService.releaseReservation(order.id, 'released')
    assert.equal((adapter.db.prepare('SELECT allocated_stock AS n FROM flash_sales WHERE id = ?').get(sale.id) as any).n, 0)
  })
})
