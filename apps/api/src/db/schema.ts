import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  check
} from 'drizzle-orm/sqlite-core'

import { sql } from 'drizzle-orm'

// ==========================================
// 1. USERS
// ==========================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),

  name: text('name').notNull(),

  email: text('email').notNull().unique(),

  passwordHash: text('password_hash').notNull(),

  role: text('role', {
    enum: ['customer', 'admin']
  }).notNull().default('customer'),

  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),

  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`)
})

// ==========================================
// 2. SESSIONS
// ==========================================

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),

    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    expiresAt: text('expires_at').notNull(),

    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`)
  },
  (table) => [
    index('idx_sessions_user_id').on(table.userId)
  ]
)

// ==========================================
// 3. PRODUCTS
// ==========================================

export const products = sqliteTable(
  'products',
  {
    id: text('id').primaryKey(),

    name: text('name').notNull(),

    description: text('description'),

    sku: text('sku').notNull().unique(),

    price: integer('price').notNull(),

    category: text('category'),

    imageUrl: text('image_url'),

    status: text('status', {
      enum: ['active', 'archived']
    }).notNull().default('active'),

    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),

    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`)
  },
  (table) => [
    index('idx_products_category').on(table.category),
    index('idx_products_status').on(table.status),
    check('products_price_check', sql`${table.price} >= 0`)
  ]
)

// ==========================================
// 4. INVENTORY
// ==========================================

export const inventory = sqliteTable(
  'inventory',
  {
    productId: text('product_id')
      .primaryKey()
      .references(() => products.id),

    onHand: integer('on_hand').notNull().default(0),

    reserved: integer('reserved').notNull().default(0)
  },
  (table) => [
    check('inventory_on_hand_check', sql`${table.onHand} >= 0`),
    check('inventory_reserved_check', sql`${table.reserved} >= 0`),
    check(
      'inventory_reserved_limit_check',
      sql`${table.reserved} <= ${table.onHand}`
    )
  ]
)
// ==========================================
// 5. CARTS
// ==========================================

export const carts = sqliteTable(
  'carts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    status: text('status', {
      enum: ['active', 'converted', 'abandoned']
    }).notNull().default('active'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`)
  },
  (table) => [
    index('idx_carts_user_id').on(table.userId)
  ]
)

// ==========================================
// 6. CART ITEMS
// ==========================================

export const cartItems = sqliteTable(
  'cart_items',
  {
    id: text('id').primaryKey(),
    cartId: text('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
    productId: text('product_id').notNull().references(() => products.id),
    quantity: integer('quantity').notNull()
  },
  (table) => [
    uniqueIndex('idx_cart_product_unique').on(table.cartId, table.productId),
    check('cart_items_quantity_check', sql`${table.quantity} > 0`)
  ]
)

// ==========================================
// 7. ORDERS
// ==========================================

export const orders = sqliteTable(
  'orders',
  {
    id: text('id').primaryKey(),
    orderNumber: text('order_number').notNull().unique(),
    userId: text('user_id').notNull().references(() => users.id),
    status: text('status', {
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'payment_failed']
    }).notNull().default('pending'),
    totalAmount: integer('total_amount').notNull(),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`)
  },
  (table) => [
    index('idx_orders_user_id').on(table.userId),
    index('idx_orders_status').on(table.status),
    check('orders_total_check', sql`${table.totalAmount} >= 0`)
  ]
)

// ==========================================
// 8. ORDER ITEMS
// ==========================================

export const orderItems = sqliteTable(
  'order_items',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id').notNull().references(() => orders.id),
    productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
    productName: text('product_name').notNull(),
    unitPrice: integer('unit_price').notNull(),
    quantity: integer('quantity').notNull(),
    subtotal: integer('subtotal').notNull()
  },
  (table) => [
    check('order_items_price_check', sql`${table.unitPrice} >= 0`),
    check('order_items_quantity_check', sql`${table.quantity} > 0`),
    check('order_items_subtotal_check', sql`${table.subtotal} >= 0`)
  ]
)

// ==========================================
// 9. RESERVATIONS
// ==========================================

export const reservations = sqliteTable(
  'reservations',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id').notNull().unique().references(() => orders.id),
    status: text('status', {
      enum: ['active', 'confirmed', 'released', 'expired']
    }).notNull().default('active'),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
  },
  (table) => [
    index('idx_reservations_status_expiry').on(table.status, table.expiresAt)
  ]
)

// ==========================================
// 10. RESERVATION ITEMS
// ==========================================

export const reservationItems = sqliteTable(
  'reservation_items',
  {
    id: text('id').primaryKey(),
    reservationId: text('reservation_id').notNull().references(() => reservations.id),
    productId: text('product_id').notNull().references(() => products.id),
    quantity: integer('quantity').notNull()
  },
  (table) => [
    uniqueIndex('idx_reservation_product_unique').on(table.reservationId, table.productId),
    check('reservation_items_quantity_check', sql`${table.quantity} > 0`)
  ]
)

// ==========================================
// 11. PAYMENTS
// ==========================================

export const payments = sqliteTable(
  'payments',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id').notNull().references(() => orders.id),
    status: text('status', {
      enum: ['pending', 'succeeded', 'failed', 'refunded']
    }).notNull().default('pending'),
    amount: integer('amount').notNull(),
    providerReference: text('provider_reference'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`)
  },
  (table) => [
    index('idx_payments_order_id').on(table.orderId),
    check('payments_amount_check', sql`${table.amount} >= 0`)
  ]
)

// ==========================================
// 12. IDEMPOTENCY KEYS
// ==========================================

export const idempotencyKeys = sqliteTable(
  'idempotency_keys',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    idempotencyKey: text('idempotency_key').notNull(),
    requestHash: text('request_hash').notNull(),
    responseStatus: integer('response_status'),
    responseBody: text('response_body'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
  },
  (table) => [
    uniqueIndex('idx_idempotency_user_key').on(table.userId, table.idempotencyKey)
  ]
)

// ==========================================
// 13. INVENTORY MOVEMENTS
// ==========================================

export const inventoryMovements = sqliteTable(
  'inventory_movements',
  {
    id: text('id').primaryKey(),
    productId: text('product_id').notNull().references(() => products.id),
    movementType: text('movement_type', {
      enum: ['stock_received', 'stock_reserved', 'reservation_released', 'stock_sold', 'adjustment']
    }).notNull(),
    quantity: integer('quantity').notNull(),
    referenceId: text('reference_id'),
    notes: text('notes'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`)
  },
  (table) => [
    index('idx_inventory_movements_product').on(table.productId),
    index('idx_inventory_movements_created').on(table.createdAt)
  ]
)