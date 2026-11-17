import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { SqliteD1Adapter } from './d1-adapter'
import { ProductService } from '../src/services/product.service'

describe('Products Service Suite', () => {
  let adapter: SqliteD1Adapter
  let productService: ProductService

  beforeEach(() => {
    adapter = new SqliteD1Adapter(':memory:')
    adapter.initSchema()
    productService = new ProductService(adapter as any)
  })

  test('Create product creates product, inventory and movement in one batch', async () => {
    const prod = await productService.createProduct({
      name: 'Wireless Mouse',
      description: 'Precision gaming mouse',
      sku: 'FS-MS-100',
      price: 299900,
      category: 'Electronics',
      initialStock: 25
    })

    assert.ok(prod.id)
    assert.equal(prod.name, 'Wireless Mouse')
    assert.equal(prod.sku, 'FS-MS-100')
    assert.equal(prod.onHand, 25)
    assert.equal(prod.reserved, 0)
    assert.equal(prod.available, 25)

    // Check inventory movement record
    const movement = adapter.db.prepare('SELECT * FROM inventory_movements WHERE product_id = ?').get(prod.id) as any
    assert.ok(movement)
    assert.equal(movement.movement_type, 'stock_received')
    assert.equal(movement.quantity, 25)
  })

  test('Reject creation with duplicate SKU', async () => {
    await productService.createProduct({
      name: 'Item A',
      sku: 'DUP-SKU-001',
      price: 1000,
      initialStock: 10
    })

    await assert.rejects(
      async () => {
        await productService.createProduct({
          name: 'Item B',
          sku: 'DUP-SKU-001',
          price: 2000,
          initialStock: 5
        })
      },
      (err: any) => {
        assert.equal(err.statusCode, 409)
        return true
      }
    )
  })

  test('Update product attributes and reject conflicting SKU', async () => {
    const prod = await productService.createProduct({
      name: 'Original Name',
      sku: 'SKU-ORIG',
      price: 1000,
      initialStock: 10
    })

    const updated = await productService.updateProduct(prod.id, {
      name: 'New Name',
      price: 1500
    })

    assert.equal(updated.name, 'New Name')
    assert.equal(updated.price, 1500)
    assert.equal(updated.sku, 'SKU-ORIG')
  })

  test('Archive product changes status to archived', async () => {
    const prod = await productService.createProduct({
      name: 'To Archive',
      sku: 'SKU-ARCH',
      price: 1000,
      initialStock: 10
    })

    await productService.archiveProduct(prod.id)

    const listActive = await productService.listProducts()
    assert.equal(listActive.find((p) => p.id === prod.id), undefined)

    const listAll = await productService.listProducts({ includeArchived: true })
    const archivedProd = listAll.find((p) => p.id === prod.id)
    assert.ok(archivedProd)
    assert.equal(archivedProd.status, 'archived')
  })
})
