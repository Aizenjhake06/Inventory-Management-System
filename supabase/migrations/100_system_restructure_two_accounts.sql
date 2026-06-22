-- ============================================
-- COMPLETE DATABASE SETUP - INVENTORY SYSTEM
-- ============================================
-- Version: 2.0 (2 Accounts System)
-- Date: June 22, 2026
-- Description: 2 accounts (admin + logistics-admin)
-- Features: Item count, Quantity count, COGS, Selling Price, Total Sales
-- ============================================

-- ============================================
-- STEP 1: DROP ALL EXISTING TABLES
-- ============================================
DROP TABLE IF EXISTS email_report_logs CASCADE;
DROP TABLE IF EXISTS email_report_schedules CASCADE;
DROP TABLE IF EXISTS dispatch_tracking CASCADE;
DROP TABLE IF EXISTS inventory_alerts CASCADE;
DROP TABLE IF EXISTS bundle_items CASCADE;
DROP TABLE IF EXISTS bundles CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS restocks CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- STEP 2: ENABLE EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 3: CREATE TABLES
-- ============================================

-- 1. USERS (2 accounts only)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'logistics-admin')),
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  profile_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. INVENTORY (Products - Essential fields with profit calculation)
CREATE TABLE inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, -- Item name
  quantity INTEGER NOT NULL DEFAULT 0, -- Quantity
  cost_price NUMERIC(10,2) NOT NULL, -- COGS
  selling_price NUMERIC(10,2) NOT NULL, -- Selling price
  gross_profit NUMERIC(10,2) GENERATED ALWAYS AS (selling_price - cost_price) STORED, -- Auto-calculated
  margin NUMERIC(10,2) GENERATED ALWAYS AS (
    CASE 
      WHEN selling_price > 0 THEN ((selling_price - cost_price) / selling_price * 100)
      ELSE 0
    END
  ) STORED, -- Auto-calculated percentage
  reorder_level INTEGER DEFAULT 10, -- For low stock alerts
  image_url TEXT, -- Optional image
  last_updated TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ORDERS (Simple dispatch tracking)
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  qty INTEGER NOT NULL,
  cogs NUMERIC(10,2) NOT NULL, -- Total COGS
  total NUMERIC(10,2) NOT NULL, -- Total sales amount
  product TEXT NOT NULL, -- Product names
  status TEXT DEFAULT 'Dispatched' CHECK (status IN ('Dispatched', 'Shipped', 'Delivered')),
  dispatched_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- 4. LOGS (Activity tracking)
CREATE TABLE logs (
  id TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  item_id TEXT,
  item_name TEXT,
  details TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  user_role TEXT,
  quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. RESTOCKS (Restock history tracking)
CREATE TABLE restocks (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  cost_price NUMERIC(10,2) NOT NULL,
  total_cost NUMERIC(10,2) NOT NULL,
  reason TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 4: CREATE INDEXES
-- ============================================
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_inventory_name ON inventory(name);
CREATE INDEX idx_inventory_quantity ON inventory(quantity);
CREATE INDEX idx_orders_date ON orders(date);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_logs_timestamp ON logs(timestamp);
CREATE INDEX idx_logs_operation ON logs(operation);
CREATE INDEX idx_restocks_item_id ON restocks(item_id);
CREATE INDEX idx_restocks_timestamp ON restocks(timestamp);

-- ============================================
-- STEP 5: INSERT DEFAULT DATA
-- ============================================

-- 5a. Create 2 accounts
INSERT INTO users (id, username, password, role, display_name, email)
VALUES
  ('admin-001', 'admin', 'TEMP', 'admin', 'Main Administrator', 'admin@system.local'),
  ('logistic-001', 'logistic', 'TEMP', 'logistics-admin', 'Logistics Admin', 'logistics@system.local');

-- 5b. Set passwords (bcrypt)
UPDATE users SET password = crypt('admin123', gen_salt('bf')) WHERE username = 'admin';
UPDATE users SET password = crypt('logistic123', gen_salt('bf')) WHERE username = 'logistic';

-- ============================================
-- STEP 6: GRANT PERMISSIONS
-- ============================================
GRANT ALL ON users TO postgres, anon, authenticated, service_role;
GRANT ALL ON inventory TO postgres, anon, authenticated, service_role;
GRANT ALL ON orders TO postgres, anon, authenticated, service_role;
GRANT ALL ON logs TO postgres, anon, authenticated, service_role;
GRANT ALL ON restocks TO postgres, anon, authenticated, service_role;

-- ============================================
-- STEP 7: VERIFICATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATABASE SETUP COMPLETE!';
  RAISE NOTICE '========================================';
END $$;

-- Show created users
SELECT username, role, display_name, email FROM users ORDER BY role;

-- Show summary
DO $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users;
  
  RAISE NOTICE '';
  RAISE NOTICE 'SUMMARY:';
  RAISE NOTICE '- Users: %', user_count;
  RAISE NOTICE '';
  RAISE NOTICE 'LOGIN CREDENTIALS:';
  RAISE NOTICE '1. Admin: admin / admin123';
  RAISE NOTICE '2. Logistics: logistic / logistic123';
  RAISE NOTICE '';
  RAISE NOTICE 'READY TO USE!';
  RAISE NOTICE '========================================';
END $$;
