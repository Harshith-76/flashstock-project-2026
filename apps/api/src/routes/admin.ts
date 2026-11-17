import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { User, Session } from '../types'

const adminRoutes = new Hono<{ Bindings: Env; Variables: { user: User; session: Session } }>()

adminRoutes.use('*', authMiddleware, adminMiddleware)

// GET ALL CUSTOMERS
adminRoutes.get('/customers', async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at AS createdAt,
        COUNT(o.id) AS orderCount,
        COALESCE(SUM(CASE WHEN o.status IN ('confirmed', 'processing', 'shipped', 'delivered') THEN o.total_amount ELSE 0 END), 0) AS totalSpent
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all<any>()

    return c.json({
      success: true,
      count: result.results.length,
      customers: result.results
    })
  } catch (error: any) {
    console.error('Get customers error:', error)
    return c.json({
      success: false,
      message: error.message || 'Unable to fetch customers'
    }, 500)
  }
})

// SEED REALISTIC SAMPLE DATA (Preserves existing data, only inserts if missing)
adminRoutes.post('/seed-demo-data', async (c) => {
  try {
    const sampleProducts = [
      {
        id: 'prod_002',
        name: 'Pro Wireless Gaming Mouse',
        description: 'Ultra-lightweight 26,000 DPI optical sensor with 80-hour battery life.',
        sku: 'FS-MS-002',
        price: 249900, // ₹2,499.00
        category: 'Electronics',
        imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&auto=format&fit=crop&q=80',
        stock: 25
      },
      {
        id: 'prod_003',
        name: '4K Ultra-Wide Curved Monitor 34"',
        description: '144Hz 1ms IPS curved HDR gaming display with USB-C 90W power delivery.',
        sku: 'FS-MON-003',
        price: 3499900, // ₹34,999.00
        category: 'Electronics',
        imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80',
        stock: 8
      },
      {
        id: 'prod_004',
        name: 'Studio Noise-Cancelling Headphones',
        description: 'Active noise cancellation with custom acoustic architecture and 40h runtime.',
        sku: 'FS-AUD-004',
        price: 899900, // ₹8,999.00
        category: 'Audio',
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
        stock: 15
      },
      {
        id: 'prod_005',
        name: 'Ergonomic Mesh Office Chair',
        description: 'Breathable responsive mesh with adjustable 4D armrests and lumbar arch support.',
        sku: 'FS-CHR-005',
        price: 1299900, // ₹12,999.00
        category: 'Furniture',
        imageUrl: 'https://images.unsplash.com/photo-1580481077111-e408e08d532a?w=600&auto=format&fit=crop&q=80',
        stock: 5
      },
      {
        id: 'prod_006',
        name: 'USB-C Thunderbolt 4 Docking Station',
        description: 'Dual 4K 60Hz display support, 100W PD charging, 10Gbps high speed ports.',
        sku: 'FS-DCK-006',
        price: 599900, // ₹5,999.00
        category: 'Accessories',
        imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
        stock: 12
      }
    ]

    let insertedCount = 0
    const now = new Date().toISOString()

    for (const p of sampleProducts) {
      const exists = await c.env.DB.prepare(
        'SELECT id FROM products WHERE id = ? OR sku = ?'
      ).bind(p.id, p.sku).first()

      if (!exists) {
        await c.env.DB.batch([
          c.env.DB.prepare(`
            INSERT INTO products (id, name, description, sku, price, category, image_url, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
          `).bind(p.id, p.name, p.description, p.sku, p.price, p.category, p.imageUrl, now, now),

          c.env.DB.prepare(`
            INSERT INTO inventory (product_id, on_hand, reserved)
            VALUES (?, ?, 0)
          `).bind(p.id, p.stock),

          c.env.DB.prepare(`
            INSERT INTO inventory_movements (id, product_id, movement_type, quantity, notes, created_at)
            VALUES (?, ?, 'stock_received', ?, 'Demo seed stock', ?)
          `).bind(crypto.randomUUID(), p.id, p.stock, now)
        ])
        insertedCount++
      }
    }

    // Also check if flash sale for Mechanical Keyboard (prod_001) exists, otherwise add active flash sale
    const flashSaleExists = await c.env.DB.prepare(
      'SELECT id FROM flash_sales WHERE product_id = ?'
    ).bind('prod_001').first()

    if (!flashSaleExists) {
      const startTime = new Date(Date.now() - 3600000).toISOString()
      const endTime = new Date(Date.now() + 86400000 * 2).toISOString() // 48 hours active

      await c.env.DB.prepare(`
        INSERT INTO flash_sales (id, product_id, discount_price, sale_stock_limit, allocated_stock, start_time, end_time, status, created_at, updated_at)
        VALUES (?, 'prod_001', 399900, 5, 0, ?, ?, 'active', ?, ?)
      `).bind(crypto.randomUUID(), startTime, endTime, now, now).run()
    }

    return c.json({
      success: true,
      message: `Demo seed complete. Inserted ${insertedCount} new products. Existing data preserved.`
    })
  } catch (error: any) {
    console.error('Seed demo data error:', error)
    return c.json({
      success: false,
      message: error.message || 'Seed demo data failed'
    }, 500)
  }
})

export default adminRoutes
