# 🔧 SUPABASE FIX REQUIRED

Kailangan mong i-run ang 2 SQL scripts sa Supabase Dashboard para maayos ang:
1. ✅ **Image Upload** - "Bucket not found" error
2. ✅ **Duplicate Products** - "Product already exists" constraint error

---

## 📋 STEP-BY-STEP INSTRUCTIONS

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Login and select your project
3. Click **"SQL Editor"** sa left sidebar

---

## 🖼️ FIX #1: Create Storage Bucket for Product Images

### Run This Script First:
```sql
-- =============================================================================
-- CREATE STORAGE BUCKET FOR PRODUCT IMAGES
-- =============================================================================

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public read access (anyone can view images)
CREATE POLICY "Public Access - Product Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- 3. Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- 4. Allow authenticated users to update
CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE
USING ( 
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- 5. Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
USING ( 
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- Verify
SELECT * FROM storage.buckets WHERE id = 'product-images';
```

### ✅ Expected Result:
- You should see: `Success. No rows returned`
- Go to **Storage** section in Supabase
- You should see `product-images` bucket listed

---

## 📦 FIX #2: Remove Duplicate Product Name Constraint

### Run This Script Second:
```sql
-- =============================================================================
-- ALLOW DUPLICATE PRODUCT NAMES (for variants with different COGS/prices)
-- =============================================================================

-- Drop all unique constraints on product name
ALTER TABLE inventory 
DROP CONSTRAINT IF EXISTS inventory_name_store_channel_unique;

ALTER TABLE inventory 
DROP CONSTRAINT IF EXISTS inventory_name_key;

ALTER TABLE inventory 
DROP CONSTRAINT IF EXISTS inventory_name_store_key;

ALTER TABLE inventory 
DROP CONSTRAINT IF EXISTS inventory_unique_name;

-- Verify all constraints removed
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'inventory'::regclass 
  AND contype = 'u'
  AND pg_get_constraintdef(oid) LIKE '%name%';
```

### ✅ Expected Result:
- You should see: `Success. No rows returned`
- The verification query should return **0 rows** (no name-based unique constraints)

---

## 🎯 TEST IF IT WORKS

### After running BOTH scripts:

1. **Test Image Upload:**
   - Go to your app → Add Product
   - Try uploading an image
   - Should work without "Bucket not found" error

2. **Test Duplicate Products:**
   - Try adding a product with the same name but different COGS/price
   - Example:
     - Product 1: "LIPOCOLLA" - COGS: 120, Price: 599
     - Product 2: "LIPOCOLLA" - COGS: 150, Price: 650 (variant)
   - Should work without constraint error

---

## ⚠️ TROUBLESHOOTING

### If Image Upload Still Fails:
1. Check if bucket exists:
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'product-images';
   ```
2. Check policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%product%';
   ```

### If Duplicate Error Still Appears:
1. Check remaining constraints:
   ```sql
   SELECT conname, pg_get_constraintdef(oid) 
   FROM pg_constraint 
   WHERE conrelid = 'inventory'::regclass AND contype = 'u';
   ```
2. Manually drop any constraint with 'name' in it

---

## 📝 QUICK COPY-PASTE

Copy mo lang yung buong script sa bawat FIX, paste sa SQL Editor, then click **"Run"**.

**FIX #1**: See `CREATE_STORAGE_BUCKET.sql`
**FIX #2**: See `FIX_DUPLICATE_PRODUCT_CONSTRAINT.sql`

---

## ✅ CHECKLIST

- [ ] Run FIX #1 (Storage Bucket)
- [ ] Verify bucket exists in Storage section
- [ ] Run FIX #2 (Remove Constraint)
- [ ] Verify no name constraints remain
- [ ] Test image upload
- [ ] Test adding duplicate product names with different prices

---

**Need help?** Send me a screenshot of the error if the scripts don't work.
