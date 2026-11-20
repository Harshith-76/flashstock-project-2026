import { Product, ProductWithInventory } from '../types'

export class ProductService {
  constructor(private db: D1Database) {}

  async listProducts(filters?: {
    category?: string
    search?: string
    sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular'
    includeArchived?: boolean
  }): Promise<ProductWithInventory[]> {
    let query = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.sku,
        p.price,
        p.category,
        p.image_url AS imageUrl,
        p.status,
        p.created_at AS createdAt,
        p.updated_at AS updatedAt,
        COALESCE(i.on_hand, 0) AS onHand,
        COALESCE(i.reserved, 0) AS reserved,
        COALESCE(i.on_hand - i.reserved, 0) AS available,
        fs.id AS fs_id,
        fs.discount_price AS fs_discount_price,
        fs.sale_stock_limit AS fs_sale_stock_limit,
        fs.allocated_stock AS fs_allocated_stock,
        fs.start_time AS fs_start_time,
        fs.end_time AS fs_end_time,
        fs.status AS fs_status
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id
      LEFT JOIN flash_sales fs ON fs.product_id = p.id
        AND fs.status = 'active'
        AND datetime(fs.start_time) <= datetime('now')
        AND datetime(fs.end_time) >= datetime('now')
      WHERE 1=1
    `

    const params: unknown[] = []

    if (!filters?.includeArchived) {
      query += " AND p.status = 'active'"
    }

    if (filters?.category) {
      query += ' AND LOWER(p.category) = LOWER(?)'
      params.push(filters.category)
    }

    if (filters?.search) {
      query += ' AND (LOWER(p.name) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(p.sku) LIKE ?)'
      const searchTerm = `%${filters.search.toLowerCase()}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }

    switch (filters?.sort) {
      case 'price_asc':
        query += ' ORDER BY p.price ASC'
        break
      case 'price_desc':
        query += ' ORDER BY p.price DESC'
        break
      case 'newest':
        query += ' ORDER BY p.created_at DESC'
        break
      case 'popular':
        query += ` ORDER BY (
          SELECT COALESCE(SUM(oi.quantity), 0)
          FROM order_items oi JOIN orders o ON o.id = oi.order_id
          WHERE oi.product_id = p.id AND o.status IN ('confirmed', 'processing', 'shipped', 'delivered')
        ) DESC, p.created_at DESC`
        break
      default:
        query += ' ORDER BY p.created_at DESC'
        break
    }

    const result = await this.db.prepare(query).bind(...params).all<any>()

    return result.results.map((r) => {
      const prod: ProductWithInventory = {
        id: r.id,
        name: r.name,
        description: r.description,
        sku: r.sku,
        price: r.price,
        category: r.category,
        imageUrl: r.imageUrl,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        onHand: r.onHand,
        reserved: r.reserved,
        available: r.available
      }

      if (r.fs_id) {
        prod.flashSale = {
          id: r.fs_id,
          productId: r.id,
          discountPrice: r.fs_discount_price,
          saleStockLimit: r.fs_sale_stock_limit,
          allocatedStock: r.fs_allocated_stock,
          startTime: r.fs_start_time,
          endTime: r.fs_end_time,
          status: r.fs_status,
          createdAt: '',
          updatedAt: ''
        }
      }

      return prod
    })
  }

  async getProductById(id: string): Promise<ProductWithInventory | null> {
    const row = await this.db.prepare(`
      SELECT
        p.id,
        p.name,
        p.description,
        p.sku,
        p.price,
        p.category,
        p.image_url AS imageUrl,
        p.status,
        p.created_at AS createdAt,
        p.updated_at AS updatedAt,
        COALESCE(i.on_hand, 0) AS onHand,
        COALESCE(i.reserved, 0) AS reserved,
        COALESCE(i.on_hand - i.reserved, 0) AS available,
        fs.id AS fs_id,
        fs.discount_price AS fs_discount_price,
        fs.sale_stock_limit AS fs_sale_stock_limit,
        fs.allocated_stock AS fs_allocated_stock,
        fs.start_time AS fs_start_time,
        fs.end_time AS fs_end_time,
        fs.status AS fs_status
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id
      LEFT JOIN flash_sales fs ON fs.product_id = p.id
        AND fs.status = 'active'
        AND datetime(fs.start_time) <= datetime('now')
        AND datetime(fs.end_time) >= datetime('now')
      WHERE p.id = ?
    `).bind(id).first<any>()

    if (!row) return null

    const prod: ProductWithInventory = {
      id: row.id,
      name: row.name,
      description: row.description,
      sku: row.sku,
      price: row.price,
      category: row.category,
      imageUrl: row.imageUrl,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      onHand: row.onHand,
      reserved: row.reserved,
      available: row.available
    }

    if (row.fs_id) {
      prod.flashSale = {
        id: row.fs_id,
        productId: row.id,
        discountPrice: row.fs_discount_price,
        saleStockLimit: row.fs_sale_stock_limit,
        allocatedStock: row.fs_allocated_stock,
        startTime: row.fs_start_time,
        endTime: row.fs_end_time,
        status: row.fs_status,
        createdAt: '',
        updatedAt: ''
      }
    }

    return prod
  }

  async createProduct(data: {
    name: string
    description?: string
    sku: string
    price: number
    category?: string
    imageUrl?: string
    initialStock: number
  }): Promise<ProductWithInventory> {
    const existing = await this.db.prepare(
      'SELECT id FROM products WHERE sku = ?'
    ).bind(data.sku).first()

    if (existing) {
      const err = new Error('A product with this SKU already exists')
      ;(err as any).statusCode = 409
      throw err
    }

    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    const statements = [
      this.db.prepare(`
        INSERT INTO products (id, name, description, sku, price, category, image_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        data.name,
        data.description ?? null,
        data.sku,
        data.price,
        data.category ?? null,
        data.imageUrl ?? null,
        now,
        now
      ),
      this.db.prepare(`
        INSERT INTO inventory (product_id, on_hand, reserved)
        VALUES (?, ?, 0)
      `).bind(id, data.initialStock)
    ]

    if (data.initialStock > 0) {
      statements.push(
        this.db.prepare(`
          INSERT INTO inventory_movements (id, product_id, movement_type, quantity, notes, created_at)
          VALUES (?, ?, 'stock_received', ?, 'Initial stock setup', ?)
        `).bind(crypto.randomUUID(), id, data.initialStock, now)
      )
    }

    await this.db.batch(statements)

    return {
      id,
      name: data.name,
      description: data.description ?? null,
      sku: data.sku,
      price: data.price,
      category: data.category ?? null,
      imageUrl: data.imageUrl ?? null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      onHand: data.initialStock,
      reserved: 0,
      available: data.initialStock
    }
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<ProductWithInventory> {
    const existing = await this.getProductById(id)
    if (!existing) {
      const err = new Error('Product not found')
      ;(err as any).statusCode = 404
      throw err
    }

    if (data.sku && data.sku !== existing.sku) {
      const skuCheck = await this.db.prepare(
        'SELECT id FROM products WHERE sku = ? AND id != ?'
      ).bind(data.sku, id).first()

      if (skuCheck) {
        const err = new Error('SKU already belongs to another product')
        ;(err as any).statusCode = 409
        throw err
      }
    }

    const updates: string[] = []
    const values: unknown[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.description !== undefined) {
      updates.push('description = ?')
      values.push(data.description)
    }
    if (data.sku !== undefined) {
      updates.push('sku = ?')
      values.push(data.sku)
    }
    if (data.price !== undefined) {
      updates.push('price = ?')
      values.push(data.price)
    }
    if (data.category !== undefined) {
      updates.push('category = ?')
      values.push(data.category)
    }
    if (data.imageUrl !== undefined) {
      updates.push('image_url = ?')
      values.push(data.imageUrl)
    }

    updates.push("updated_at = datetime('now')")
    values.push(id)

    await this.db.prepare(`
      UPDATE products
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...values).run()

    const updated = await this.getProductById(id)
    return updated!
  }

  async archiveProduct(id: string): Promise<void> {
    const result = await this.db.prepare(`
      UPDATE products
      SET status = 'archived', updated_at = datetime('now')
      WHERE id = ? AND status = 'active'
    `).bind(id).run()

    if (!result.meta.changes) {
      const err = new Error('Active product not found')
      ;(err as any).statusCode = 404
      throw err
    }
  }
}
