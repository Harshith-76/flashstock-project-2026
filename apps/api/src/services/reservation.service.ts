import { Order, Reservation, ReservationItem } from '../types'

export interface CheckoutItemInput {
  productId: string
  quantity: number
}

export interface CreateReservationResult {
  order: Order
  reservation: Reservation
}

export class ReservationService {
  constructor(private db: D1Database) {}

  /**
   * Concurrency-safe reservation creation.
   * Atomically reserves stock across multiple products, creates the order and reservation.
   * If any item has insufficient available stock (on_hand - reserved < quantity),
   * the database CHECK constraint fails and the entire batch transaction rolls back.
   */
  async createReservation(params: {
    userId: string
    items: CheckoutItemInput[]
    idempotencyKey?: string
    requestHash?: string
    cartId?: string
    shippingAddress?: Record<string, string>
  }): Promise<CreateReservationResult> {
    const { userId, idempotencyKey, requestHash, cartId, shippingAddress } = params
    let { items } = params

    if (!items || items.length === 0) {
      const err = new Error('No items specified for reservation')
      ;(err as any).statusCode = 400
      throw err
    }

    // Step 1: Fetch all products and active flash sales
    const quantities = new Map<string, number>()
    for (const item of items) quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity)
    items = Array.from(quantities, ([productId, quantity]) => ({ productId, quantity }))
    const productIds = items.map((i) => i.productId)
    const placeholders = productIds.map(() => '?').join(', ')

    const productsResult = await this.db.prepare(`
      SELECT
        p.id,
        p.name,
        p.price,
        p.status,
        COALESCE(i.on_hand, 0) AS on_hand,
        COALESCE(i.reserved, 0) AS reserved,
        COALESCE(i.on_hand - i.reserved, 0) AS available,
        fs.id AS fs_id,
        fs.discount_price AS fs_discount_price,
        fs.sale_stock_limit AS fs_sale_stock_limit,
        fs.allocated_stock AS fs_allocated_stock
      FROM products p
      JOIN inventory i ON i.product_id = p.id
      LEFT JOIN flash_sales fs ON fs.product_id = p.id
        AND fs.status = 'active'
        AND datetime(fs.start_time) <= datetime('now')
        AND datetime(fs.end_time) >= datetime('now')
      WHERE p.id IN (${placeholders})
    `).bind(...productIds).all<any>()

    const productMap = new Map<string, any>()
    for (const p of productsResult.results) {
      productMap.set(p.id, p)
    }

    // Step 2: Validate product existence, active status, and pre-check stock
    let totalAmount = 0
    const orderItemsToInsert: {
      id: string
      productId: string
      productName: string
      unitPrice: number
      quantity: number
      subtotal: number
      flashSaleId?: string
    }[] = []

    for (const item of items) {
      const p = productMap.get(item.productId)
      if (!p) {
        const err = new Error(`Product not found: ${item.productId}`)
        ;(err as any).statusCode = 404
        throw err
      }

      if (p.status !== 'active') {
        const err = new Error(`Product "${p.name}" is no longer active`)
        ;(err as any).statusCode = 400
        throw err
      }

      if (p.available < item.quantity) {
        const err = new Error(`Insufficient stock for product "${p.name}". Available: ${p.available}, requested: ${item.quantity}`)
        ;(err as any).statusCode = 409
        throw err
      }

      let unitPrice = p.price
      let flashSaleId: string | undefined

      if (p.fs_id) {
        const remainingSaleStock = p.fs_sale_stock_limit - p.fs_allocated_stock
        if (remainingSaleStock >= item.quantity) {
          unitPrice = p.fs_discount_price
          flashSaleId = p.fs_id
        }
      }

      const subtotal = unitPrice * item.quantity
      totalAmount += subtotal

      orderItemsToInsert.push({
        id: crypto.randomUUID(),
        productId: item.productId,
        productName: p.name,
        unitPrice,
        quantity: item.quantity,
        subtotal,
        flashSaleId
      })
    }

    // Step 3: Construct the atomic D1 batch statements
    const orderId = crypto.randomUUID()
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`
    const reservationId = crypto.randomUUID()
    const now = new Date().toISOString()
    // Expiration: 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const statements: D1PreparedStatement[] = []

    // 3a: Atomically reserve stock for each product in inventory
    // The table CHECK constraint (reserved <= on_hand) and trigger ensure that if
    // concurrent purchases race and deplete available stock, SQLite aborts the entire batch!
    for (const item of items) {
      statements.push(
        this.db.prepare(`
          UPDATE inventory
          SET reserved = reserved + ?
          WHERE product_id = ?
        `).bind(item.quantity, item.productId)
      )

      const oi = orderItemsToInsert.find((x) => x.productId === item.productId)
      if (oi?.flashSaleId) {
        statements.push(
          this.db.prepare(`
            UPDATE flash_sales
            SET allocated_stock = allocated_stock + ?
            WHERE id = ?
          `).bind(item.quantity, oi.flashSaleId)
        )
      }
    }

    // 3b: Insert Order
    statements.push(
      this.db.prepare(`
        INSERT INTO orders (id, order_number, user_id, status, total_amount, shipping_address, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
      `).bind(orderId, orderNumber, userId, totalAmount, shippingAddress ? JSON.stringify(shippingAddress) : null, now, now)
    )

    if (cartId) {
      statements.push(this.db.prepare(`
        INSERT INTO order_carts (order_id, cart_id, created_at) VALUES (?, ?, ?)
      `).bind(orderId, cartId, now))
    }

    // 3c: Insert Order Items
    for (const oi of orderItemsToInsert) {
      statements.push(
        this.db.prepare(`
          INSERT INTO order_items (id, order_id, product_id, product_name, unit_price, quantity, subtotal)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(oi.id, orderId, oi.productId, oi.productName, oi.unitPrice, oi.quantity, oi.subtotal)
      )
    }

    // 3d: Insert Reservation
    statements.push(
      this.db.prepare(`
        INSERT INTO reservations (id, order_id, status, expires_at, created_at)
        VALUES (?, ?, 'active', ?, ?)
      `).bind(reservationId, orderId, expiresAt, now)
    )

    // 3e: Insert Reservation Items
    for (const item of items) {
      statements.push(
        this.db.prepare(`
          INSERT INTO reservation_items (id, reservation_id, product_id, quantity, flash_sale_id)
          VALUES (?, ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(), reservationId, item.productId, item.quantity,
          orderItemsToInsert.find((oi) => oi.productId === item.productId)?.flashSaleId || null
        )
      )
    }

    // 3f: Insert Inventory Movement Records
    for (const item of items) {
      statements.push(
        this.db.prepare(`
          INSERT INTO inventory_movements (id, product_id, movement_type, quantity, reference_id, notes, created_at)
          VALUES (?, ?, 'stock_reserved', ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          item.productId,
          item.quantity,
          reservationId,
          `Stock reserved for order ${orderNumber}`,
          now
        )
      )
    }

    // 3g: Idempotency record if key provided
    if (idempotencyKey && requestHash) {
      const responsePayload = JSON.stringify({
        success: true,
        orderId,
        orderNumber,
        reservationId,
        expiresAt,
        totalAmount
      })

      statements.push(
        this.db.prepare(`
          INSERT INTO idempotency_keys (id, user_id, idempotency_key, request_hash, response_status, response_body, created_at)
          VALUES (?, ?, ?, ?, 201, ?, ?)
        `).bind(crypto.randomUUID(), userId, idempotencyKey, requestHash, responsePayload, now)
      )
    }

    // Step 4: Execute the entire batch atomically
    try {
      await this.db.batch(statements)
    } catch (error: any) {
      const msg = String(error?.message || error)
      if (
        msg.includes('CHECK constraint failed') ||
        msg.includes('INSUFFICIENT_STOCK') ||
        msg.includes('inventory_reserved_limit_check')
      ) {
        const err = new Error('Insufficient inventory available. Reservation failed due to concurrent demand.')
        ;(err as any).statusCode = 409
        throw err
      }

      if (msg.includes('UNIQUE constraint failed') && msg.includes('idempotency_keys')) {
        const err = new Error('Duplicate checkout request with this idempotency key')
        ;(err as any).statusCode = 409
        throw err
      }

      console.error('Batch reservation execution failed:', error)
      throw error
    }

    const order: Order = {
      id: orderId,
      orderNumber,
      userId,
      status: 'pending',
      totalAmount,
      shippingAddress: shippingAddress ? JSON.stringify(shippingAddress) : null,
      createdAt: now,
      updatedAt: now,
      items: orderItemsToInsert.map((oi) => ({
        id: oi.id,
        orderId,
        productId: oi.productId,
        productName: oi.productName,
        unitPrice: oi.unitPrice,
        quantity: oi.quantity,
        subtotal: oi.subtotal
      }))
    }

    const reservation: Reservation = {
      id: reservationId,
      orderId,
      status: 'active',
      expiresAt,
      createdAt: now,
      items: items.map((i) => ({
        id: '',
        reservationId,
        productId: i.productId,
        quantity: i.quantity
      }))
    }

    return { order, reservation }
  }

  /**
   * Confirms a reservation after successful payment:
   * - Sets reservation status to 'confirmed'
   * - Deducts reserved quantity from on_hand stock and releases reserved quantity
   * - Sets order status to 'confirmed'
   * - Records inventory movement 'stock_sold'
   */
  async confirmReservation(orderId: string): Promise<boolean> {
    const reservation = await this.db.prepare(`
      SELECT r.id, r.status, r.expires_at
      FROM reservations r
      WHERE r.order_id = ?
    `).bind(orderId).first<{ id: string; status: string; expires_at: string }>()

    if (!reservation) {
      const err = new Error('Reservation not found for this order')
      ;(err as any).statusCode = 404
      throw err
    }

    if (reservation.status === 'confirmed') {
      return true // Already confirmed idempotently
    }

    if (reservation.status !== 'active') {
      const err = new Error(`Cannot confirm reservation with status "${reservation.status}"`)
      ;(err as any).statusCode = 400
      throw err
    }

    // Check expiry
    if (new Date(reservation.expires_at) <= new Date()) {
      await this.releaseReservation(orderId, 'expired')
      const err = new Error('Reservation has expired. Stock has been released.')
      ;(err as any).statusCode = 410
      throw err
    }

    const items = await this.db.prepare(`
      SELECT product_id, quantity, flash_sale_id
      FROM reservation_items
      WHERE reservation_id = ?
    `).bind(reservation.id).all<{ product_id: string; quantity: number; flash_sale_id: string | null }>()

    const now = new Date().toISOString()
    const statements: D1PreparedStatement[] = [
      // 1: Mark reservation confirmed conditionally
      this.db.prepare(`
        UPDATE reservations
        SET status = 'confirmed'
        WHERE id = ? AND status = 'active'
      `).bind(reservation.id),

      // 2: Update order status to confirmed
      this.db.prepare(`
        UPDATE orders
        SET status = 'confirmed', updated_at = ?
        WHERE id = ?
      `).bind(now, orderId)
    ]

    // 3: Deduct sold stock and release reserved stock
    for (const item of items.results) {
      statements.push(
        this.db.prepare(`
          UPDATE inventory
          SET on_hand = on_hand - ?, reserved = reserved - ?
          WHERE product_id = ?
        `).bind(item.quantity, item.quantity, item.product_id)
      )

      statements.push(
        this.db.prepare(`
          INSERT INTO inventory_movements (id, product_id, movement_type, quantity, reference_id, notes, created_at)
          VALUES (?, ?, 'stock_sold', ?, ?, 'Stock deducted on confirmed payment', ?)
        `).bind(crypto.randomUUID(), item.product_id, item.quantity, orderId, now)
      )
    }

    const results = await this.db.batch(statements)
    return results[0].meta.changes === 1
  }

  /**
   * Releases reserved stock back to available inventory
   * (e.g. On payment failure, user cancellation, or reservation expiry).
   */
  async releaseReservation(orderId: string, reason: 'released' | 'expired' | 'payment_failed' = 'released'): Promise<boolean> {
    const reservation = await this.db.prepare(`
      SELECT r.id, r.status
      FROM reservations r
      WHERE r.order_id = ?
    `).bind(orderId).first<{ id: string; status: string }>()

    if (!reservation) {
      return false
    }

    if (reservation.status === 'released' || reservation.status === 'expired') {
      return true // Already released idempotently
    }

    if (reservation.status !== 'active') {
      return false
    }

    const items = await this.db.prepare(`
      SELECT product_id, quantity, flash_sale_id
      FROM reservation_items
      WHERE reservation_id = ?
    `).bind(reservation.id).all<{ product_id: string; quantity: number; flash_sale_id: string | null }>()

    const now = new Date().toISOString()
    const finalReservationStatus = reason === 'expired' ? 'expired' : 'released'
    const finalOrderStatus = reason === 'expired' ? 'cancelled' : reason === 'payment_failed' ? 'payment_failed' : 'cancelled'

    const statements: D1PreparedStatement[] = [
      this.db.prepare(`
        UPDATE reservations
        SET status = ?
        WHERE id = ? AND status = 'active'
      `).bind(finalReservationStatus, reservation.id),

      this.db.prepare(`
        UPDATE orders
        SET status = ?, updated_at = ?
        WHERE id = ?
      `).bind(finalOrderStatus, now, orderId)
    ]

    for (const item of items.results) {
      statements.push(
        this.db.prepare(`
          UPDATE inventory
          SET reserved = reserved - ?
          WHERE product_id = ?
        `).bind(item.quantity, item.product_id)
      )

      if (item.flash_sale_id) {
        statements.push(this.db.prepare(`
          UPDATE flash_sales SET allocated_stock = allocated_stock - ?
          WHERE id = ? AND allocated_stock >= ?
        `).bind(item.quantity, item.flash_sale_id, item.quantity))
      }

      statements.push(
        this.db.prepare(`
          INSERT INTO inventory_movements (id, product_id, movement_type, quantity, reference_id, notes, created_at)
          VALUES (?, ?, 'reservation_released', ?, ?, ?, ?)
        `).bind(
          crypto.randomUUID(),
          item.product_id,
          item.quantity,
          orderId,
          `Stock released due to ${reason}`,
          now
        )
      )
    }

    const results = await this.db.batch(statements)
    return results[0].meta.changes === 1
  }

  /**
   * Background-compatible sweep of all expired reservations.
   * Finds active reservations where expires_at <= datetime('now') and releases them.
   */
  async expireStaleReservations(): Promise<number> {
    const expiredList = await this.db.prepare(`
      SELECT order_id
      FROM reservations
      WHERE status = 'active'
        AND datetime(expires_at) <= datetime('now')
    `).all<{ order_id: string }>()

    let count = 0
    for (const row of expiredList.results) {
      try {
        const released = await this.releaseReservation(row.order_id, 'expired')
        if (released) count++
      } catch (err) {
        console.error(`Failed to expire reservation for order ${row.order_id}:`, err)
      }
    }

    return count
  }
}
