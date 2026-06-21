'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Search, Package, Truck, CheckCircle, Clock, XCircle, RefreshCw, 
  User, Phone, Mail, MapPin, AlertCircle, PackageCheck, Ban, AlertTriangle, RotateCcw,
  Calendar, Eye, FileText
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { apiGet } from '@/lib/api-client'
import { BrandLoader } from '@/components/ui/brand-loader'
import { EnterpriseDateRangePicker } from '@/components/ui/enterprise-date-range-picker'
import * as XLSX from 'xlsx'
import { TablePagination } from '@/components/ui/table-pagination'

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail?: string
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
  estimatedDelivery?: string
  deliveryDate?: string
  notes?: string
  dispatchNotes?: string
  department?: string
}

export default function LogisticsTrackOrdersPage() {
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    fetchOrders()
    
    // Set up polling to refresh orders every 1 second for real-time sync
    const pollInterval = setInterval(() => {
      fetchOrders()
    }, 1000)
    
    return () => clearInterval(pollInterval)
  }, [])

  useEffect(() => {
    filterOrders()
  }, [searchTerm, statusFilter, salesChannelFilter, startDate, endDate, orders])

  const fetchOrders = async () => {
    try {
      const data = await apiGet<any[]>('/api/orders?status=Packed')
      
      const transformedOrders: Order[] = data.map(order => ({
        id: order.id,
        orderNumber: order.id,
        customerName: order.customer_name || 'N/A',
        customerPhone: order.customer_contact || 'N/A',
        customerEmail: undefined,
        customerAddress: order.customer_address || 'N/A',
        storeName: order.store || 'N/A',
        itemName: order.product ? order.product.replace(/\s*\(\d+\)\s*$/, '') : 'N/A',
        quantity: order.qty || 0,
        totalAmount: order.total || 0,
        orderStatus: order.status as 'Pending' | 'Packed',
        parcelStatus: (order.parcel_status || 'PENDING') as any,
        paymentStatus: (order.payment_status || 'pending') as any,
        courier: order.courier || '-',
        trackingNumber: order.waybill || '-',
        orderDate: order.packed_at || order.date,
        estimatedDelivery: undefined,
        deliveryDate: order.status === 'Delivered' ? order.updated_at : undefined,
        notes: JSON.stringify({
          dispatchedBy: order.dispatched_by,
          dispatchedAt: order.created_at,
          packedBy: order.packed_by,
          packedAt: order.packed_at,
          store: order.store
        }),
        dispatchNotes: order.dispatch_notes || '',
        department: order.sales_channel || 'N/A'
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

  const filterOrders = () => {
    let filtered = [...orders]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term) ||
        order.itemName.toLowerCase().includes(term) ||
        order.trackingNumber?.toLowerCase().includes(term)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.parcelStatus === statusFilter)
    }

    if (salesChannelFilter !== 'all') {
      filtered = filtered.filter(order => order.department === salesChannelFilter)
    }

    if (startDate) {
      filtered = filtered.filter(order => new Date(order.orderDate) >= startDate)
    }

    if (endDate) {
      const endOfDay = new Date(endDate)
      endOfDay.setHours(23, 59, 59, 999)
      filtered = filtered.filter(order => new Date(order.orderDate) <= endOfDay)
    }

    setFilteredOrders(filtered)
  }

  const updateOrderStatus = async (orderId: string, status?: string, parcelStatus?: string, paymentStatus?: string) => {
    try {
      // Optimistic update - update UI immediately
      if (parcelStatus) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { ...order, parcelStatus: parcelStatus as any }
              : order
          )
        )
      }

      if (paymentStatus) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { ...order, paymentStatus: paymentStatus as any }
              : order
          )
        )
      }

      // Update in backend
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          parcel_status: parcelStatus,
          payment_status: paymentStatus
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
      'PENDING': { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
      'IN TRANSIT': { label: 'In Transit', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Truck },
      'ON DELIVERY': { label: 'On Delivery', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Package },
      'PICKUP': { label: 'For Pickup', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', icon: PackageCheck },
      'DELIVERED': { label: 'Delivered', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
      'CANCELLED': { label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
      'DETAINED': { label: 'Detained', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Ban },
      'PROBLEMATIC': { label: 'Problematic', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', icon: AlertTriangle },
      'RETURNED': { label: 'Returned', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: RotateCcw }
    }

    const config = statusConfig[status] || statusConfig['PENDING']
    const Icon = config.icon

    return (
      <Badge className={`${config.color} font-medium px-2.5 py-1 flex items-center gap-1.5 w-fit`}>
        <Icon className="h-3.5 w-3.5" />
        {config.label}
      </Badge>
    )
  }

  const getPaymentBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      'pending': { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
      'paid': { label: 'Paid', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      'cod': { label: 'COD', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      'refunded': { label: 'Refunded', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
    }

    const config = statusConfig[status] || statusConfig['pending']

    return (
      <Badge className={`${config.color} font-medium px-2.5 py-1`}>
        {config.label}
      </Badge>
    )
  }

  const exportToExcel = () => {
    try {
      const wsData: any[][] = []
      
      wsData.push(['TRACK ORDERS REPORT'])
      wsData.push([`Generated: ${new Date().toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`])
      wsData.push([`Total Orders: ${filteredOrders.length}`])
      wsData.push([])
      
      wsData.push(['No.', 'Order #', 'Date', 'Sales Channel', 'Customer', 'Product', 'Qty', 'Amount', 'Courier', 'Waybill', 'Payment', 'Status'])
      
      filteredOrders.forEach((order, index) => {
        wsData.push([
          index + 1,
          `#${order.id.slice(-6)}`,
          new Date(order.orderDate).toLocaleDateString('en-US', { 
            month: '2-digit', 
            day: '2-digit', 
            year: '2-digit'
          }) + ' ' + new Date(order.orderDate).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false
          }),
          order.department || 'N/A',
          order.customerName,
          order.itemName,
          order.quantity,
          order.totalAmount.toFixed(2),
          order.courier || '-',
          order.trackingNumber || '-',
          order.paymentStatus.toUpperCase(),
          order.parcelStatus
        ])
      })

      const ws = XLSX.utils.aoa_to_sheet(wsData)
      ws['!cols'] = [
        { wch: 5 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
        { wch: 30 }, { wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 20 },
        { wch: 15 }, { wch: 15 }
      ]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Track Orders')
      XLSX.writeFile(wb, `Track_Orders_${new Date().toISOString().split('T')[0]}.xlsx`)

      toast.success('Excel report downloaded successfully')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      toast.error('Failed to export Excel report')
    }
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-3 py-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <BrandLoader size="lg" />
            <p className="text-slate-600 dark:text-slate-400 mt-6 text-sm font-medium">Loading orders...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-3 py-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold gradient-text">Track Orders Overview</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Monitor all packed orders and their delivery status</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6 border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-5">
            <Search className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">Search & Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN TRANSIT">In Transit</SelectItem>
                <SelectItem value="ON DELIVERY">On Delivery</SelectItem>
                <SelectItem value="PICKUP">For Pickup</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="DETAINED">Detained</SelectItem>
                <SelectItem value="PROBLEMATIC">Problematic</SelectItem>
                <SelectItem value="RETURNED">Returned</SelectItem>
              </SelectContent>
            </Select>

            <Select value={salesChannelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="h-10 border-slate-200 dark:border-slate-700">
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

            <EnterpriseDateRangePicker
              startDate={startDate}
              endDate={endDate}
              onDateChange={(start, end) => {
                setStartDate(start)
                setEndDate(end)
              }}
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
              Showing <span className="font-bold text-slate-900 dark:text-white">{filteredOrders.length}</span> of <span className="font-bold text-slate-900 dark:text-white">{orders.length}</span> orders
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <CardTitle className="flex items-center gap-3 text-lg font-bold text-slate-900 dark:text-white">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-md shadow-purple-500/30">
              <Package className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            Orders List
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                <Package className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">No orders found</p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900 dark:bg-black border-b-2 border-slate-700">
                    <th className="py-2.5 px-3 text-left font-bold text-[10px] text-white uppercase tracking-wider">Date</th>
                    <th className="py-2.5 px-3 text-left font-bold text-[10px] text-white uppercase tracking-wider">Name</th>
                    <th className="py-2.5 px-3 text-left font-bold text-[10px] text-white uppercase tracking-wider">Address</th>
                    <th className="py-2.5 px-3 text-left font-bold text-[10px] text-white uppercase tracking-wider">Contact No.</th>
                    <th className="py-2.5 px-3 text-left font-bold text-[10px] text-white uppercase tracking-wider">Price</th>
                    <th className="py-2.5 px-3 text-left font-bold text-[10px] text-white uppercase tracking-wider">Items</th>
                    <th className="py-2.5 px-3 text-left font-bold text-[10px] text-white uppercase tracking-wider">Tracking</th>
                    <th className="py-2.5 px-3 text-left font-bold text-[10px] text-white uppercase tracking-wider">Payment</th>
                    <th className="py-2.5 px-3 text-left font-bold text-[10px] text-white uppercase tracking-wider">Status</th>
                    <th className="py-2.5 px-3 text-center font-bold text-[10px] text-white uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors duration-150 h-14">
                      <td className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        <div className="whitespace-nowrap">
                          {new Date(order.orderDate).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: '2-digit', 
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-[10px] text-slate-500">{new Date(order.orderDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                      </td>
                      <td className="py-2 px-3 text-[11px] font-medium text-slate-900 dark:text-slate-100">
                        <div className="max-w-[120px] truncate" title={order.customerName}>{order.customerName}</div>
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-700 dark:text-slate-300">
                        <div className="max-w-[180px] truncate" title={order.customerAddress}>{order.customerAddress}</div>
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-600 dark:text-slate-400">
                        <div className="max-w-[110px] truncate" title={order.customerPhone}>{order.customerPhone}</div>
                      </td>
                      <td className="py-2 px-3 text-[11px] font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{formatCurrency(order.totalAmount)}</td>
                      <td className="py-2 px-3 text-[11px] text-slate-700 dark:text-slate-300">
                        <div className="max-w-[150px]">
                          <div className="truncate font-medium" title={order.itemName}>{order.itemName}</div>
                          <div className="text-[10px] text-slate-500">Qty: {order.quantity}</div>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                        <div className="max-w-[100px] truncate" title={order.trackingNumber}>{order.trackingNumber}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5 truncate">{order.courier || 'Flash'}</div>
                      </td>
                      <td className="py-2 px-3">
                        <Select 
                          value={order.paymentStatus} 
                          onValueChange={(value) => updateOrderStatus(order.id, undefined, undefined, value)}
                        >
                          <SelectTrigger className="h-7 w-[85px] text-[10px] border-slate-200 dark:border-slate-700">
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
                      <td className="py-2 px-3">
                        <Select 
                          value={order.parcelStatus} 
                          onValueChange={(value) => updateOrderStatus(order.id, undefined, value, undefined)}
                        >
                          <SelectTrigger className="h-7 w-[100px] text-[10px] border-slate-200 dark:border-slate-700">
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
                      <td className="py-2 px-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order)
                            setShowDetailsModal(true)
                          }}
                          className="h-7 px-3 text-[10px] hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300"
                        >
                          👁️ View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {/* Professional Header with Dark Gradient */}
          <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-6 py-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
            <div className="relative">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30">
                    <Package className="h-6 w-6 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold text-white tracking-tight !text-white">Order Details</DialogTitle>
                    <p className="text-slate-200 text-sm mt-0.5 font-medium !text-slate-200">Complete order information and tracking</p>
                  </div>
                </div>
              </DialogHeader>
            </div>
          </div>

          {selectedOrder && (
            <div className="space-y-6 p-6">
              {/* Order Header Info */}
              <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Order Number</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">#{selectedOrder.id.slice(-6)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Order Date</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    {new Date(selectedOrder.orderDate).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric'
                    })}
                    <span className="text-sm text-slate-600 dark:text-slate-400 ml-2">
                      {new Date(selectedOrder.orderDate).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit'
                      })}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Sales Channel</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">{selectedOrder.department}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Status</p>
                  {getStatusBadge(selectedOrder.parcelStatus)}
                </div>
              </div>

              {/* Customer Information */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Customer Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{selectedOrder.customerName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{selectedOrder.customerPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Address</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5 leading-relaxed">{selectedOrder.customerAddress}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Information */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Order Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-start py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Product:</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white text-right">{selectedOrder.itemName}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Quantity:</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedOrder.quantity}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Total Amount:</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedOrder.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Payment Status:</span>
                    {getPaymentBadge(selectedOrder.paymentStatus)}
                  </div>
                </div>
              </div>

              {/* Shipping Information */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Shipping Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Courier:</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedOrder.courier}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Waybill Number:</span>
                    <span className="text-sm font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded">{selectedOrder.trackingNumber}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.dispatchNotes && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-amber-50 dark:bg-amber-900/10">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    Notes
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{selectedOrder.dispatchNotes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
