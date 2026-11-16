-- ==========================================
-- FLASHSTOCK DATABASE
-- Initial Migration: 0001
-- Database: Cloudflare D1 (SQLite)
-- ==========================================

PRAGMA foreign_keys = ON;

-- ==========================================
-- 1. USERS
-- ==========================================

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer'
        CHECK (role IN ('customer', 'admin')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==========================================
-- 2. SESSIONS
-- ==========================================

CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id
ON sessions(user_id);

-- ==========================================
-- 3. PRODUCTS
-- ==========================================

CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT NOT NULL UNIQUE,
    price INTEGER NOT NULL CHECK (price >= 0),
    category TEXT,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_products_category
ON products(category);

CREATE INDEX idx_products_status
ON products(status);

-- ==========================================
-- 4. INVENTORY
-- ==========================================

CREATE TABLE inventory (
    product_id TEXT PRIMARY KEY,
    on_hand INTEGER NOT NULL DEFAULT 0,
    reserved INTEGER NOT NULL DEFAULT 0,

    CHECK (on_hand >= 0),
    CHECK (reserved >= 0),
    CHECK (reserved <= on_hand),

    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ==========================================
-- 5. CARTS
-- ==========================================

CREATE TABLE carts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'converted', 'abandoned')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_carts_user_id
ON carts(user_id);

-- ==========================================
-- 6. CART ITEMS
-- ==========================================

CREATE TABLE cart_items (
    id TEXT PRIMARY KEY,
    cart_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),

    UNIQUE (cart_id, product_id),

    FOREIGN KEY (cart_id) REFERENCES carts(id)
        ON DELETE CASCADE,

    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ==========================================
-- 7. ORDERS
-- ==========================================

CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'confirmed',
            'processing',
            'shipped',
            'delivered',
            'cancelled',
            'payment_failed'
        )),

    total_amount INTEGER NOT NULL CHECK (total_amount >= 0),

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_orders_user_id
ON orders(user_id);

CREATE INDEX idx_orders_status
ON orders(status);

-- ==========================================
-- 8. ORDER ITEMS
-- ==========================================

CREATE TABLE order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT NOT NULL,
    unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal INTEGER NOT NULL CHECK (subtotal >= 0),

    FOREIGN KEY (order_id) REFERENCES orders(id),

    FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE SET NULL
);

-- ==========================================
-- 9. RESERVATIONS
-- ==========================================

CREATE TABLE reservations (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN (
            'active',
            'confirmed',
            'released',
            'expired'
        )),

    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE INDEX idx_reservations_status_expiry
ON reservations(status, expires_at);

-- ==========================================
-- 10. RESERVATION ITEMS
-- ==========================================

CREATE TABLE reservation_items (
    id TEXT PRIMARY KEY,
    reservation_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),

    UNIQUE (reservation_id, product_id),

    FOREIGN KEY (reservation_id) REFERENCES reservations(id),

    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ==========================================
-- 11. PAYMENTS
-- ==========================================

CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'succeeded',
            'failed',
            'refunded'
        )),

    amount INTEGER NOT NULL CHECK (amount >= 0),
    provider_reference TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE INDEX idx_payments_order_id
ON payments(order_id);

-- ==========================================
-- 12. IDEMPOTENCY KEYS
-- ==========================================

CREATE TABLE idempotency_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),

    UNIQUE (user_id, idempotency_key),

    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ==========================================
-- 13. INVENTORY MOVEMENTS
-- ==========================================

CREATE TABLE inventory_movements (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,

    movement_type TEXT NOT NULL
        CHECK (movement_type IN (
            'stock_received',
            'stock_reserved',
            'reservation_released',
            'stock_sold',
            'adjustment'
        )),

    quantity INTEGER NOT NULL,
    reference_id TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX idx_inventory_movements_product
ON inventory_movements(product_id);

CREATE INDEX idx_inventory_movements_created
ON inventory_movements(created_at);