import { ReservationService, CheckoutItemInput } from './reservation.service'
import { CartService } from './cart.service'
import { Order, Reservation } from '../types'

async function computeHash(data: any): Promise<string> {
  const enc = new TextEncoder()
  const serialized = typeof data === 'string' ? data : JSON.stringify(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(serialized))
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export class CheckoutService {
  private reservationService: ReservationService
  private cartService: CartService

  constructor(private db: D1Database) {
    this.reservationService = new ReservationService(db)
    this.cartService = new CartService(db)
  }

  async processCheckout(params: {
    userId: string
    idempotencyKey: string
    cartId?: string
    items?: CheckoutItemInput[]
    shippingAddress?: any
  }): Promise<{ order: Order; reservation: Reservation; isDuplicate?: boolean }> {
    const { userId, idempotencyKey, cartId, items, shippingAddress } = params

    // Step 1: Idempotency Check
    const normalizedPayload = {
      cartId: cartId || null,
      items: items ? items.map((i) => ({ productId: i.productId, quantity: i.quantity })).sort((a, b) => a.productId.localeCompare(b.productId)) : null,
      shippingAddress: shippingAddress || null
    }

    const requestHash = await computeHash(normalizedPayload)

    const existingKey = await this.db.prepare(`
      SELECT request_hash, response_status, response_body
      FROM idempotency_keys
      WHERE user_id = ? AND idempotency_key = ?
    `).bind(userId, idempotencyKey).first<{
      request_hash: string
      response_status: number
      response_body: string
    }>()

    if (existingKey) {
      if (existingKey.request_hash !== requestHash) {
        const err = new Error('Conflict: Idempotency key already used with a different request payload')
        ;(err as any).statusCode = 409
        throw err
      }

      // Return cached response
      if (existingKey.response_body) {
        try {
          const cached = JSON.parse(existingKey.response_body)
          // Fetch order to return latest state
          const order = await this.db.prepare(
            'SELECT * FROM orders WHERE id = ?'
          ).bind(cached.orderId).first<any>()

          const reservation = await this.db.prepare(
            'SELECT * FROM reservations WHERE id = ?'
          ).bind(cached.reservationId).first<any>()

          if (order && reservation) {
            return {
              order: {
                id: order.id,
                orderNumber: order.order_number,
                userId: order.user_id,
                status: order.status,
                totalAmount: order.total_amount,
                createdAt: order.created_at,
                updatedAt: order.updated_at
              },
              reservation: {
                id: reservation.id,
                orderId: reservation.order_id,
                status: reservation.status,
                expiresAt: reservation.expires_at,
                createdAt: reservation.created_at
              },
              isDuplicate: true
            }
          }
        } catch (e) {
          console.error('Failed to parse cached idempotency body:', e)
        }
      }
    }

    // Step 2: Determine items to reserve
    let checkoutItems: CheckoutItemInput[] = []

    if (items && items.length > 0) {
      checkoutItems = items
    } else if (cartId) {
      const cart = await this.cartService.getCart(userId)
      if (!cart.items || cart.items.length === 0) {
        const err = new Error('Shopping cart is empty')
        ;(err as any).statusCode = 400
        throw err
      }
      checkoutItems = cart.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity
      }))
    }

    if (checkoutItems.length === 0) {
      const err = new Error('No items to checkout')
      ;(err as any).statusCode = 400
      throw err
    }

    // Step 3: Execute atomic reservation
    const result = await this.reservationService.createReservation({
      userId,
      items: checkoutItems,
      idempotencyKey,
      requestHash
    })

    // Step 4: If checking out from cart, convert cart status
    if (cartId) {
      await this.db.prepare(`
        UPDATE carts
        SET status = 'converted', updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `).bind(cartId, userId).run()

      await this.cartService.clearCart(userId)
    }

    return result
  }
}
