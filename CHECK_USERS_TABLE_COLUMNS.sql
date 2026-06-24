-- Check all columns in the users table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- This will show you exactly what columns exist in your users table
-- Look for 'assigned_channel' in the results
