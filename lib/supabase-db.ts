/**
 * Supabase Database Layer
 * 
 * This file provides database functions using Supabase as the backend.
 * All functions return the same data structures for seamless migration.
 */

import { supabaseAdmin } from './supabase'
import type { InventoryItem, Transaction, Log, Restock, Store } from './types'

// ==================== HELPER FUNCTIONS ====================

const formatTimestamp = (date: Date = new Date()) => {
  // Store in ISO format with Manila timezone offset
  // This ensures consistent storage and proper timezone handling
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }
  const formatted = date.toLocaleString('sv-SE', options) // sv-SE gives YYYY-MM-DD HH:MM:SS format
  return formatted.replace(' ', 'T') // Convert to ISO-like format: YYYY-MM-DDTHH:MM:SS
}

const generateId = (prefix: string) => `${prefix}-${Date.now()}`

// ==================== INVENTORY ====================

export async function getInventoryItems(): Promise<InventoryItem[]> {
  // Fetch from inventory table (simplified - no categories, stores, or sales channels)
  const { data, error } = await supabaseAdmin
    .from('inventory')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching inventory items:', error)
    throw new Error(`Failed to fetch inventory items: ${error.message}`)
  }

  return (data || []).map(item => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    costPrice: item.cost_price,
    sellingPrice: item.selling_price,
    reorderLevel: item.reorder_level || 10,
    lastUpdated: item.last_updated,
    imageUrl: item.image_url || null,
  }))
}

export async function addInventoryItem(item: Omit<InventoryItem, "id" | "lastUpdated">): Promise<InventoryItem> {
  const id = generateId('ITEM')
  const lastUpdated = formatTimestamp()

  const { data, error} = await supabaseAdmin
    .from('inventory')
    .insert({
      id,
      name: item.name,
      quantity: item.quantity,
      cost_price: item.costPrice,
      selling_price: item.sellingPrice,
      reorder_level: item.reorderLevel || 10,
      last_updated: lastUpdated,
      image_url: (item as any).imageUrl || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding inventory item:', error)
    throw new Error(`Failed to add inventory item: ${error.message}`)
  }

  return {
    id,
    name: item.name,
    quantity: item.quantity,
    costPrice: item.costPrice,
    sellingPrice: item.sellingPrice,
    reorderLevel: item.reorderLevel || 10,
    lastUpdated,
    imageUrl: (item as any).imageUrl || null
  } as InventoryItem
}

export async function updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<void> {
  const lastUpdated = formatTimestamp()
  
  // Build update object with snake_case keys
  const updateData: any = {
    last_updated: lastUpdated
  }

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.quantity !== undefined) updateData.quantity = updates.quantity
  if (updates.costPrice !== undefined) updateData.cost_price = updates.costPrice
  if (updates.sellingPrice !== undefined) updateData.selling_price = updates.sellingPrice
  if (updates.reorderLevel !== undefined) updateData.reorder_level = updates.reorderLevel
  if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl || null

  const { error } = await supabaseAdmin
    .from('inventory')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('Error updating inventory item:', error)
    throw new Error(`Failed to update inventory item: ${error.message}`)
  }
}

export async function deleteInventoryItem(id: string): Promise<void> {
  // Delete dependent records first to avoid foreign key constraint violations
  // 1. Delete restock history referencing this item
  await supabaseAdmin.from('restocks').delete().eq('item_id', id)

  // 2. Delete transactions referencing this item (if any)
  await supabaseAdmin.from('transactions').delete().eq('item_id', id)

  // 3. Now delete the inventory item
  const { error } = await supabaseAdmin
    .from('inventory')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting inventory item:', error)
    throw new Error(`Failed to delete inventory item: ${error.message}`)
  }
}

// ==================== TRANSACTIONS ====================

export async function addTransaction(transaction: Omit<Transaction, "id" | "timestamp">): Promise<Transaction> {
  const id = generateId('TXN')
  const timestamp = formatTimestamp()

  const { data, error } = await supabaseAdmin
    .from('transactions')
    .insert({
      id,
      item_id: transaction.itemId,
      item_name: transaction.itemName,
      quantity: transaction.quantity,
      cost_price: transaction.costPrice,
      selling_price: transaction.sellingPrice,
      total_cost: transaction.totalCost,
      profit: transaction.profit,
      timestamp,
      department: transaction.department || '',
      staff_name: transaction.staffName || '',
      notes: transaction.notes || '',
      transaction_type: transaction.transactionType || 'sale',
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding transaction:', error)
    throw new Error(`Failed to add transaction: ${error.message}`)
  }

  return { ...transaction, id, timestamp }
}

export async function getTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .order('timestamp', { ascending: false })

  if (error) {
    console.error('Error fetching transactions:', error)
    throw new Error(`Failed to fetch transactions: ${error.message}`)
  }

  return (data || []).map(row => {
    const quantity = row.quantity
    const sellingPrice = row.selling_price
    const transactionType = row.transaction_type as 'sale' | 'demo' | 'internal' | 'transfer'
    const totalRevenue = transactionType === 'sale' ? quantity * sellingPrice : 0

    return {
      id: row.id,
      itemId: row.item_id,
      itemName: row.item_name,
      quantity,
      costPrice: row.cost_price,
      sellingPrice,
      totalCost: row.total_cost,
      totalRevenue,
      profit: row.profit,
      timestamp: row.timestamp,
      type: 'sale' as 'sale' | 'restock',
      transactionType,
      department: row.department,
      staffName: row.staff_name,
      notes: row.notes,
      // Transaction status tracking
      status: row.status || 'completed',
      cancellationReason: row.cancellation_reason,
      cancellation_notes: row.cancellation_notes,
      cancelledBy: row.cancelled_by,
      cancelledAt: row.cancelled_at,
      // Customer information
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      customerEmail: row.customer_email,
      customerAddress: row.customer_address,
    }
  })
}

// ==================== ORDERS ====================

export interface Order {
  id: string
  date: string
  sales_channel: string
  store: string
  courier?: string
  waybill?: string
  qty: number
  cogs: number
  total: number
  product: string
  productName?: string  // Added for display purposes
  orderNumber?: string  // Added for packer dashboard
  status: string
  parcel_status: string
  dispatched_by: string
  packed_by?: string
  packed_at?: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

export async function getOrders(salesChannel?: string): Promise<Order[]> {
  let query = supabaseAdmin
    .from('orders')
    .select('*')
    .is('deleted_at', null)
    // CRITICAL: Only include Packed orders (completed sales)
    // Pending orders are not yet sales (still in Packing Queue)
    .in('status', ['Packed', 'Shipped', 'Delivered'])
    .order('date', { ascending: false })
  
  // Filter by sales channel if provided
  if (salesChannel && salesChannel !== 'all') {
    query = query.eq('sales_channel', salesChannel)
  }
  
  const { data, error } = await query

  if (error) {
    console.error('Error fetching orders:', error)
    throw new Error(`Failed to fetch orders: ${error.message}`)
  }

  return (data || []).map(row => ({
    id: row.id,
    date: row.date,
    sales_channel: row.sales_channel,
    store: row.store,
    courier: row.courier,
    waybill: row.waybill,
    qty: row.qty,
    cogs: parseFloat(row.cogs) || 0,
    total: parseFloat(row.total) || 0,
    product: row.product,
    status: row.status,
    parcel_status: row.parcel_status,
    dispatched_by: row.dispatched_by,
    packed_by: row.packed_by,
    packed_at: row.packed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at
  }))
}

// ==================== LOGS ====================

export async function addLog(log: Omit<Log, "id" | "timestamp">): Promise<Log> {
  const id = generateId('LOG')
  // Use same timestamp format as transactions for consistency
  const timestamp = formatTimestamp()

  console.log('[addLog] Attempting to insert log:', { id, operation: log.operation, itemName: log.itemName })

  const { data, error } = await supabaseAdmin
    .from('logs')
    .insert({
      id,
      operation: log.operation,
      item_id: log.itemId || '',
      item_name: log.itemName || '',
      details: log.details,
      timestamp,
      quantity: log.quantity || 0,
    })
    .select()
    .single()

  if (error) {
    console.error('[addLog] Error adding log:', error)
    throw new Error(`Failed to add log: ${error.message}`)
  }

  console.log('[addLog] Log inserted successfully:', data)
  return { ...log, id, timestamp }
}

export async function getLogs(): Promise<Log[]> {
  const { data, error } = await supabaseAdmin
    .from('logs')
    .select('*')
    .order('timestamp', { ascending: false })

  if (error) {
    console.error('Error fetching logs:', error)
    throw new Error(`Failed to fetch logs: ${error.message}`)
  }

  return (data || []).map(row => ({
    id: row.id,
    operation: row.operation,
    itemId: row.item_id,
    itemName: row.item_name,
    details: row.details,
    timestamp: row.timestamp,
    quantity: row.quantity,
    // Transaction status tracking
    status: row.status,
    cancellationReason: row.cancellation_reason,
    cancelledBy: row.cancelled_by,
    cancelledAt: row.cancelled_at,
  }))
}

// ==================== RESTOCKS ====================

export async function addRestock(restock: Omit<Restock, "id" | "timestamp">): Promise<Restock> {
  const id = generateId('RSTK')
  const timestamp = formatTimestamp()

  const { data, error } = await supabaseAdmin
    .from('restocks')
    .insert({
      id,
      item_id: restock.itemId,
      item_name: restock.itemName,
      quantity: restock.quantity,
      cost_price: restock.costPrice,
      total_cost: restock.totalCost,
      timestamp,
      reason: restock.reason,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding restock:', error)
    throw new Error(`Failed to add restock: ${error.message}`)
  }

  return { ...restock, id, timestamp }
}

export async function getRestocks(): Promise<Restock[]> {
  const { data, error } = await supabaseAdmin
    .from('restocks')
    .select('*')
    .order('timestamp', { ascending: false })

  if (error) {
    console.error('Error fetching restocks:', error)
    throw new Error(`Failed to fetch restocks: ${error.message}`)
  }

  return (data || []).map(row => ({
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name,
    quantity: row.quantity,
    costPrice: row.cost_price,
    totalCost: row.total_cost,
    timestamp: row.timestamp,
    reason: row.reason,
  }))
}

// ==================== STORAGE ROOMS ====================

export interface StorageRoom {
  id: string
  name: string
  createdAt: string
}

// ==================== STORES ====================

export async function getStores(): Promise<Store[]> {
  const { data, error} = await supabaseAdmin
    .from('stores')
    .select('*')
    .order('sales_channel', { ascending: true })
    .order('store_name', { ascending: true })

  if (error) {
    console.error('Error fetching stores:', error)
    throw new Error(`Failed to fetch stores: ${error.message}`)
  }

  return (data || []).map(row => ({
    id: row.id,
    store_name: row.store_name,
    sales_channel: row.sales_channel,
    created_at: row.created_at,
  }))
}

export async function addStore(store_name: string, sales_channel: string): Promise<Store> {
  const id = generateId('STORE')
  const created_at = formatTimestamp()

  const { data, error } = await supabaseAdmin
    .from('stores')
    .insert({
      id,
      store_name,
      sales_channel,
      created_at,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding store:', error)
    throw new Error(`Failed to add store: ${error.message}`)
  }

  return { id, store_name, sales_channel, created_at }
}

export async function updateStore(id: string, store_name: string, sales_channel: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('stores')
    .update({ store_name, sales_channel })
    .eq('id', id)

  if (error) {
    console.error('Error updating store:', error)
    throw new Error(`Failed to update store: ${error.message}`)
  }
}

export async function deleteStore(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('stores')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting store:', error)
    throw new Error(`Failed to delete store: ${error.message}`)
  }
}

// ==================== CATEGORIES ====================

export interface Category {
  id: string
  name: string
  createdAt: string
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching categories:', error)
    throw new Error(`Failed to fetch categories: ${error.message}`)
  }

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  }))
}

export async function addCategory(name: string): Promise<Category> {
  const id = generateId('CAT')
  const createdAt = formatTimestamp()

  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert({
      id,
      name,
      created_at: createdAt,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding category:', error)
    throw new Error(`Failed to add category: ${error.message}`)
  }

  return { id, name, createdAt }
}

export async function updateCategory(id: string, name: string): Promise<void> {
  const { error} = await supabaseAdmin
    .from('categories')
    .update({ name })
    .eq('id', id)

  if (error) {
    console.error('Error updating category:', error)
    throw new Error(`Failed to update category: ${error.message}`)
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting category:', error)
    throw new Error(`Failed to delete category: ${error.message}`)
  }
}

// ==================== ACCOUNTS/USERS ====================

export interface Account {
  id: string
  username: string
  password: string
  role: 'admin' | 'operations' | 'packer' | 'logistics-admin' | 'tracker'
  displayName: string
  email?: string
  phone?: string
  assignedChannel?: string
  profileImage?: string | null  // Added for profile image feature
  createdAt: string
}

export async function getAccounts(): Promise<Account[]> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .order('username', { ascending: true })

  if (error) {
    console.error('Error fetching accounts:', error)
    throw new Error(`Failed to fetch accounts: ${error.message}`)
  }

  return (data || []).map(row => ({
    id: row.id,
    username: row.username,
    password: row.password,
    role: row.role as 'admin' | 'operations' | 'packer' | 'logistics-admin' | 'tracker',
    displayName: row.display_name,
    email: row.email,
    phone: row.phone,
    assignedChannel: row.assigned_channel,
    profileImage: row.profile_image || null,
    createdAt: row.created_at,
  }))
}

export async function getAccountByUsername(username: string): Promise<Account | null> {
  try {
    console.log("[v0] Querying Supabase for username:", username)
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (error) {
      console.error("[v0] Supabase query error:", error.message, error.code)
      if (error.code === 'PGRST116') {
        // No rows returned - user doesn't exist
        console.log("[v0] User not found in database")
        return null
      }
      throw new Error(`Database query failed: ${error.message}`)
    }

    if (!data) {
      console.log("[v0] No data returned from query")
      return null
    }

    console.log("[v0] User data retrieved successfully")
    return {
      id: data.id,
      username: data.username,
      password: data.password,
      role: data.role as 'admin' | 'operations' | 'packer' | 'logistics-admin' | 'tracker',
      displayName: data.display_name,
      email: data.email,
      phone: data.phone,
      assignedChannel: data.assigned_channel,
      profileImage: data.profile_image || null,
      createdAt: data.created_at,
    }
  } catch (error: any) {
    console.error("[v0] Error in getAccountByUsername:", error)
    throw error
  }
}

export async function validateCredentials(username: string, password: string): Promise<Account | null> {
  try {
    console.log("[v0] validateCredentials called for username:", username)
    const account = await getAccountByUsername(username)
    console.log("[v0] Account found:", !!account)
    
    if (!account) {
      console.log("[v0] Account not found")
      return null
    }

    // Use bcrypt to compare password with hash
    const { verifyPassword } = await import("@/lib/password-hash")
    const isPasswordValid = await verifyPassword(password, account.password)
    
    if (isPasswordValid) {
      console.log("[v0] Password match successful")
      return account
    }
    
    console.log("[v0] Password match failed")
    return null
  } catch (error) {
    console.error("[v0] Error in validateCredentials:", error)
    throw error
  }
}

export async function updateAccount(username: string, updates: { password?: string; displayName?: string; email?: string; phone?: string; profileImage?: string }): Promise<void> {
  const updateData: any = {}
  
  // Hash password if being updated
  if (updates.password !== undefined) {
    const { hashPassword } = await import("@/lib/password-hash")
    updateData.password = await hashPassword(updates.password)
  }
  
  if (updates.displayName !== undefined) updateData.display_name = updates.displayName
  if (updates.email !== undefined) updateData.email = updates.email
  if (updates.phone !== undefined) updateData.phone = updates.phone
  if (updates.profileImage !== undefined) updateData.profile_image = updates.profileImage || null

  console.log('[updateAccount] Updating user:', {
    username,
    updateData,
    hasProfileImage: !!updates.profileImage
  })

  const { error } = await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('username', username)

  if (error) {
    console.error('Error updating account:', error)
    throw new Error(`Failed to update account: ${error.message}`)
  }
  
  console.log('[updateAccount] Update successful for:', username)
}

export async function updateUsername(oldUsername: string, newUsername: string): Promise<void> {
  // Check if new username already exists
  const existing = await getAccountByUsername(newUsername)
  if (existing) {
    throw new Error('Username already exists')
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ username: newUsername })
    .eq('username', oldUsername)

  if (error) {
    console.error('Error updating username:', error)
    throw new Error(`Failed to update username: ${error.message}`)
  }
}

export async function addAccount(account: Omit<Account, "id" | "createdAt">): Promise<Account> {
  // Check if username already exists
  const existing = await getAccountByUsername(account.username)
  if (existing) {
    throw new Error('Username already exists')
  }

  const id = generateId('USER')
  const createdAt = formatTimestamp()

  // Hash the password
  const { hashPassword } = await import("@/lib/password-hash")
  const hashedPassword = await hashPassword(account.password)

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      id,
      username: account.username,
      password: hashedPassword,
      role: account.role,
      display_name: account.displayName,
      assigned_channel: account.assignedChannel || null, // Add assigned_channel field
      profile_image: account.profileImage || null, // Add profile_image field
      created_at: createdAt,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding account:', error)
    throw new Error(`Failed to add account: ${error.message}`)
  }

  return {
    id,
    username: account.username,
    password: hashedPassword,
    role: account.role,
    assignedChannel: account.assignedChannel,
    displayName: account.displayName,
    profileImage: account.profileImage,
    createdAt,
  }
}

export async function deleteAccount(username: string): Promise<void> {
  // Check if account exists
  const account = await getAccountByUsername(username)
  if (!account) {
    throw new Error('Account not found')
  }

  const { error } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('username', username)

  if (error) {
    console.error('Error deleting account:', error)
    throw new Error(`Failed to delete account: ${error.message}`)
  }
}
