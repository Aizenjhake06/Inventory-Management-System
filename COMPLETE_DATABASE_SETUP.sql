-- ============================================
-- COMPLETE DATABASE SETUP - INVENTORY MANAGEMENT SYSTEM
-- ============================================
-- Version: 2.0 (Two-Account Simplified System)
-- Date: June 22, 2026
-- Description: Complete database structure for 2-account system with auto inventory deduction
-- ============================================

-- ============================================
-- STEP 1: DROP ALL EXISTING TABLES (Clean slate)
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
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- STEP 2: ENABLE EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- For password hashing
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- For UUID generation

-- ============================================
-- STEP 3: CREATE TABLES
-- ============================================

-- 1. USERS TABLE (Authentication)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL, -- bcrypt hashed
  role TEXT NOT NULL CHECK (role IN ('admin', 'logistics-admin')),
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  profile_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CATEGORIES TABLE
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

-- 3. STORES TABLE (Storage Rooms)
CREATE TABLE stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

-- 4. INVENTORY TABLE (Products)
CREATE TABLE inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  store TEXT NOT NULL, -- Storage location
  sales_channel TEXT NOT NULL, -- Shopee, Lazada, TikTok, etc.
  quantity INTEGER NOT NULL DEFAULT 0,
  cost_price NUMERIC(10,2) NOT NULL, -- COGS
  selling_price NUMERIC(10,2) NOT NULL,
  reorder_level INTEGER NOT NULL DEFAULT 10,
  last_updated TEXT NOT NULL,
  sku TEXT,
  image_url TEXT,
  discount NUMERIC(10,2) DEFAULT 0,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  discount_end_date TEXT,
  min_price NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, store, sales_channel) -- Prevent duplicates
);

-- 5. ORDERS TABLE (Main transaction tracking)
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL, -- Order date (dispatch time)
  sales_channel TEXT NOT NULL,
  store TEXT NOT NULL,
  courier TEXT NOT NULL,
  waybill TEXT NOT NULL UNIQUE, -- Tracking number
  qty INTEGER NOT NULL,
  cogs NUMERIC(10,2) NOT NULL, -- Cost of Goods Sold
  total NUMERIC(10,2) NOT NULL, -- Total revenue
  product TEXT NOT NULL, -- Product names (comma-separated if multiple)
  
  -- Status Tracking
  status TEXT DEFAULT 'Dispatched' CHECK (status IN ('Dispatched', 'Shipped', 'Delivered')),
  parcel_status TEXT DEFAULT 'PENDING' CHECK (parcel_status IN ('PENDING', 'IN TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED', 'PROBLEMATIC', 'DETAINED')),
  
  -- People & Customer Tracking
  dispatched_by TEXT NOT NULL, -- Who created the order
  customer_name TEXT,
  customer_contact TEXT,
  customer_address TEXT,
  
  -- Additional Info
  dispatch_notes TEXT,
  is_cancelled BOOLEAN DEFAULT FALSE,
  cancellation_reason TEXT,
  cancelled_by TEXT,
  cancelled_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP -- Soft delete
);

-- 6. ORDER_ITEMS TABLE (Detailed order breakdown)
CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Item Details
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  cost_price NUMERIC(10,2) NOT NULL,
  selling_price NUMERIC(10,2) NOT NULL,
  
  -- Calculated
  total_cost NUMERIC(10,2) NOT NULL,
  total_revenue NUMERIC(10,2) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. BUNDLES TABLE (Product bundles)
CREATE TABLE bundles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  store TEXT NOT NULL,
  sales_channel TEXT NOT NULL,
  bundle_price NUMERIC(10,2) NOT NULL,
  bundle_cost NUMERIC(10,2) NOT NULL,
  regular_price NUMERIC(10,2) NOT NULL,
  savings NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0, -- Auto-calculated from components
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, store, sales_channel)
);

-- 8. BUNDLE_ITEMS TABLE (Components of bundles)
CREATE TABLE bundle_items (
  id TEXT PRIMARY KEY,
  bundle_id TEXT NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. CUSTOMERS TABLE
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  loyalty_points INTEGER DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  last_purchase TEXT,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. LOGS TABLE (Activity tracking)
CREATE TABLE logs (
  id TEXT PRIMARY KEY,
  operation TEXT NOT NULL, -- sale, restock, add-product, edit-product, delete-product, etc.
  item_id TEXT,
  item_name TEXT,
  details TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  user_role TEXT, -- admin or logistics-admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. TRANSACTIONS TABLE (Legacy - kept for historical data)
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  cost_price NUMERIC(10,2) NOT NULL,
  selling_price NUMERIC(10,2) NOT NULL,
  total_cost NUMERIC(10,2) NOT NULL,
  total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  profit NUMERIC(10,2) NOT NULL,
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sale', 'restock')),
  transaction_type TEXT CHECK (transaction_type IN ('sale', 'demo', 'internal', 'transfer')),
  department TEXT,
  customer_id TEXT,
  customer_name TEXT,
  discount NUMERIC(10,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. RESTOCKS TABLE
CREATE TABLE restocks (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  cost_price NUMERIC(10,2) NOT NULL,
  total_cost NUMERIC(10,2) NOT NULL,
  timestamp TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('restock', 'damaged-return', 'supplier-return')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. INVENTORY_ALERTS TABLE
CREATE TABLE inventory_alerts (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'reorder')),
  current_quantity INTEGER NOT NULL,
  reorder_level INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP,
  is_resolved BOOLEAN DEFAULT FALSE
);

-- 14. EMAIL_REPORT_SCHEDULES TABLE
CREATE TABLE email_report_schedules (
  id TEXT PRIMARY KEY,
  report_type TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  recipient_email TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_sent_at TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. EMAIL_REPORT_LOGS TABLE
CREATE TABLE email_report_logs (
  id TEXT PRIMARY KEY,
  schedule_id TEXT REFERENCES email_report_schedules(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT
);

-- 16. DISPATCH_TRACKING TABLE
CREATE TABLE dispatch_tracking (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  updated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Users indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Inventory indexes
CREATE INDEX idx_inventory_name ON inventory(name);
CREATE INDEX idx_inventory_category ON inventory(category);
CREATE INDEX idx_inventory_store ON inventory(store);
CREATE INDEX idx_inventory_sales_channel ON inventory(sales_channel);
CREATE INDEX idx_inventory_quantity ON inventory(quantity);

-- Orders indexes
CREATE INDEX idx_orders_date ON orders(date);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_parcel_status ON orders(parcel_status);
CREATE INDEX idx_orders_sales_channel ON orders(sales_channel);
CREATE INDEX idx_orders_waybill ON orders(waybill);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_deleted_at ON orders(deleted_at);

-- Order items indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_item_id ON order_items(item_id);

-- Bundles indexes
CREATE INDEX idx_bundles_name ON bundles(name);
CREATE INDEX idx_bundles_sales_channel ON bundles(sales_channel);

-- Logs indexes
CREATE INDEX idx_logs_timestamp ON logs(timestamp);
CREATE INDEX idx_logs_operation ON logs(operation);
CREATE INDEX idx_logs_created_at ON logs(created_at);

-- ============================================
-- STEP 5: INSERT DEFAULT DATA
-- ============================================

-- 5a. Create 2 User Accounts
INSERT INTO users (id, username, password, role, display_name, email, phone, profile_image)
VALUES
  (
    'admin-001',
    'admin',
    'TEMP_PASSWORD', -- Will be replaced in next step
    'admin',
    'Main Administrator',
    'admin@system.local',
    NULL,
    NULL
  ),
  (
    'logistic-001',
    'logistic',
    'TEMP_PASSWORD', -- Will be replaced in next step
    'logistics-admin',
    'Logistics Admin',
    'logistics@system.local',
    NULL,
    NULL
  );

-- 5b. Set Passwords (bcrypt hashing)
UPDATE users 
SET password = crypt('admin123', gen_salt('bf'))
WHERE username = 'admin';

UPDATE users 
SET password = crypt('logistic123', gen_salt('bf'))
WHERE username = 'logistic';

-- 5c. Insert Default Categories
INSERT INTO categories (id, name, created_at) VALUES
  ('cat-001', 'Electronics', NOW()::TEXT),
  ('cat-002', 'Clothing', NOW()::TEXT),
  ('cat-003', 'Food & Beverages', NOW()::TEXT),
  ('cat-004', 'Home & Garden', NOW()::TEXT),
  ('cat-005', 'Health & Beauty', NOW()::TEXT),
  ('cat-006', 'Sports & Outdoors', NOW()::TEXT),
  ('cat-007', 'Toys & Games', NOW()::TEXT),
  ('cat-008', 'Books & Media', NOW()::TEXT),
  ('cat-009', 'Automotive', NOW()::TEXT),
  ('cat-010', 'Office Supplies', NOW()::TEXT);

-- 5d. Insert Default Stores (Storage Rooms)
INSERT INTO stores (id, name, created_at) VALUES
  ('store-001', 'Main Warehouse', NOW()::TEXT),
  ('store-002', 'Secondary Warehouse', NOW()::TEXT),
  ('store-003', 'Retail Store', NOW()::TEXT),
  ('store-004', 'Distribution Center', NOW()::TEXT);

-- ============================================
-- STEP 6: CREATE VIEW FOR UNIFIED PRODUCTS
-- ============================================

-- This view combines inventory and bundles for easier querying
CREATE OR REPLACE VIEW products_unified AS
  SELECT 
    id,
    name,
    category,
    store,
    sales_channel AS "salesChannel",
    quantity,
    cost_price AS "costPrice",
    selling_price AS "sellingPrice",
    image_url AS "imageUrl",
    'product' AS "productType",
    reorder_level AS "reorderLevel",
    sku,
    created_at AS "createdAt"
  FROM inventory
  
  UNION ALL
  
  SELECT 
    id,
    name,
    category,
    store,
    sales_channel AS "salesChannel",
    quantity,
    bundle_cost AS "costPrice",
    bundle_price AS "sellingPrice",
    image_url AS "imageUrl",
    'bundle' AS "productType",
    10 AS "reorderLevel", -- Default reorder level for bundles
    NULL AS sku,
    created_at AS "createdAt"
  FROM bundles;

-- ============================================
-- STEP 7: GRANT PERMISSIONS
-- ============================================

-- Grant permissions to all roles
GRANT ALL ON users TO postgres, anon, authenticated, service_role;
GRANT ALL ON categories TO postgres, anon, authenticated, service_role;
GRANT ALL ON stores TO postgres, anon, authenticated, service_role;
GRANT ALL ON inventory TO postgres, anon, authenticated, service_role;
GRANT ALL ON orders TO postgres, anon, authenticated, service_role;
GRANT ALL ON order_items TO postgres, anon, authenticated, service_role;
GRANT ALL ON bundles TO postgres, anon, authenticated, service_role;
GRANT ALL ON bundle_items TO postgres, anon, authenticated, service_role;
GRANT ALL ON customers TO postgres, anon, authenticated, service_role;
GRANT ALL ON logs TO postgres, anon, authenticated, service_role;
GRANT ALL ON transactions TO postgres, anon, authenticated, service_role;
GRANT ALL ON restocks TO postgres, anon, authenticated, service_role;
GRANT ALL ON inventory_alerts TO postgres, anon, authenticated, service_role;
GRANT ALL ON email_report_schedules TO postgres, anon, authenticated, service_role;
GRANT ALL ON email_report_logs TO postgres, anon, authenticated, service_role;
GRANT ALL ON dispatch_tracking TO postgres, anon, authenticated, service_role;
GRANT ALL ON products_unified TO postgres, anon, authenticated, service_role;

-- ============================================
-- STEP 8: CREATE FUNCTIONS (Optional utility functions)
-- ============================================

-- Function to update bundle quantity based on component items
CREATE OR REPLACE FUNCTION update_bundle_quantity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bundles
  SET quantity = (
    SELECT MIN(FLOOR(i.quantity / bi.quantity))
    FROM bundle_items bi
    JOIN inventory i ON i.id = bi.item_id
    WHERE bi.bundle_id = NEW.bundle_id
  )
  WHERE id = NEW.bundle_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update bundle quantity when inventory changes
CREATE TRIGGER trigger_update_bundle_quantity
AFTER INSERT OR UPDATE ON bundle_items
FOR EACH ROW
EXECUTE FUNCTION update_bundle_quantity();

-- Function to log inventory changes
CREATE OR REPLACE FUNCTION log_inventory_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.quantity != NEW.quantity THEN
    INSERT INTO logs (id, operation, item_id, item_name, details, timestamp)
    VALUES (
      'log-' || gen_random_uuid(),
      'inventory-update',
      NEW.id,
      NEW.name,
      'Quantity changed from ' || OLD.quantity || ' to ' || NEW.quantity,
      NOW()::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-log inventory updates
CREATE TRIGGER trigger_log_inventory_change
AFTER UPDATE ON inventory
FOR EACH ROW
EXECUTE FUNCTION log_inventory_change();

-- ============================================
-- STEP 9: VERIFICATION QUERIES
-- ============================================

-- Check that everything was created successfully
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATABASE SETUP COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'USERS CREATED:';
END $$;

SELECT 
  username, 
  role, 
  display_name,
  email
FROM users 
ORDER BY role;

DO $$
DECLARE
  user_count INTEGER;
  category_count INTEGER;
  store_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO category_count FROM categories;
  SELECT COUNT(*) INTO store_count FROM stores;
  
  RAISE NOTICE '';
  RAISE NOTICE 'SUMMARY:';
  RAISE NOTICE '- Users: %', user_count;
  RAISE NOTICE '- Categories: %', category_count;
  RAISE NOTICE '- Stores: %', store_count;
  RAISE NOTICE '';
  RAISE NOTICE 'LOGIN CREDENTIALS:';
  RAISE NOTICE '1. Admin Account';
  RAISE NOTICE '   Username: admin';
  RAISE NOTICE '   Password: admin123';
  RAISE NOTICE '';
  RAISE NOTICE '2. Logistics Admin Account';
  RAISE NOTICE '   Username: logistic';
  RAISE NOTICE '   Password: logistic123';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'READY TO USE!';
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- END OF SETUP
-- ============================================
