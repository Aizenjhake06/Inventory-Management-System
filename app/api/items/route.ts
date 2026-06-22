import { type NextRequest, NextResponse } from "next/server"
// Using Supabase as primary database
import { getInventoryItems, addInventoryItem, addLog } from "@/lib/supabase-db"
import { getCachedData, invalidateCachePattern } from "@/lib/cache"
import { withAuth, withAdmin, withRoles } from "@/lib/api-helpers"

// GET - Requires authentication (any role)
export const GET = withAuth(async (request, { user }) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")

    let items
    try {
      const hasTimestamp = searchParams.get("t")
      
      if (hasTimestamp) {
        // Bypass cache entirely when timestamp is present (for fresh data after create/delete)
        items = await getInventoryItems()
      } else {
        // Use cache for normal requests
        items = await getCachedData(
          'inventory-items-with-bundles',
          () => getInventoryItems(),
          2 * 60 * 1000 // 2 minutes cache
        )
      }
    } catch (dbError) {
      console.error("[API] Database error fetching items (returning empty list):", dbError)
      return NextResponse.json([])
    }

    // Products are universal - all roles can see all products (including bundles)
    // No department/channel filtering needed

    if (search) {
      const searchLower = search.toLowerCase()
      const filtered = items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower),
      )
      return NextResponse.json(filtered)
    }

    return NextResponse.json(items)
  } catch (error) {
    console.error("[API] Error fetching items:", error)
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 })
  }
})

// POST - Requires admin, operations, or logistics-admin role
export const POST = withRoles(['admin', 'operations', 'logistics-admin', 'dept-manager'], async (request, { user }) => {
  try {
    const body = await request.json()
    console.log('[Items API POST] body:', JSON.stringify(body))
    
    // Allow duplicate names, but block exact duplicates (name + COGS + price all match)
    let existingItems: any[] = []
    try { existingItems = await getInventoryItems() } catch { /* allow create if fetch fails */ }
    
    const bodyName = (body.name || '').toString().toLowerCase().trim()
    const bodyCost = Number(body.costPrice) || 0
    const bodyPrice = Number(body.sellingPrice) || 0
    
    const exactDuplicate = bodyName ? existingItems.find(item => {
      const itemName = (item.name || '').toString().toLowerCase().trim()
      const itemCost = Number(item.costPrice) || 0
      const itemPrice = Number(item.sellingPrice) || 0
      
      return itemName === bodyName && itemCost === bodyCost && itemPrice === bodyPrice
    }) : null
    
    if (exactDuplicate) {
      return NextResponse.json({ 
        error: `Product "${body.name}" with COGS ₱${bodyCost.toFixed(2)} and price ₱${bodyPrice.toFixed(2)} already exists. Change the COGS or price to create a variant.`,
        existingProduct: {
          id: exactDuplicate.id,
          name: exactDuplicate.name,
          quantity: exactDuplicate.quantity,
          costPrice: exactDuplicate.costPrice,
          sellingPrice: exactDuplicate.sellingPrice
        }
      }, { status: 409 })
    }
    
    try {
      const item = await addInventoryItem(body)
      
      // Invalidate cache after creating new item
      invalidateCachePattern('inventory')    
      
      // Log creation (don't fail the request if logging fails)
      try {
        await addLog({
          operation: "create",
          itemId: item.id,
          itemName: item.name,
          details: `Added "${item.name}" by ${user.displayName} - Qty: ${item.quantity}, Cost: ₱${item.costPrice.toFixed(2)}, Sell: ₱${item.sellingPrice.toFixed(2)}`
        })
      } catch (logError) {
        console.error('[Items API] Failed to log item creation (non-fatal):', logError)
      }
      
      return NextResponse.json(item)
    } catch (dbError: any) {
      // Handle unique constraint violation from database
      if (dbError.message?.includes('inventory_name_store_channel_unique') || 
          dbError.message?.includes('duplicate key') ||
          dbError.code === '23505') {
        return NextResponse.json({ 
          error: `Database constraint error: A product with this name already exists in this store/channel. Please contact administrator to update database schema to allow product variants.`,
          details: 'The database has a unique constraint preventing duplicate product names. This needs to be removed to support product variants with different COGS/prices.'
        }, { status: 409 })
      }
      throw dbError
    }
  } catch (error) {
    console.error("[API] Error creating item:", error)
    return NextResponse.json({ error: "Failed to create item", details: String(error) }, { status: 500 })
  }
})
