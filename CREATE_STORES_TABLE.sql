-- Create Stores Table
-- This table stores sales channels and their associated stores/locations

CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  store_name TEXT NOT NULL,
  sales_channel TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_stores_sales_channel ON stores(sales_channel);
CREATE INDEX IF NOT EXISTS idx_stores_store_name ON stores(store_name);

-- Insert sample stores for each sales channel
INSERT INTO stores (id, store_name, sales_channel, created_at) VALUES
  ('STORE-' || extract(epoch from now())::bigint || '001', 'Main Warehouse', 'Facebook', NOW()::TEXT),
  ('STORE-' || extract(epoch from now())::bigint || '002', 'Store 1', 'Facebook', NOW()::TEXT),
  ('STORE-' || extract(epoch from now())::bigint || '003', 'Store 2', 'Facebook', NOW()::TEXT),
  ('STORE-' || extract(epoch from now())::bigint || '004', 'Main Hub', 'Shopee', NOW()::TEXT),
  ('STORE-' || extract(epoch from now())::bigint || '005', 'Distribution Center', 'Shopee', NOW()::TEXT),
  ('STORE-' || extract(epoch from now())::bigint || '006', 'Central Warehouse', 'Lazada', NOW()::TEXT),
  ('STORE-' || extract(epoch from now())::bigint || '007', 'Storage Room 1', 'Lazada', NOW()::TEXT),
  ('STORE-' || extract(epoch from now())::bigint || '008', 'Walk-in Store', 'Walk-in', NOW()::TEXT),
  ('STORE-' || extract(epoch from now())::bigint || '009', 'Display Area', 'Walk-in', NOW()::TEXT);

-- Verify the table was created
SELECT 'Stores table created successfully!' as status;
SELECT COUNT(*) as total_stores FROM stores;
