-- ============================================
-- ADD RESTOCKS TABLE (Quick Fix)
-- ============================================
-- This will add the missing restocks table without deleting your data
-- Run this in Supabase SQL Editor
-- ============================================

-- Create restocks table
CREATE TABLE IF NOT EXISTS restocks (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_restocks_item_id ON restocks(item_id);
CREATE INDEX IF NOT EXISTS idx_restocks_timestamp ON restocks(timestamp);

-- Grant permissions
GRANT ALL ON restocks TO postgres, anon, authenticated, service_role;

-- Verify
SELECT 'Restocks table created successfully!' AS status;
