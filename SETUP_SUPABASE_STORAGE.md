# Setup Supabase Storage for Product Images

## Error: "Bucket not found"

This error occurs because the Supabase Storage bucket hasn't been created yet.

## Step-by-Step Setup

### 1. Go to Supabase Dashboard
- Open: https://supabase.com/dashboard
- Select your project

### 2. Navigate to Storage
- Click on **"Storage"** in the left sidebar
- You'll see the Storage page

### 3. Create the Bucket
1. Click the **"New bucket"** button
2. **Bucket Name:** `product-images` (EXACTLY this name - it's hardcoded in the API)
3. **Public bucket:** ✅ **ENABLE** (check the box)
   - This allows images to be viewed without authentication
4. Click **"Create bucket"**

### 4. Verify Bucket Settings
After creating the bucket:
- Click on the `product-images` bucket
- Go to **"Policies"** tab
- You should see policies for:
  - ✅ **SELECT** (read access) - PUBLIC
  - ✅ **INSERT** (upload) - Service role only
  - ✅ **DELETE** (remove) - Service role only

### 5. Test Image Upload
1. Go to your Inventory page
2. Click **"Add Product"**
3. Try uploading an image
4. It should work now! ✅

## Storage Structure

Images will be stored in this structure:
```
product-images/
  └── products/
      ├── ITEM-123456789-1234567890.webp
      ├── ITEM-987654321-0987654321.webp
      └── ...
```

## Image URL Format

Public URLs will look like:
```
https://[your-project-id].supabase.co/storage/v1/object/public/product-images/products/[filename].webp
```

## Troubleshooting

### If you still get "Bucket not found":
1. Make sure bucket name is EXACTLY `product-images` (no spaces, no caps)
2. Refresh your page
3. Check browser console for detailed error

### If images upload but don't display:
1. Make sure bucket is **PUBLIC**
2. Check if the URL is accessible (copy-paste into browser)
3. Verify CORS settings in Supabase (should be automatic)

## Image Specifications

- **Max Size:** 300KB (auto-compressed)
- **Max Dimensions:** 800x800px
- **Formats:** JPG, PNG, WebP
- **Output Format:** WebP (best compression)

---

✅ **Done!** Your product image upload should now work perfectly.
