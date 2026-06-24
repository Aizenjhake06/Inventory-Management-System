-- Verify and Refresh Schema Cache
-- Run this after adding columns to force Supabase to refresh its schema cache

-- Step 1: Verify columns exist in transactions table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND column_name IN ('staff_name', 'status', 'cancellation_reason', 'cancelled_by', 'cancelled_at', 'customer_phone', 'customer_email', 'customer_address')
ORDER BY column_name;

-- Step 2: If any columns are missing, add them now
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS staff_name TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cancellation_notes TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cancelled_at TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- Step 3: Force schema cache refresh by running NOTIFY
NOTIFY pgrst, 'reload schema';

-- Step 4: Verify again
SELECT 'Schema refreshed! Checking columns...' as status;

SELECT 
  table_name,
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- Step 5: Test insert (this will fail if columns don't exist)
DO $$
BEGIN
  -- Try to prepare a statement with the columns
  PERFORM column_name 
  FROM information_schema.columns 
  WHERE table_name = 'transactions' 
    AND column_name = 'staff_name';
  
  IF FOUND THEN
    RAISE NOTICE 'SUCCESS: staff_name column exists!';
  ELSE
    RAISE EXCEPTION 'ERROR: staff_name column does not exist!';
  END IF;
END $$;
