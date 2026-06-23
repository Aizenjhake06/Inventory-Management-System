import { type NextRequest, NextResponse } from "next/server"
import { getStores, addStore, addLog } from "@/lib/supabase-db"
import { getCachedData, invalidateCachePattern } from "@/lib/cache"
import { withAuth, withAdmin, withRoles } from "@/lib/api-helpers"

export const GET = withAuth(async (request, { user }) => {
  try {
    const stores = await getCachedData(
      'stores',
      () => getStores(),
      5 * 60 * 1000 // 5 minutes
    )

    // DEPARTMENT FILTERING: Operations users only see their department's stores
    // Admin and logistics-admin see all stores
    let filteredStores = stores
    if (user.role === 'operations' && user.assignedChannel) {
      filteredStores = stores.filter(store => store.sales_channel === user.assignedChannel)
    }

    return NextResponse.json(filteredStores)
  } catch (error) {
    console.error("[API] Error fetching stores:", error)
    return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 })
  }
})

export const POST = withRoles(['admin', 'operations', 'dept-manager'], async (request, { user }) => {
  try {
    const { store_name, sales_channel } = await request.json()
    
    if (!store_name || typeof store_name !== 'string' || store_name.trim().length === 0) {
      return NextResponse.json({ error: "Store name is required" }, { status: 400 })
    }

    if (!sales_channel || typeof sales_channel !== 'string' || sales_channel.trim().length === 0) {
      return NextResponse.json({ error: "Sales channel is required" }, { status: 400 })
    }

    const store = await addStore(store_name.trim(), sales_channel.trim())
    invalidateCachePattern('stores')
    
    await addLog({
      operation: "create",
      itemId: store.id,
      itemName: `${store_name.trim()} (${sales_channel})`,
      details: `Created store "${store_name.trim()}" under ${sales_channel} by ${user.displayName}`
    })
    
    return NextResponse.json(store)
  } catch (error) {
    console.error("[API] Error adding store:", error)
    return NextResponse.json({ error: "Failed to add store" }, { status: 500 })
  }
})
