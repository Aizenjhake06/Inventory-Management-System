'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { 
  Search, Package, Truck, CheckCircle, Clock, XCircle, RefreshCw, 
  User, Phone, MapPin, AlertCircle, PackageCheck, AlertTriangle, RotateCcw, Eye, Download
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { apiGet } from '@/lib/api-client'
import { BrandLoader } from '@/components/ui/brand-loader'
import { EnterpriseDateRangePicker } from '@/components/ui/enterprise-date-range-picker'
import { TablePagination } from '@/components/ui/table-pagination'
import * as XLSX from 'xlsx'

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerAddress: string
  storeName?: string
  itemName: string
  quantity: number
  totalAmount: number
  orderStatus: 'Pending' | 'Packed'
  parcelStatus: 'PENDING' | 'DELIVERED' | 'ON DELIVERY' | 'PICKUP' | 'IN TRANSIT' | 'CANCELLED' | 'DETAINED' | 'PROBLEMATIC' | 'RETURNED'
  paymentStatus: 'pending' | 'paid' | 'cod' | 'refunded'
  courier?: string
  trackingNumber?: string
  orderDate: string
  notes?: string
  dispatchNotes?: string
  department?: string
  reason?: string // Reason for CANCELLED, RETURNED, PROBLEMATIC
  is_cancelled?: boolean
  cancellation_reason?: string
  cancelled_by?: string
  cancelled_at?: string
}

export default function TrackerDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [salesChannelFilter, setChannelFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showReturnConfirm, setShowReturnConfirm] = useState(false)
  const [returnReason, setReturnReason] = useState('')
  const [returning, setReturning] = useState(false)

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<string>('')
  const [bulkUpdating, setBulkUpdating] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    filterOrders()
    // Clear selections when filters change
    setSelectedIds(new Set())
  }, [searchTerm, statusFilter, salesChannelFilter, startDate, endDate, orders])

  const fetchOrders = async () => {
    try {
      // Fetch only packed orders (ready for tracking)
      const data = await apiGet<any[]>('/api/orders?status=Packed')
      
      // Transform data to match Order interface
      const transformedOrders: Order[] = data.map(order => ({
        id: order.id,
        orderNumber: order.id,
        customerName: order.customer_name || 'N/A',
        customerPhone: order.customer_contact || 'N/A',
        customerAddress: order.customer_address || 'N/A',
        storeName: order.store || 'N/A',
        itemName: order.product || 'N/A',
        quantity: order.qty || 0,
        totalAmount: order.total || 0,
        orderStatus: order.status as 'Pending' | 'Packed',
        parcelStatus: (order.parcel_status || 'PENDING') as any,
        paymentStatus: (order.payment_status || 'pending') as any,
        courier: order.courier || '-',
        trackingNumber: order.waybill || '-',
        orderDate: order.packed_at || order.date,
        notes: JSON.stringify({
          dispatchedBy: order.dispatched_by,
          dispatchedAt: order.created_at,
          packedBy: order.packed_by,
          packedAt: order.packed_at,
          store: order.store
        }),
        dispatchNotes: order.dispatch_notes || '',
        department: order.sales_channel || 'N/A',
        reason: order.reason || '',
        is_cancelled: order.is_cancelled || false,
        cancellation_reason: order.cancellation_reason || '',
        cancelled_by: order.cancelled_by || '',
        cancelled_at: order.cancelled_at || ''
      }))
      
      setOrders(transformedOrders)
      setFilteredOrders(transformedOrders)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, parcelStatus: string, reason?: string) => {
    try {
      // Optimistic update
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, parcelStatus: parcelStatus as any, reason: reason || '' }
            : order
        )
      )
      setFilteredOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, parcelStatus: parcelStatus as any, reason: reason || '' }
            : order
        )
      )

      // Update in background
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parcel_status: parcelStatus,
          reason: reason || null
        }),
      })

      if (!response.ok) {
        // Revert optimistic update on error
        await fetchOrders()
        throw new Error('Failed to update status')
      }

      toast.success('Status updated successfully')
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const updateOrderPaymentStatus = async (orderId: string, paymentStatus: 'pending' | 'paid' | 'cod' | 'refunded') => {
    try {
      // Optimistic update
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, paymentStatus }
            : order
        )
      )
      setFilteredOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, paymentStatus }
            : order
        )
      )

      // Update in background
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_status: paymentStatus
        }),
      })

      if (!response.ok) {
        // Revert optimistic update on error
        await fetchOrders()
        throw new Error('Failed to update payment status')
      }

      toast.success('Payment status updated successfully')
    } catch (error) {
      console.error('Error updating payment status:', error)
      toast.error('Failed to update payment status')
    }
  }

  const handleReturnToQueue = async () => {
    if (!selectedOrder) return

    if (!returnReason.trim()) {
      toast.error('Please provide a reason for returning to queue')
      return
    }

    // Check if user is logged in
    const username = localStorage.getItem('username')
    const userRole = localStorage.getItem('userRole')
    
    if (!username || !userRole) {
      toast.error('Authentication required. Please login again.')
      window.location.href = '/'
      return
    }

    try {
      setReturning(true)

      const response = await fetch(`/api/orders/${selectedOrder.id}/return-to-queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-username': username,
          'x-user-role': userRole,
        },
        body: JSON.stringify({
          reason: returnReason,
          returnedBy: localStorage.getItem('displayName') || username
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to return order to queue')
      }

      toast.success('Order cancelled and returned to packing queue')
      toast.info('Inventory restored • Sales data reverted • Order marked as cancelled')
      
      // Close modals and reset
      setShowReturnConfirm(false)
      setShowDetailsModal(false)
      setReturnReason('')
      setSelectedOrder(null)
      
      // Refresh orders list
      await fetchOrders()
    } catch (error: any) {
      console.error('Error returning to queue:', error)
      toast.error(error.message || 'Failed to return order to queue')
    } finally {
      setReturning(false)
    }
  }

  const filterOrders = () => {
    let filtered = [...orders]
    
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.trackingNumber && order.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.parcelStatus === statusFilter)
    }
    
    if (salesChannelFilter !== 'all') {
      filtered = filtered.filter(order => order.department === salesChannelFilter)
    }
    
    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      filtered = filtered.filter(order => new Date(order.orderDate) >= start)
    }
    
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      filtered = filtered.filter(order => new Date(order.orderDate) <= end)
    }
    
    setFilteredOrders(filtered)
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setChannelFilter('all')
    setStartDate(null)
    setEndDate(null)
    toast.success('Filters cleared')
  }

  // ── Bulk selection helpers ─────────────────────────────────────────────────
  const isAllSelected = paginatedOrders.length > 0 && paginatedOrders.every(o => selectedIds.has(o.id))
  const isIndeterminate = !isAllSelected && paginatedOrders.some(o => selectedIds.has(o.id))

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedOrders.map(o => o.id)))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedIds.size === 0) return
    try {
      setBulkUpdating(true)
      const ids = Array.from(selectedIds)

      // Optimistic update
      const update = (list: Order[]) =>
        list.map(o => selectedIds.has(o.id) ? { ...o, parcelStatus: bulkStatus as any } : o)
      setOrders(update)
      setFilteredOrders(update)

      // Sequential PATCH to preserve audit trail
      await Promise.all(
        ids.map(id =>
          fetch(`/api/orders/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parcel_status: bulkStatus }),
          })
        )
      )

      toast.success(`${ids.length} order${ids.length > 1 ? 's' : ''} updated to "${bulkStatus}"`)
      setSelectedIds(new Set())
      setBulkStatus('')
    } catch (err) {
      console.error('Bulk update error:', err)
      toast.error('Bulk update failed — please try again')
      await fetchOrders()
    } finally {
      setBulkUpdating(false)
    }
  }

  const exportToExcel = () => {
    try {
      // Export only the currently displayed data (paginated)
      const dataToExport = paginatedOrders.map(order => ({
        'Date': new Date(order.orderDate).toLocaleDateString('en-US', { 
          month: 'short', 
          day: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        'Customer Name': order.customerName,
        'Address': order.customerAddress,
        'Contact Number': order.customerPhone,
        'Total Price': formatCurrency(order.totalAmount),
        'Items': order.itemName,
        'Quantity': order.quantity,
        'Courier': order.courier || '-',
        'Tracking Number': order.trackingNumber || '-',
        'Payment Status': order.paymentStatus.toUpperCase(),
        'Parcel Status': order.parcelStatus,
        'Sales Channel': order.department || 'N/A',
        'Store': order.storeName || 'N/A',
      }))

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(dataToExport)
      
      // Set column widths
      const colWidths = [
        { wch: 15 }, // Date
        { wch: 20 }, // Customer Name
        { wch: 40 }, // Address
        { wch: 15 }, // Contact Number
        { wch: 12 }, // Total Price
        { wch: 30 }, // Items
        { wch: 8 },  // Quantity
        { wch: 15 }, // Courier
        { wch: 20 }, // Tracking Number
        { wch: 15 }, // Payment Status
        { wch: 15 }, // Parcel Status
        { wch: 15 }, // Sales Channel
        { wch: 15 }, // Store
      ]
      ws['!cols'] = colWidths

      // Create workbook
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Tracker Orders')

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `Tracker_Orders_Page${currentPage}_${timestamp}.xlsx`

      // Save file
      XLSX.writeFile(wb, filename)

      toast.success(`Exported ${paginatedOrders.length} orders from current page`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export data')
    }
  }

  const getParcelStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      DELIVERED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'ON DELIVERY': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      PICKUP: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'IN TRANSIT': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      DETAINED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      PROBLEMATIC: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      RETURNED: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
    }
    
    const icons = {
      PENDING: Clock,
      DELIVERED: CheckCircle,
      'ON DELIVERY': Truck,
      PICKUP: Package,
      'IN TRANSIT': Truck,
      CANCELLED: XCircle,
      DETAINED: AlertCircle,
      PROBLEMATIC: AlertTriangle,
      RETURNED: RotateCcw,
    }
    
    const Icon = icons[status as keyof typeof icons] || Clock
    const style = styles[status as keyof typeof styles] || styles.PENDING
    
    return (
      <Badge className={`${style} border-0 text-[10px] px-1.5 py-0.5`}>
        <Icon className="h-2.5 w-2.5 mr-1" />
        {status}
      </Badge>
    )
  }

  const openDetailsModal = (order: Order) => {
    setSelectedOrder(order)
    setShowDetailsModal(true)
  }

  const totalOrders = filteredOrders.length
  const deliveredCount = filteredOrders.filter(o => o.parcelStatus === 'DELIVERED').length
  const returnedCount = filteredOrders.filter(o => o.parcelStatus === 'RETURNED').length

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[600px]">
        <div className="text-center">
          <BrandLoader size="lg" />
          <p className="text-slate-600 dark:text-slate-400 mt-6 text-sm font-medium">Loading orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 sm:space-y-6 pt-4 sm:pt-6 px-2 sm:px-4 lg:px-6 pb-6 sm:pb-8">
      {/* Page Header - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-1 sm:mb-2">Tracker Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
            Update parcel status and manage order tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={exportToExcel}
            disabled={paginatedOrders.length === 0}
            className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export to Excel</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <EnterpriseDateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateChange={(start, end) => {
              setStartDate(start)
              setEndDate(end)
            }}
            className="h-10 sm:h-11 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg font-semibold transition-all shadow-sm"
          />
        </div>
      </div>

      {/* KPI Cards - Mobile Optimized */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Orders */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30 flex-shrink-0">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Total Orders</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 tabular-nums">{totalOrders}</p>
              <p className="text-xs text-blue-600 dark:text-blue-500 flex items-center gap-1 mt-0.5">
                <Package className="h-3 w-3" />
                All tracked
              </p>
            </div>
          </div>
        </Card>

        {/* Delivered */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-600 shadow-lg shadow-green-500/30 flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">Delivered</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 tabular-nums">{deliveredCount}</p>
              <p className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1 mt-0.5">
                <CheckCircle className="h-3 w-3" />
                {totalOrders > 0 ? `${Math.round((deliveredCount / totalOrders) * 100)}% rate` : 'No orders'}
              </p>
            </div>
          </div>
        </Card>

        {/* Returned */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-600 shadow-lg shadow-orange-500/30 flex-shrink-0">
              <RotateCcw className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider">Returned</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 tabular-nums">{returnedCount}</p>
              <p className="text-xs text-orange-600 dark:text-orange-500 flex items-center gap-1 mt-0.5">
                <RotateCcw className="h-3 w-3" />
                {totalOrders > 0 ? `${Math.round((returnedCount / totalOrders) * 100)}% rate` : 'No returns'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by order # or tracking #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            {/* Sales Channel Filter */}
            <Select value={salesChannelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="sm:w-48 h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-0">
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

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-48 h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-0">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN TRANSIT">In Transit</SelectItem>
                <SelectItem value="ON DELIVERY">On Delivery</SelectItem>
                <SelectItem value="PICKUP">Pickup</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="DETAINED">Detained</SelectItem>
                <SelectItem value="PROBLEMATIC">Problematic</SelectItem>
                <SelectItem value="RETURNED">Returned</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {(searchTerm || statusFilter !== 'all' || salesChannelFilter !== 'all' || startDate || endDate) && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium whitespace-nowrap"
              >
                Clear Filters
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <CardHeader className="border-b bg-white dark:bg-slate-900 p-3 sm:p-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  Orders Queue
                </CardTitle>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'} ready
                </p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end flex-shrink-0">
                {statusFilter !== 'all' && (
                  <Badge variant="secondary" className="text-xs whitespace-nowrap">
                    {statusFilter}
                  </Badge>
                )}
                {searchTerm && (
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    Searching
                  </Badge>
                )}
                {!searchTerm && statusFilter === 'all' && (
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    All Orders
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {/* Table */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400 font-medium">
                {searchTerm ? 'No matching orders' : 'No orders found'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                {searchTerm ? 'Try different search' : 'All orders tracked! 🎉'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Scroll Hint */}
              <div className="md:hidden px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2 font-medium">
                  <span className="text-slate-500">←</span>
                  <span>Swipe to see all columns • Tap row to highlight</span>
                  <span className="text-blue-500">→</span>
                </p>
              </div>

              <div className="overflow-x-auto">
                {/* Bulk Action Bar — shows when items are selected */}
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/50">
                    <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                      {selectedIds.size} order{selectedIds.size > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-2 ml-auto">
                      <select
                        value={bulkStatus}
                        onChange={e => setBulkStatus(e.target.value)}
                        className="h-8 px-2 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Select new status...</option>
                        <option value="PENDING">Pending</option>
                        <option value="IN TRANSIT">In Transit</option>
                        <option value="ON DELIVERY">On Delivery</option>
                        <option value="PICKUP">Pickup</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="DETAINED">Detained</option>
                        <option value="PROBLEMATIC">Problematic</option>
                        <option value="RETURNED">Returned</option>
                      </select>
                      <button
                        onClick={handleBulkUpdate}
                        disabled={!bulkStatus || bulkUpdating}
                        className="h-8 px-4 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {bulkUpdating ? 'Updating...' : 'Apply to Selected'}
                      </button>
                      <button
                        onClick={() => setSelectedIds(new Set())}
                        className="h-8 px-3 text-xs text-amber-700 dark:text-amber-400 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                <table className="w-full table-fixed">
                  {/* Desktop Header - Hidden on Mobile */}
                  <thead className="sticky top-0 z-10 hidden md:table-header-group">
                    <tr className="bg-slate-900 dark:bg-slate-950 border-b border-slate-700">
                      {/* Checkbox column */}
                      <th className="py-4 px-3 text-center border-r border-slate-700/50" style={{ width: '4%' }}>
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={el => { if (el) el.indeterminate = isIndeterminate }}
                          onChange={toggleSelectAll}
                          className="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer"
                          title="Select all on page"
                        />
                      </th>
                      <th className="text-left py-4 px-2 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50" style={{ width: '7%' }}>
                        Date
                      </th>
                      <th className="text-left py-4 px-2 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50" style={{ width: '10%' }}>
                        Name
                      </th>
                      <th className="text-left py-4 px-2 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50" style={{ width: '18%' }}>
                        Address
                      </th>
                      <th className="text-left py-4 px-2 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50" style={{ width: '9%' }}>
                        Contact No.
                      </th>
                      <th className="text-right py-4 px-2 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50" style={{ width: '8%' }}>
                        Price
                      </th>
                      <th className="text-left py-4 px-2 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50" style={{ width: '16%' }}>
                        Items
                      </th>
                      <th className="text-left py-4 px-2 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50" style={{ width: '12%' }}>
                        Tracking
                      </th>
                      <th className="text-left py-4 px-2 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50" style={{ width: '9%' }}>
                        Payment
                      </th>
                      <th className="text-left py-4 px-2 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50" style={{ width: '11%' }}>
                        Status
                      </th>
                      <th className="text-center py-4 px-2 text-[11px] font-bold text-white uppercase tracking-wider" style={{ width: '11%' }}>
                        Action
                      </th>
                    </tr>
                  </thead>

                  {/* Mobile Header - Only Date, Waybill, Parcel Status, Action */}
                  <thead className="sticky top-0 z-10 md:hidden">
                    <tr className="bg-slate-900 dark:bg-slate-950 border-b border-slate-700">
                      <th className="text-left py-3 px-2 text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50" style={{ width: '15%' }}>
                        Date
                      </th>
                      <th className="text-left py-3 px-2 text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50" style={{ width: '25%' }}>
                        Waybill
                      </th>
                      <th className="text-left py-3 px-2 text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50" style={{ width: '35%' }}>
                        Status
                      </th>
                      <th className="text-center py-3 px-2 text-[10px] font-bold text-white uppercase tracking-wider" style={{ width: '25%' }}>
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {paginatedOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="h-14 transition-all duration-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30"
                      >
                        {/* Desktop View - All Columns */}
                        {/* Checkbox - desktop only */}
                        <td className="py-3 px-3 hidden md:table-cell text-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(order.id)}
                            onChange={() => toggleSelect(order.id)}
                            className="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                              {new Date(order.orderDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: '2-digit', 
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {new Date(order.orderDate).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit', 
                                hour12: true
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell">
                          <span className="text-[11px] text-slate-900 dark:text-white font-medium block truncate max-w-[120px]" title={order.customerName}>
                            {order.customerName}
                          </span>
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell">
                          <span className="text-[11px] text-slate-700 dark:text-slate-300 block truncate max-w-[200px]" title={order.customerAddress}>
                            {order.customerAddress}
                          </span>
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell">
                          <span className="text-[11px] font-mono text-slate-900 dark:text-white font-medium block truncate max-w-[100px]" title={order.customerPhone}>
                            {order.customerPhone}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right hidden md:table-cell">
                          <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                            ₱{order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell">
                          <div className="flex flex-col gap-0.5 max-w-[180px]">
                            <span className="text-[11px] text-slate-900 dark:text-white font-medium truncate" title={order.itemName.replace(/\s*\(\d+\)\s*$/, '')}>
                              {order.itemName.replace(/\s*\(\d+\)\s*$/, '')}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              Qty: {order.quantity}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell">
                          <div className="flex flex-col gap-0.5 max-w-[130px]">
                            <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 truncate" title={order.trackingNumber}>
                              {order.trackingNumber}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {order.courier}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                          <Select 
                            value={order.paymentStatus} 
                            onValueChange={(value) => {
                              updateOrderPaymentStatus(order.id, value as any)
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs border-slate-200 dark:border-slate-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="cod">COD</SelectItem>
                              <SelectItem value="refunded">Refunded</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                          <Select 
                            value={order.parcelStatus} 
                            onValueChange={(value) => {
                              // Update status directly without modal
                              updateOrderStatus(order.id, value)
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs border-slate-200 dark:border-slate-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="IN TRANSIT">In Transit</SelectItem>
                              <SelectItem value="ON DELIVERY">On Delivery</SelectItem>
                              <SelectItem value="PICKUP">Pickup</SelectItem>
                              <SelectItem value="DELIVERED">Delivered</SelectItem>
                              <SelectItem value="CANCELLED">Cancelled</SelectItem>
                              <SelectItem value="DETAINED">Detained</SelectItem>
                              <SelectItem value="PROBLEMATIC">Problematic</SelectItem>
                              <SelectItem value="RETURNED">Returned</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => openDetailsModal(order)}
                              className="h-8 px-3 text-[11px] font-medium border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-200 whitespace-nowrap rounded-lg inline-flex items-center gap-1.5"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View Details
                            </button>
                          </div>
                        </td>

                        {/* Mobile View - Simplified: Date, Waybill, Parcel Status, Action */}
                        <td className="py-3 px-2 md:hidden" style={{ width: '15%' }}>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                              {new Date(order.orderDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: '2-digit'
                              })}
                            </span>
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {new Date(order.orderDate).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit', 
                                hour12: true
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 md:hidden" style={{ width: '25%' }}>
                          <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap block">
                            {order.trackingNumber}
                          </span>
                        </td>
                        <td className="py-3 px-2 md:hidden" style={{ width: '35%' }} onClick={(e) => e.stopPropagation()}>
                          <Select 
                            value={order.parcelStatus} 
                            onValueChange={(value) => {
                              updateOrderStatus(order.id, value)
                            }}
                          >
                            <SelectTrigger className="h-8 text-[10px] border-slate-200 dark:border-slate-700 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="IN TRANSIT">In Transit</SelectItem>
                              <SelectItem value="ON DELIVERY">On Delivery</SelectItem>
                              <SelectItem value="PICKUP">Pickup</SelectItem>
                              <SelectItem value="DELIVERED">Delivered</SelectItem>
                              <SelectItem value="CANCELLED">Cancelled</SelectItem>
                              <SelectItem value="DETAINED">Detained</SelectItem>
                              <SelectItem value="PROBLEMATIC">Problematic</SelectItem>
                              <SelectItem value="RETURNED">Returned</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-2 md:hidden" style={{ width: '25%' }}>
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => openDetailsModal(order)}
                              className="h-8 px-2 text-[9px] font-medium border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 whitespace-nowrap rounded inline-flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </button>
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
        </CardContent>
      </Card>

      {/* Order Details Modal - Professional Design */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 gap-0">
          {/* Modal Header */}
          <div className="bg-slate-900 dark:bg-slate-950 px-8 py-6 border-b border-slate-700 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <span className="text-white">Order Details</span>
              </DialogTitle>
              <p className="text-slate-200 text-sm mt-2 font-medium">
                View and update order tracking information
              </p>
            </DialogHeader>
          </div>

          {selectedOrder && (
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-8 py-6">
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
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Full Name
                      </p>
                      <p className="text-base font-semibold text-slate-900 dark:text-white">
                        {selectedOrder.customerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Phone Number
                      </p>
                      <p className="text-base font-mono font-semibold text-slate-900 dark:text-white">
                        {selectedOrder.customerPhone}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Delivery Address
                      </p>
                      <p className="text-base font-medium text-slate-900 dark:text-white leading-relaxed">
                        {selectedOrder.customerAddress}
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
                        #{selectedOrder.id.slice(-6)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Order Date
                      </p>
                      <p className="text-base font-semibold text-slate-900 dark:text-white">
                        {new Date(selectedOrder.orderDate).toLocaleDateString('en-US', { 
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
                        {selectedOrder.itemName.replace(/\s*\(\d+\)\s*$/, '')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Quantity
                      </p>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {selectedOrder.quantity}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Total Amount
                      </p>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatCurrency(selectedOrder.totalAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Sales Channel
                      </p>
                      <Badge className="bg-slate-700 dark:bg-slate-600 text-white border-0 text-sm font-semibold px-3 py-1.5">
                        {selectedOrder.department || 'N/A'}
                      </Badge>
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
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Courier Service
                      </p>
                      <p className="text-base font-semibold text-slate-900 dark:text-white">
                        {selectedOrder.courier}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Tracking Number
                      </p>
                      <p className="text-base font-mono font-bold text-purple-600 dark:text-purple-400">
                        {selectedOrder.trackingNumber}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timeline Section */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-slate-700 dark:bg-slate-600 rounded-lg">
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                      Timeline
                    </h3>
                  </div>
                  {(() => {
                    try {
                      const notesData = JSON.parse(selectedOrder.notes || '{}')
                      return (
                        <div className="grid grid-cols-2 gap-4">
                          {/* Dispatched */}
                          <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-amber-800">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Dispatched</p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{notesData.dispatchedBy || 'N/A'}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                {notesData.dispatchedAt ? new Date(notesData.dispatchedAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'N/A'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Packed */}
                          <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-amber-800">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                              <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Packed</p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{notesData.packedBy || 'N/A'}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                {notesData.packedAt ? new Date(notesData.packedAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    } catch (e) {
                      return (
                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                          No timeline information available
                        </p>
                      )
                    }
                  })()}
                </div>

                {/* Cancelled Info Section - shown when order was returned to queue (is_cancelled) */}
                {selectedOrder.is_cancelled && (
                  <div className="rounded-lg p-5 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                    <div className="mb-3">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Actions</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                        This order has been cancelled. It was returned to the packing queue.
                      </p>
                    </div>
                    <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-2">
                      <p className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                        ⚠️ Order Cancelled
                      </p>
                      {selectedOrder.cancellation_reason && (
                        <div>
                          <p className="text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-wider mb-0.5">Reason:</p>
                          <p className="text-sm font-bold text-red-700 dark:text-red-400">{selectedOrder.cancellation_reason}</p>
                        </div>
                      )}
                      <p className="text-xs text-red-600 dark:text-red-500">
                        {selectedOrder.cancelled_by
                          ? <>Cancelled by: <span className="font-semibold">{selectedOrder.cancelled_by}</span></>
                          : <span className="italic">Cancelled by: Unknown</span>
                        }
                        {selectedOrder.cancelled_at && (
                          <> on {new Date(selectedOrder.cancelled_at + (!selectedOrder.cancelled_at.includes('+') && !selectedOrder.cancelled_at.includes('Z') ? '+08:00' : '')).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}</>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Update Status Section */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
                    Update Parcel Status
                  </h3>
                  <div className="space-y-5">
                    <div>
                      <Label htmlFor="status" className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                        Parcel Status
                      </Label>
                      <Select 
                        value={selectedOrder.parcelStatus} 
                        onValueChange={(value) => {
                          setSelectedOrder({ ...selectedOrder, parcelStatus: value as any })
                        }}
                      >
                        <SelectTrigger id="status" className="h-12 text-base font-medium border-2 border-slate-300 dark:border-slate-600 focus:border-slate-400 dark:focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING" className="text-base">Pending</SelectItem>
                          <SelectItem value="IN TRANSIT" className="text-base">In Transit</SelectItem>
                          <SelectItem value="ON DELIVERY" className="text-base">On Delivery</SelectItem>
                          <SelectItem value="PICKUP" className="text-base">Pickup</SelectItem>
                          <SelectItem value="DELIVERED" className="text-base">Delivered</SelectItem>
                          <SelectItem value="CANCELLED" className="text-base">Cancelled</SelectItem>
                          <SelectItem value="DETAINED" className="text-base">Detained</SelectItem>
                          <SelectItem value="PROBLEMATIC" className="text-base">Problematic</SelectItem>
                          <SelectItem value="RETURNED" className="text-base">Returned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Reason field - shown for CANCELLED, RETURNED, PROBLEMATIC */}
                    {['CANCELLED', 'RETURNED', 'PROBLEMATIC'].includes(selectedOrder.parcelStatus) && (
                      <div className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
                        <Label htmlFor="reason" className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                          Reason <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="reason"
                          placeholder="Please provide a detailed reason for this status..."
                          value={selectedOrder.reason || ''}
                          onChange={(e) => setSelectedOrder({ ...selectedOrder, reason: e.target.value })}
                          rows={4}
                          className="text-base border-2 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          This information will be recorded for tracking purposes
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons - Outside card, side by side, right aligned */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowReturnConfirm(true)}
                    className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 text-sm border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Return to Queue
                  </button>
                  
                  <button
                    onClick={() => {
                      updateOrderStatus(
                        selectedOrder.id, 
                        selectedOrder.parcelStatus,
                        ['CANCELLED', 'RETURNED', 'PROBLEMATIC'].includes(selectedOrder.parcelStatus) 
                          ? selectedOrder.reason 
                          : undefined
                      )
                      setShowDetailsModal(false)
                    }}
                    className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 text-sm border border-transparent hover:border-slate-700 dark:hover:border-slate-200"
                  >
                    Update Status
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Return to Queue Confirmation Dialog */}
      <AlertDialog open={showReturnConfirm} onOpenChange={setShowReturnConfirm}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <AlertDialogTitle className="text-xl font-bold">Return to Packing Queue?</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="text-base text-slate-600 dark:text-slate-400">
                <p className="mb-3">This action will:</p>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  <li>Change order status from <strong>Packed</strong> to <strong>Pending</strong></li>
                  <li>Restore inventory quantity</li>
                  <li>Remove from sales calculations</li>
                  <li>Clear packing information</li>
                  <li>Update all dashboard metrics</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4">
            <Label htmlFor="return-reason" className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
              Reason for Return <span className="text-red-500">*</span>
            </Label>
            <Select
              value={returnReason}
              onValueChange={setReturnReason}
            >
              <SelectTrigger className="text-sm border-2 border-slate-300 dark:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 h-11">
                <SelectValue placeholder="Select a reason for returning to queue..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Customer cancellation">Customer cancellation</SelectItem>
                <SelectItem value="Wrong / incomplete address">Wrong / incomplete address</SelectItem>
                <SelectItem value="Unreachable customer">Unreachable customer</SelectItem>
                <SelectItem value="Payment issues (failed / COD risk)">Payment issues (failed / COD risk)</SelectItem>
                <SelectItem value="Courier unavailable / pickup delay">Courier unavailable / pickup delay</SelectItem>
                <SelectItem value="Packing error (wrong item)">Packing error (wrong item)</SelectItem>
                <SelectItem value="Duplicate order">Duplicate order</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              This will be recorded in activity logs for accountability
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={returning}
              className="px-6 py-3 text-base font-semibold"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReturnToQueue}
              disabled={returning || !returnReason.trim()}
              className="px-6 py-3 text-base font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900"
            >
              {returning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Confirm Return
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
