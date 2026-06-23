-- =============================================================================
-- FIX: Remove ALL unique constraints on inventory table that prevent duplicates
-- =============================================================================
-- This allows products with the same name but different COGS/prices (variants)
-- =============================================================================

-- Drop the main constraint if it exists
ALTER TABLE inventory 
DROP CONSTRAINT IF EXISTS inventory_name_store_channel_unique;

-- Drop any other unique constraints on name
ALTER TABLE inventory 
DROP CONSTRAINT IF EXISTS inventory_name_key;

-- Drop unique constraint on name + store
ALTER TABLE inventory 
DROP CONSTRAINT IF EXISTS inventory_name_store_key;

-- Drop any partial unique constraints
ALTER TABLE inventory 
DROP CONSTRAINT IF EXISTS inventory_unique_name;

-- List all remaining constraints for verification
SELECT 
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  CASE con.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
  END AS constraint_type_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'inventory'
  AND nsp.nspname = 'public'
ORDER BY con.contype, con.conname;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- 1. Check if constraint is gone (should return no rows with 'name' in definition)
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'inventory'::regclass 
  AND contype = 'u'  -- unique constraints
  AND pg_get_constraintdef(oid) LIKE '%name%';

-- 2. Test: Try to insert duplicate product names (should succeed now)
-- Uncomment below to test:
-- INSERT INTO inventory (name, quantity, cost_price, selling_price, reorder_level)
-- VALUES ('TEST PRODUCT', 10, 50, 100, 5);
-- 
-- INSERT INTO inventory (name, quantity, cost_price, selling_price, reorder_level)
-- VALUES ('TEST PRODUCT', 20, 60, 120, 5);
-- 
-- SELECT * FROM inventory WHERE name = 'TEST PRODUCT';
-- DELETE FROM inventory WHERE name = 'TEST PRODUCT';

-- =============================================================================
-- INSTRUCTIONS:
-- =============================================================================
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Copy and paste this script
-- 3. Click "Run"
-- 4. You should see the constraints list without any name-based UNIQUE constraints
-- 5. Now you can add products with the same name but different COGS/prices
-- =============================================================================
