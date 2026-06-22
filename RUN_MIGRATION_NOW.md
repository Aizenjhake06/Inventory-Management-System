# 🚨 CRITICAL: YOU MUST RUN THE DATABASE MIGRATION NOW!

## Why You're Getting "Failed to Create Item" Error

The error happens because:
1. **Your database still has the OLD schema** (with categories, stores, sales_channel)
2. **Your code expects the NEW schema** (simplified, no categories/stores)
3. When you try to add a product, the code sends ONLY the new fields
4. The database rejects it because it's missing the old required fields

## ⚠️ YOU CANNOT USE THE SYSTEM UNTIL YOU RUN THE MIGRATION

The frontend and backend code has been updated, but **the database is still using the old structure**. This mismatch causes all create/update operations to fail.

## How to Run the Migration

### Step 1: Open Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)

### Step 2: Copy the Migration SQL
1. Open the file: `supabase/migrations/100_system_restructure_two_accounts.sql`
2. Select ALL the content (Ctrl+A)
3. Copy it (Ctrl+C)

### Step 3: Execute the Migration
1. In Supabase SQL Editor, paste the SQL
2. Click **"Run"** button (or press Ctrl+Enter)
3. Wait for execution to complete (should take 5-10 seconds)

### Step 4: Verify Success
You should see output like:
```
NOTICE: ========================================
NOTICE: DATABASE SETUP COMPLETE!
NOTICE: ========================================

NOTICE: SUMMARY:
NOTICE: - Users: 2

NOTICE: LOGIN CREDENTIALS:
NOTICE: 1. Admin: admin / admin123
NOTICE: 2. Logistics: logistic / logistic123

NOTICE: READY TO USE!
NOTICE: ========================================
```

## What the Migration Does

### 🗑️ DROPS (Deletes):
- All existing tables
- All old data (orders, inventory, users, etc.)

### ✨ CREATES:
- 4 new simplified tables:
  1. `users` - 2 accounts only (admin + logistics-admin)
  2. `inventory` - Products (name, quantity, cost_price, selling_price)
  3. `orders` - Simple dispatch tracking
  4. `logs` - Activity logs

### ✅ ADDS:
- Auto-calculated columns:
  - `gross_profit` = selling_price - cost_price
  - `margin` = (gross_profit / selling_price) * 100
- 2 default user accounts with hashed passwords

## ⚠️ WARNING: THIS WILL DELETE ALL EXISTING DATA!

**BACKUP YOUR DATABASE FIRST** if you have important data!

To backup:
1. Go to Supabase Dashboard
2. Click **"Database"** → **"Backups"**
3. Create a manual backup
4. Wait for backup to complete
5. Then run the migration

## After Running the Migration

1. **Restart your dev server**:
   ```bash
   # Stop the server (Ctrl+C)
   # Start it again
   npm run dev
   ```

2. **Clear browser cache**:
   - Press F12 (DevTools)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

3. **Login**:
   - Username: `admin`
   - Password: `admin123`

4. **Test**:
   - Add a product (should work now!)
   - Dispatch from POS
   - Check dashboard

## If You See Errors After Migration

### Error: "relation does not exist"
**Solution**: The migration didn't run completely. Run it again.

### Error: "Failed to create item" (still)
**Solution**: 
1. Check console for specific error
2. Make sure you're logged in as `admin` (not the old username)
3. Try logging out and logging in again

### Error: "Invalid login credentials"
**Solution**: 
- The old user accounts were deleted
- Use the NEW credentials:
  - `admin / admin123`
  - `logistic / logistic123`

## Migration File Location

```
supabase/migrations/100_system_restructure_two_accounts.sql
```

This file contains the COMPLETE database setup for the simplified 2-account system.

---

**🚨 ACTION REQUIRED: Run the migration NOW to use the system!**
