import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/orders - Get orders with optional status filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    console.log('[Orders API] Fetching orders with filters:', { status, startDate, endDate })
    
    let query = supabaseAdmin
      .from('orders')
      .select('*')
      .is('deleted_at', null)
    
    // Filter by date range if provided
    if (startDate) {
      query = query.gte('created_at', startDate)
      console.log('[Orders API] 📅 Filtering from (created_at):', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
      console.log('[Orders API] 📅 Filtering to (created_at):', endDate)
    }
    
    // Filter by status if provided
    if (status) {
      if (status === 'Dispatched') {
        query = query.eq('status', 'Dispatched')
      } else if (status === 'Shipped') {
        query = query.in('status', ['Shipped', 'Delivered'])
      }
    }
    
    // Sort by created_at (latest first)
    query = query.order('created_at', { ascending: false })
    
    const { data, error } = await query
    
    console.log('[Orders API] 📊 Query Results:')
    console.log('[Orders API] Total orders returned:', data?.length || 0)
    
    if (error) {
      console.error('[API] Error fetching orders:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('[API] Error in GET /api/orders:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch orders',
      details: error.toString()
    }, { status: 500 })
  }
}

// POST /api/orders - Create new order with IMMEDIATE inventory deduction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      date,
      qty,
      cogs,
      total,
      product,
      dispatchedBy,
      notes,
      orderItems = []
    } = body
    
    // Validate required fields (simplified - no more store, channel, customer info)
    if (!date || !qty || !cogs || !total || !product || !dispatchedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Generate order ID
    const orderId = `ORD-${Date.now()}`
    
    // Get current Manila time for created_at
    const now = new Date()
    const manilaTimeString = now.toLocaleString('en-US', { 
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    
    // Convert "MM/DD/YYYY, HH:mm:ss" to "YYYY-MM-DD HH:mm:ss"
    const [datePart, timePart] = manilaTimeString.split(', ')
    const [month, day, year] = datePart.split('/')
    const createdAt = `${year}-${month}-${day} ${timePart}`
    
    // ============================================
    // AUTO INVENTORY DEDUCTION ON DISPATCH
    // ============================================
    console.log('[POS API] 🔥 AUTO DEDUCTING INVENTORY ON DISPATCH')
    console.log('[POS API] Order Items:', orderItems)
    
    // Process each item in the order
    if (orderItems && orderItems.length > 0) {
      for (const orderItem of orderItems) {
        const { itemId, itemName, quantity } = orderItem
        
        console.log('[POS API] Processing item:', { itemId, itemName, quantity })
        
        // Try to find inventory item by ID first (more reliable)
        let { data: inventoryItemById, error: idError } = await supabaseAdmin
          .from('inventory')
          .select('quantity, name, id')
          .eq('id', itemId)
          .maybeSingle()
        
        let inventoryItem = inventoryItemById
        let inventoryError = idError
        
        // If ID lookup fails, try by name
        if (!inventoryItem) {
          console.log('[POS API] ID lookup failed, trying name lookup for:', itemName)
          
          // First, let's see what items exist (for debugging)
          const { data: allItems } = await supabaseAdmin
            .from('inventory')
            .select('id, name')
            .limit(10)
          console.log('[POS API] Sample inventory items in DB:', allItems)
          
          // Try exact match (get first result if multiple exist)
          const { data: exactMatches, error: exactError } = await supabaseAdmin
            .from('inventory')
            .select('quantity, name, id')
            .eq('name', itemName)
            .limit(1)
          
          console.log('[POS API] Exact match query:', { itemName, exactMatches, exactError })
          
          if (exactMatches && exactMatches.length > 0) {
            inventoryItem = exactMatches[0]
            inventoryError = null
            console.log('[POS API] Found exact match:', inventoryItem.name)
          } else {
            // Try case-insensitive match with ILIKE
            const ilikePattern = `%${itemName}%`
            const { data: items, error: ilikeError } = await supabaseAdmin
              .from('inventory')
              .select('quantity, name, id')
              .ilike('name', ilikePattern)
              .limit(1)
            
            console.log('[POS API] ILIKE match query:', { ilikePattern, items, ilikeError })
            
            if (items && items.length > 0) {
              inventoryItem = items[0]
              inventoryError = null
              console.log('[POS API] Found case-insensitive match:', inventoryItem.name)
            }
          }
        }
        
        if (inventoryError || !inventoryItem) {
          console.error('[POS API] ❌ Inventory item not found:', {
            itemId,
            itemName,
            error: inventoryError?.message
          })
          return NextResponse.json({ 
            error: `Inventory item not found: ${itemName}`,
            details: 'Cannot dispatch order - product not found in inventory'
          }, { status: 404 })
        }
        
        // Check if enough stock available
        if (inventoryItem.quantity < quantity) {
          console.error('[POS API] ❌ Insufficient stock:', {
            product: inventoryItem.name,
            available: inventoryItem.quantity,
            requested: quantity
          })
          return NextResponse.json({ 
            error: `Insufficient stock for ${inventoryItem.name}`,
            details: `Available: ${inventoryItem.quantity}, Requested: ${quantity}`
          }, { status: 400 })
        }
        
        const newQuantity = inventoryItem.quantity - quantity
        
        console.log('[POS API] Updating inventory:', {
          product: inventoryItem.name,
          currentQty: inventoryItem.quantity,
          orderQty: quantity,
          newQty: newQuantity
        })
        
        const { error: updateError } = await supabaseAdmin
          .from('inventory')
          .update({ 
            quantity: newQuantity,
            last_updated: createdAt
          })
          .eq('id', inventoryItem.id)
        
        if (updateError) {
          console.error('[POS API] ❌ Error updating inventory:', updateError)
          return NextResponse.json({ 
            error: 'Failed to update inventory',
            details: updateError.message 
          }, { status: 500 })
        }
        
        console.log(`[POS API] ✅ Inventory deducted: ${inventoryItem.name} -${quantity} (New: ${newQuantity})`)
      }
    } else {
      // Fallback: old method using product string (for backwards compatibility)
      console.log('[POS API] No orderItems array, using fallback method with product string')
      
      // Clean product name (remove quantity suffix like "(1)")
      const cleanProductName = product.replace(/\s*\(\d+\)\s*$/, '').trim()
      
      console.log('[POS API] Attempting to deduct inventory:', {
        originalProduct: product,
        cleanProductName,
        quantity: qty
      })
      
      // Try exact match first (by name only - no store/channel)
      const { data: exactMatches } = await supabaseAdmin
        .from('inventory')
        .select('quantity, name, id')
        .eq('name', cleanProductName)
        .limit(1)
      
      let inventoryItem = null
      let inventoryError = null
      
      if (exactMatches && exactMatches.length > 0) {
        inventoryItem = exactMatches[0]
        console.log('[POS API] Found exact match:', inventoryItem.name)
      } else {
        // Try case-insensitive match
        console.log('[POS API] Exact match failed, trying case-insensitive match...')
        const { data: items } = await supabaseAdmin
          .from('inventory')
          .select('quantity, name, id')
          .ilike('name', cleanProductName)
          .limit(1)
        
        if (items && items.length > 0) {
          inventoryItem = items[0]
          console.log('[POS API] Found case-insensitive match:', inventoryItem.name)
        } else {
          inventoryError = { message: 'No matching inventory item found' }
        }
      }
      
      if (inventoryError) {
        console.error('[POS API] ❌ Inventory item not found:', {
          searchedFor: cleanProductName,
          error: inventoryError.message
        })
        return NextResponse.json({ 
          error: `Inventory item not found: ${cleanProductName}`,
          details: 'Cannot dispatch order - product not found in inventory'
        }, { status: 404 })
      }
      
      if (inventoryItem) {
        // Check if enough stock available
        if (inventoryItem.quantity < qty) {
          console.error('[POS API] ❌ Insufficient stock:', {
            product: inventoryItem.name,
            available: inventoryItem.quantity,
            requested: qty
          })
          return NextResponse.json({ 
            error: `Insufficient stock for ${inventoryItem.name}`,
            details: `Available: ${inventoryItem.quantity}, Requested: ${qty}`
          }, { status: 400 })
        }
        
        const newQuantity = inventoryItem.quantity - qty
        
        console.log('[POS API] Updating inventory:', {
          product: inventoryItem.name,
          currentQty: inventoryItem.quantity,
          orderQty: qty,
          newQty: newQuantity
        })
        
        const { error: updateError } = await supabaseAdmin
          .from('inventory')
          .update({ 
            quantity: newQuantity,
            last_updated: createdAt
          })
          .eq('id', inventoryItem.id)
        
        if (updateError) {
          console.error('[POS API] ❌ Error updating inventory:', updateError)
          return NextResponse.json({ 
            error: 'Failed to update inventory',
            details: updateError.message 
          }, { status: 500 })
        }
        
        console.log(`[POS API] ✅ Inventory deducted: ${inventoryItem.name} -${qty} (New: ${newQuantity})`)
      }
    }
    
    // Insert order with status 'Dispatched' (not Pending)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        id: orderId,
        date: createdAt, // Use dispatch time as sale date
        qty,
        cogs,
        total,
        product,
        status: 'Dispatched', // AUTO-DISPATCHED
        dispatched_by: dispatchedBy,
        notes: notes || null,
        created_at: createdAt,
        updated_at: createdAt
      })
      .select()
      .single()
    
    if (orderError) {
      console.error('[API] Error creating order:', orderError)
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }
    
    // Log the dispatch action as "sale"
    try {
      const { addLog } = await import('@/lib/supabase-db')
      await addLog({
        operation: 'sale',
        itemName: product,
        details: `Order dispatched by ${dispatchedBy}. Qty: ${qty}, Total: ₱${total.toLocaleString()}. Inventory auto-deducted: -${qty}`
      })
    } catch (logError) {
      console.error('[API] Error logging sale:', logError)
      // Don't fail the request if logging fails
    }
    
    return NextResponse.json(order, { status: 201 })
  } catch (error: any) {
    console.error('[API] Error in POST /api/orders:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to create order',
      details: error.toString()
    }, { status: 500 })
  }
}
