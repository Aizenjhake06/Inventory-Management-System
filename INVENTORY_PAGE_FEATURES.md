# Inventory/Products Page - Complete Features Guide 📦

**WIHI Asia Inventory System**  
**Page**: `/dashboard/inventory`  
**Role**: Admin & Operations  
**Version**: v2.1.0+

---

## Overview

The Inventory/Products page is the central hub for managing all products, bundles, categories, and stores in the system. It provides comprehensive product management with advanced filtering, sorting, bulk operations, and detailed analytics.

---

## 🎯 Core Features

### 1. **Product Management** ✅

#### View Products
- **Data Table Display**: Professional table with resizable columns
- **Product Types**: 
  - Single products (individual items)
  - Bundle products (multiple items packaged together)
- **Column Information**:
  - Product name & image
  - Category
  - Stock status (In Stock / Low Stock / Out of Stock)
  - Current stock quantity
  - Cost price
  - Selling price
  - Profit margin (%)
  - Action buttons (Edit, Delete)

#### Add New Product
- **Button**: "Add Product" (top-right)
- **Dialog Form** includes:
  - Product name
  - SKU (Stock Keeping Unit)
  - Category selection
  - Cost price
  - Selling price
  - Initial quantity
  - Reorder level (low stock threshold)
  - Product description
  - Product image upload
- **Auto-calculations**: Profit margin computed automatically
- **Validation**: All required fields validated

#### Edit Product
- **Access**: Click edit icon (✏️) on any product row
- **Features**:
  - Update any product field
  - Change product image
  - Modify pricing
  - Adjust stock levels
  - Update reorder threshold
- **Live Updates**: Changes reflect immediately in table

#### Delete Product
- **Access**: Click delete icon (🗑️) on any product row
- **Safety**: Confirmation dialog before deletion
- **Message**: "Are you sure you want to delete [Product Name]?"
- **Impact**: Permanently removes product from inventory

---

### 2. **Bundle Management** 🎁

#### What are Bundles?
Bundles are virtual products composed of multiple individual items sold together as a package deal.

#### Create Bundle
- **Button**: "Create Bundle"
- **Features**:
  - Bundle name
  - Bundle SKU
  - Add multiple items to bundle
  - Set quantity per item
  - Auto-calculated total cost
  - Auto-calculated bundle price
  - Profit margin display
  - Bundle image upload

#### Bundle Components
- **Item Selection**: Choose from existing inventory
- **Quantity Control**: Set how many of each item in bundle
- **Pricing**:
  - Total cost = Sum of (item cost × quantity)
  - Selling price = Your custom price
  - Profit = Selling price - Total cost

#### Edit Bundle
- **Access**: Click edit on bundle product
- **Update**: Add/remove items, change quantities, update pricing
- **Validation**: Cannot create bundle with out-of-stock items

---

### 3. **Search & Filtering** 🔍

#### Search Bar
- **Location**: Top of page
- **Search by**:
  - Product name
  - Category name
  - SKU code
- **Real-time**: Results update as you type
- **Case-insensitive**: Finds "laptop" or "LAPTOP"

#### Filter by Product Type
- **Options**:
  - All Products (default)
  - Single Items only
  - Bundles only
- **Use Case**: Quick view of specific product types

#### Filter by Category
- **Options**: All Categories + your custom categories
- **Dynamic**: Updates based on created categories
- **Quick Access**: Filter by Electronics, Clothing, etc.

#### Filter by Stock Status
- **Options**:
  - All Stock (default)
  - Low Stock (quantity ≤ reorder level)
  - Out of Stock (quantity = 0)
- **Alerts**: Quickly identify items needing restock

---

### 4. **Sorting** 🔄

#### Sort Options
- **By Name**:
  - A-Z (ascending)
  - Z-A (descending)
- **By Price**:
  - Low to High
  - High to Low
- **By Stock**:
  - Least stock first
  - Most stock first

#### Usage
- **Access**: Dropdown menu "Sort by"
- **Instant**: Results reorder immediately
- **Persistent**: Selection remembered during session

---

### 5. **Statistics Cards** 📊

Located at the top of the page, showing:

#### Total Items
- **Icon**: 📦 Package (Indigo)
- **Shows**: Total number of products
- **Includes**: Both single items and bundles

#### Total Quantity
- **Icon**: 📦 Package (Blue)
- **Shows**: Sum of all stock quantities
- **Note**: Excludes bundle quantities (counts individual items only)

#### Total Inventory Value
- **Icon**: 💵 Dollar Sign (Green)
- **Shows**: Total value at selling price
- **Formula**: Σ(quantity × selling price)
- **Display**: Formatted currency (₱)

#### Threshold Count (Admin Only)
- **Icon**: ⚠️ Alert Circle (Orange)
- **Shows**: Number of items at/below reorder level
- **Purpose**: Quick alert for items needing attention

---

### 6. **Category Management** 🏷️

#### View Categories
- **Access**: "Manage Categories" button
- **Display**: List of all product categories
- **Info**: Category name & creation date

#### Add Category
- **Input**: Category name field
- **Button**: "Add Category"
- **Validation**: Cannot add duplicate categories
- **Use Case**: Electronics, Clothing, Food, etc.

#### Edit Category
- **Access**: Edit icon next to category
- **Feature**: Rename category
- **Impact**: Updates all products using this category

#### Delete Category
- **Access**: Delete icon next to category
- **Safety**: Confirmation required
- **Warning**: Check if category is in use first

---

### 7. **Store Management** 🏪

#### What are Stores?
Physical or virtual locations where products are stored/sold.

#### View Stores
- **Access**: "Manage Stores" button
- **Display**: Store name & sales channel
- **Examples**:
  - Main Warehouse (Physical Store)
  - Manila Branch (Shopee)
  - Cebu Outlet (Lazada)

#### Add Store
- **Fields**:
  - Store name
  - Sales channel (Shopee, Lazada, Facebook, TikTok, Physical Store)
- **Button**: "Add Store"
- **Purpose**: Organize inventory by location

#### Edit Store
- **Access**: Edit icon next to store
- **Update**: Store name or sales channel
- **Use Case**: Rebrand or change platform

#### Delete Store
- **Access**: Delete icon next to store
- **Warning**: Confirm before deleting
- **Impact**: Store removed from system

---

### 8. **Stock Management** 📈

#### Restock Items
- **Access**: Click on product row or "Restock" action
- **Dialog includes**:
  - Current stock level
  - Restock amount input
  - Restock reason dropdown:
    - New Purchase
    - Return from Customer
    - Inventory Adjustment
    - Damaged Items Replacement
    - Supplier Correction
    - Other
  - Timestamp automatic
- **Result**: Stock increased, logged in activity

#### Stock Status Indicators
- **🟢 In Stock**: Green badge, quantity > reorder level
- **🟡 Low Stock**: Yellow badge, quantity ≤ reorder level
- **🔴 Out of Stock**: Red badge, quantity = 0

#### Auto-Alerts
- **Low Stock**: Yellow highlight when below threshold
- **Out of Stock**: Red highlight when zero quantity
- **Dashboard**: Alerts also shown on main dashboard

---

### 9. **Export Features** 📥

#### Export to Excel
- **Button**: "Export Excel" (Admin only)
- **Includes**:
  - Product name
  - Quantity
  - Cost price
  - Selling price
  - Profit margin %
  - Total value
  - Total COGS
  - Stock status
  - Last restock date
  - Last restock amount
  - Restock reason
- **Header Section**:
  - Report date & time
  - Summary information:
    - Total products
    - Total quantity
    - Total inventory value
    - Total COGS
    - In stock count
    - Low stock count
    - Out of stock count
  - Filter applied
- **Grouping**: Products grouped by name + price combination
- **Note**: Bundles excluded from export
- **Format**: .xlsx file
- **Naming**: `Inventory-Report-YYYY-MM-DD.xlsx`

#### Export to PDF
- **Button**: "Export PDF" (Admin only)
- **Similar content** to Excel export
- **Format**: PDF document
- **Use Case**: Printing, sharing with stakeholders

---

### 10. **Pagination** 📄

#### Features
- **Page Size Options**:
  - 10 items per page
  - 20 items per page (default)
  - 50 items per page
  - 100 items per page
- **Navigation**:
  - Previous/Next buttons
  - Page number display
  - Jump to page input
  - Total pages shown
- **Info Display**: "Showing X-Y of Z items"
- **Keyboard Support**: Arrow keys to navigate

---

### 11. **Resizable Columns** 📏

#### Feature Description
Drag column borders to resize for optimal viewing.

#### How to Use
1. Hover over column border
2. Cursor changes to resize icon
3. Click and drag left/right
4. Release to set new width

#### Columns Available
- Product (350px default)
- Category (220px default)
- Status (120px default)
- Stock (130px default)
- Cost (130px default)
- Price (130px default)
- Margin (120px default)
- Actions (150px default)

#### Persistence
- **Saved**: Column widths saved to localStorage
- **Restored**: Widths restored on next visit
- **Per User**: Each user has own preferences
- **Reset**: Clear browser data to reset

---

### 12. **Responsive Design** 📱

#### Mobile (< 640px)
- Table switches to card view
- Stacked layout
- Touch-friendly buttons
- Simplified actions

#### Tablet (640px - 1024px)
- Scrollable table
- Adjusted column widths
- Optimized spacing

#### Desktop (> 1024px)
- Full table view
- All columns visible
- Maximum productivity

---

### 13. **Real-time Updates** ⚡

#### Auto-refresh
- **On Focus**: Data refreshes when window regains focus
- **After Actions**: Automatic refresh after add/edit/delete
- **Live Data**: Always shows current inventory state

#### Toast Notifications
- **Success**: Green toast for successful operations
- **Error**: Red toast for failed operations
- **Info**: Blue toast for informational messages

---

### 14. **Role-Based Features** 👥

#### Admin Role
- ✅ Full access to all features
- ✅ Can add/edit/delete products
- ✅ Can manage categories & stores
- ✅ Can export data
- ✅ Can create/edit bundles
- ✅ Can restock items
- ✅ Sees all products across all channels

#### Operations Role (Department)
- ✅ View all products
- ✅ Can add products
- ✅ Can edit products
- ✅ Can restock items
- ✅ Limited to assigned sales channel (auto-filtered)
- ❌ Cannot delete products
- ❌ Cannot export data
- ❌ Cannot manage categories/stores

---

### 15. **Advanced Features** 🚀

#### Product Images
- **Upload**: Drag & drop or click to upload
- **Formats**: JPG, PNG, WebP
- **Storage**: Supabase Storage
- **Display**: Thumbnail in table, full size in dialogs
- **Fallback**: Default icon if no image

#### Profit Margin Calculation
- **Formula**: ((Selling Price - Cost Price) / Selling Price) × 100
- **Display**: Percentage with 2 decimals
- **Color Coding**:
  - 🟢 Green: > 30% margin (good)
  - 🟡 Yellow: 10-30% margin (okay)
  - 🔴 Red: < 10% margin (low)

#### SKU (Stock Keeping Unit)
- **Purpose**: Unique product identifier
- **Format**: Any alphanumeric string
- **Optional**: Can be auto-generated
- **Use**: Barcode scanning, inventory tracking

#### Reorder Level (Threshold)
- **Purpose**: Low stock alert trigger
- **Setting**: Set during product creation/edit
- **Alert**: Yellow badge when stock ≤ threshold
- **Dashboard**: Count shown on main dashboard

---

## 📋 Quick Actions

### Bulk Operations
- ✅ Select multiple products (checkbox)
- ✅ Bulk delete (future enhancement)
- ✅ Bulk restock (future enhancement)
- ✅ Bulk export (current feature)

### Keyboard Shortcuts
- `Ctrl + F` or `/`: Focus search
- `Esc`: Close dialogs
- `Arrow Keys`: Navigate pages
- `Enter`: Confirm actions

### Context Menus
- **Right-click on product row**:
  - Edit
  - Delete
  - Restock
  - View Details

---

## 🎨 UI/UX Features

### Professional Design
- ✅ Clean, modern interface
- ✅ Dark mode support
- ✅ Consistent color scheme (gold theme)
- ✅ Smooth animations
- ✅ Responsive layouts

### Loading States
- **Initial Load**: Branded loader with message
- **Actions**: Button loading spinners
- **Skeleton**: Shimmer effects (if enabled)

### Empty States
- **No Products**: Friendly message with "Add Product" CTA
- **No Search Results**: "No products found" with clear filters button
- **No Category**: Prompt to create first category

### Error Handling
- **Network Errors**: Clear error messages
- **Validation Errors**: Field-level error displays
- **Retry Options**: Reload button on failures

---

## 🔧 Technical Specifications

### Data Fetching
- **API Endpoint**: `/api/items`
- **Method**: GET
- **Refresh**: On mount, focus, after mutations
- **Cache**: Timestamp-based cache busting

### State Management
- **React Hooks**: useState for local state
- **Effect Hooks**: useEffect for side effects
- **Persistence**: localStorage for preferences

### Performance
- **Pagination**: Only render visible items
- **Lazy Loading**: Images load on-demand
- **Debouncing**: Search input debounced
- **Memoization**: Expensive calculations cached

---

## 📊 Data Flow

```
User Action → API Call → Database Update → Fetch Latest Data → Update UI → Show Toast
```

### Example: Adding a Product
1. User clicks "Add Product"
2. Dialog opens with form
3. User fills in details
4. Clicks "Save"
5. POST to `/api/items`
6. Database inserts record
7. Success response received
8. Fetch updated items list
9. Table refreshes with new product
10. Success toast shown

---

## 🚨 Validations

### Product Form
- ✅ Name: Required, min 2 characters
- ✅ Category: Required, must exist
- ✅ Cost Price: Required, > 0
- ✅ Selling Price: Required, > cost price
- ✅ Quantity: Required, ≥ 0
- ✅ Reorder Level: Required, ≥ 0
- ✅ Image: Optional, max 5MB

### Bundle Form
- ✅ Bundle Name: Required
- ✅ Items: At least 1 item required
- ✅ Quantities: All > 0
- ✅ Stock Check: All items must be in stock

---

## 💡 Best Practices

### For Admin Users
1. **Set Reorder Levels**: Always configure low stock thresholds
2. **Categorize Products**: Use categories for better organization
3. **Regular Audits**: Export reports monthly for analysis
4. **Image Quality**: Use high-quality product images
5. **Price Updates**: Keep cost/selling prices up-to-date

### For Operations Users
1. **Channel Focus**: Filter by your assigned channel
2. **Stock Monitoring**: Check low stock items daily
3. **Restock Promptly**: Restock items before they hit zero
4. **Accurate Data**: Double-check entries before saving

---

## 🔮 Future Enhancements (Roadmap)

### Planned Features
- [ ] Barcode scanning for quick add
- [ ] Bulk import from CSV/Excel
- [ ] Product variants (size, color)
- [ ] Multi-warehouse management
- [ ] Stock transfer between stores
- [ ] Product history timeline
- [ ] Advanced analytics dashboard
- [ ] Price history tracking
- [ ] Automated reorder suggestions
- [ ] Integration with suppliers

---

## 📞 Support & Help

### Common Issues

**Q: Product not showing up?**  
A: Check filters - may be filtered out by category or stock status.

**Q: Cannot delete product?**  
A: Check if product is used in active orders. Admin permission required.

**Q: Export not working?**  
A: Excel export is admin-only feature. Check user role.

**Q: Column widths reset?**  
A: Clear browser cache to reset. Otherwise widths are saved per browser.

---

## ✅ Feature Checklist

### Product Management
- [x] Add product
- [x] Edit product
- [x] Delete product
- [x] View product details
- [x] Product images
- [x] SKU management

### Bundle Management
- [x] Create bundle
- [x] Edit bundle
- [x] Delete bundle
- [x] View bundle components
- [x] Bundle pricing

### Search & Filter
- [x] Search by name/category/SKU
- [x] Filter by product type
- [x] Filter by category
- [x] Filter by stock status
- [x] Sort by multiple fields

### Stock Management
- [x] Restock items
- [x] Stock status badges
- [x] Low stock alerts
- [x] Out of stock indicators
- [x] Reorder level setting

### Data Management
- [x] Category CRUD
- [x] Store CRUD
- [x] Export to Excel
- [x] Export to PDF
- [x] Pagination

### UX Features
- [x] Resizable columns
- [x] Responsive design
- [x] Dark mode
- [x] Loading states
- [x] Toast notifications
- [x] Role-based access

---

## 📈 Statistics

- **Total Features**: 15+ major features
- **Sub-features**: 50+ capabilities
- **CRUD Operations**: 12 different types
- **Export Formats**: 2 (Excel, PDF)
- **User Roles**: 2 (Admin, Operations)
- **Filter Options**: 10+ combinations
- **Sort Options**: 6 different sorts

---

**Version**: v2.1.0+  
**Last Updated**: June 21, 2026  
**Status**: Production Ready ✅  
**Page Location**: `/dashboard/inventory`  
**File**: `app/dashboard/inventory/page.tsx`

---

**Created By**: Kiro AI Assistant  
**Documentation Type**: Complete Feature Guide  
**Purpose**: User Reference & Training Material
