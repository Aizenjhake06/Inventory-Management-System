"use client"

import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, ShoppingCart, Trash2, CheckCircle, Package, Truck, User } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import type { InventoryItem } from "@/lib/types"
import { apiGet, apiPost } from "@/lib/api-client"
import { getCurrentUser } from "@/lib/auth"
import { formatCurrency, cn } from "@/lib/utils"
import { toast } from "sonner"

interface CartItem {
  item: InventoryItem
  quantity: number
}

export default function POSPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [stores, setStores] = useState<Array<{id: string, store_name: string, sales_channel: string}>>([])
  const [staffName, setStaffName] = useState('')
  const [staffProfileImage, setStaffProfileImage] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [assignedChannel, setAssignedChannel] = useState<string>('')
  const [dispatchId, setDispatchId] = useState('')
  const [dispatchedItems, setDispatchedItems] = useState<Array<{name: string, quantity: number, price: number}>>([])
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  
  // Helper function to get local date in YYYY-MM-DD format
  const getLocalDateString = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // Order Form Modal States
  const [orderFormOpen, setOrderFormOpen] = useState(false)
  const [orderForm, setOrderForm] = useState({
    date: getLocalDateString(),
    salesChannel: '',
    store: '',
    courier: '',
    waybill: '',
    status: 'Pending',
    qty: 0,
    cogs: 0,
    total: 0,
    parcelStatus: 'PENDING',
    product: '',
    dispatchedBy: '',
    customerName: '',
    customerAddress: '',
    customerContact: '',
    notes: ''
  })

  // Waybill validation states
  const [waybillChecking, setWaybillChecking] = useState(false)
  const [waybillError, setWaybillError] = useState<string | null>(null)
  const [duplicateOrders, setDuplicateOrders] = useState<any[]>([])
  const [waybillValid, setWaybillValid] = useState(false)

  const total = useMemo(() => cart.reduce((sum, cartItem) => sum + cartItem.item.sellingPrice * cartItem.quantity, 0), [cart])

  const filteredItems = useMemo(() => {
    let filtered = items

    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (item) => item.name.toLowerCase().includes(searchLower) ||
                  item.category.toLowerCase().includes(searchLower),
      )
    }

    return filtered
  }, [search, items])

  useEffect(() => {
    // Get current logged-in user using the auth helper
    const currentUser = getCurrentUser()
    console.log('[POS] Current user:', currentUser) // Debug log
    
    if (currentUser) {
      const name = currentUser.displayName || currentUser.username || 'Unknown User'
      console.log('[POS] Setting staff name to:', name) // Debug log
      setStaffName(name)
      setCurrentUserRole(currentUser.role || '')
      setAssignedChannel(currentUser.assignedChannel || '')
      
      // Fetch user profile image from API
      fetchUserProfile(currentUser.username)
    } else {
      console.warn('[POS] No current user found in localStorage')
      setStaffName('Unknown User')
    }
    
    fetchItems()
    fetchStorageRooms()
  }, [])

  async function fetchUserProfile(username: string) {
    try {
      const data = await apiGet<any>('/api/auth/profile')
      if (data.profile_image) {
        setStaffProfileImage(data.profile_image)
        console.log('[POS] Profile image loaded:', data.profile_image)
      }
    } catch (error) {
      console.error('[POS] Error fetching user profile:', error)
    }
  }

  async function fetchItems() {
    try {
      // Fetch from unified products view (includes both inventory and bundles)
      const data = await apiGet<InventoryItem[]>("/api/products")
      const itemsArray = Array.isArray(data) ? data : []
      console.log('[POS] Fetched items count:', itemsArray.length)
      console.log('[POS] First 5 items:', itemsArray.slice(0, 5))
      console.log('[POS] Product types:', itemsArray.map(i => i.productType))
      setItems(itemsArray)
    } catch (error) {
      console.error("[POS] Error fetching items:", error)
      setItems([])
    }
  }

  async function fetchStorageRooms() {
    try {
      const data = await apiGet<Array<{id: string, store_name: string, sales_channel: string}>>('/api/stores')
      setStores(data)
    } catch (error) {
      console.error('Error fetching stores:', error)
    }
  }

  // Waybill validation function
  const checkWaybillDuplicate = async (waybill: string) => {
    if (!waybill || waybill.trim() === '') {
      setWaybillError(null)
      setDuplicateOrders([])
      setWaybillValid(false)
      return
    }

    try {
      setWaybillChecking(true)
      const response = await fetch(`/api/orders/check-waybill?waybill=${encodeURIComponent(waybill.trim())}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check waybill')
      }

      if (data.exists && data.orders.length > 0) {
        setWaybillError(`Duplicate waybill found! This waybill is already used by ${data.count} order(s).`)
        setDuplicateOrders(data.orders)
        setWaybillValid(false)
      } else {
        setWaybillError(null)
        setDuplicateOrders([])
        setWaybillValid(true)
      }
    } catch (error: any) {
      console.error('[Waybill Check] Error:', error)
      setWaybillError('Failed to validate waybill')
      setWaybillValid(false)
    } finally {
      setWaybillChecking(false)
    }
  }

  // Debounced waybill validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (orderForm.waybill) {
        checkWaybillDuplicate(orderForm.waybill)
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(timer)
  }, [orderForm.waybill])

  function handleOpenOrderForm() {
    if (cart.length === 0) {
      alert('Please add items to cart first')
      return
    }

    // Auto-fill form data from cart
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0)
    const totalCOGS = cart.reduce((sum, item) => sum + (item.item.costPrice * item.quantity), 0)
    const totalPrice = cart.reduce((sum, item) => sum + (item.item.sellingPrice * item.quantity), 0)
    const productList = cart.map(item => `${item.item.name} (${item.quantity})`).join(', ')
    
    // Get sales channel and store from first item (assuming all items are from same store)
    const firstItem = cart[0].item
    
    setOrderForm({
      date: getLocalDateString(),
      salesChannel: (currentUserRole === 'operations' || currentUserRole === 'dept-manager') ? assignedChannel : (firstItem.salesChannel || ''),
      store: firstItem.store || '',
      courier: '',
      waybill: '',
      status: 'Pending',
      qty: totalQty,
      cogs: totalCOGS,
      total: totalPrice,
      parcelStatus: 'PENDING',
      product: productList,
      dispatchedBy: staffName,
      customerName: '',
      customerAddress: '',
      customerContact: '',
      notes: ''
    })
    
    // Reset waybill validation state
    setWaybillError(null)
    setDuplicateOrders([])
    setWaybillValid(false)
    setWaybillChecking(false)
    
    setOrderFormOpen(true)
  }

  async function handleSubmitOrder() {
    // Validate required fields
    if (!orderForm.salesChannel) {
      toast.error('Please select a Sales Channel')
      return
    }
    
    if (!orderForm.store) {
      toast.error('Please select a Store')
      return
    }
    
    if (!orderForm.courier || !orderForm.waybill) {
      toast.error('Please fill in Courier and Waybill')
      return
    }

    if (!orderForm.customerName || !orderForm.customerAddress || !orderForm.customerContact) {
      toast.error('Please fill in all customer information')
      return
    }

    setLoading(true)
    try {
      // Prepare order items for detailed tracking
      const orderItems = cart.map((cartItem) => ({
        itemId: cartItem.item.id,
        itemName: cartItem.item.name,
        quantity: cartItem.quantity,
        costPrice: cartItem.item.costPrice,
        sellingPrice: cartItem.item.sellingPrice,
      }))

      // Create order in orders table (for tracking system)
      // NOTE: Inventory is NOT deducted here - only when order is marked as packed
      const currentUser = getCurrentUser()
      await apiPost("/api/orders", {
        date: orderForm.date,
        salesChannel: orderForm.salesChannel,
        store: orderForm.store,
        courier: orderForm.courier,
        waybill: orderForm.waybill,
        qty: orderForm.qty,
        cogs: orderForm.cogs,
        total: orderForm.total,
        product: orderForm.product,
        dispatchedBy: orderForm.dispatchedBy,
        agentUsername: currentUser?.username || null, // Track agent by username for dept-manager
        customerName: orderForm.customerName,
        customerAddress: orderForm.customerAddress,
        customerContact: orderForm.customerContact,
        notes: orderForm.notes,
        orderItems: orderItems
      })

      // Generate dispatch ID
      const newDispatchId = `WD-${Date.now()}`
      setDispatchId(newDispatchId)
      
      // Store dispatched items for display using the ACTUAL total from order form
      // Note: If total was edited in the form, we use that instead of cart prices
      const actualTotal = orderForm.total
      const calculatedTotal = cart.reduce((sum, item) => sum + (item.item.sellingPrice * item.quantity), 0)
      
      // If total was edited, distribute proportionally or just use the form total
      if (Math.abs(actualTotal - calculatedTotal) > 0.01) {
        // Total was edited - use single line item with combined product names
        setDispatchedItems([{
          name: orderForm.product,
          quantity: orderForm.qty,
          price: actualTotal
        }])
      } else {
        // Total matches - use individual items
        setDispatchedItems(cart.map(cartItem => ({
          name: cartItem.item.name,
          quantity: cartItem.quantity,
          price: cartItem.item.sellingPrice * cartItem.quantity
        })))
      }
      
      setCart([])
      fetchItems()
      setOrderFormOpen(false)
      setSuccessModalOpen(true)

      // Reset form
      setOrderForm({
        date: getLocalDateString(),
        salesChannel: '',
        store: '',
        courier: '',
        waybill: '',
        status: 'Pending',
        qty: 0,
        cogs: 0,
        total: 0,
        parcelStatus: 'PENDING',
        product: '',
        dispatchedBy: staffName,
        customerName: '',
        customerAddress: '',
        customerContact: '',
        notes: ''
      })

      toast.success('Order created successfully! Go to Packing Queue to mark as packed.')
    } catch (error) {
      console.error("Error submitting order:", error)
      toast.error("Failed to submit order. Please check all fields and try again.")
    } finally {
      setLoading(false)
    }
  }

  function addToCart(item: InventoryItem) {
    const existingItem = cart.find((cartItem) => cartItem.item.id === item.id)

    if (existingItem) {
      if (existingItem.quantity < item.quantity) {
        setCart(
          cart.map((cartItem) =>
            cartItem.item.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem,
          ),
        )
        // Toast for quantity increase
        toast.success(`${item.name} quantity increased to ${existingItem.quantity + 1}`, {
          duration: 2000,
          icon: '➕',
        })
      } else {
        // Toast when max stock reached
        toast.warning(`Maximum stock reached for ${item.name}`, {
          duration: 2000,
          icon: '⚠️',
        })
      }
    } else {
      setCart([...cart, { item, quantity: 1 }])
      // Toast for new item added
      toast.success(`${item.name} added to cart`, {
        duration: 2000,
        icon: '✓',
      })
    }
  }

  function updateQuantity(itemId: string, quantity: number) {
    const cartItem = cart.find((ci) => ci.item.id === itemId)
    if (!cartItem) return

    if (quantity <= 0) {
      removeFromCart(itemId)
      return
    }

    // Allow any quantity to be entered, but cap at available stock
    const finalQuantity = Math.min(quantity, cartItem.item.quantity)
    setCart(cart.map((ci) => (ci.item.id === itemId ? { ...ci, quantity: finalQuantity } : ci)))
  }

  function removeFromCart(itemId: string) {
    setCart(cart.filter((cartItem) => cartItem.item.id !== itemId))
  }

  return (
    <div className="w-full px-4 lg:px-6 py-6">
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold gradient-text">Order Dispatch Overview</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Stock release and distribution management
        </p>
      </div>

      {/* 2-Column Layout: Products (LEFT) + Sidebar (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-[2.5fr_1fr] gap-6">
        
        {/* LEFT COLUMN: Products Section */}
        <div className="space-y-4">
          <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                  Products ({filteredItems.length})
                </CardTitle>
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredItems.map((item) => {
                  const isLowStock = item.quantity <= item.reorderLevel && item.quantity > 0
                  const isOutOfStock = item.quantity === 0
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      disabled={isOutOfStock}
                      className={cn(
                        "group relative overflow-hidden transition-all duration-200 text-left border rounded-lg flex flex-col",
                        isOutOfStock
                          ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 opacity-60 cursor-not-allowed"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500 hover:-translate-y-0.5 cursor-pointer active:scale-95"
                      )}
                    >
                      {/* Image Section - Top */}
                      <div className="relative w-full aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            alt={item.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                          </div>
                        )}
                        
                        {/* Stock Badge - Top Right */}
                        <div className="absolute top-1.5 right-1.5">
                          <span className={cn(
                            "px-1.5 py-0.5 text-[9px] font-bold rounded shadow-sm",
                            isOutOfStock
                              ? "bg-red-500 text-white"
                              : isLowStock
                              ? "bg-amber-500 text-white"
                              : "bg-slate-900/70 text-white"
                          )}>
                            {isOutOfStock ? "OUT" : item.quantity}
                          </span>
                        </div>

                        {/* Add Button - Hover */}
                        {!isOutOfStock && (
                          <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Text Section - Bottom */}
                      <div className="p-2 flex flex-col gap-1 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                        {/* Product Name - Smaller Font Size */}
                        <h3 
                          className="text-[10px] sm:text-[11px] font-medium text-slate-900 dark:text-white line-clamp-2 leading-tight min-h-[28px]" 
                          title={item.name}
                        >
                          {item.name}
                        </h3>
                        
                        {/* Price - Emphasized */}
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            ₱{item.sellingPrice.toFixed(0)}
                          </span>
                          {/* Hide COGS for department agents (operations and dept-manager) */}
                          {currentUserRole !== 'operations' && currentUserRole !== 'dept-manager' && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                              COGS ₱{item.costPrice.toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
              
              {filteredItems.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">No products found</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500">Try adjusting your search</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Sticky Sidebar (Cart + Dispatch Info) */}
        <div className="sticky top-5 h-[calc(100vh-120px)] flex flex-col gap-4">
          
          {/* Cart Summary - TOP (Flexible Height with Scroll) */}
          <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Cart Summary</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">₱{total.toFixed(2)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No items in cart</p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Select products to add</p>
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto flex-1">
                  {cart.map((cartItem) => (
                    <div
                      key={cartItem.item.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{cartItem.item.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          ₱{cartItem.item.sellingPrice.toFixed(2)} × {cartItem.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max={cartItem.item.quantity}
                          value={cartItem.quantity}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === '') return
                            const numValue = parseInt(value, 10)
                            if (!isNaN(numValue) && numValue >= 1) {
                              updateQuantity(cartItem.item.id, numValue)
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value
                            if (value === '' || parseInt(value, 10) < 1) {
                              updateQuantity(cartItem.item.id, 1)
                            }
                          }}
                          className="min-w-[60px] max-w-[100px] h-8 text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeFromCart(cartItem.item.id)} 
                          className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 min-w-[70px] text-right">
                        ₱{(cartItem.item.sellingPrice * cartItem.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dispatch Information - BOTTOM (Fixed at Bottom) */}
          <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 flex-shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                Dispatch Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dispatched By */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Dispatched By *</Label>
                <div className="flex items-center justify-between p-4 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-center gap-3">
                    {/* Profile Image or Gradient Circle */}
                    {staffProfileImage ? (
                      <div className="h-12 w-12 rounded-full overflow-hidden shadow-md ring-2 ring-blue-500/30">
                        <img 
                          src={staffProfileImage} 
                          alt={staffName}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            // Fallback to gradient circle if image fails to load
                            e.currentTarget.style.display = 'none'
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement
                            if (fallback) fallback.style.display = 'flex'
                          }}
                        />
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md" style={{ display: 'none' }}>
                          {staffName ? staffName.charAt(0).toUpperCase() : '?'}
                        </div>
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {staffName ? staffName.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <p className="text-base font-semibold text-slate-900 dark:text-white">
                        {staffName || 'Unknown User'}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">Currently logged in</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-2 rounded-md bg-blue-100 dark:bg-blue-800 border border-blue-300 dark:border-blue-600">
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Verified</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Auto-verified from your account</span>
                </div>
              </div>

              <Button 
                onClick={handleOpenOrderForm} 
                disabled={loading || cart.length === 0} 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                size="lg"
              >
                {loading ? "Processing..." : `Dispatch ${cart.length > 0 ? `(${cart.length} items)` : ''}`}
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Order Form Modal - Professional Design */}
      <Dialog open={orderFormOpen} onOpenChange={setOrderFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 gap-0">
          {/* Modal Header with Gradient */}
          <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-8 py-6 border-b border-slate-600">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold tracking-tight" style={{ color: 'white' }}>
                    Order Dispatch Form
                  </DialogTitle>
                  <p className="text-slate-200 text-sm mt-1 font-medium">
                    Fill in courier and tracking details for this dispatch
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Form Content with Scrollable Area */}
          <div className="overflow-y-auto max-h-[calc(90vh-220px)] px-8 py-6">
            <div className="space-y-6">
              {/* Order Information Card - Emerald/Teal Gradient */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-6 border border-emerald-100 dark:border-emerald-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-600 rounded-lg">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Order Information
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</Label>
                    <Input
                      type="date"
                      value={orderForm.date}
                      onChange={(e) => setOrderForm({...orderForm, date: e.target.value})}
                      className="mt-2 h-11 border-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sales Channel</Label>
                    {(currentUserRole === 'operations' || currentUserRole === 'dept-manager') ? (
                      <Input
                        value={assignedChannel}
                        readOnly
                        className="mt-2 h-11 bg-slate-100 dark:bg-slate-800 cursor-not-allowed font-medium border-2"
                      />
                    ) : (
                      <Select 
                        value={orderForm.salesChannel} 
                        onValueChange={(value) => setOrderForm({...orderForm, salesChannel: value, store: ''})}
                      >
                        <SelectTrigger className="mt-2 h-11 border-2">
                          <SelectValue placeholder="Select sales channel" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {Array.from(new Set(stores.map(s => s.sales_channel))).sort().map((channel) => (
                            <SelectItem key={channel} value={channel}>{channel}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Store</Label>
                    <Select 
                      value={orderForm.store} 
                      onValueChange={(value) => setOrderForm({...orderForm, store: value})}
                    >
                      <SelectTrigger className="mt-2 h-11 border-2">
                        <SelectValue placeholder="Select store" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {stores
                          .filter(s => (currentUserRole === 'operations' || currentUserRole === 'dept-manager') 
                            ? true 
                            : (!orderForm.salesChannel || s.sales_channel === orderForm.salesChannel)
                          )
                          .sort((a, b) => a.store_name.localeCompare(b.store_name))
                          .map((store) => (
                            <SelectItem key={store.id} value={store.store_name}>
                              {store.store_name}
                              {(currentUserRole !== 'operations' && currentUserRole !== 'dept-manager') && orderForm.salesChannel && (
                                <span className="text-xs text-slate-500 ml-2">({store.sales_channel})</span>
                              )}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</Label>
                    <Input
                      value={orderForm.status}
                      readOnly
                      className="mt-2 h-11 bg-slate-50 dark:bg-slate-800 border-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Quantity</Label>
                    <Input
                      type="number"
                      value={orderForm.qty}
                      readOnly
                      className="mt-2 h-11 bg-slate-50 dark:bg-slate-800 border-2 font-bold text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total COGS</Label>
                    <Input
                      value={formatCurrency(orderForm.cogs)}
                      readOnly
                      className="mt-2 h-11 bg-slate-50 dark:bg-slate-800 border-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Amount *</Label>
                    <Input
                      type="number"
                      value={orderForm.total}
                      onChange={(e) => setOrderForm({...orderForm, total: parseFloat(e.target.value) || 0})}
                      placeholder="Enter total amount"
                      className="mt-2 h-11 font-bold text-emerald-600 dark:text-emerald-400 border-2"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Parcel Status</Label>
                    <Input
                      value={orderForm.parcelStatus}
                      readOnly
                      className="mt-2 h-11 bg-slate-50 dark:bg-slate-800 border-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Products</Label>
                    <textarea
                      value={orderForm.product}
                      readOnly
                      rows={2}
                      className="mt-2 w-full px-3 py-2 rounded-md border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Information Card - Blue/Indigo Gradient */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Customer Information
                  </h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer Full Name *</Label>
                    <Input
                      value={orderForm.customerName}
                      onChange={(e) => setOrderForm({...orderForm, customerName: e.target.value})}
                      placeholder="Enter customer name"
                      className="mt-2 h-11 border-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer Contact Number *</Label>
                    <Input
                      value={orderForm.customerContact}
                      onChange={(e) => setOrderForm({...orderForm, customerContact: e.target.value})}
                      placeholder="Enter contact number (e.g., 09123456789)"
                      className="mt-2 h-11 border-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer Delivery Address *</Label>
                    <textarea
                      value={orderForm.customerAddress}
                      onChange={(e) => setOrderForm({...orderForm, customerAddress: e.target.value})}
                      placeholder="Enter complete delivery address"
                      rows={3}
                      className="mt-2 w-full px-3 py-2 rounded-md border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Dispatch Details Card - Purple/Pink Gradient */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-100 dark:border-purple-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <Truck className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Dispatch Details
                  </h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Courier Service *</Label>
                    <Select value={orderForm.courier} onValueChange={(value) => setOrderForm({...orderForm, courier: value})}>
                      <SelectTrigger className="mt-2 h-11 border-2 focus:ring-2 focus:ring-purple-500">
                        <SelectValue placeholder="Select courier" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="Flash">Flash</SelectItem>
                        <SelectItem value="J&T">J&T</SelectItem>
                        <SelectItem value="Ninja Van">Ninja Van</SelectItem>
                        <SelectItem value="Lalamove">Lalamove</SelectItem>
                        <SelectItem value="Grab">Grab</SelectItem>
                        <SelectItem value="LBC">LBC</SelectItem>
                        <SelectItem value="2GO">2GO</SelectItem>
                        <SelectItem value="JRS Express">JRS Express</SelectItem>
                        <SelectItem value="Entrego">Entrego</SelectItem>
                        <SelectItem value="ABest Express">ABest Express</SelectItem>
                        <SelectItem value="Gogo Xpress">Gogo Xpress</SelectItem>
                        <SelectItem value="XDE Logistics">XDE Logistics</SelectItem>
                        <SelectItem value="AP Cargo">AP Cargo</SelectItem>
                        <SelectItem value="Gryffon Courier Services">Gryffon Courier Services</SelectItem>
                        <SelectItem value="Delivery Parcel Express">Delivery Parcel Express</SelectItem>
                        <SelectItem value="Bluebee Express">Bluebee Express</SelectItem>
                        <SelectItem value="GrabExpress">GrabExpress</SelectItem>
                        <SelectItem value="Borzo">Borzo</SelectItem>
                        <SelectItem value="Transportify">Transportify</SelectItem>
                        <SelectItem value="DHL Express">DHL Express</SelectItem>
                        <SelectItem value="UPS">UPS</SelectItem>
                        <SelectItem value="FedEx">FedEx</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Waybill / Tracking Number *</Label>
                    <div className="relative">
                      <Input
                        value={orderForm.waybill}
                        onChange={(e) => setOrderForm({...orderForm, waybill: e.target.value})}
                        placeholder="Enter tracking number"
                        className={cn(
                          "mt-2 h-11 border-2 focus:ring-2 focus:ring-purple-500",
                          waybillError && "border-red-500 focus:ring-red-500",
                          waybillValid && !waybillError && "border-green-500 focus:ring-green-500"
                        )}
                      />
                      {waybillChecking && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 mt-1">
                          <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                        </div>
                      )}
                      {waybillValid && !waybillChecking && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 mt-1">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                      )}
                    </div>
                    
                    {/* Validation Error Message */}
                    {waybillError && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                          ❌ {waybillError}
                        </p>
                        {duplicateOrders.length > 0 && (
                          <div className="space-y-1">
                            {duplicateOrders.map((order, index) => (
                              <div key={index} className="text-xs text-red-600 dark:text-red-500 flex items-center gap-2">
                                <span className="font-mono">•</span>
                                <span>
                                  Order {order.orderNumber} - {order.location}
                                  {order.isCancelled && <span className="ml-1 text-orange-600">(Cancelled)</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-red-600 dark:text-red-500 mt-2 font-medium">
                          Please use a unique waybill number.
                        </p>
                      </div>
                    )}
                    
                    {/* Success Message */}
                    {waybillValid && !waybillError && orderForm.waybill && (
                      <p className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Waybill is unique and valid
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notes (Optional)</Label>
                    <textarea
                      value={orderForm.notes}
                      onChange={(e) => setOrderForm({...orderForm, notes: e.target.value})}
                      rows={3}
                      placeholder="Add any special instructions or notes for this order..."
                      className="mt-2 w-full px-3 py-2 rounded-md border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dispatched By</Label>
                    <Input
                      value={orderForm.dispatchedBy}
                      readOnly
                      className="mt-2 h-11 bg-slate-50 dark:bg-slate-800 border-2"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions - Professional Design */}
          <div className="px-8 py-5 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setOrderFormOpen(false)}
              disabled={loading}
              className="h-11 px-6 font-semibold border-2 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitOrder}
              disabled={loading || !orderForm.salesChannel || !orderForm.store || !orderForm.courier || !orderForm.waybill || !orderForm.customerName || !orderForm.customerAddress || !orderForm.customerContact || waybillError !== null || !waybillValid || waybillChecking}
              className="h-11 px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-semibold shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting..." : waybillChecking ? "Validating..." : "Submit Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white text-xl font-semibold flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              Items Dispatched Successfully!
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Stock has been released and transaction logged
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-center text-green-800 dark:text-green-200 font-medium mb-2">
                Order Dispatched Successfully
              </p>
              <p className="text-center text-sm text-green-700 dark:text-green-300">
                Dispatch ID: <span className="font-mono font-bold">{dispatchId}</span>
              </p>
            </div>

            {/* Product Details */}
            {dispatchedItems.length > 0 && (
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Dispatched Items</h4>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-48 overflow-y-auto">
                  {dispatchedItems.map((item, index) => (
                    <div key={index} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">Total</span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {formatCurrency(dispatchedItems.reduce((sum, item) => sum + item.price, 0))}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <p>✓ Order created in Packing Queue</p>
              <p>✓ Awaiting packing confirmation</p>
              <p>✓ Staff: {staffName}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                ⚠️ Inventory will be deducted when order is marked as packed
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setSuccessModalOpen(false)} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
