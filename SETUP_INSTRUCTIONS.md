# 🚀 SYSTEM RESTRUCTURE - SETUP INSTRUCTIONS

## ✅ SYSTEM OVERVIEW

This inventory management system now has **2 accounts only**:

### 1. **MAIN ADMIN**
- **Username:** `admin`
- **Password:** `admin123`
- **Pages Access:**
  - Dashboard (Sales data, analytics)
  - POS
  - Products
  - Sales Analytics
  - Business Contacts
  - Activity Logs

### 2. **LOGISTICS ADMIN**
- **Username:** `logistic`
- **Password:** `logistic123`
- **Pages Access:**
  - POS Page
  - Products (can change sales data)

---

## 🔧 SETUP STEPS

### **Step 1: Run Database Migration**

Go to your Supabase project SQL Editor and run this migration:

```bash
supabase\migrations\100_system_restructure_two_accounts.sql
```

This will:
- ✅ Clean all existing data (fresh start)
- ✅ Remove unused user roles (operations, packer, tracker, dept-manager)
- ✅ Create 2 accounts: admin + logistic
- ✅ Update database schema
- ✅ Remove department/channel filtering

### **Step 2: Verify Accounts Created**

Run this query in Supabase SQL Editor:

```sql
SELECT username, role, display_name FROM users ORDER BY role;
```

You should see:
```
username  | role             | display_name
----------|------------------|------------------
admin     | admin            | Main Administrator
logistic  | logistics-admin  | Logistics Admin
```

### **Step 3: Update Password Hashes (IMPORTANT!)**

The migration includes password hashes, but if they don't work, run this in Supabase SQL Editor:

```sql
-- Update admin password to 'admin123'
UPDATE users 
SET password = crypt('admin123', gen_salt('bf'))
WHERE username = 'admin';

-- Update logistic password to 'logistic123'
UPDATE users 
SET password = crypt('logistic123', gen_salt('bf'))
WHERE username = 'logistic';
```

### **Step 4: Start Development Server**

```bash
npm install
npm run dev
```

Open: **http://localhost:3000**

---

## 🎯 KEY CHANGES

### **POS System - Auto Inventory Deduction**
- **Before:** Order created → Pending → Packer marks as Packed → Inventory deducted
- **After:** Order created in POS → **IMMEDIATE inventory deduction** → Status: Dispatched

### **Removed Features**
- ❌ Packing Queue
- ❌ Track Orders page
- ❌ Department/Channel filtering
- ❌ Operations, Packer, Tracker, Dept-Manager roles
- ❌ Agent performance tracking

### **Simplified Flow**
1. Login (admin or logistic)
2. Go to POS
3. Create order (dispatch)
4. **Inventory auto-deducts immediately**
5. Order saved as "Dispatched" (not Pending)
6. View sales in Dashboard

---

## 🔐 LOGIN CREDENTIALS

| Account | Username | Password | Default Route |
|---------|----------|----------|---------------|
| Main Admin | `admin` | `admin123` | `/dashboard` |
| Logistics Admin | `logistic` | `logistic123` | `/dashboard/pos` |

---

## 📊 DATABASE SCHEMA

### **Key Tables**
- `users` - 2 accounts only
- `inventory` - Products with auto-deduction
- `orders` - Status: Dispatched/Shipped/Delivered (no Pending/Packed)
- `order_items` - Detailed order breakdown
- `logs` - Activity logs

### **Removed Columns**
- `users.assigned_channel`
- `users.agent_username`
- `orders.packed_by`
- `orders.packed_at`
- `orders.agent_username`

---

## 🧪 TESTING CHECKLIST

After setup, test:

- [ ] Login as admin (admin/admin123)
- [ ] Login as logistic (logistic/logistic123)
- [ ] Create product in inventory
- [ ] Dispatch order in POS
- [ ] Verify inventory deducted immediately
- [ ] Check order status = "Dispatched"
- [ ] View sales in Dashboard
- [ ] Check activity logs

---

## ⚠️ TROUBLESHOOTING

### **Can't login?**
Run password hash update (Step 3)

### **Inventory not deducting?**
Check:
1. Product name matches exactly
2. Store and sales_channel match
3. Enough stock available
4. Check browser console for errors

### **Old roles still showing?**
Clear browser localStorage:
```javascript
localStorage.clear()
```
Then refresh page

---

## 📝 NOTES

- All existing data is **DELETED** during migration (clean start)
- No backward compatibility with old system
- Password can be changed after first login via Settings (admin only)
- Default passwords are stored in `lib/auth.ts`
