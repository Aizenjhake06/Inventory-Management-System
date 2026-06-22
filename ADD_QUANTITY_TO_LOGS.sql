-- ============================================
-- ADD QUANTITY COLUMN TO LOGS TABLE
-- ============================================
-- This fixes the "quantity column not found" error
-- Run this in Supabase SQL Editor
-- ============================================

-- Add quantity column to logs table
ALTER TABLE logs ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;

-- Verify
SELECT 'Quantity column added to logs table successfully!' AS status;

-- Show table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'logs'
ORDER BY ordinal_position;
