-- Add assigned_channel column to users table
-- This column is used to assign logistics admin users to specific sales channels

-- Add the assigned_channel column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'assigned_channel'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN assigned_channel TEXT;
    
    RAISE NOTICE 'Column assigned_channel added to users table';
  ELSE
    RAISE NOTICE 'Column assigned_channel already exists in users table';
  END IF;
END $$;

-- Add the profile_image column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'profile_image'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN profile_image TEXT;
    
    RAISE NOTICE 'Column profile_image added to users table';
  ELSE
    RAISE NOTICE 'Column profile_image already exists in users table';
  END IF;
END $$;

-- Refresh the schema cache (IMPORTANT!)
NOTIFY pgrst, 'reload schema';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('assigned_channel', 'profile_image')
ORDER BY column_name;

-- Show all columns in users table for verification
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
