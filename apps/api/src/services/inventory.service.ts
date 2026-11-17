import { InventoryRecord } from '../types'

export class InventoryService {
  constructor(private db: D1Database) {}

  async getAllInventory(): Promise<InventoryRecord[]> {
    const result = await this.db.prepare(`
      SELECT
        p.id AS productId,
        p.name,
        p.sku,
        p.status,
        i.on_hand AS onHand,
        i.reserved,
        (i.on_hand - i.reserved) AS available
      FROM inventory i
      JOIN products p ON p.id = i.product_id
      ORDER BY p.created_at DESC
    `).all<InventoryRecord>()

    return result.results
  }

  async getInventoryByProductId(productId: string): Promise<InventoryRecord | null> {
    const row = await this.db.prepare(`
      SELECT
        p.id AS productId,
        p.name,
        p.sku,
        p.status,
        i.on_hand AS onHand,
        i.reserved,
        (i.on_hand - i.reserved) AS available
      FROM inventory i
      JOIN products p ON p.id = i.product_id
      WHERE i.product_id = ?
    `).bind(productId).first<InventoryRecord>()

    return row || null
  }

  async adjustStock(productId: string, newOnHand: number, notes?: string): Promise<InventoryRecord> {
    const current = await this.getInventoryByProductId(productId)
    if (!current) {
      const err = new Error('Inventory record not found')
      ;(err as any).statusCode = 404
      throw err
    }

    if (newOnHand < current.reserved) {
      const err = new Error(`Stock cannot be set lower than currently reserved quantity (${current.reserved})`)
      ;(err as any).statusCode = 409
      throw err
    }

    const difference = newOnHand - current.onHand
    if (difference === 0) {
      return current
    }

    const now = new Date().toISOString()
    const movementId = crypto.randomUUID()
    const movementType = difference > 0 ? 'stock_received' : 'adjustment'

    const statements = [
      this.db.prepare(`
        UPDATE inventory
        SET on_hand = ?
        WHERE product_id = ?
          AND on_hand = ?
          AND reserved = ?
      `).bind(newOnHand, productId, current.onHand, current.reserved),

      this.db.prepare(`
        INSERT INTO inventory_movements (id, product_id, movement_type, quantity, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        movementId,
        productId,
        movementType,
        Math.abs(difference),
        notes || `Stock adjusted from ${current.onHand} to ${newOnHand}`,
        now
      )
    ]

    const results = await this.db.batch(statements)

    if (results[0].meta.changes !== 1) {
      const err = new Error('Inventory was modified concurrently. Please refresh and retry.')
      ;(err as any).statusCode = 409
      throw err
    }

    return {
      productId,
      name: current.name,
      sku: current.sku,
      status: current.status,
      onHand: newOnHand,
      reserved: current.reserved,
      available: newOnHand - current.reserved
    }
  }

  async getMovements(productId?: string, limit: number = 50): Promise<any[]> {
    let query = `
      SELECT
        im.id,
        im.product_id AS productId,
        p.name AS productName,
        p.sku,
        im.movement_type AS movementType,
        im.quantity,
        im.reference_id AS referenceId,
        im.notes,
        im.created_at AS createdAt
      FROM inventory_movements im
      JOIN products p ON p.id = im.product_id
    `
    const params: unknown[] = []

    if (productId) {
      query += ' WHERE im.product_id = ?'
      params.push(productId)
    }

    query += ' ORDER BY im.created_at DESC LIMIT ?'
    params.push(limit)

    const result = await this.db.prepare(query).bind(...params).all()
    return result.results
  }
}
