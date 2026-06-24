# Remove assigned_channel from User Creation

## Problem
When creating a new Logistics Admin user, the system was trying to insert `assigned_channel` column which doesn't exist in the Supabase users table (because we removed the old operations/department system).

Error:
```
Failed to add account: Could not find the 'assigned_channel' column of 'users' in the schema cache
```

## Root Cause
The `assigned_channel` column was used for the old operations/department system that we deleted. Now we only have 2 account types:
- **admin** - Full access
- **logistics-admin** - Limited access

We don't need `assigned_channel` anymore for these 2 roles.

## Solution

### Changes Made in `lib/supabase-db.ts`

#### 1. Removed `assigned_channel` from INSERT statement (line 732-741)

**Before:**
```typescript
const { data, error } = await supabaseAdmin
  .from('users')
  .insert({
    id,
    username: account.username,
    password: hashedPassword,
    role: account.role,
    display_name: account.displayName,
    assigned_channel: account.assignedChannel || null, // ❌ Column doesn't exist!
    profile_image: account.profileImage || null,
    created_at: createdAt,
  })
```

**After:**
```typescript
const { data, error } = await supabaseAdmin
  .from('users')
  .insert({
    id,
    username: account.username,
    password: hashedPassword,
    role: account.role,
    display_name: account.displayName,
    profile_image: account.profileImage || null,  // ✅ Only essential columns
    created_at: createdAt,
  })
```

#### 2. Removed `assignedChannel` from return value (line 750-758)

**Before:**
```typescript
return {
  id,
  username: account.username,
  password: hashedPassword,
  role: account.role,
  assignedChannel: account.assignedChannel,  // ❌ Not needed anymore
  displayName: account.displayName,
  profileImage: account.profileImage,
  createdAt,
}
```

**After:**
```typescript
return {
  id,
  username: account.username,
  password: hashedPassword,
  role: account.role,
  displayName: account.displayName,
  profileImage: account.profileImage,  // ✅ Only essential fields
  createdAt,
}
```

## Note About Existing Code

The `assignedChannel` field is still present in many other parts of the codebase:
- `Account` interface (optional field)
- localStorage operations
- API auth headers
- Navbar logos (for old operations role)

**This is OK** because:
1. It's marked as **optional** (`assignedChannel?:`)
2. Old code won't break
3. New admin/logistics-admin users simply won't use it
4. It will be `undefined` or `null` for new users

## Testing

After this fix, you should be able to:
1. ✅ Create new Logistics Admin users without errors
2. ✅ Upload profile images
3. ✅ User appears in the Users list
4. ✅ Login works correctly
5. ✅ No database schema errors

## Current Users Table Schema

Your `users` table should have these columns:
- ✅ `id` (TEXT, PRIMARY KEY)
- ✅ `username` (TEXT, UNIQUE, NOT NULL)
- ✅ `password` (TEXT, NOT NULL)
- ✅ `role` (TEXT, NOT NULL)
- ✅ `display_name` (TEXT)
- ✅ `email` (TEXT)
- ✅ `phone` (TEXT)
- ✅ `profile_image` (TEXT) - check if this exists!
- ✅ `created_at` (TIMESTAMP WITH TIME ZONE)

**Note:** If `profile_image` column is also missing, you'll need to add it. But let's test user creation first to see if that's an issue.

## Try Creating User Again

Go to Admin → Settings → Users tab and try creating the "Jen" (logistic2) user again. It should work now! 🎉
