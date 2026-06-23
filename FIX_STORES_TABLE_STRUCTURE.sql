-- Fix Stores Table Structure
-- The code expects 'store_name' and 'sales_channel' columns but the table has 'name'
-- This migration updates the stores table to match the code expectations

-- Step 1: Add new columns
ALTER TABLE stores ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS sales_channel TEXT;

-- Step 2: Migrate existing data (if any exists)
-- Copy 'name' to 'store_name' and set default sales_channel
UPDATE stores 
SET store_name = name,
    sales_channel = 'General'
WHERE store_name IS NULL;

-- Step 3: Drop old 'name' column
ALTER TABLE stores DROP COLUMN IF EXISTS name;

-- Step 4: Make store_name NOT NULL (now that data is migrated)
ALTER TABLE stores ALTER COLUMN store_name SET NOT NULL;
ALTER TABLE stores ALTER COLUMN sales_channel SET NOT NULL;

-- Step 5: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stores_sales_channel ON stores(sales_channel);
CREATE INDEX IF NOT EXISTS idx_stores_store_name ON stores(store_name);

-- Verify the structure
-- Expected columns: id, store_name, sales_channel, created_at
