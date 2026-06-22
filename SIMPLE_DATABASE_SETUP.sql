-- ============================================
-- SIMPLE DATABASE SETUP (Minimal Version)
-- ============================================
-- Use this if the complete version has issues
-- ============================================

-- Clean slate
DROP TABLE IF EXISTS bundle_items CASCADE;
DROP TABLE IF EXISTS bundles CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. USERS
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. CATEGORIES
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL
);

-- 3. STORES
CREATE TABLE stores (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL
);

-- 4. INVENTORY
CREATE TABLE inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  store TEXT NOT NULL,
  sales_channel TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  cost_price NUMERIC(10,2) NOT NULL,
  selling_price NUMERIC(10,2) NOT NULL,
  reorder_level INTEGER NOT NULL DEFAULT 10,
  last_updated TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. ORDERS
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  sales_channel TEXT NOT NULL,
  store TEXT NOT NULL,
  courier TEXT NOT NULL,
  waybill TEXT UNIQUE NOT NULL,
  qty INTEGER NOT NULL,
  cogs NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  product TEXT NOT NULL,
  status TEXT DEFAULT 'Dispatched',
  parcel_status TEXT DEFAULT 'PENDING',
  dispatched_by TEXT NOT NULL,
  customer_name TEXT,
  customer_contact TEXT,
  customer_address TEXT,
  dispatch_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. LOGS
CREATE TABLE logs (
  id TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  item_name TEXT,
  details TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  user_role TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert users
INSERT INTO users (id, username, password, role, display_name, email) VALUES
  ('admin-001', 'admin', 'TEMP', 'admin', 'Main Administrator', 'admin@system.local'),
  ('logistic-001', 'logistic', 'TEMP', 'logistics-admin', 'Logistics Admin', 'logistics@system.local');

-- Set passwords
UPDATE users SET password = crypt('admin123', gen_salt('bf')) WHERE username = 'admin';
UPDATE users SET password = crypt('logistic123', gen_salt('bf')) WHERE username = 'logistic';

-- Insert default categories
INSERT INTO categories (id, name, created_at) VALUES
  ('cat-001', 'Electronics', NOW()::TEXT),
  ('cat-002', 'Clothing', NOW()::TEXT),
  ('cat-003', 'Food & Beverages', NOW()::TEXT),
  ('cat-004', 'Home & Garden', NOW()::TEXT);

-- Insert default stores
INSERT INTO stores (id, name, created_at) VALUES
  ('store-001', 'Main Warehouse', NOW()::TEXT),
  ('store-002', 'Secondary Warehouse', NOW()::TEXT);

-- Create indexes
CREATE INDEX idx_inventory_name ON inventory(name);
CREATE INDEX idx_orders_date ON orders(date);
CREATE INDEX idx_orders_status ON orders(status);

-- Verify
SELECT username, role, display_name FROM users;
SELECT COUNT(*) as category_count FROM categories;
SELECT COUNT(*) as store_count FROM stores;
