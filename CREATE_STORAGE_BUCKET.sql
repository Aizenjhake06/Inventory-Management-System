-- =============================================================================
-- CREATE SUPABASE STORAGE BUCKET FOR PRODUCT IMAGES
-- =============================================================================
-- Run this in your Supabase SQL Editor to create the storage bucket
-- =============================================================================

-- 1. Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,  -- Public bucket so images are accessible
  2097152,  -- 2MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create storage policy for public read access (anyone can view images)
CREATE POLICY "Public Access - Product Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- 3. Create storage policy for authenticated users to upload (logged in users only)
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- 4. Create storage policy for authenticated users to update (logged in users only)
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

-- 5. Create storage policy for authenticated users to delete (logged in users only)
CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
USING ( 
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================
-- Run this to verify the bucket was created:
SELECT * FROM storage.buckets WHERE id = 'product-images';

-- =============================================================================
-- INSTRUCTIONS:
-- =============================================================================
-- 1. Go to your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project
-- 3. Go to SQL Editor
-- 4. Copy and paste this entire script
-- 5. Click "Run" to execute
-- 6. You should see "Success. No rows returned" message
-- 7. Go to Storage section to verify the bucket exists
-- =============================================================================
