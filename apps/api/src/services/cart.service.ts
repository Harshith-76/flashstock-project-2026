import { Cart, CartItem } from '../types'

export class CartService {
  constructor(private db: D1Database) {}

  async getOrCreateActiveCart(userId: string): Promise<string> {
    let cart = await this.db.prepare(
      "SELECT id FROM carts WHERE user_id = ? AND status = 'active'"
    ).bind(userId).first<{ id: string }>()

    if (!cart) {
      const cartId = crypto.randomUUID()
      const now = new Date().toISOString()
      await this.db.prepare(`
        INSERT INTO carts (id, user_id, status, created_at, updated_at)
        VALUES (?, ?, 'active', ?, ?)
      `).bind(cartId, userId, now, now).run()
      return cartId
    }

    return cart.id
  }

  async getCart(userId: string, requestedCartId?: string): Promise<Cart> {
    const cartId = requestedCartId
      ? (await this.db.prepare("SELECT id FROM carts WHERE id = ? AND user_id = ? AND status = 'active'")
          .bind(requestedCartId, userId).first<{ id: string }>())?.id
      : await this.getOrCreateActiveCart(userId)
    if (!cartId) {
      const err = new Error('Active cart not found')
      ;(err as any).statusCode = 404
      throw err
    }

    const itemsResult = await this.db.prepare(`
      SELECT
        ci.id,
        ci.cart_id AS cartId,
        ci.product_id AS productId,
        ci.quantity,
        p.name,
        p.sku,
        p.price,
        p.image_url AS imageUrl,
        p.status,
        COALESCE(i.on_hand - i.reserved, 0) AS available,
        fs.id AS fs_id,
        fs.discount_price AS fs_discount_price
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      LEFT JOIN inventory i ON i.product_id = p.id
      LEFT JOIN flash_sales fs ON fs.product_id = p.id
        AND fs.status = 'active'
        AND datetime(fs.start_time) <= datetime('now')
        AND datetime(fs.end_time) >= datetime('now')
      WHERE ci.cart_id = ?
      ORDER BY ci.id ASC
    `).bind(cartId).all<any>()

    let totalAmount = 0
    let itemCount = 0

    const items: CartItem[] = itemsResult.results.map((row) => {
      const unitPrice = row.fs_id && row.fs_discount_price !== null ? row.fs_discount_price : row.price
      totalAmount += unitPrice * row.quantity
      itemCount += row.quantity

      return {
        id: row.id,
        cartId: row.cartId,
        productId: row.productId,
        quantity: row.quantity,
        name: row.name,
        sku: row.sku,
        price: unitPrice,
        imageUrl: row.imageUrl,
        available: row.available
      }
    })

    return {
      id: cartId,
      userId,
      status: 'active',
      items,
      totalAmount,
      itemCount
    }
  }

  async addItem(userId: string, productId: string, quantity: number): Promise<Cart> {
    const cartId = await this.getOrCreateActiveCart(userId)

    const product = await this.db.prepare(
      "SELECT id, status FROM products WHERE id = ? AND status = 'active'"
    ).bind(productId).first()

    if (!product) {
      const err = new Error('Product not found or inactive')
      ;(err as any).statusCode = 404
      throw err
    }

    const existingItem = await this.db.prepare(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?'
    ).bind(cartId, productId).first<{ id: string; quantity: number }>()

    const stock = await this.db.prepare(`
      SELECT COALESCE(on_hand - reserved, 0) AS available FROM inventory WHERE product_id = ?
    `).bind(productId).first<{ available: number }>()
    const requestedQuantity = (existingItem?.quantity || 0) + quantity
    if (requestedQuantity > (stock?.available || 0)) {
      const err = new Error(`Only ${stock?.available || 0} units are currently available`)
      ;(err as any).statusCode = 409
      throw err
    }

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity
      await this.db.prepare(
        'UPDATE cart_items SET quantity = ? WHERE id = ?'
      ).bind(newQuantity, existingItem.id).run()
    } else {
      const itemId = crypto.randomUUID()
      await this.db.prepare(`
        INSERT INTO cart_items (id, cart_id, product_id, quantity)
        VALUES (?, ?, ?, ?)
      `).bind(itemId, cartId, productId, quantity).run()
    }

    return this.getCart(userId)
  }

  async updateItemQuantity(userId: string, cartItemId: string, quantity: number): Promise<Cart> {
    const cartId = await this.getOrCreateActiveCart(userId)

    const item = await this.db.prepare(`
      SELECT ci.product_id AS productId, COALESCE(i.on_hand - i.reserved, 0) AS available
      FROM cart_items ci LEFT JOIN inventory i ON i.product_id = ci.product_id
      WHERE ci.id = ? AND ci.cart_id = ?
    `).bind(cartItemId, cartId).first<{ productId: string; available: number }>()
    if (!item) {
      const err = new Error('Cart item not found')
      ;(err as any).statusCode = 404
      throw err
    }
    if (quantity > item.available) {
      const err = new Error(`Only ${item.available} units are currently available`)
      ;(err as any).statusCode = 409
      throw err
    }

    if (quantity <= 0) {
      await this.db.prepare(
        'DELETE FROM cart_items WHERE id = ? AND cart_id = ?'
      ).bind(cartItemId, cartId).run()
    } else {
      const result = await this.db.prepare(
        'UPDATE cart_items SET quantity = ? WHERE id = ? AND cart_id = ?'
      ).bind(quantity, cartItemId, cartId).run()

      if (!result.meta.changes) {
        const err = new Error('Cart item not found')
        ;(err as any).statusCode = 404
        throw err
      }
    }

    return this.getCart(userId)
  }

  async removeItem(userId: string, cartItemId: string): Promise<Cart> {
    const cartId = await this.getOrCreateActiveCart(userId)
    await this.db.prepare(
      'DELETE FROM cart_items WHERE id = ? AND cart_id = ?'
    ).bind(cartItemId, cartId).run()

    return this.getCart(userId)
  }

  async clearCart(userId: string): Promise<void> {
    const cartId = await this.getOrCreateActiveCart(userId)
    await this.db.prepare('DELETE FROM cart_items WHERE cart_id = ?').bind(cartId).run()
  }

  async convertCart(userId: string, cartId: string): Promise<void> {
    const result = await this.db.batch([
      this.db.prepare("DELETE FROM cart_items WHERE cart_id = ? AND cart_id IN (SELECT id FROM carts WHERE user_id = ? AND status = 'active')")
        .bind(cartId, userId),
      this.db.prepare("UPDATE carts SET status = 'converted', updated_at = datetime('now') WHERE id = ? AND user_id = ? AND status = 'active'")
        .bind(cartId, userId)
    ])
    if (result[1].meta.changes !== 1) {
      const err = new Error('Active cart not found')
      ;(err as any).statusCode = 404
      throw err
    }
  }
}
