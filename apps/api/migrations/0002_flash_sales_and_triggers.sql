-- ==========================================
-- FLASHSTOCK DATABASE
-- Migration: 0002_flash_sales_and_triggers
-- Database: Cloudflare D1 (SQLite)
-- ==========================================

PRAGMA foreign_keys = ON;

-- 1. FLASH SALES TABLE
CREATE TABLE IF NOT EXISTS flash_sales (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    discount_price INTEGER NOT NULL CHECK (discount_price >= 0),
    sale_stock_limit INTEGER NOT NULL CHECK (sale_stock_limit > 0),
    allocated_stock INTEGER NOT NULL DEFAULT 0 CHECK (allocated_stock >= 0 AND allocated_stock <= sale_stock_limit),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended', 'cancelled')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_flash_sales_product ON flash_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_flash_sales_status ON flash_sales(status);

-- 2. INVENTORY OVERSELL PROTECTION TRIGGER
-- Enforces that reserved stock can never exceed on-hand stock under any circumstance
CREATE TRIGGER IF NOT EXISTS trg_prevent_inventory_oversell
BEFORE UPDATE OF reserved, on_hand ON inventory
FOR EACH ROW
WHEN (NEW.reserved > NEW.on_hand OR NEW.reserved < 0 OR NEW.on_hand < 0)
BEGIN
    SELECT RAISE(ABORT, 'INSUFFICIENT_STOCK: Reserved quantity cannot exceed on-hand stock');
END;
