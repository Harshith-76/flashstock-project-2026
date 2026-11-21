import { Hono } from 'hono'
import { ReservationService } from '../services/reservation.service'
import { authMiddleware } from '../middleware/auth'
import { adminMiddleware } from '../middleware/admin'
import { User, Session } from '../types'
import { publicErrorMessage } from '../middleware/public-error'

const reservationRoutes = new Hono<{ Bindings: Env; Variables: { user: User; session: Session } }>()

// Background expiration sweep endpoint
reservationRoutes.post('/sweep-expired', authMiddleware, adminMiddleware, async (c) => {
  try {
    const reservationService = new ReservationService(c.env.DB)
    const expiredCount = await reservationService.expireStaleReservations()

    return c.json({
      success: true,
      message: `Expired ${expiredCount} stale reservations and released inventory`,
      expiredCount
    })
  } catch (error: any) {
    console.error('Reservation sweep error:', error)
    return c.json({
      success: false,
      message: publicErrorMessage(error, 'Failed to sweep expired reservations')
    }, 500)
  }
})

// GET RESERVATION FOR AN ORDER
reservationRoutes.get('/:orderId', authMiddleware, async (c) => {
  try {
    const orderId = c.req.param('orderId')
    const user = c.get('user')
    const order = await c.env.DB.prepare('SELECT user_id FROM orders WHERE id = ?')
      .bind(orderId).first<{ user_id: string }>()
    if (!order) return c.json({ success: false, message: 'Reservation not found' }, 404)
    if (user.role !== 'admin' && order.user_id !== user.id) {
      return c.json({ success: false, message: 'Access denied' }, 403)
    }
    const row = await c.env.DB.prepare(`
      SELECT
        r.id,
        r.order_id AS orderId,
        r.status,
        r.expires_at AS expiresAt,
        r.created_at AS createdAt
      FROM reservations r
      WHERE r.order_id = ?
    `).bind(orderId).first<any>()

    if (!row) {
      return c.json({
        success: false,
        message: 'Reservation not found'
      }, 404)
    }

    const items = await c.env.DB.prepare(`
      SELECT
        ri.id,
        ri.product_id AS productId,
        ri.quantity,
        p.name AS productName,
        p.sku
      FROM reservation_items ri
      JOIN products p ON p.id = ri.product_id
      WHERE ri.reservation_id = ?
    `).bind(row.id).all<any>()

    const isExpired = new Date(row.expiresAt) <= new Date() && row.status === 'active'

    return c.json({
      success: true,
      reservation: {
        ...row,
        isExpired,
        items: items.results
      }
    })
  } catch (error: any) {
    console.error('Get reservation error:', error)
    return c.json({
      success: false,
      message: publicErrorMessage(error, 'Unable to fetch reservation')
    }, 500)
  }
})

export default reservationRoutes
