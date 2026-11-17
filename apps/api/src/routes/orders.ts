import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { User, Session } from '../types'

const orderRoutes = new Hono<{ Bindings: Env; Variables: { user: User; session: Session } }>()

orderRoutes.use('*', authMiddleware)

// GET ORDERS (customer sees own orders; admin can see all)
orderRoutes.get('/', async (c) => {
  try {
    const user = c.get('user')
    const seeAll = c.req.query('all') === 'true' && user.role === 'admin'
    const status = c.req.query('status')

    let query = `
      SELECT
        o.id,
        o.order_number AS orderNumber,
        o.user_id AS userId,
        o.status,
        o.total_amount AS totalAmount,
        o.created_at AS createdAt,
        o.updated_at AS updatedAt,
        u.name AS customerName,
        u.email AS customerEmail,
        r.id AS reservationId,
        r.status AS reservationStatus,
        r.expires_at AS reservationExpiresAt
      FROM orders o
      JOIN users u ON u.id = o.user_id
      LEFT JOIN reservations r ON r.order_id = o.id
      WHERE 1=1
    `
    const params: unknown[] = []

    if (!seeAll) {
      query += ' AND o.user_id = ?'
      params.push(user.id)
    }

    if (status) {
      query += ' AND o.status = ?'
      params.push(status)
    }

    query += ' ORDER BY o.created_at DESC'

    const result = await c.env.DB.prepare(query).bind(...params).all<any>()

    return c.json({
      success: true,
      count: result.results.length,
      orders: result.results
    })
  } catch (error: any) {
    console.error('Get orders error:', error)
    return c.json({
      success: false,
      message: error.message || 'Unable to fetch orders'
    }, 500)
  }
})

// GET ORDER BY ID
orderRoutes.get('/:id', async (c) => {
  try {
    const user = c.get('user')
    const id = c.req.param('id')

    const order = await c.env.DB.prepare(`
      SELECT
        o.id,
        o.order_number AS orderNumber,
        o.user_id AS userId,
        o.status,
        o.total_amount AS totalAmount,
        o.created_at AS createdAt,
        o.updated_at AS updatedAt,
        u.name AS customerName,
        u.email AS customerEmail
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE o.id = ?
    `).bind(id).first<any>()

    if (!order) {
      return c.json({
        success: false,
        message: 'Order not found'
      }, 404)
    }

    // Permission check: customer can only view own order
    if (user.role !== 'admin' && order.userId !== user.id) {
      return c.json({
        success: false,
        message: 'Access denied'
      }, 403)
    }

    // Fetch items
    const items = await c.env.DB.prepare(`
      SELECT
        oi.id,
        oi.product_id AS productId,
        oi.product_name AS productName,
        oi.unit_price AS unitPrice,
        oi.quantity,
        oi.subtotal,
        p.image_url AS imageUrl
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
    `).bind(id).all<any>()

    // Fetch reservation
    const reservation = await c.env.DB.prepare(`
      SELECT id, status, expires_at AS expiresAt, created_at AS createdAt
      FROM reservations
      WHERE order_id = ?
    `).bind(id).first<any>()

    // Fetch payment
    const payment = await c.env.DB.prepare(`
      SELECT id, status, amount, provider_reference AS providerReference, created_at AS createdAt
      FROM payments
      WHERE order_id = ?
    `).bind(id).first<any>()

    return c.json({
      success: true,
      order: {
        ...order,
        items: items.results,
        reservation,
        payment
      }
    })
  } catch (error: any) {
    console.error('Get order by id error:', error)
    return c.json({
      success: false,
      message: error.message || 'Unable to fetch order'
    }, 500)
  }
})

// UPDATE ORDER STATUS (Admin only)
orderRoutes.patch('/:id/status', adminMiddleware, async (c) => {
  try {
    const id = c.req.param('id')
    const { status } = await c.req.json()

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'payment_failed']
    if (!validStatuses.includes(status)) {
      return c.json({
        success: false,
        message: 'Invalid order status'
      }, 400)
    }

    const result = await c.env.DB.prepare(`
      UPDATE orders
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(status, id).run()

    if (!result.meta.changes) {
      return c.json({
        success: false,
        message: 'Order not found'
      }, 404)
    }

    return c.json({
      success: true,
      message: 'Order status updated',
      status
    })
  } catch (error: any) {
    console.error('Update order status error:', error)
    return c.json({
      success: false,
      message: error.message || 'Unable to update status'
    }, 500)
  }
})

export default orderRoutes
