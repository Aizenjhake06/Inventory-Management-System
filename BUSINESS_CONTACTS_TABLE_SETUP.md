# Business Contacts Table Setup

## Problem
The business contacts page is showing an error because the `business_contacts` table doesn't exist in the database.

## Solution
Run the SQL script to create the table with proper structure and permissions.

## Steps to Fix

### 1. Run the SQL Script
Execute the `CREATE_BUSINESS_CONTACTS_TABLE.sql` file in your Supabase SQL Editor:

1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `CREATE_BUSINESS_CONTACTS_TABLE.sql`
4. Click "Run" to execute

### 2. What the Script Does
- ✅ Creates `business_contacts` table with all required columns
- ✅ Sets up indexes for faster queries
- ✅ Enables Row Level Security (RLS)
- ✅ Creates policies for admin and logistics-admin roles
- ✅ Adds trigger for `updated_at` timestamp
- ✅ Inserts 3 sample records for testing

### 3. Table Structure
```sql
business_contacts:
- id (UUID, Primary Key)
- name (TEXT, NOT NULL) - Main contact/company name
- company_name (TEXT, NULLABLE)
- contact_person (TEXT, NULLABLE)
- contact_type (TEXT, NOT NULL) - 'supplier', 'distributor', or 'reseller'
- position (TEXT, NULLABLE)
- email (TEXT, NULLABLE)
- phone (TEXT, NULLABLE)
- address (TEXT, NULLABLE)
- notes (TEXT, NULLABLE)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### 4. Permissions
- **Admin**: Full access (view, create, update, delete)
- **Logistics-admin**: Full access (view, create, update, delete)

### 5. After Running the Script
The business contacts page should work immediately for both admin and logistics-admin accounts.

## Files Involved
- `CREATE_BUSINESS_CONTACTS_TABLE.sql` - SQL migration script
- `lib/business-contacts.ts` - Business logic (already correct)
- `app/api/business-contacts/route.ts` - API endpoints (already correct)
- `app/logistics/business-contacts/page.tsx` - Logistics UI page
- `app/admin/business-contacts/page.tsx` - Admin UI page (if exists)

## Verification
After running the script:
1. Login as logistics-admin
2. Click "Business Contacts" tab
3. You should see the 3 sample contacts
4. Try adding a new contact to test
