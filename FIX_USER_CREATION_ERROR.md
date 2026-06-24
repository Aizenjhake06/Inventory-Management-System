# Fix User Creation Error - Missing assigned_channel Column

## Error
```
Failed to add account: Could not find the 'assigned_channel' column of 'users' in the schema cache
```

## Root Cause
The `users` table in Supabase is missing the `assigned_channel` column. The code is trying to insert this column (line 736 in `lib/supabase-db.ts`), but the database schema doesn't have it.

## Solution

### Step 1: Run the SQL Migration
Open the file `ADD_ASSIGNED_CHANNEL_TO_USERS.sql` and run it in your Supabase SQL Editor:

```sql
-- Add assigned_channel column to users table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'assigned_channel'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN assigned_channel TEXT;
    
    RAISE NOTICE 'Column assigned_channel added to users table';
  ELSE
    RAISE NOTICE 'Column assigned_channel already exists in users table';
  END IF;
END $$;
```

### Step 2: Verify the Column Was Added
Run this query to verify:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name = 'assigned_channel';
```

Expected result:
```
column_name       | data_type | is_nullable
assigned_channel  | text      | YES
```

### Step 3: Refresh Schema Cache (IMPORTANT!)
After adding the column, you MUST refresh the Supabase schema cache. Run this in Supabase SQL Editor:

```sql
NOTIFY pgrst, 'reload schema';
```

Or simply wait 30-60 seconds for the cache to automatically refresh.

### Step 4: Try Creating the User Again
Go back to Admin → Settings → Users tab and try creating the "Logistics Admin" user again.

## What This Column Is Used For

The `assigned_channel` column is used to assign users to specific sales channels:
- **Logistics Admin**: Can be assigned to manage specific sales channels (Shopee, Lazada, Facebook, TikTok, Physical Store)
- **Team Leaders**: Already use this column to be assigned to specific channels
- **Admin**: Don't need this column (can access all channels)

## Code Reference

In `lib/supabase-db.ts` (line 736):
```typescript
const { data, error } = await supabaseAdmin
  .from('users')
  .insert({
    id,
    username: account.username,
    password: hashedPassword,
    role: account.role,
    display_name: account.displayName,
    assigned_channel: account.assignedChannel || null, // ← This column must exist!
    profile_image: account.profileImage || null,
    created_at: createdAt,
  })
```

## Expected Users Table Schema

After running the migration, your `users` table should have these columns:
- `id` (TEXT, PRIMARY KEY)
- `username` (TEXT, UNIQUE, NOT NULL)
- `password` (TEXT, NOT NULL)
- `role` (TEXT, NOT NULL)
- `display_name` (TEXT)
- `email` (TEXT)
- `phone` (TEXT)
- `profile_image` (TEXT)
- **`assigned_channel` (TEXT)** ← NEW COLUMN
- `created_at` (TIMESTAMP WITH TIME ZONE)

## Testing
After running the migration and refreshing the schema cache:
1. ✅ Create a new Logistics Admin user with username "logistic2", display name "Jen"
2. ✅ Profile image should upload successfully
3. ✅ User should be created without errors
4. ✅ User should appear in the Users list
