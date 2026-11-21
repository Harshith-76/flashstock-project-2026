import { ReservationService } from './reservation.service'
import { Payment } from '../types'

export class PaymentService {
  private reservationService: ReservationService

  constructor(private db: D1Database) {
    this.reservationService = new ReservationService(db)
  }

  async simulatePayment(params: {
    orderId: string
    outcome?: 'success' | 'failure' | 'timeout' | 'expired' | 'processing'
    providerReference?: string
  }): Promise<{ payment: Payment; orderStatus: string; message: string }> {
    const { orderId, outcome = 'success', providerReference } = params

    // 1. Fetch order and reservation
    const order = await this.db.prepare(
      'SELECT id, order_number, total_amount, status FROM orders WHERE id = ?'
    ).bind(orderId).first<{
      id: string
      order_number: string
      total_amount: number
      status: string
    }>()

    if (!order) {
      const err = new Error('Order not found')
      ;(err as any).statusCode = 404
      throw err
    }

    // 2. Check for existing payment
    const existingPayment = await this.db.prepare(
      'SELECT id, status, amount, provider_reference, created_at, updated_at FROM payments WHERE order_id = ?'
    ).bind(orderId).first<{
      id: string
      status: 'pending' | 'succeeded' | 'failed' | 'refunded'
      amount: number
      provider_reference: string | null
      created_at: string
      updated_at: string
    }>()

    if (existingPayment && existingPayment.status === 'succeeded') {
      return {
        payment: {
          id: existingPayment.id,
          orderId,
          status: existingPayment.status,
          amount: existingPayment.amount,
          providerReference: existingPayment.provider_reference,
          createdAt: existingPayment.created_at,
          updatedAt: existingPayment.updated_at
        },
        orderStatus: order.status,
        message: 'Payment was already processed successfully'
      }
    }

    const reservation = await this.db.prepare(
      'SELECT id, status, expires_at FROM reservations WHERE order_id = ?'
    ).bind(orderId).first<{
      id: string
      status: string
      expires_at: string
    }>()

    if (!reservation) {
      const err = new Error('No reservation record found for this order')
      ;(err as any).statusCode = 404
      throw err
    }

    const isExpired = new Date(reservation.expires_at) <= new Date() || reservation.status === 'expired'

    const paymentId = existingPayment ? existingPayment.id : crypto.randomUUID()
    const ref = providerReference || `SIM-PAY-${Date.now().toString(36).toUpperCase()}`
    const now = new Date().toISOString()

    // 3. Handle scenarios
    if (outcome === 'processing' && !isExpired) {
      const payment = await this.savePaymentRecord(paymentId, orderId, 'pending', order.total_amount, ref, now)
      if (!payment) throw new Error('Payment state could not be saved')
      return {
        payment,
        orderStatus: order.status,
        message: 'Payment is processing. The reservation remains active while the result is pending.'
      }
    } else if (outcome === 'success') {
      if (isExpired) {
        // Late payment after expiration must be rejected!
        const released = await this.reservationService.releaseReservation(orderId, 'expired')
        const latestStatus = await this.getReservationStatus(orderId)
        if (!released && latestStatus === 'confirmed') {
          const payment = await this.finalizeSuccessfulPayment(orderId, paymentId, order.total_amount, ref, now)
          return { payment, orderStatus: 'confirmed', message: 'Payment was already confirmed successfully.' }
        }

        await this.savePaymentRecord(paymentId, orderId, 'failed', order.total_amount, ref, now)

        const err = new Error('Payment rejected: Reservation expired before payment completion. Stock has been released.')
        ;(err as any).statusCode = 410
        throw err
      }

      // Confirm reservation & deduct stock
      const confirmed = await this.reservationService.confirmReservation(orderId)
      if (!confirmed) {
        const latestStatus = await this.getReservationStatus(orderId)
        const err = new Error(latestStatus === 'expired'
          ? 'Reservation has expired. Stock has been released.'
          : 'Reservation is no longer available for payment.')
        ;(err as any).statusCode = latestStatus === 'expired' ? 410 : 409
        throw err
      }

      const payment = await this.finalizeSuccessfulPayment(orderId, paymentId, order.total_amount, ref, now)

      return {
        payment: {
          ...payment,
          orderId
        },
        orderStatus: 'confirmed',
        message: 'Payment completed successfully. Stock deducted and order confirmed.'
      }
    } else if (outcome === 'expired' || outcome === 'timeout' || isExpired) {
      const released = await this.reservationService.releaseReservation(orderId, 'expired')
      if (!released && await this.getReservationStatus(orderId) === 'confirmed') {
        const payment = await this.finalizeSuccessfulPayment(orderId, paymentId, order.total_amount, ref, now)
        return { payment, orderStatus: 'confirmed', message: 'Payment was already confirmed successfully.' }
      }

      await this.savePaymentRecord(paymentId, orderId, 'failed', order.total_amount, ref, now)

      return {
        payment: {
          id: paymentId,
          orderId,
          status: 'failed',
          amount: order.total_amount,
          providerReference: ref,
          createdAt: now,
          updatedAt: now
        },
        orderStatus: 'cancelled',
        message: 'Reservation timed out or expired. Stock released.'
      }
    } else {
      // Payment failure
      const released = await this.reservationService.releaseReservation(orderId, 'payment_failed')
      if (!released && await this.getReservationStatus(orderId) === 'confirmed') {
        const payment = await this.finalizeSuccessfulPayment(orderId, paymentId, order.total_amount, ref, now)
        return { payment, orderStatus: 'confirmed', message: 'Payment was already confirmed successfully.' }
      }

      await this.savePaymentRecord(paymentId, orderId, 'failed', order.total_amount, ref, now)

      return {
        payment: {
          id: paymentId,
          orderId,
          status: 'failed',
          amount: order.total_amount,
          providerReference: ref,
          createdAt: now,
          updatedAt: now
        },
        orderStatus: 'payment_failed',
        message: 'Payment simulation failed. Reserved stock released.'
      }
    }
  }

  private async getReservationStatus(orderId: string): Promise<string | null> {
    const reservation = await this.db.prepare('SELECT status FROM reservations WHERE order_id = ?')
      .bind(orderId).first<{ status: string }>()
    return reservation?.status || null
  }

  private async finalizeSuccessfulPayment(
    orderId: string,
    paymentId: string,
    amount: number,
    providerRef: string,
    now: string
  ): Promise<Payment> {
    const sourceCart = await this.db.prepare('SELECT cart_id FROM order_carts WHERE order_id = ?')
      .bind(orderId).first<{ cart_id: string }>()
    if (sourceCart) {
      await this.db.batch([
        this.db.prepare('DELETE FROM cart_items WHERE cart_id = ?').bind(sourceCart.cart_id),
        this.db.prepare("UPDATE carts SET status = 'converted', updated_at = ? WHERE id = ? AND status = 'active'")
          .bind(now, sourceCart.cart_id)
      ])
    }
    const payment = await this.savePaymentRecord(paymentId, orderId, 'succeeded', amount, providerRef, now)
    if (!payment) throw new Error('Payment state could not be saved')
    return payment
  }

  private async savePaymentRecord(
    id: string,
    orderId: string,
    status: string,
    amount: number,
    providerRef: string,
    now: string
  ): Promise<Payment | null> {
    const existing = await this.db.prepare('SELECT id, status FROM payments WHERE order_id = ?')
      .bind(orderId).first<{ id: string; status: string }>()
    if (existing) {
      await this.db.prepare(`
        UPDATE payments
        SET status = ?, provider_reference = ?, updated_at = ?
        WHERE id = ? AND status != 'succeeded'
      `).bind(status, providerRef, now, existing.id).run()
    } else {
      await this.db.prepare(`
        INSERT INTO payments (id, order_id, status, amount, provider_reference, created_at, updated_at)
        SELECT ?, ?, ?, ?, ?, ?, ?
        WHERE NOT EXISTS (SELECT 1 FROM payments WHERE order_id = ?)
      `).bind(id, orderId, status, amount, providerRef, now, now, orderId).run()
    }
    return this.getPaymentByOrderId(orderId)
  }

  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    const row = await this.db.prepare(`
      SELECT id, order_id AS orderId, status, amount, provider_reference AS providerReference, created_at AS createdAt, updated_at AS updatedAt
      FROM payments
      WHERE order_id = ?
    `).bind(orderId).first<Payment>()

    return row || null
  }
}
