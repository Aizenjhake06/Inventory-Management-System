# 📦 Inventory Management System - Simplified 2-Account Version

## 🎯 System Overview

A streamlined inventory management system with **automatic inventory deduction on dispatch** and simplified 2-account structure.

### Key Features
- ✅ **Auto Inventory Deduction** - Inventory deducts immediately when order is dispatched in POS
- ✅ **Simplified Workflow** - No packing queue, orders go directly to "Dispatched" status
- ✅ **2 Account Types** - Main Admin + Logistics Admin only
- ✅ **Sales-Focused Dashboard** - Real-time sales metrics and analytics
- ✅ **Product Management** - Full inventory control with low stock alerts
- ✅ **Activity Tracking** - Comprehensive logs of all system operations

---

## 👥 User Accounts

### 1. Main Admin
**Username:** `admin`  
**Password:** `admin123`

**Access:**
- 📊 Dashboard - Sales overview, KPIs, revenue metrics
- 🛒 POS - Create and dispatch orders
- 📦 Products - Add, edit, delete inventory items
- 📈 Sales Analytics - Detailed sales reports and charts
- 👥 Business Contacts - Manage customer and supplier contacts
- 📝 Activity Logs - View all system operations

### 2. Logistics Admin
**Username:** `logistic`  
**Password:** `logistic123`

**Access:**
- 🛒 POS - Create and dispatch orders
- 📦 Products - View and update product sales data

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ installed
- Supabase account with active project
- Git (optional)

### 2. Installation
```bash
# Clone or download project
cd "Inventory Management System"

# Install dependencies
npm install

# Setup environment variables
# Copy .env.example to .env.local and fill in your Supabase credentials
```

### 3. Database Setup
1. Open Supabase SQL Editor
2. Run migration: `supabase/migrations/100_system_restructure_two_accounts.sql`
3. Verify 2 accounts created

### 4. Run Application
```bash
npm run dev
```
Open: http://localhost:3000

### 5. First Login
Login with:
- Username: `admin`
- Password: `admin123`

---

## 📖 User Guide

### How to Create an Order (POS)

1. **Navigate to POS Page**
   - Click "Point of Sale (POS)" in sidebar

2. **Add Products**
   - Search for product by name
   - Click "Add to Cart"
   - Adjust quantity if needed

3. **Fill Order Details**
   - **Customer Info:**
     - Name
     - Contact Number
     - Delivery Address
   - **Order Info:**
     - Sales Channel (Shopee, Lazada, TikTok, etc.)
     - Store Location
     - Courier Service
     - Waybill/Tracking Number
   - **Notes:** (Optional)

4. **Dispatch Order**
   - Click "Dispatch Order" button
   - ✅ **Inventory automatically deducts**
   - ✅ Order created with status "Dispatched"
   - ✅ Sale recorded in analytics

### How to Manage Products

1. **Add New Product**
   - Go to Products page
   - Click "Add Product"
   - Fill details:
     - Name, Category, Store, Sales Channel
     - Quantity, Cost Price, Selling Price
     - Reorder Level (for low stock alerts)
   - Upload image (optional)
   - Click Save

2. **Edit Product**
   - Find product in list
   - Click edit icon
   - Update fields
   - Click Save

3. **Delete Product**
   - Find product in list
   - Click delete icon
   - Confirm deletion

### How to View Sales Analytics

1. **Dashboard Overview**
   - Total Revenue
   - Gross Profit & Margin
   - Total Sales Volume
   - Average Order Value
   - Low Stock Alerts

2. **Sales Analytics Page**
   - Revenue trends over time
   - Sales by channel breakdown
   - Top performing products
   - Period comparison (Day/Week/Month)

### How to Check Activity Logs

1. Go to Activity Logs page
2. View all system operations:
   - Orders dispatched
   - Products added/updated
   - Inventory changes
   - Sales recorded
3. Filter by date or search by keyword

---

## ⚙️ System Architecture

### Order Flow
```
POS Order Creation
       ↓
Validate Product & Stock
       ↓
Deduct Inventory (Immediate)
       ↓
Create Order (Status: Dispatched)
       ↓
Record Sale in Analytics
       ↓
Log Activity
```

### Key Changes from Old System
- ❌ **Removed:** Packing Queue workflow
- ❌ **Removed:** Track Orders page
- ❌ **Removed:** 4 user roles (operations, packer, tracker, dept-manager)
- ❌ **Removed:** Department/channel filtering
- ✅ **Added:** Immediate inventory deduction on dispatch
- ✅ **Added:** Simplified 2-account structure
- ✅ **Added:** Sales-focused dashboard metrics

---

## 🔧 Technical Details

### Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **UI:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **State:** React Hooks

### Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Tables
- **users** - System accounts (admin, logistics-admin)
- **inventory** - Products with auto-deduction
- **orders** - Dispatched orders (status: Dispatched/Shipped/Delivered)
- **order_items** - Detailed order line items
- **logs** - Activity tracking
- **categories** - Product categories
- **stores** - Storage locations
- **bundles** - Product bundles

### API Routes
- `/api/orders` - Create/fetch orders (auto-deduct inventory)
- `/api/items` - Manage inventory
- `/api/dashboard` - Dashboard metrics
- `/api/analytics` - Sales analytics data
- `/api/logs` - Activity logs

---

## 📊 Key Metrics Tracked

### Dashboard KPIs
- **Total Revenue** - Sum of all dispatched orders
- **Gross Profit** - Revenue minus COGS
- **Profit Margin** - (Gross Profit / Revenue) × 100
- **Total Sales** - Number of items sold
- **Average Order Value** - Revenue ÷ Orders
- **Total Orders** - Count of dispatched orders
- **Total Delivered** - Count of delivered orders

### Inventory Alerts
- **Low Stock** - Items where quantity ≤ reorder level
- **Out of Stock** - Items with quantity = 0

### Sales Analytics
- Revenue trends (daily/weekly/monthly)
- Sales by channel distribution
- Top products by revenue and quantity
- Period-over-period comparison

---

## ⚠️ Important Notes

### Inventory Management
- **Automatic Deduction:** Inventory deducts IMMEDIATELY when order is created in POS
- **Stock Validation:** System prevents ordering more than available stock
- **Product Matching:** Must exactly match product name, store, and sales channel
- **Case-Insensitive:** If exact match fails, tries case-insensitive search

### Order Status Flow
1. **Dispatched** - Order created and inventory deducted
2. **Shipped** - Order handed to courier (manual update)
3. **Delivered** - Order received by customer (manual update)

### Security
- Passwords hashed using bcrypt
- Role-based access control (RBAC)
- API route protection
- Input validation on all forms

---

## 🐛 Troubleshooting

### Can't Login?
- Verify credentials: `admin` / `admin123` or `logistic` / `logistic123`
- Clear browser cache and cookies
- Check Supabase connection

### Inventory Not Deducting?
- Check product name matches exactly
- Verify store and sales_channel match
- Ensure sufficient stock available
- Check browser console for errors

### Dashboard Shows Zero?
- Verify orders have status "Dispatched" or higher
- Check date range filter
- Ensure orders exist in database

### Page Not Loading?
- Hard refresh: `Ctrl + Shift + R`
- Clear localStorage: `localStorage.clear()`
- Restart dev server

---

## 📞 Support

For issues or questions:
1. Check **DEPLOYMENT_CHECKLIST.md** for common issues
2. Review **SYSTEM_RESTRUCTURE_COMPLETE.md** for detailed changes
3. Check browser console for error messages
4. Verify Supabase database status

---

## 📝 Version History

### Version 2.0 (Current) - June 22, 2026
- ✅ Simplified to 2 accounts (admin + logistics-admin)
- ✅ Auto inventory deduction on dispatch
- ✅ Removed packing queue workflow
- ✅ Sales-focused dashboard
- ✅ Streamlined navigation (6 core pages)

### Version 1.0 (Previous)
- 6 user roles with complex permissions
- Packing queue workflow
- Department/channel filtering
- 40+ pages across role-specific sections

---

## 🎉 Success!

Your inventory management system is now running with:
- ✅ 2 simplified accounts
- ✅ Automatic inventory deduction
- ✅ Streamlined sales workflow
- ✅ Real-time analytics

**Ready to manage your inventory efficiently!** 🚀
