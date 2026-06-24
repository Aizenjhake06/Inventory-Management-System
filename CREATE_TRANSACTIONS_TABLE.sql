-- Create Transactions Table
-- This table tracks all sales, demo/display, internal usage, and warehouse transfers

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  cost_price NUMERIC(10,2) NOT NULL,
  selling_price NUMERIC(10,2) NOT NULL,
  total_cost NUMERIC(10,2) NOT NULL,
  total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  profit NUMERIC(10,2) NOT NULL,
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sale', 'restock')),
  transaction_type TEXT CHECK (transaction_type IN ('sale', 'demo', 'internal', 'transfer')),
  department TEXT,
  staff_name TEXT,
  notes TEXT,
  -- Status tracking
  status TEXT DEFAULT 'completed',
  cancellation_reason TEXT,
  cancellation_notes TEXT,
  cancelled_by TEXT,
  cancelled_at TEXT,
  -- Customer information
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,
  discount NUMERIC(10,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_item_id ON transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_department ON transactions(department);
CREATE INDEX IF NOT EXISTS idx_transactions_staff_name ON transactions(staff_name);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Grant permissions
GRANT ALL ON transactions TO postgres, anon, authenticated, service_role;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Verify table was created
SELECT 'Transactions table created successfully!' as status;
SELECT COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'transactions';

-- Show all columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
