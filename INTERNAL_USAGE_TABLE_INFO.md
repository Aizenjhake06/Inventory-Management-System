# Internal Usage - Database Information

## Overview
Internal Usage uses the existing `transactions` table. Hindi kailangan ng separate table.

## Transaction Types for Internal Usage
The system filters transactions with these `transaction_type` values:
- `demo` - Demo/Display units
- `internal` - Internal company use
- `transfer` - Warehouse transfers

## Complete Transactions Table SQL

```sql
-- TRANSACTIONS TABLE
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
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,
  discount NUMERIC(10,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  staff_name TEXT,
  notes TEXT,
  status TEXT CHECK (status IN ('completed', 'cancelled', 'returned', 'pending')),
  cancellation_reason TEXT,
  cancelled_by TEXT,
  cancelled_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_item_id ON transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_department ON transactions(department);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Disable RLS (using supabaseAdmin)
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
```

## How Internal Usage Works

### 1. Data Storage
All transactions are stored in the `transactions` table with:
- `type` = 'sale' (for inventory tracking)
- `transaction_type` = 'demo', 'internal', or 'transfer'
- `total_revenue` = 0 (internal usage doesn't count as revenue)

### 2. Filtering in API
The `/api/internal-usage` endpoint filters transactions:
```typescript
internalTransactions = allTransactions.filter(
  (transaction) => 
    transaction.transactionType === 'demo' ||
    transaction.transactionType === 'internal' ||
    transaction.transactionType === 'transfer'
)
```

### 3. Department Filtering
- **Admin**: See all internal usage transactions
- **Operations**: Only see their assigned channel's transactions
- **Logistics-admin**: See all transactions

## Column Descriptions

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Unique transaction ID |
| item_id | TEXT | Product ID |
| item_name | TEXT | Product name |
| quantity | INTEGER | Number of items used |
| cost_price | NUMERIC | Cost per unit |
| selling_price | NUMERIC | Selling price (for reference) |
| total_cost | NUMERIC | Total cost (quantity × cost_price) |
| total_revenue | NUMERIC | Always 0 for internal usage |
| profit | NUMERIC | Usually negative (cost) |
| timestamp | TEXT | When the transaction occurred |
| type | TEXT | 'sale' (for inventory deduction) |
| **transaction_type** | TEXT | **'demo', 'internal', or 'transfer'** |
| department | TEXT | Sales channel/department |
| customer_id | TEXT | Not used for internal |
| customer_name | TEXT | Staff name or department |
| discount | NUMERIC | Not applicable |
| notes | TEXT | Usage notes/reason |
| status | TEXT | Transaction status |
| created_at | TIMESTAMPTZ | Auto-generated timestamp |

## Key Features

### ✅ Benefits of Using Existing Table
1. **No extra table needed** - Simplified database structure
2. **Consistent transaction history** - All movements in one place
3. **Easy filtering** - Just filter by `transaction_type`
4. **Shared infrastructure** - Logs, reports, analytics work automatically

### ⚠️ Important Notes
- Internal usage transactions have `total_revenue = 0`
- They still deduct from inventory
- They appear in activity logs
- They DON'T count toward sales metrics
- Financial reports exclude them from revenue calculations

## If Table Doesn't Exist

If your `transactions` table doesn't exist or is missing columns, run this SQL:

```sql
-- Drop and recreate (BE CAREFUL - this deletes data!)
DROP TABLE IF EXISTS transactions CASCADE;

-- Then run the CREATE TABLE statement above
```

## Verification Query

Check if your table has the correct structure:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
```

Check existing internal usage data:
```sql
SELECT * FROM transactions
WHERE transaction_type IN ('demo', 'internal', 'transfer')
ORDER BY timestamp DESC
LIMIT 10;
```
