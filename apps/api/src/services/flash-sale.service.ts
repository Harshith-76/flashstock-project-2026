import { FlashSale } from '../types'

export class FlashSaleService {
  constructor(private db: D1Database) {}

  async getActiveFlashSales(): Promise<FlashSale[]> {
    const result = await this.db.prepare(`
      SELECT
        fs.id,
        fs.product_id AS productId,
        fs.discount_price AS discountPrice,
        fs.sale_stock_limit AS saleStockLimit,
        fs.allocated_stock AS allocatedStock,
        fs.start_time AS startTime,
        fs.end_time AS endTime,
        fs.status,
        fs.created_at AS createdAt,
        fs.updated_at AS updatedAt,
        p.name AS productName,
        p.price AS originalPrice
      FROM flash_sales fs
      JOIN products p ON p.id = fs.product_id
      WHERE fs.status = 'active'
        AND datetime(fs.start_time) <= datetime('now')
        AND datetime(fs.end_time) >= datetime('now')
        AND p.status = 'active'
      ORDER BY fs.created_at DESC
    `).all<FlashSale>()

    return result.results
  }

  async getAllFlashSales(): Promise<FlashSale[]> {
    const result = await this.db.prepare(`
      SELECT
        fs.id,
        fs.product_id AS productId,
        fs.discount_price AS discountPrice,
        fs.sale_stock_limit AS saleStockLimit,
        fs.allocated_stock AS allocatedStock,
        fs.start_time AS startTime,
        fs.end_time AS endTime,
        fs.status,
        fs.created_at AS createdAt,
        fs.updated_at AS updatedAt,
        p.name AS productName,
        p.price AS originalPrice
      FROM flash_sales fs
      JOIN products p ON p.id = fs.product_id
      ORDER BY fs.created_at DESC
    `).all<FlashSale>()

    return result.results
  }

  async getFlashSaleById(id: string): Promise<FlashSale | null> {
    const row = await this.db.prepare(`
      SELECT
        fs.id,
        fs.product_id AS productId,
        fs.discount_price AS discountPrice,
        fs.sale_stock_limit AS saleStockLimit,
        fs.allocated_stock AS allocatedStock,
        fs.start_time AS startTime,
        fs.end_time AS endTime,
        fs.status,
        fs.created_at AS createdAt,
        fs.updated_at AS updatedAt,
        p.name AS productName,
        p.price AS originalPrice
      FROM flash_sales fs
      JOIN products p ON p.id = fs.product_id
      WHERE fs.id = ?
    `).bind(id).first<FlashSale>()

    return row || null
  }

  async createFlashSale(data: {
    productId: string
    discountPrice: number
    saleStockLimit: number
    startTime: string
    endTime: string
    status?: 'draft' | 'active' | 'ended' | 'cancelled'
  }): Promise<FlashSale> {
    const product = await this.db.prepare(
      'SELECT id, name, price, status FROM products WHERE id = ?'
    ).bind(data.productId).first<{ id: string; name: string; price: number; status: string }>()

    if (!product) {
      const err = new Error('Product not found')
      ;(err as any).statusCode = 404
      throw err
    }

    if (data.discountPrice >= product.price) {
      const err = new Error('Discount price must be lower than current product price')
      ;(err as any).statusCode = 400
      throw err
    }

    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const status = data.status || 'active'

    await this.db.prepare(`
      INSERT INTO flash_sales (id, product_id, discount_price, sale_stock_limit, allocated_stock, start_time, end_time, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.productId,
      data.discountPrice,
      data.saleStockLimit,
      data.startTime,
      data.endTime,
      status,
      now,
      now
    ).run()

    return {
      id,
      productId: data.productId,
      discountPrice: data.discountPrice,
      saleStockLimit: data.saleStockLimit,
      allocatedStock: 0,
      startTime: data.startTime,
      endTime: data.endTime,
      status,
      createdAt: now,
      updatedAt: now,
      productName: product.name,
      originalPrice: product.price
    }
  }

  async updateFlashSale(id: string, data: Partial<FlashSale>): Promise<FlashSale> {
    const existing = await this.getFlashSaleById(id)
    if (!existing) {
      const err = new Error('Flash sale not found')
      ;(err as any).statusCode = 404
      throw err
    }

    const updates: string[] = []
    const values: unknown[] = []

    if (data.discountPrice !== undefined) {
      updates.push('discount_price = ?')
      values.push(data.discountPrice)
    }
    if (data.saleStockLimit !== undefined) {
      if (data.saleStockLimit < existing.allocatedStock) {
        const err = new Error(`Stock limit cannot be lower than already allocated stock (${existing.allocatedStock})`)
        ;(err as any).statusCode = 409
        throw err
      }
      updates.push('sale_stock_limit = ?')
      values.push(data.saleStockLimit)
    }
    if (data.startTime !== undefined) {
      updates.push('start_time = ?')
      values.push(data.startTime)
    }
    if (data.endTime !== undefined) {
      updates.push('end_time = ?')
      values.push(data.endTime)
    }
    if (data.status !== undefined) {
      updates.push('status = ?')
      values.push(data.status)
    }

    updates.push("updated_at = datetime('now')")
    values.push(id)

    await this.db.prepare(`
      UPDATE flash_sales
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...values).run()

    const updated = await this.getFlashSaleById(id)
    return updated!
  }
}
