'use client'

import { useState, useEffect } from 'react'
import { BrandLoader } from '@/components/ui/brand-loader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
import { Search, Package, RefreshCw, CheckCircle, ShoppingCart, TrendingUp, Eye, User, Phone, MapPin, Clock, Truck, Trash2, XCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { apiGet, apiPost } from '@/lib/api-client'
import { getCurrentUser } from '@/lib/auth'
import { getCurrentUserRole, getAuthHeaders } from '@/lib/role-utils'
import { EnterpriseDateRangePicker } from '@/components/ui/enterprise-date-range-picker'
import { TablePagination } from '@/components/ui/table-pagination'

interface Order {
  id: string
  orderNumber?: string
  date: string
  sales_channel?: string
  channel?: string
  store: string
  courier: string
  waybill: string
  status: string
  orderStatus?: string
  qty: number
  quantity?: number
  cogs?: number
  total: number
  totalAmount?: number
  parcel_status?: string
  product?: string
  itemName?: string
  customerName?: string
  customerPhone?: string
  customerAddress?: string
  dispatchNotes?: string
  dispatched_by?: string
  packed_by: string | null
  packed_at: string | null
  created_at?: string
  orderDate?: string
  is_cancelled?: boolean
  cancellation_reason?: string
  cancelled_by?: string
  cancelled_at?: string
  restored_by?: string
  restored_at?: string
}

/**
 * Shared Packing Queue Page
 * Works for both Admin and Team Leader roles
 */
export default function PackingQueuePage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [salesChannelFilter, setChannelFilter] = useState<string>('all')
  const [cancellationFilter, setCancellationFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [packing, setPacking] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [cancellationReasonOther, setCancellationReasonOther] = useState('') // For "Other" option
  const [uncancelling, setUncancelling] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    courier: '',
    waybill: '',
    quantity: 0,
    totalAmount: 0,
    dispatchNotes: ''
  })

  // Role detection
  const userRole = getCurrentUserRole()
  const isTeamLeader = false // Team leader role removed

  // Helper function to format date and time - using same logic as Activity Logs
  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A'
    
    // If the date string doesn't have timezone info, treat it as Philippine time
    // Supabase stores timestamps without timezone, so we need to append +08:00
    let date: Date
    if (dateString.includes('T') && !dateString.includes('+') && !dateString.includes('Z')) {
      // ISO format without timezone: add Philippine timezone
      date = new Date(dateString + '+08:00')
    } else if (!dateString.includes('T')) {
      // Format: "YYYY-MM-DD HH:mm:ss" - treat as Philippine time
      date = new Date(dateString.replace(' ', 'T') + '+08:00')
    } else {
      date = new Date(dateString)
    }
    
    // Format date as MM/DD/YY
    const dateStr = date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: '2-digit'
    })
    
    // Format time as HH:mm (24-hour)
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false
    })
    
    return `${dateStr} ${timeStr}`
  }

  // Helper function to parse date as Philippine time
  const parseAsPhilippineTime = (dateString: string): Date => {
    if (!dateString) return new Date()
    
    // If the date string doesn't have timezone info, treat it as Philippine time
    if (dateString.includes('T') && !dateString.includes('+') && !dateString.includes('Z')) {
      // ISO format without timezone: add Philippine timezone
      return new Date(dateString + '+08:00')
    } else if (!dateString.includes('T')) {
      // Format: "YYYY-MM-DD HH:mm:ss" - treat as Philippine time
      return new Date(dateString.replace(' ', 'T') + '+08:00')
    }
    return new Date(dateString)
  }

  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUser(user)
    fetchOrders()

    // Poll for updates every 10 seconds (team leaders only)
    if (isTeamLeader) {
      const interval = setInterval(fetchOrders, 10000)
      return () => clearInterval(interval)
    }
  }, [isTeamLeader])

  useEffect(() => {
    filterOrders()
  }, [searchTerm, salesChannelFilter, cancellationFilter, startDate, endDate, orders])

  const fetchOrders = async () => {
    try {
      setLoading(true)

      // Get current user directly (not from state)
      const user = getCurrentUser()
      
      console.log('[Packing Queue] ===== DEPARTMENT FILTERING DEBUG =====')
      console.log('[Packing Queue] Current user:', user)
      console.log('[Packing Queue] User role:', user?.role)
      console.log('[Packing Queue] Assigned channel:', user?.assignedChannel)

      // Team leaders use their own API endpoint
      if (isTeamLeader) {
        const headers = getAuthHeaders()
        const response = await fetch('/api/team-leader/packing-queue', {
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch packing queue')
        }

        setOrders(data.queue || [])
        setFilteredOrders(data.queue || [])
        setLoading(false)
        return
      }

      // Fetch only pending orders (not yet packed)
      const data = await apiGet<any[]>('/api/orders?status=Pending')
      
      console.log('[Packing Queue] Total orders fetched from API:', data.length)
      console.log('[Packing Queue] User info:', { role: user?.role, assignedChannel: user?.assignedChannel })
      
      // Map database fields to Order interface
      let mappedOrders: Order[] = data.map(order => ({
        id: order.id,
        orderNumber: order.id,
        date: order.date,
        sales_channel: order.sales_channel,
        channel: order.sales_channel,
        store: order.store,
        courier: order.courier,
        waybill: order.waybill,
        status: order.status,
        orderStatus: order.status,
        qty: order.qty,
        quantity: order.qty,
        cogs: order.cogs,
        total: order.total,
        totalAmount: order.total,
        parcel_status: order.parcel_status,
        product: order.product ? order.product.replace(/\s*\(\d+\)\s*$/, '') : order.product, // Remove (quantity) from product name
        itemName: order.product ? order.product.replace(/\s*\(\d+\)\s*$/, '') : order.product, // Remove (quantity) from product name
        customerName: order.customer_name,
        customerPhone: order.customer_contact,
        customerAddress: order.customer_address,
        dispatchNotes: order.dispatch_notes,
        dispatched_by: order.dispatched_by,
        packed_by: order.packed_by,
        packed_at: order.packed_at,
        created_at: order.created_at,
        orderDate: order.created_at,
        is_cancelled: order.is_cancelled,
        cancellation_reason: order.cancellation_reason,
        cancelled_by: order.cancelled_by,
        cancelled_at: order.cancelled_at,
        restored_by: order.restored_by,
        restored_at: order.restored_at
      } as any))
      
      // Filter by assigned channel for dept-manager and operations roles
      if ((user?.role === 'dept-manager' || user?.role === 'operations') && user?.assignedChannel) {
        console.log('[Packing Queue] Filtering by assigned channel:', user.assignedChannel)
        mappedOrders = mappedOrders.filter(order => order.sales_channel === user.assignedChannel)
      }
      
      console.log('[Packing Queue] Orders to display:', mappedOrders.map(o => ({
        id: o.id.slice(-6),
        channel: o.sales_channel
      })))
      
      setOrders(mappedOrders)
      setFilteredOrders(mappedOrders)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    let filtered = [...orders]
    
    if (searchTerm) {
      filtered = filtered.filter(order => 
        (order.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.store || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.waybill || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.product || order.itemName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Sales channel filter (Admin only)
    if (salesChannelFilter !== 'all') {
      filtered = filtered.filter(order => 
        (order.sales_channel || order.channel) === salesChannelFilter
      )
    }
    
    // Cancellation status filter
    if (cancellationFilter === 'cancelled') {
      filtered = filtered.filter(order => order.is_cancelled === true)
    } else if (cancellationFilter === 'active') {
      filtered = filtered.filter(order => !order.is_cancelled)
    }
    
    // Date range filter
    if (startDate) {
      filtered = filtered.filter(order => {
        const orderDate = parseAsPhilippineTime(order.created_at || order.orderDate || order.date || '')
        return orderDate >= startDate
      })
    }
    if (endDate) {
      filtered = filtered.filter(order => {
        const orderDate = parseAsPhilippineTime(order.created_at || order.orderDate || order.date || '')
        // Set end date to end of day (23:59:59)
        const endOfDay = new Date(endDate)
        endOfDay.setHours(23, 59, 59, 999)
        return orderDate <= endOfDay
      })
    }
    
    setFilteredOrders(filtered)
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  const handleMarkAsPacked = async (orderId: string) => {
    if (!currentUser) {
      toast.error('User not logged in')
      return
    }

    try {
      setPacking(orderId)

      // Team leaders use their own API endpoint
      if (isTeamLeader) {
        const headers = getAuthHeaders()
        const response = await fetch(`/api/team-leader/packing-queue/${orderId}/pack`, {
          method: 'PUT',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to pack order')
        }

        toast.success('Order packed successfully')
        setShowConfirm(false)
        setSelectedOrder(null)
        fetchOrders()
        return
      }

      // Admin: Use regular API
      const packedBy = currentUser.displayName || currentUser.username || 'Unknown User'
      await apiPost(`/api/orders/${orderId}/pack`, { packedBy })
      
      toast.success('Order marked as packed successfully!')
      fetchOrders()
    } catch (error) {
      console.error('Error packing order:', error)
      toast.error('Failed to pack order')
    } finally {
      setPacking(null)
    }
  }

  const openConfirmDialog = (order: Order) => {
    setSelectedOrder(order)
    setShowConfirm(true)
  }

  const openDetailsModal = (order: Order) => {
    setSelectedOrder(order)
    setEditForm({
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      customerAddress: order.customerAddress || '',
      courier: order.courier || '',
      waybill: order.waybill || '',
      quantity: order.qty || order.quantity || 0,
      totalAmount: order.total || order.totalAmount || 0,
      dispatchNotes: order.dispatchNotes || ''
    })
    setIsEditMode(false)
    setShowDetailsModal(true)
  }

  const handleEditMode = () => {
    setIsEditMode(true)
  }

  const handleCancelEdit = () => {
    if (selectedOrder) {
      setEditForm({
        customerName: selectedOrder.customerName || '',
        customerPhone: selectedOrder.customerPhone || '',
        customerAddress: selectedOrder.customerAddress || '',
        courier: selectedOrder.courier || '',
        waybill: selectedOrder.waybill || '',
        quantity: selectedOrder.qty || selectedOrder.quantity || 0,
        totalAmount: selectedOrder.total || selectedOrder.totalAmount || 0,
        dispatchNotes: selectedOrder.dispatchNotes || ''
      })
    }
    setIsEditMode(false)
  }

  const handleSaveEdit = async () => {
    if (!selectedOrder) return

    try {
      const headers = getAuthHeaders()
      const response = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_name: editForm.customerName,
          customer_contact: editForm.customerPhone,
          customer_address: editForm.customerAddress,
          courier: editForm.courier,
          waybill: editForm.waybill,
          qty: editForm.quantity,
          total: editForm.totalAmount,
          dispatch_notes: editForm.dispatchNotes
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update order')
      }

      toast.success('Order updated successfully')
      setIsEditMode(false)
      setShowDetailsModal(false)
      fetchOrders()
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error('Failed to update order')
    }
  }

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return

    try {
      setDeleting(true)
      const headers = getAuthHeaders()
      const response = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'DELETE',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Delete order error:', data)
        throw new Error(data.error || data.details || 'Failed to delete order')
      }

      toast.success(data.message || 'Order deleted successfully')
      if (data.inventoryRestored) {
        toast.success('Inventory restored successfully')
      }
      setShowDeleteConfirm(false)
      setShowDetailsModal(false)
      setSelectedOrder(null)
      fetchOrders()
    } catch (error: any) {
      console.error('Error deleting order:', error)
      toast.error(error.message || 'Failed to delete order')
    } finally {
      setDeleting(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!selectedOrder) return
    
    // Validate cancellation reason
    if (!cancellationReason || cancellationReason.trim() === '') {
      toast.error('Please select a cancellation reason')
      return
    }
    
    // If "Other" is selected, validate the custom reason
    if (cancellationReason === 'Other (please specify)' && (!cancellationReasonOther || cancellationReasonOther.trim() === '')) {
      toast.error('Please specify the cancellation reason')
      return
    }
    
    // Use custom reason if "Other" is selected, otherwise use the dropdown value
    const finalReason = cancellationReason === 'Other (please specify)' 
      ? cancellationReasonOther.trim() 
      : cancellationReason

    try {
      setCancelling(true)
      
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const headers = getAuthHeaders()
      const response = await fetch(`/api/orders/${selectedOrder.id}/cancel`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: finalReason,
          cancelledBy: currentUser?.displayName || currentUser?.username || 'Unknown'
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      const data = await response.json()

      if (!response.ok) {
        console.error('Cancel order error:', data)
        throw new Error(data.error || data.details || 'Failed to cancel order')
      }

      toast.success('Order cancelled successfully - Order will remain in queue with red highlight')
      
      // Update the order in the local state to mark as cancelled (keeps it in the list)
      setOrders(prev => prev.map(o => 
        o.id === selectedOrder.id ? { ...o, is_cancelled: true, cancellation_reason: finalReason } : o
      ))
      setFilteredOrders(prev => prev.map(o => 
        o.id === selectedOrder.id ? { ...o, is_cancelled: true, cancellation_reason: finalReason } : o
      ))
      
      // Update selected order to show cancelled state in modal
      setSelectedOrder({ ...selectedOrder, is_cancelled: true, cancellation_reason: finalReason })
      
      setShowCancelConfirm(false)
      setCancellationReason('') // Reset reason
      setCancellationReasonOther('') // Reset custom reason
      // Keep modal open so user can see the cancelled state
    } catch (error: any) {
      console.error('Error cancelling order:', error)
      if (error.name === 'AbortError') {
        toast.error('Request timed out - Please try again')
      } else {
        toast.error(error.message || 'Failed to cancel order')
      }
    } finally {
      setCancelling(false)
    }
  }

  const handleUncancelOrder = async () => {
    if (!selectedOrder) return

    try {
      setUncancelling(true)
      
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const headers = getAuthHeaders()
      const response = await fetch(`/api/orders/${selectedOrder.id}/cancel`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          restoredBy: currentUser?.displayName || currentUser?.username || 'Unknown'
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      const data = await response.json()

      if (!response.ok) {
        console.error('Uncancel order error:', data)
        throw new Error(data.error || data.details || 'Failed to uncancel order')
      }

      toast.success('Order restored successfully - Order is now available for packing')
      
      // Update the order in the local state to mark as uncancelled with restoration info
      const restorationInfo = {
        is_cancelled: false,
        cancellation_reason: undefined,
        restored_by: currentUser?.displayName || currentUser?.username || 'Unknown',
        restored_at: new Date().toISOString()
      }
      
      setOrders(prev => prev.map(o => 
        o.id === selectedOrder.id ? { ...o, ...restorationInfo } : o
      ))
      setFilteredOrders(prev => prev.map(o => 
        o.id === selectedOrder.id ? { ...o, ...restorationInfo } : o
      ))
      
      // Update selected order to show uncancelled state with restoration info in modal
      setSelectedOrder({ ...selectedOrder, ...restorationInfo })
      
      // Keep modal open so user can see the restored state
    } catch (error: any) {
      console.error('Error uncancelling order:', error)
      if (error.name === 'AbortError') {
        toast.error('Request timed out - Please try again')
      } else {
        toast.error(error.message || 'Failed to uncancel order')
      }
    } finally {
      setUncancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[600px]">
        <div className="text-center">
          <BrandLoader size="lg" />
          <p className="text-slate-600 dark:text-slate-400 mt-6 text-sm font-medium">
            Loading packing queue...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 py-6 space-y-6">
      {/* Header with Title and Date Filter */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold gradient-text">Packing Queue Overview</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isTeamLeader 
              ? 'Orders waiting to be packed for your channel'
              : 'Orders waiting to be packed and dispatched'
            }
          </p>
        </div>
        
        {/* Date Filter - Right Corner */}
        <div className="flex items-center gap-3">
          <EnterpriseDateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateChange={(start, end) => {
              setStartDate(start)
              setEndDate(end)
            }}
          />
        </div>
      </div>

      {/* Department Overview Cards - For Admin Only */}
      {userRole === 'admin' && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {(() => {
            // Calculate stats for each department
            const departments = [
              { name: 'Shopee', logo: '/Shopee.png', color: 'orange' },
              { name: 'Lazada', logo: '/Lazada.png', color: 'blue' },
              { name: 'TikTok', logo: '/tiktok.png', color: 'black' },
              { name: 'Facebook', logo: '/facebook.png', color: 'blue-facebook' },
              { name: 'Physical Store', logo: '/Physical Store.png', color: 'green' }
            ]
            
            return departments.map((dept) => {
              const deptOrders = filteredOrders.filter(o => (o.sales_channel || o.channel) === dept.name)
              const cancelledOrders = deptOrders.filter(o => o.is_cancelled === true)
              const activeOrders = deptOrders.filter(o => !o.is_cancelled)
              
              const cancelledCount = cancelledOrders.length
              const activeCount = activeOrders.length
              const cancelledAmount = cancelledOrders.reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0)
              const activeAmount = activeOrders.reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0)
              
              // Determine color scheme based on department
              let colorScheme = {
                gradient: 'from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-900/10',
                text: 'text-orange-900 dark:text-orange-100',
                subtext: 'text-orange-700 dark:text-orange-400'
              }
              
              if (dept.color === 'blue') {
                colorScheme = {
                  gradient: 'from-indigo-50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-900/10',
                  text: 'text-indigo-900 dark:text-indigo-100',
                  subtext: 'text-indigo-700 dark:text-indigo-400'
                }
              } else if (dept.color === 'black') {
                colorScheme = {
                  gradient: 'from-slate-50 to-slate-100/50 dark:from-slate-900/20 dark:to-slate-900/10',
                  text: 'text-slate-900 dark:text-slate-100',
                  subtext: 'text-slate-700 dark:text-slate-400'
                }
              } else if (dept.color === 'blue-facebook') {
                colorScheme = {
                  gradient: 'from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10',
                  text: 'text-blue-900 dark:text-blue-100',
                  subtext: 'text-blue-700 dark:text-blue-400'
                }
              } else if (dept.color === 'green') {
                colorScheme = {
                  gradient: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10',
                  text: 'text-emerald-900 dark:text-emerald-100',
                  subtext: 'text-emerald-700 dark:text-emerald-400'
                }
              }
              
              return (
                <Card key={dept.name} className={`p-3 border-0 shadow-md bg-gradient-to-br ${colorScheme.gradient}`}>
                  <div className="space-y-3">
                    {/* Department Header with Logo */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center p-1">
                        <img 
                          src={dept.logo} 
                          alt={dept.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <p className={`text-[9px] font-bold ${colorScheme.subtext} uppercase tracking-wider leading-tight flex-1`}>
                        {dept.name}
                      </p>
                    </div>
                    
                    {/* Cancelled and Active - Horizontal Layout */}
                    <div className="flex items-center justify-between gap-2 divide-x divide-slate-300 dark:divide-slate-600">
                      {/* Cancelled Orders - Left Side */}
                      <div className="flex-1 pr-2">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[8px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                            <XCircle className="h-2.5 w-2.5 text-red-500" />
                            <span className="hidden sm:inline">Cancelled</span>
                          </span>
                          <span className={`text-sm font-bold ${colorScheme.text} tabular-nums`}>
                            {cancelledCount}
                          </span>
                        </div>
                        <p className="text-[9px] font-semibold text-red-600 dark:text-red-400 tabular-nums text-right">
                          {formatCurrency(cancelledAmount)}
                        </p>
                      </div>
                      
                      {/* Active Orders - Right Side */}
                      <div className="flex-1 pl-2">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[8px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                            <CheckCircle className="h-2.5 w-2.5 text-green-500" />
                            <span className="hidden sm:inline">Active</span>
                          </span>
                          <span className={`text-sm font-bold ${colorScheme.text} tabular-nums`}>
                            {activeCount}
                          </span>
                        </div>
                        <p className={`text-[9px] font-semibold ${colorScheme.subtext} tabular-nums text-right`}>
                          {formatCurrency(activeAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })
          })()}
        </div>
      )}

      {/* Stats Cards - Professional Corporate Design */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-5">
        {/* Total Orders - Blue */}
        <Card className="p-5 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30">
              <Package className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Total Orders</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 tabular-nums">{filteredOrders.length}</p>
            </div>
          </div>
        </Card>

        {/* Total Items - Purple */}
        <Card className="p-5 border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 shadow-lg shadow-purple-500/30">
              <ShoppingCart className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Total Items</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 tabular-nums">
                {filteredOrders.reduce((sum, order) => sum + (order.qty || order.quantity || 0), 0)}
              </p>
            </div>
          </div>
        </Card>

        {/* Total Value - Green */}
        <Card className="p-5 border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-600 shadow-lg shadow-green-500/30">
              <TrendingUp className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">Total Value</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 tabular-nums">
                {formatCurrency(filteredOrders.reduce((sum, order) => sum + (order.total || order.totalAmount || 0), 0))}
              </p>
            </div>
          </div>
        </Card>

        {/* Active Orders - Emerald */}
        <Card className="p-5 border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 shadow-lg shadow-emerald-500/30 flex-shrink-0">
              <CheckCircle className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Active Orders</p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 tabular-nums">
                {filteredOrders.filter(o => !o.is_cancelled).length}
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                {formatCurrency(filteredOrders.filter(o => !o.is_cancelled).reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0))}
              </p>
            </div>
          </div>
        </Card>

        {/* Cancelled Orders - Rose */}
        <Card className="p-5 border-0 shadow-lg bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/20 dark:to-rose-900/10">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600 shadow-lg shadow-rose-500/30 flex-shrink-0">
              <XCircle className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Cancelled</p>
              <p className="text-2xl font-bold text-rose-900 dark:text-rose-100 tabular-nums">
                {filteredOrders.filter(o => o.is_cancelled).length}
              </p>
              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                {formatCurrency(filteredOrders.filter(o => o.is_cancelled).reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0))}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters - Professional Design */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <h3 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">Search & Filter Orders</h3>
          <Button onClick={fetchOrders} variant="ghost" size="sm" className="ml-auto h-8 text-xs gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20">
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-1/2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
          
          <div className="flex gap-4 sm:ml-auto">
            {/* Cancellation Status Filter */}
            <div className="w-full sm:w-[200px]">
              <Select value={cancellationFilter} onValueChange={setCancellationFilter}>
                <SelectTrigger className="h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 rounded-md">
                  <SelectValue placeholder="All Orders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="active">Active Orders</SelectItem>
                  <SelectItem value="cancelled">Cancelled Orders</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Sales Channel Filter - Admin Only */}
            {userRole === 'admin' && (
              <div className="w-full sm:w-[200px]">
                <Select value={salesChannelFilter} onValueChange={setChannelFilter}>
                  <SelectTrigger className="h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 rounded-md">
                    <SelectValue placeholder="All Channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    <SelectItem value="Shopee">Shopee</SelectItem>
                    <SelectItem value="Lazada">Lazada</SelectItem>
                    <SelectItem value="TikTok">TikTok</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Physical Store">Physical Store</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                <Package className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No orders in queue</h3>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                All orders have been packed
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Scroll Hint */}
              <div className="md:hidden px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-100 dark:border-blue-800 mb-4 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center justify-center gap-2 font-medium">
                  <span className="text-blue-500">←</span>
                  <span>Swipe to see all columns • Tap row to highlight</span>
                  <span className="text-blue-500">→</span>
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full table-fixed min-w-[1200px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-black dark:bg-black">
                      <th className="text-left py-4 px-4 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[140px]">
                        Waybill No.
                      </th>
                      <th className="text-left py-4 px-4 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[140px]">
                        Date & Time
                      </th>
                      {!isTeamLeader && (
                        <th className="text-center py-4 px-4 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[110px]">
                          Channel
                        </th>
                      )}
                      <th className="text-left py-4 px-4 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[150px]">
                        Store
                      </th>
                      <th className="text-left py-4 px-4 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[200px]">
                        Product
                      </th>
                      <th className="text-center py-4 px-4 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[80px]">
                        Qty
                      </th>
                      <th className="text-right py-4 px-4 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[120px]">
                        Total
                      </th>
                      <th className="text-center py-4 px-5 text-[11px] font-bold text-white uppercase tracking-wider w-[200px]">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {paginatedOrders.map((order) => (
                      <tr
                        key={order.id}
                        className={`transition-all duration-200 cursor-pointer ${
                          order.is_cancelled 
                            ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                        }`}
                      >
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-start gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                              {order.waybill || order.id || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                              #{(order.id || '').slice(-6).toUpperCase()}
                            </span>
                            {order.is_cancelled && (
                              <Badge className="bg-red-600 text-white text-[9px] px-1.5 py-0 font-bold uppercase">
                                CANCELLED
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                            {parseAsPhilippineTime(order.created_at || order.orderDate || order.date || '').toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: '2-digit', 
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {parseAsPhilippineTime(order.created_at || order.orderDate || order.date || '').toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit', 
                              hour12: true
                            })}
                          </span>
                        </div>
                      </td>
                      {!isTeamLeader && (
                        <td className="py-3 px-4 text-center">
                          <Badge variant="outline" className="text-[10px] font-semibold whitespace-nowrap">
                            {order.sales_channel || order.channel || 'N/A'}
                          </Badge>
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate block">
                          {order.store}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="max-w-full">
                          <p className="text-xs text-slate-900 dark:text-white font-medium line-clamp-2 leading-relaxed">
                            {order.product || order.itemName}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 rounded-md">
                          {order.qty || order.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                          {formatCurrency(order.total || order.totalAmount || 0)}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetailsModal(order)}
                            className="h-10 px-6 rounded-lg font-semibold border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-200 whitespace-nowrap"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            VIEW DETAILS
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
          {filteredOrders.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredOrders.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
      </div>

      {/* Order Details Modal - Professional Design */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 gap-0 flex flex-col">
          {/* Modal Header */}
          <div className="bg-slate-900 dark:bg-slate-950 px-8 py-6 border-b border-slate-700 dark:border-slate-800 flex-shrink-0 relative">
            <div className="flex items-start gap-4 pr-8">
              <DialogHeader className="flex-1">
                <DialogTitle className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-slate-700 dark:bg-slate-600 rounded-lg">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-white">Order Details</span>
                </DialogTitle>
                <p className="text-slate-300 dark:text-slate-400 text-sm mt-2 font-medium">
                  Review and manage order information
                </p>
              </DialogHeader>
            </div>

            {/* Status badges — absolute, bottom-right below X button */}
            {selectedOrder && (
              <div className="absolute bottom-6 right-8 flex items-center gap-2">
                {selectedOrder.is_cancelled ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-red-500/80 text-white border border-red-400/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-white inline-block"></span>
                    Cancelled
                  </span>
                ) : (
                  <>
                    {selectedOrder.restored_by && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/80 text-white border border-blue-400/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-white inline-block"></span>
                        Restored
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/80 text-white border border-emerald-400/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-white inline-block"></span>
                      Active
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {selectedOrder && (
            <>
              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 px-8 py-6">
                <div className="space-y-6">
                  {/* Customer Information Card */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-slate-700 dark:bg-slate-600 rounded-lg">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                        Customer Information
                      </h3>
                    </div>
                    {isEditMode ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                            Full Name
                          </Label>
                          <Input
                            value={editForm.customerName}
                            onChange={(e) => setEditForm({...editForm, customerName: e.target.value})}
                            placeholder="Enter customer name"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                            Phone Number
                          </Label>
                          <Input
                            value={editForm.customerPhone}
                            onChange={(e) => setEditForm({...editForm, customerPhone: e.target.value})}
                            placeholder="Enter contact number"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                            Delivery Address
                          </Label>
                          <textarea
                            value={editForm.customerAddress}
                            onChange={(e) => setEditForm({...editForm, customerAddress: e.target.value})}
                            rows={3}
                            className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter delivery address"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                            Dispatch Notes
                          </Label>
                          <textarea
                            value={editForm.dispatchNotes}
                            onChange={(e) => setEditForm({...editForm, dispatchNotes: e.target.value})}
                            rows={3}
                            className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm resize-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            placeholder="Add any special instructions or notes..."
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Full Name
                          </p>
                          <p className="text-base font-semibold text-slate-900 dark:text-white">
                            {selectedOrder.customerName || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Phone Number
                          </p>
                          <p className="text-base font-mono font-semibold text-slate-900 dark:text-white">
                            {selectedOrder.customerPhone || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Delivery Address
                          </p>
                          <p className="text-base font-medium text-slate-900 dark:text-white leading-relaxed">
                            {selectedOrder.customerAddress || 'N/A'}
                          </p>
                        </div>
                        {selectedOrder.dispatchNotes && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                              Dispatch Notes
                            </p>
                            <p className="text-base font-medium text-slate-900 dark:text-white leading-relaxed">
                              {selectedOrder.dispatchNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Order Information Card */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-slate-700 dark:bg-slate-600 rounded-lg">
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                        Order Information
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Order Number
                        </p>
                        <p className="text-base font-mono font-bold text-slate-900 dark:text-white">
                          #{(selectedOrder.orderNumber || selectedOrder.id || '').slice(-6)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Order Date
                        </p>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">
                          {parseAsPhilippineTime(selectedOrder.created_at || selectedOrder.orderDate || selectedOrder.date || '').toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Product Items
                        </p>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">
                          {selectedOrder.product || selectedOrder.itemName}
                        </p>
                        {isEditMode ? (
                          <div className="mt-2">
                            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                              Quantity {(() => {
                                // Check if order has multiple products
                                const productName = selectedOrder.product || selectedOrder.itemName || ''
                                const hasMultipleProducts = productName.includes(',') || productName.includes('+') || productName.includes('&')
                                return hasMultipleProducts ? '(Read-only for multiple products)' : ''
                              })()}
                            </Label>
                            <Input
                              type="number"
                              value={editForm.quantity}
                              onChange={(e) => {
                                // Check if order has multiple products
                                const productName = selectedOrder.product || selectedOrder.itemName || ''
                                const hasMultipleProducts = productName.includes(',') || productName.includes('+') || productName.includes('&')
                                
                                if (!hasMultipleProducts) {
                                  const newQty = parseInt(e.target.value) || 0
                                  const unitPrice = selectedOrder.total && selectedOrder.qty 
                                    ? selectedOrder.total / selectedOrder.qty 
                                    : 0
                                  setEditForm({
                                    ...editForm, 
                                    quantity: newQty,
                                    totalAmount: newQty * unitPrice
                                  })
                                }
                              }}
                              className="text-sm font-semibold h-10"
                              min="1"
                              disabled={(() => {
                                const productName = selectedOrder.product || selectedOrder.itemName || ''
                                return productName.includes(',') || productName.includes('+') || productName.includes('&')
                              })()}
                              title={(() => {
                                const productName = selectedOrder.product || selectedOrder.itemName || ''
                                const hasMultipleProducts = productName.includes(',') || productName.includes('+') || productName.includes('&')
                                return hasMultipleProducts ? 'Quantity cannot be edited for orders with multiple products' : ''
                              })()}
                            />
                          </div>
                        ) : (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            Qty: {selectedOrder.qty || selectedOrder.quantity}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Total Amount
                        </p>
                        {isEditMode ? (
                          <Input
                            type="number"
                            value={editForm.totalAmount.toFixed(2)}
                            onChange={(e) => setEditForm({...editForm, totalAmount: parseFloat(e.target.value) || 0})}
                            className="text-xl font-bold text-emerald-600 dark:text-emerald-400 h-12"
                            min="0"
                            step="0.01"
                          />
                        ) : (
                          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatCurrency(selectedOrder.total || selectedOrder.totalAmount || 0)}
                          </p>
                        )}
                      </div>
                      {!isTeamLeader && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Sales Channel
                          </p>
                          <Badge variant="secondary" className="text-sm font-semibold">
                            {selectedOrder.sales_channel || selectedOrder.channel || 'N/A'}
                          </Badge>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Store
                        </p>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">
                          {selectedOrder.store}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tracking Information Card */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-slate-700 dark:bg-slate-600 rounded-lg">
                        <Truck className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                        Tracking Information
                      </h3>
                    </div>
                    {isEditMode ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                            Courier
                          </Label>
                          <Input
                            value={editForm.courier}
                            onChange={(e) => setEditForm({...editForm, courier: e.target.value})}
                            placeholder="Enter courier name"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2 block">
                            Waybill Number
                          </Label>
                          <Input
                            value={editForm.waybill}
                            onChange={(e) => setEditForm({...editForm, waybill: e.target.value})}
                            placeholder="Enter waybill number"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Courier Service
                          </p>
                          <p className="text-base font-semibold text-slate-900 dark:text-white">
                            {selectedOrder.courier || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Waybill Number
                          </p>
                          <p className="text-base font-mono font-bold text-purple-600 dark:text-purple-400">
                            {selectedOrder.waybill || 'N/A'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Timeline - Dispatch Information */}
                  {selectedOrder.dispatched_by && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-slate-700 dark:bg-slate-600 rounded-lg">
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                          Timeline
                        </h3>
                      </div>
                      <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Dispatched</p>
                          <p className="text-base font-bold text-slate-900 dark:text-white">{selectedOrder.dispatched_by}</p>
                          {selectedOrder.created_at && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              {parseAsPhilippineTime(selectedOrder.created_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer with Action Buttons - Fixed at bottom */}
              <div className="border-t border-slate-200 dark:border-slate-700 px-8 py-6 bg-slate-50 dark:bg-slate-900/50 flex-shrink-0">
                <div className="space-y-4">
                  {isEditMode ? (
                    <>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                          Save Changes?
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Review your changes before saving. You can cancel to discard changes.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="flex-1 h-12 px-8 rounded-xl font-semibold border-2"
                        >
                          CANCEL
                        </Button>
                        <Button
                          onClick={handleSaveEdit}
                          className="flex-1 h-12 px-8 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
                        >
                          <CheckCircle className="h-5 w-5 mr-3" />
                          SAVE CHANGES
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 tracking-tight">
                          Actions
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {selectedOrder?.is_cancelled 
                            ? userRole === 'logistics-admin'
                              ? 'This order has been cancelled.'
                              : 'This order has been cancelled. You can restore it to allow packing.'
                            : userRole === 'logistics-admin'
                            ? 'View order details below.'
                            : 'Mark this order as packed, cancel it, or delete it from the queue.'}
                        </p>
                      </div>
                      
                      {selectedOrder?.is_cancelled && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                          <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                            ⚠️ Order Cancelled
                          </p>
                          {selectedOrder.cancellation_reason && (
                            <div className="mb-2">
                              <p className="text-xs font-semibold text-red-600 dark:text-red-500 uppercase tracking-wider mb-1">
                                Reason:
                              </p>
                              <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                                {selectedOrder.cancellation_reason}
                              </p>
                            </div>
                          )}
                          {selectedOrder.cancelled_by && (
                            <p className="text-xs text-red-600 dark:text-red-500">
                              Cancelled by: <span className="font-semibold">{selectedOrder.cancelled_by}</span>
                              {selectedOrder.cancelled_at && (
                                <> on {parseAsPhilippineTime(selectedOrder.cancelled_at).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}</>
                              )}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Show restoration info if order was previously cancelled and restored */}
                      {!selectedOrder?.is_cancelled && selectedOrder?.restored_by && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                          <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
                            ✓ Order Restored
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-500">
                            Restored by: <span className="font-semibold">{selectedOrder.restored_by}</span>
                            {selectedOrder.restored_at && (
                              <> on {parseAsPhilippineTime(selectedOrder.restored_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</>
                            )}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                            This order was previously cancelled
                            {selectedOrder.cancelled_at && (
                              <> on {parseAsPhilippineTime(selectedOrder.cancelled_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</>
                            )}
                            {selectedOrder.cancelled_by && (
                              <> by <span className="font-semibold">{selectedOrder.cancelled_by}</span></>
                            )}
                            .
                          </p>
                        </div>
                      )}
                      
                      <div className="flex gap-3">
                        {selectedOrder?.is_cancelled ? (
                          <>
                            {/* UNCANCEL button - For admin and department accounts (operations role) */}
                            {(userRole === 'operations' || userRole === 'admin') && (
                              <Button
                                onClick={handleUncancelOrder}
                                disabled={uncancelling}
                                className="flex-1 h-12 px-8 rounded-xl font-bold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {uncancelling ? (
                                  <>
                                    <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                                    RESTORING...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-5 w-5 mr-3" />
                                    RESTORE ORDER
                                  </>
                                )}
                              </Button>
                            )}
                            
                            {/* DELETE - hidden for logistics-admin */}
                            {userRole !== 'logistics-admin' && (
                              <Button
                                variant="destructive"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="h-12 px-8 rounded-xl font-bold"
                              >
                                DELETE
                              </Button>
                            )}
                          </>
                        ) : (
                          <>
                            {/* MARK AS PACKED - hidden for logistics-admin */}
                            {userRole !== 'logistics-admin' && (
                              <Button
                                onClick={() => {
                                  setShowDetailsModal(false)
                                  openConfirmDialog(selectedOrder)
                                }}
                                className="flex-1 h-12 px-8 rounded-xl font-bold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg"
                              >
                                <CheckCircle className="h-5 w-5 mr-3" />
                                MARK AS PACKED
                              </Button>
                            )}

                            {/* EDIT ORDER - for admin/operations, after mark as packed */}
                            {!isEditMode && userRole !== 'logistics-admin' && (
                              <Button
                                variant="outline"
                                onClick={handleEditMode}
                                className="h-12 px-6 rounded-xl font-bold border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                              >
                                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                EDIT
                              </Button>
                            )}
                            
                            {/* CANCEL button - For admin and department accounts (operations role) */}
                            {(userRole === 'operations' || userRole === 'admin') && (
                              <Button
                                variant="outline"
                                onClick={() => setShowCancelConfirm(true)}
                                className="h-12 px-8 rounded-xl font-bold border-2 border-orange-500 text-orange-600 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-500 dark:hover:bg-orange-950"
                              >
                                CANCEL
                              </Button>
                            )}
                            
                            {/* DELETE - hidden for logistics-admin */}
                            {userRole !== 'logistics-admin' && (
                              <Button
                                variant="destructive"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="h-12 px-8 rounded-xl font-bold"
                              >
                                DELETE
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="max-w-md p-0 gap-0">
          {/* Professional Header with Dark Gradient */}
          <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-6 py-5 border-b border-slate-600">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <span className="text-white">Confirm Packing</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-200 text-sm mt-2 font-medium">
                Are you sure you want to mark order{' '}
                <span className="font-mono font-bold text-white">
                  #{(selectedOrder?.orderNumber || selectedOrder?.id || '').slice(-6)}
                </span>{' '}
                as packed?
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          
          {/* Professional Footer */}
          <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-5 flex justify-end gap-3">
            <AlertDialogCancel className="h-12 px-8 rounded-xl font-semibold border-2">
              CANCEL
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedOrder && handleMarkAsPacked(selectedOrder.id)}
              className="h-12 px-8 rounded-xl font-bold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg"
            >
              CONFIRM
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Professional SaaS Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden border-0">
          {/* Header with gradient background */}
          <div className="relative bg-gradient-to-br from-red-500 via-red-600 to-red-700 px-6 py-5 text-center">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
            <div className="relative">
              <div className="inline-flex items-center justify-center w-14 h-14 mx-auto mb-3 rounded-full bg-white/20 backdrop-blur-sm ring-4 ring-white/30">
                <Trash2 className="h-7 w-7 text-white" strokeWidth={2.5} />
              </div>
              <DialogTitle className="text-xl font-bold !text-white tracking-tight">
                Delete Order
              </DialogTitle>
              <p className="text-white text-xs mt-1.5 font-medium">
                This action is permanent and cannot be undone
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-4">
            <div className="text-center space-y-3">
              <p className="text-slate-700 dark:text-slate-300 font-medium">
                Are you sure you want to delete this order?
              </p>
              {selectedOrder && (
                <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-semibold mb-1">
                    Order Number
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                    #{(selectedOrder.orderNumber || selectedOrder.id || '').slice(-6)}
                  </p>
                  {selectedOrder.product && (
                    <>
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-semibold mb-1 mt-2">
                        Product
                      </p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedOrder.product}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Warning box */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                    Warning: Permanent Action
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    All order data and associated records will be permanently removed from the system.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer with buttons */}
          <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  // Don't clear selectedOrder - keep the Order Details modal open
                }}
                disabled={deleting}
                className="h-11 px-6 font-semibold border-2 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteOrder}
                disabled={deleting}
                className="h-11 px-6 font-semibold bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Please wait...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Order
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={(open) => {
        setShowCancelConfirm(open)
        if (!open) {
          setCancellationReason('') // Reset reason when closing
          setCancellationReasonOther('') // Reset custom reason when closing
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-orange-600 dark:text-orange-400">Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel order{' '}
              <span className="font-mono font-semibold">
                #{(selectedOrder?.orderNumber || selectedOrder?.id || '').slice(-6)}
              </span>?{' '}
              <span className="text-orange-600 dark:text-orange-400 font-semibold">
                This will prevent the order from being packed.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* Cancellation Reason Dropdown */}
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="cancellation-reason" className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                Cancellation Reason <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={cancellationReason} 
                onValueChange={setCancellationReason}
                disabled={cancelling}
              >
                <SelectTrigger className="h-10 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Customer changed mind">Customer changed mind</SelectItem>
                  <SelectItem value="Ordered by mistake">Ordered by mistake</SelectItem>
                  <SelectItem value="Duplicate order">Duplicate order</SelectItem>
                  <SelectItem value="No longer needed">No longer needed</SelectItem>
                  <SelectItem value="Payment not completed">Payment not completed</SelectItem>
                  <SelectItem value="Payment declined">Payment declined</SelectItem>
                  <SelectItem value="COD not confirmed">COD not confirmed</SelectItem>
                  <SelectItem value="Out of stock">Out of stock</SelectItem>
                  <SelectItem value="Item damaged before packing">Item damaged before packing</SelectItem>
                  <SelectItem value="Unable to ship to location">Unable to ship to location</SelectItem>
                  <SelectItem value="Invalid / incomplete address">Invalid / incomplete address</SelectItem>
                  <SelectItem value="Shipping delay issue">Shipping delay issue</SelectItem>
                  <SelectItem value="Pricing or listing error">Pricing or listing error</SelectItem>
                  <SelectItem value="Suspected fraudulent order">Suspected fraudulent order</SelectItem>
                  <SelectItem value="Internal processing issue">Internal processing issue</SelectItem>
                  <SelectItem value="Other (please specify)">Other (please specify)</SelectItem>
                </SelectContent>
              </Select>
              {cancellationReason === '' && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Please select a reason for cancelling this order
                </p>
              )}
            </div>
            
            {/* Show text input if "Other" is selected */}
            {cancellationReason === 'Other (please specify)' && (
              <div>
                <Label htmlFor="cancellation-reason-other" className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                  Please Specify <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="cancellation-reason-other"
                  value={cancellationReasonOther}
                  onChange={(e) => setCancellationReasonOther(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Please provide details..."
                  disabled={cancelling}
                />
              </div>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling} className="h-12 px-8 rounded-xl font-semibold">
              GO BACK
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              disabled={
                cancelling || 
                cancellationReason === '' || 
                (cancellationReason === 'Other (please specify)' && cancellationReasonOther.trim() === '')
              }
              className="h-12 px-8 rounded-xl font-bold bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                  CANCELLING...
                </>
              ) : (
                'CANCEL ORDER'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loading Overlay */}
      <LoadingOverlay 
        show={cancelling || uncancelling} 
        message={cancelling ? 'Cancelling order...' : 'Restoring order...'}
      />
    </div>
  )
}
