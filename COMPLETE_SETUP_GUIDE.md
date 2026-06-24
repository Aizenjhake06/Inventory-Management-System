# Complete Database Setup Guide

## Problem Summary
Your Internal Usage dispatch is failing because several tables are missing or incomplete in your Supabase database.

## Root Cause Analysis

After checking migration `100_system_restructure_two_accounts.sql`, I found:

**Tables that exist in migration 100:**
- ✅ `users`
- ✅ `inventory`
- ✅ `orders`
- ✅ `logs`
- ✅ `restocks`

**Tables that are MISSING:**
- ❌ `transactions` (CRITICAL - causing dispatch errors)
- ❌ `stores` (causes "Failed to fetch stores")
- ❌ `business_contacts` (causes business contacts feature to fail)

## Complete Setup - Run These SQL Files in Order

### 1. CREATE_TRANSACTIONS_TABLE.sql ⚠️ **CRITICAL**
**Purpose:** Creates the transactions table for tracking sales, internal usage, demos, and transfers

**Run this FIRST!**

This creates:
- Main transactions table with all required columns
- Indexes for performance
- Proper permissions
- Schema cache refresh

### 2. CREATE_STORES_TABLE.sql ⚠️ **CRITICAL**
**Purpose:** Creates stores/locations table for dispatch destinations

This creates:
- Stores table with `store_name` and `sales_channel`
- Sample stores for Facebook, Shopee, Lazada, Walk-in
- 9 ready-to-use stores

### 3. CREATE_BUSINESS_CONTACTS_TABLE.sql (Optional)
**Purpose:** Creates business contacts table if you use that feature

This creates:
- Business contacts table for customers/suppliers
- Proper column structure matching the UI

## Step-by-Step Instructions

### Step 1: Run SQL Files in Supabase

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Run files in this exact order:
   
   **A. CREATE_TRANSACTIONS_TABLE.sql**
   - Copy entire content
   - Paste in SQL Editor
   - Click **Run**
   - Verify: Should see "Transactions table created successfully!"
   
   **B. CREATE_STORES_TABLE.sql**
   - Copy entire content
   - Paste in SQL Editor
   - Click **Run**
   - Verify: Should see "Stores table created successfully!" and "total_stores: 9"
   
   **C. CREATE_BUSINESS_CONTACTS_TABLE.sql** (if needed)
   - Copy entire content
   - Paste in SQL Editor
   - Click **Run**
   - Verify: Should see success message

### Step 2: Refresh Schema Cache

Run this in SQL Editor:
```sql
NOTIFY pgrst, 'reload schema';
```

### Step 3: Restart Next.js Dev Server

1. **Stop** your dev server (Ctrl+C in terminal)
2. **Delete cache:**
   ```bash
   rmdir /s /q .next
   ```
3. **Restart:**
   ```bash
   npm run dev
   ```

### Step 4: Hard Refresh Browser

- Press **Ctrl+Shift+R** to clear browser cache

### Step 5: Test Internal Usage

1. Go to **Internal Usage** page
2. Add items to cart
3. Click **Dispatch Items**
4. Select purpose (Demo/Display, Internal Use, or Warehouse Transfer)
5. Select sales channel/store
6. Fill in staff name
7. Click **Dispatch**
8. ✅ Should work without errors!

## Verification

After running all SQL files, verify tables exist:

```sql
-- Check all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Expected tables:**
- ✅ users
- ✅ inventory  
- ✅ orders
- ✅ logs
- ✅ restocks
- ✅ transactions ← NEW
- ✅ stores ← NEW
- ✅ business_contacts ← NEW (if you ran that file)

## What Gets Fixed

After completing this setup:

✅ Internal Usage dispatch will work  
✅ Demo/Display dispatches will work  
✅ Warehouse transfers will work  
✅ Staff names will be recorded  
✅ Transaction history will be tracked  
✅ Store/location selection will work  
✅ Business contacts feature will work  
✅ All revenue tracking will work correctly  
✅ Analytics and reports will have data  

## Important Notes

1. **Internal usage does NOT count toward sales** - This is correct!
   - `transaction_type = 'internal'` has `total_revenue = 0`
   - Only `transaction_type = 'sale'` counts toward revenue
   
2. **Transaction types:**
   - `sale` = Actual customer sale (counts toward revenue)
   - `demo` = Demo/Display (no revenue)
   - `internal` = Internal usage (no revenue)
   - `transfer` = Warehouse transfer (no revenue)

3. **All transactions are logged** for audit trail regardless of type

## Troubleshooting

If dispatch still fails after setup:

1. Check terminal where `npm run dev` is running for detailed error
2. Verify all tables exist using the SQL query above
3. Try restarting Supabase (Project Settings > Database > Restart)
4. Check `.env.local` has correct Supabase credentials
5. Run `NOTIFY pgrst, 'reload schema';` again in Supabase

## Need Help?

If you still get errors, provide:
1. The complete error message from the terminal (not just browser console)
2. Output from the verification SQL query
3. Which SQL files you've successfully run
