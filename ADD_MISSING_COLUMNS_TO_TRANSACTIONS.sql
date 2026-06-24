-- Add Missing Columns to Transactions Table
-- The code expects these columns but they're missing from the database

-- Add staff_name column (CRITICAL - causing the error)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS staff_name TEXT;

-- Add status tracking columns (for order status functionality)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cancellation_notes TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cancelled_at TEXT;

-- Add customer detail columns (for detailed customer tracking)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- Create index on staff_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_staff_name ON transactions(staff_name);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Create index on transaction_type for reports
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);

-- Verify the columns were added
SELECT 'Transactions table updated successfully!' as status;
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;
