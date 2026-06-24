# Fix Transactions Table - Missing Columns

## Problem
When trying to dispatch items in Internal Usage, you're getting this error:
```
Error adding transaction: Could not find the 'staff_name' column of 'transactions' in the schema cache
```

## Root Cause
The `transactions` table in your Supabase database is missing several columns that the code expects:

**Missing columns:**
- ❌ `staff_name` (CRITICAL - causing the error)
- ❌ `status` (for transaction status tracking)
- ❌ `cancellation_reason`, `cancellation_notes`, `cancelled_by`, `cancelled_at` (for cancellation tracking)
- ❌ `customer_phone`, `customer_email`, `customer_address` (for detailed customer info)

## Solution

### Run the SQL Migration in Supabase

1. Open your Supabase project
2. Go to **SQL Editor**
3. Copy and paste the contents of `ADD_MISSING_COLUMNS_TO_TRANSACTIONS.sql`
4. Click **Run**

This will:
- ✅ Add `staff_name` column (fixes the dispatch error)
- ✅ Add transaction status tracking columns
- ✅ Add cancellation tracking columns
- ✅ Add detailed customer information columns
- ✅ Create proper indexes for performance

### After Running the Migration

1. **Hard refresh** your browser (Ctrl+Shift+R)
2. Go to **Internal Usage** page
3. Add items to cart
4. Click **Dispatch Items**
5. Fill in the details and dispatch
6. ✅ Should work without errors now!

## What Gets Fixed

✅ Internal Usage dispatch will work  
✅ Demo/Display dispatches will work  
✅ Warehouse transfers will work  
✅ Staff names will be recorded in transactions  
✅ Transaction status tracking will work  
✅ Order cancellations will be tracked properly  
✅ Customer details will be stored correctly  

## Verification

After running the migration, verify the columns exist:

```sql
-- Check transactions table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
```

Expected new columns:
```
staff_name          | text | YES
status              | text | YES
cancellation_reason | text | YES
cancellation_notes  | text | YES
cancelled_by        | text | YES
cancelled_at        | text | YES
customer_phone      | text | YES
customer_email      | text | YES
customer_address    | text | YES
```

## Complete Setup Checklist

To get Internal Usage fully working, you need to run these SQL files in order:

1. ✅ **CREATE_STORES_TABLE.sql** - Creates stores table with sample data
2. ✅ **ADD_MISSING_COLUMNS_TO_TRANSACTIONS.sql** - Adds missing columns to transactions (THIS FILE)
3. ✅ Hard refresh browser (Ctrl+Shift+R)
4. ✅ Test Internal Usage dispatch

After these steps, your Internal Usage feature will be fully functional!
