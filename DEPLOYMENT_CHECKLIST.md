# 🚀 DEPLOYMENT CHECKLIST

## Pre-Deployment Steps

### 1. Backup Current System (If Needed)
- [ ] Export existing Supabase data (if you want to keep historical records)
- [ ] Download copy of current `.env.local` file
- [ ] Save screenshots of current system configuration

### 2. Verify Environment Variables
Check `.env.local` file contains:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Database Migration

### Step 1: Open Supabase SQL Editor
1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **+ New Query**

### Step 2: Run Migration Script
1. Open file: `supabase/migrations/100_system_restructure_two_accounts.sql`
2. Copy entire contents
3. Paste into Supabase SQL Editor
4. Click **Run** button
5. Wait for success message

### Step 3: Verify Migration
Run this query to verify:
```sql
-- Check accounts created
SELECT username, role, display_name FROM users;

-- Should see:
-- admin     | admin            | Main Administrator
-- logistic  | logistics-admin  | Logistics Admin

-- Check tables are clean
SELECT 
  (SELECT COUNT(*) FROM orders) as orders_count,
  (SELECT COUNT(*) FROM inventory) as inventory_count,
  (SELECT COUNT(*) FROM users) as users_count;

-- Should see:
-- orders_count: 0
-- inventory_count: 0  
-- users_count: 2
```

### Step 4: Test Password Login (Optional)
If login fails, run this to reset passwords:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE users 
SET password = crypt('admin123', gen_salt('bf'))
WHERE username = 'admin';

UPDATE users 
SET password = crypt('logistic123', gen_salt('bf'))
WHERE username = 'logistic';
```

---

## Application Deployment

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

### Step 3: Open Application
Navigate to: **http://localhost:3000**

---

## Testing Procedures

### ✅ Login Tests
- [ ] Login as **admin** (admin/admin123)
  - Expected: Redirects to `/dashboard`
  - Shows: Dashboard with sales metrics
- [ ] Login as **logistic** (logistic/logistic123)
  - Expected: Redirects to `/dashboard/pos`
  - Shows: POS page
- [ ] Try old credentials (operations, packer, etc.)
  - Expected: Login fails with "Invalid credentials"

### ✅ Navigation Tests (Admin Account)
- [ ] Dashboard page loads
- [ ] POS page accessible
- [ ] Products page accessible
- [ ] Sales Analytics page accessible
- [ ] Business Contacts page accessible
- [ ] Activity Logs page accessible
- [ ] Navigation shows only 6 items:
  - Dashboard
  - POS
  - Products (+ Low Stock, Out of Stock)
  - Sales Analytics
  - Business Contacts
  - Activity Logs

### ✅ Navigation Tests (Logistics Admin Account)
- [ ] POS page accessible
- [ ] Products page accessible
- [ ] Navigation shows only 2 items:
  - POS
  - Products (+ Low Stock, Out of Stock)
- [ ] Cannot access Dashboard
- [ ] Cannot access Sales Analytics
- [ ] Cannot access Business Contacts

### ✅ Inventory & POS Tests
1. **Create Test Product**
   - [ ] Go to Products page
   - [ ] Click "Add Product"
   - [ ] Fill details:
     - Name: Test Product
     - Category: Electronics
     - Store: Main Warehouse
     - Sales Channel: Shopee
     - Quantity: 20
     - Cost Price: 100
     - Selling Price: 150
   - [ ] Click Save
   - [ ] Product appears in list

2. **Create Order in POS**
   - [ ] Go to POS page
   - [ ] Search and add "Test Product"
   - [ ] Set quantity: 5
   - [ ] Fill customer details:
     - Name: Test Customer
     - Contact: 09123456789
     - Address: Test Address
   - [ ] Select:
     - Sales Channel: Shopee
     - Store: Main Warehouse
     - Courier: J&T Express
   - [ ] Enter waybill: TEST123456
   - [ ] Click "Dispatch Order"
   - [ ] Success message appears

3. **Verify Inventory Deduction**
   - [ ] Go back to Products page
   - [ ] Find "Test Product"
   - [ ] **Verify quantity is now 15** (20 - 5 = 15)
   - [ ] This confirms auto-deduction works!

4. **Check Order Created**
   - [ ] Go to Dashboard
   - [ ] Check "Total Sales" card shows: 5
   - [ ] Check "Total Revenue" shows: ₱750
   - [ ] Check "Gross Profit" shows: ₱250

5. **Verify Activity Logs**
   - [ ] Go to Activity Logs page
   - [ ] Find latest entry
   - [ ] Should say: "Order dispatched to Shopee... Inventory auto-deducted: -5"

### ✅ Error Handling Tests
1. **Insufficient Stock**
   - [ ] Try to order 30 units of "Test Product" (only 15 available)
   - [ ] Expected: Error message "Insufficient stock"
   - [ ] Order not created

2. **Non-existent Product**
   - [ ] Try to manually create order for product not in inventory
   - [ ] Expected: Error message "Inventory item not found"
   - [ ] Order not created

### ✅ Data Accuracy Tests
- [ ] Dashboard metrics match actual data
- [ ] Sales Analytics shows correct revenue
- [ ] Inventory quantities are accurate
- [ ] Activity logs show all operations

---

## Common Issues & Solutions

### Issue: Can't login
**Solution:**
```sql
-- Reset passwords in Supabase SQL Editor:
UPDATE users 
SET password = crypt('admin123', gen_salt('bf'))
WHERE username = 'admin';

UPDATE users 
SET password = crypt('logistic123', gen_salt('bf'))
WHERE username = 'logistic';
```

### Issue: Old pages still showing
**Solution:**
```javascript
// Clear browser cache - Run in browser console:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Issue: Inventory not deducting
**Solution:**
1. Check browser console for errors
2. Verify product name exactly matches
3. Verify store and sales_channel match
4. Check sufficient stock available

### Issue: Migration fails
**Solution:**
1. Check Supabase logs for error details
2. Ensure pgcrypto extension is enabled:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   ```
3. Re-run migration

### Issue: Navigation broken
**Solution:**
- Hard refresh browser: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Clear browser cache
- Restart dev server

---

## Production Deployment (Optional)

### If deploying to Vercel/Production:

1. **Update Environment Variables**
   ```bash
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

2. **Run Build Test**
   ```bash
   npm run build
   ```

3. **Deploy**
   ```bash
   git add .
   git commit -m "System restructure: 2 accounts (admin + logistics)"
   git push origin main
   ```

4. **Verify Production**
   - [ ] Test login on production URL
   - [ ] Test POS order creation
   - [ ] Test inventory deduction
   - [ ] Check all pages load correctly

---

## Final Verification

Before marking as complete, ensure:
- [x] Database migration successful
- [x] 2 accounts created and working
- [x] Navigation shows correct pages
- [x] POS auto-deducts inventory
- [x] Orders created with "Dispatched" status
- [x] Dashboard shows sales metrics
- [x] No packing queue or track orders references
- [x] All old role logins fail
- [x] Activity logs working correctly

---

## Sign-Off

**Deployed By:** _________________  
**Date:** _________________  
**Verified By:** _________________  
**Status:** ☐ SUCCESS  ☐ ISSUES (describe below)

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

**🎉 SYSTEM RESTRUCTURE COMPLETE!**

Your inventory management system is now simplified to 2 accounts with streamlined sales workflow.
