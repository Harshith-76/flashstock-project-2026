import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { SqliteD1Adapter } from './d1-adapter'
import { ProductService } from '../src/services/product.service'
import { InventoryService } from '../src/services/inventory.service'

describe('Inventory Service Suite', () => {
  let adapter: SqliteD1Adapter
  let productService: ProductService
  let inventoryService: InventoryService

  beforeEach(() => {
    adapter = new SqliteD1Adapter(':memory:')
    adapter.initSchema()
    productService = new ProductService(adapter as any)
    inventoryService = new InventoryService(adapter as any)
  })

  test('Stock adjustment correctly updates on_hand and logs movement', async () => {
    const prod = await productService.createProduct({
      name: 'Monitor Stand',
      sku: 'FS-STD-001',
      price: 199900,
      initialStock: 10
    })

    const updated = await inventoryService.adjustStock(prod.id, 20, 'Restocked from supplier')
    assert.equal(updated.onHand, 20)
    assert.equal(updated.available, 20)
    assert.equal(updated.reserved, 0)

    const movements = await inventoryService.getMovements(prod.id)
    assert.equal(movements.length, 2) // initial + adjustment
    assert.equal(movements[0].movementType, 'stock_received')
    assert.equal(movements[0].quantity, 10)
    assert.equal(movements[0].notes, 'Restocked from supplier')
  })

  test('Reject stock reduction below currently reserved quantity', async () => {
    const prod = await productService.createProduct({
      name: 'Headset',
      sku: 'FS-HDS-001',
      price: 399900,
      initialStock: 10
    })

    // Simulate 4 units reserved
    adapter.db.prepare('UPDATE inventory SET reserved = 4 WHERE product_id = ?').run(prod.id)

    // Attempting to set onHand to 2 should be rejected with 409
    await assert.rejects(
      async () => {
        await inventoryService.adjustStock(prod.id, 2, 'Attempted drop')
      },
      (err: any) => {
        assert.equal(err.statusCode, 409)
        assert.ok(err.message.includes('reserved quantity'))
        return true
      }
    )
  })

  test('Available stock always equals on_hand minus reserved', async () => {
    const prod = await productService.createProduct({
      name: 'Keycaps Set',
      sku: 'FS-KC-001',
      price: 99900,
      initialStock: 50
    })

    adapter.db.prepare('UPDATE inventory SET reserved = 15 WHERE product_id = ?').run(prod.id)

    const inv = await inventoryService.getInventoryByProductId(prod.id)
    assert.ok(inv)
    assert.equal(inv.onHand, 50)
    assert.equal(inv.reserved, 15)
    assert.equal(inv.available, 35)
  })
})
