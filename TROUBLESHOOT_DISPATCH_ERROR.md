# Troubleshoot Internal Usage Dispatch Error

## Current Error
```
Error adding transaction: Could not find the 'staff_name' column of 'transactions' in the schema cache
[API] Error processing sale: Error: Failed to add transaction
```

## Root Cause
Supabase's PostgREST schema cache hasn't refreshed after adding the columns. Even though the columns exist in the database, the API layer doesn't know about them yet.

## Solution - Try These Steps in Order

### Step 1: Verify and Refresh Schema Cache

1. Go to **Supabase SQL Editor**
2. Run `VERIFY_AND_REFRESH_SCHEMA.sql`
3. Check the output - you should see the `staff_name` column listed
4. Look for "SUCCESS: staff_name column exists!" message

### Step 2: Manually Refresh PostgREST Schema Cache

Option A - **Using Supabase Dashboard:**
1. Go to your Supabase Project Settings
2. Go to **API** section
3. Click **"Reload schema cache"** button (if available)

Option B - **Using SQL:**
```sql
-- Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
```

Option C - **Restart the database (last resort):**
1. Go to Supabase Dashboard
2. Project Settings > Database
3. Click "Restart Database" (this will cause brief downtime)

### Step 3: Restart Your Next.js Dev Server

Even after refreshing Supabase, your local Next.js server might have cached the old schema:

1. **Stop** your current `npm run dev` (Ctrl+C in terminal)
2. **Delete Next.js cache:**
   ```bash
   rmdir /s /q .next
   ```
3. **Restart** the dev server:
   ```bash
   npm run dev
   ```

### Step 4: Hard Refresh Browser

1. Press **Ctrl+Shift+R** (Windows) to hard refresh
2. Or clear browser cache completely
3. Try dispatch again

### Step 5: Verify Environment Variables

Make sure your `.env.local` has the correct Supabase connection:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 6: Check If Columns Actually Exist

Run this in Supabase SQL Editor:

```sql
-- List all columns in transactions table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
```

**Expected columns must include:**
- `staff_name`
- `status`
- `cancellation_reason`
- `cancelled_by`
- `cancelled_at`
- `customer_phone`
- `customer_email`
- `customer_address`

If any are missing, run:
```sql
ALTER TABLE transactions ADD COLUMN staff_name TEXT;
ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'completed';
-- etc...
```

### Step 7: Test with Direct SQL Insert

Test if you can manually insert with the column:

```sql
-- Test insert
INSERT INTO transactions (
  id, item_id, item_name, quantity, cost_price, selling_price, 
  total_cost, total_revenue, profit, timestamp, type, 
  transaction_type, department, staff_name
) VALUES (
  'TEST-' || extract(epoch from now())::bigint,
  'ITEM-TEST',
  'Test Item',
  1,
  100.00,
  150.00,
  100.00,
  0.00,
  0.00,
  NOW()::TEXT,
  'sale',
  'internal',
  'Test Department',
  'Test Staff'
);

-- If successful, delete the test record
DELETE FROM transactions WHERE item_id = 'ITEM-TEST';
```

If this works, the column exists and the issue is with PostgREST cache.

## Complete Checklist

- [ ] Run `VERIFY_AND_REFRESH_SCHEMA.sql` in Supabase
- [ ] Run `NOTIFY pgrst, 'reload schema';` in Supabase
- [ ] Stop Next.js dev server
- [ ] Delete `.next` folder
- [ ] Restart Next.js dev server (`npm run dev`)
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Test dispatch again

## If Still Not Working

1. **Check the terminal** where `npm run dev` is running
2. Look for the **actual detailed error** (not just the client error)
3. Copy the **full server error message** 
4. The detailed error will tell us exactly what's wrong

## Alternative: Check Migration 100

Check if `supabase/migrations/100_system_restructure_two_accounts.sql` already has the correct transactions table structure. If it does, you might need to run that migration instead.
