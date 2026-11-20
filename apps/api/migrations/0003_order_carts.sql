-- Preserve cart contents when checkout reserves stock; convert the cart only
-- after a successful simulated payment.
CREATE TABLE IF NOT EXISTS order_carts (
  order_id TEXT PRIMARY KEY NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  cart_id TEXT NOT NULL REFERENCES carts(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_order_carts_cart_id ON order_carts(cart_id);
