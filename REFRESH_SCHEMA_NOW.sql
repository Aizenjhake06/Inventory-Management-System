-- Force PostgREST to reload the schema cache
-- Run this after creating or modifying tables

NOTIFY pgrst, 'reload schema';

-- Wait a moment, then verify
SELECT 'Schema cache refreshed!' as status;

-- Double-check staff_name column exists and is accessible
SELECT 
  'staff_name column verified!' as status,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND column_name = 'staff_name';
