# Fix Internal Usage Dispatch Error

## Problem
When trying to dispatch items in the Internal Usage page, you're getting these errors:
- "Error: Failed to fetch stores"
- "[API Client] POST /api/sales failed: 500"
- "Error: Failed to process sale"

## Root Cause
The **stores table does not exist** in your Supabase database.

The code expects a `stores` table with these columns:
- `id` (TEXT PRIMARY KEY)
- `store_name` (TEXT NOT NULL)
- `sales_channel` (TEXT NOT NULL)
- `created_at` (TEXT NOT NULL)

Without this table, the `/api/stores` endpoint fails, which breaks the dispatch functionality in Internal Usage.

## Solution

### Step 1: Create the Stores Table in Supabase

1. Open your Supabase project
2. Go to **SQL Editor**
3. Copy and paste the contents of `CREATE_STORES_TABLE.sql`
4. Click **Run**

This will:
- Create the `stores` table with correct structure
- Add proper indexes for performance
- Insert sample stores for Facebook, Shopee, Lazada, and Walk-in channels
- Give you 9 sample stores to work with immediately

### Step 2: Test the Internal Usage Page

1. **Hard refresh** the page (Ctrl+Shift+R)
2. Try to add items to cart
3. Click "Dispatch Items"
4. Select a purpose (Demo/Display, Internal Use, or Warehouse Transfer)
5. Select a sales channel/store
6. The dispatch should now work without errors!

## What This Fixes

✅ Stores API will work correctly  
✅ Internal Usage dispatch will function  
✅ Demo/Display dispatches will work  
✅ Warehouse transfers will work  
✅ No more "Failed to fetch stores" errors  

## Verification

After running the migration, you can verify the stores table structure:

```sql
-- Check the stores table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'stores'
ORDER BY ordinal_position;
```

Expected output:
```
column_name    | data_type | is_nullable
---------------|-----------|------------
id             | text      | NO
store_name     | text      | NO
sales_channel  | text      | NO
created_at     | text      | NO
```

## Note

The internal usage dispatch does NOT count toward actual sales revenue (correctly implemented):
- Transaction types `demo`, `internal`, and `transfer` have `total_revenue = 0`
- Only `sale` type transactions count toward revenue
- This is working as intended!
