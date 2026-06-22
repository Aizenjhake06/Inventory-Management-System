# 🗄️ DATABASE SETUP GUIDE

## 📋 Ano ang Gagawin

Tatlong (3) SQL files ang available:

1. **COMPLETE_DATABASE_SETUP.sql** ⭐ RECOMMENDED
   - Complete lahat ng tables, indexes, functions
   - May default data (categories, stores, users)
   - Full featured

2. **SIMPLE_DATABASE_SETUP.sql** 
   - Minimal version lang
   - 6 core tables only
   - Use kung may error sa complete version

3. **100_system_restructure_two_accounts.sql**
   - Migration script (if may existing database)
   - Mag-clean ng existing data

---

## 🚀 STEP-BY-STEP SETUP

### **Option 1: COMPLETE SETUP (Recommended)**

#### Step 1: Open Supabase
1. Go to https://app.supabase.com
2. Login
3. Select your project
4. Click **SQL Editor** sa left sidebar

#### Step 2: Run Complete Setup
1. Open file: `COMPLETE_DATABASE_SETUP.sql`
2. Copy LAHAT ng contents (Ctrl+A, Ctrl+C)
3. Paste sa Supabase SQL Editor
4. Click **RUN** button (bottom right)
5. Wait for "Success" message

#### Step 3: Verify Setup
Run this query:
```sql
-- Check users
SELECT username, role, display_name FROM users;

-- Check tables
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM categories) as categories,
  (SELECT COUNT(*) FROM stores) as stores,
  (SELECT COUNT(*) FROM inventory) as products,
  (SELECT COUNT(*) FROM orders) as orders;
```

Expected result:
- users: 2 (admin + logistic)
- categories: 10
- stores: 4
- products: 0 (empty, ready to add)
- orders: 0 (empty, ready to add)

---

### **Option 2: SIMPLE SETUP (If may error)**

#### If may ERROR sa complete setup:

1. Open file: `SIMPLE_DATABASE_SETUP.sql`
2. Copy contents
3. Paste sa Supabase SQL Editor
4. Click **RUN**
5. Verify using same query above

---

## ✅ WHAT WAS CREATED

### **Tables Created (16 total):**

#### Core Tables:
1. ✅ **users** - Login accounts (2 accounts)
2. ✅ **inventory** - Products with auto-deduction
3. ✅ **orders** - Sales orders (Dispatched/Shipped/Delivered)
4. ✅ **order_items** - Detailed order breakdown
5. ✅ **logs** - Activity tracking
6. ✅ **categories** - Product categories (10 default)
7. ✅ **stores** - Storage locations (4 default)

#### Additional Tables:
8. ✅ **bundles** - Product bundles
9. ✅ **bundle_items** - Bundle components
10. ✅ **customers** - Customer database
11. ✅ **transactions** - Legacy transactions
12. ✅ **restocks** - Restock history
13. ✅ **inventory_alerts** - Low stock alerts
14. ✅ **email_report_schedules** - Email automation
15. ✅ **email_report_logs** - Email logs
16. ✅ **dispatch_tracking** - Order tracking

### **Users Created:**

| Username | Password | Role | Access |
|----------|----------|------|--------|
| admin | admin123 | admin | Full access |
| logistic | logistic123 | logistics-admin | POS + Products |

### **Default Categories (10):**
- Electronics
- Clothing
- Food & Beverages
- Home & Garden
- Health & Beauty
- Sports & Outdoors
- Toys & Games
- Books & Media
- Automotive
- Office Supplies

### **Default Stores (4):**
- Main Warehouse
- Secondary Warehouse
- Retail Store
- Distribution Center

---

## 🔍 VERIFY EVERYTHING WORKS

### Test 1: Check Users
```sql
SELECT username, role, display_name, email FROM users;
```

Expected:
```
username  | role             | display_name        | email
----------|------------------|---------------------|--------------------
admin     | admin            | Main Administrator  | admin@system.local
logistic  | logistics-admin  | Logistics Admin     | logistics@system.local
```

### Test 2: Check Categories
```sql
SELECT name FROM categories ORDER BY name;
```

Should show 10 categories.

### Test 3: Check Stores
```sql
SELECT name FROM stores ORDER BY name;
```

Should show 4 stores.

### Test 4: Test Password Login
Try logging in to your app with:
- Username: `admin`
- Password: `admin123`

If login fails, reset password:
```sql
UPDATE users 
SET password = crypt('admin123', gen_salt('bf'))
WHERE username = 'admin';
```

---

## ⚠️ TROUBLESHOOTING

### Error: "extension pgcrypto does not exist"
**Solution:**
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Error: "relation already exists"
**Solution:** Tables already exist. Clean first:
```sql
-- Copy from COMPLETE_DATABASE_SETUP.sql lines 10-24
DROP TABLE IF EXISTS email_report_logs CASCADE;
DROP TABLE IF EXISTS email_report_schedules CASCADE;
-- ... (all drop statements)
```

### Error: "permission denied"
**Solution:** Make sure you're using the right Supabase project and have admin access.

### Users created but can't login
**Solution:** Reset passwords manually:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE users 
SET password = crypt('admin123', gen_salt('bf'))
WHERE username = 'admin';

UPDATE users 
SET password = crypt('logistic123', gen_salt('bf'))
WHERE username = 'logistic';
```

### Need to start fresh
**Solution:** Run the DROP TABLE commands then run setup again:
```sql
-- Drop all tables
DROP TABLE IF EXISTS bundle_items CASCADE;
DROP TABLE IF EXISTS bundles CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS restocks CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Then run COMPLETE_DATABASE_SETUP.sql again
```

---

## 📊 DATABASE STRUCTURE

### Main Relationships:

```
users (login accounts)
  ↓
orders (created by users)
  ↓
order_items (detailed breakdown)
  
inventory (products)
  ↓
bundles (product bundles)
  ↓
bundle_items (bundle components)
```

### Key Fields:

**users:**
- username (unique)
- password (bcrypt hashed)
- role (admin or logistics-admin)

**inventory:**
- name, category, store, sales_channel
- quantity (auto-deducted on order)
- cost_price, selling_price
- reorder_level (for alerts)

**orders:**
- status (Dispatched/Shipped/Delivered)
- waybill (tracking number)
- customer details
- dispatched_by (who created)

**logs:**
- operation (sale, restock, etc.)
- details (what happened)
- timestamp

---

## 🎯 NEXT STEPS

After database setup:

1. ✅ **Start application**
   ```bash
   npm install
   npm run dev
   ```

2. ✅ **Login**
   - Go to http://localhost:3000
   - Login as admin (admin/admin123)

3. ✅ **Add first product**
   - Go to Products page
   - Click "Add Product"
   - Fill details and save

4. ✅ **Create first order**
   - Go to POS page
   - Add product to cart
   - Fill customer details
   - Dispatch order
   - Check inventory deducted!

5. ✅ **View dashboard**
   - Check sales metrics
   - See revenue and profit

---

## 📝 QUICK REFERENCE

### Add Sample Product (Optional):
```sql
INSERT INTO inventory (
  id, name, category, store, sales_channel,
  quantity, cost_price, selling_price, 
  reorder_level, last_updated
) VALUES (
  'prod-' || gen_random_uuid(),
  'Sample Product',
  'Electronics',
  'Main Warehouse',
  'Shopee',
  100,
  50.00,
  100.00,
  10,
  NOW()::TEXT
);
```

### View All Products:
```sql
SELECT name, category, quantity, selling_price 
FROM inventory 
ORDER BY name;
```

### View All Orders:
```sql
SELECT 
  id, date, product, qty, total, 
  status, customer_name 
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;
```

### View Activity Logs:
```sql
SELECT 
  operation, item_name, details, timestamp 
FROM logs 
ORDER BY created_at DESC 
LIMIT 20;
```

---

## ✨ SUCCESS!

Database setup complete! You now have:
- ✅ Clean database structure
- ✅ 2 user accounts ready
- ✅ Default categories and stores
- ✅ All tables with proper indexes
- ✅ Ready for first order!

**Happy selling! 🚀**
