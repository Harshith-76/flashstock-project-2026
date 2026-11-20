-- Track which flash-sale quota a reservation consumed so failed or expired
-- reservations can return that quota safely.
ALTER TABLE reservation_items ADD COLUMN flash_sale_id TEXT REFERENCES flash_sales(id);
