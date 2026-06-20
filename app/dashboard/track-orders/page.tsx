'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import * as XLSX from 'xlsx'
import { 
  Search, Package, Truck, CheckCircle, Clock, XCircle, RefreshCw, 
  User, Phone, Mail, MapPin, AlertCircle, PackageCheck, Ban, AlertTriangle, RotateCcw,
  FileSpreadsheet, FileDown, Download, Trash2, ChevronDown, X, Calendar
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { apiGet } from '@/lib/api-client'
import { BrandLoader } from '@/components/ui/brand-loader'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { EnterpriseDateRangePicker } from '@/components/ui/enterprise-date-range-picker'
import { getCurrentUserRole, getAuthHeaders } from '@/lib/role-utils'
import { format } from 'date-fns'
import { TablePagination } from '@/components/ui/table-pagination'

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  customerAddress: string
  storeName?: string // Store name from notes
  itemName: string
  quantity: number
  totalAmount: number
  cogs?: number // ACTUAL cost of goods sold from database
  orderStatus: 'Pending' | 'Packed'
  parcelStatus: 'PENDING' | 'DELIVERED' | 'ON DELIVERY' | 'PICKUP' | 'IN TRANSIT' | 'CANCELLED' | 'DETAINED' | 'PROBLEMATIC' | 'RETURNED'
  paymentStatus: 'pending' | 'paid' | 'cod' | 'refunded'
  courier?: string
  trackingNumber?: string
  orderDate: string
  estimatedDelivery?: string
  deliveryDate?: string
  notes?: string
  dispatchNotes?: string // User notes from dispatch form
  department?: string // Sales channel (Shopee, Lazada, Flash, etc.)
}

export default function TrackOrdersPage() {
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerContact: '',
    customerAddress: '',
    courier: '',
    trackingNumber: '',
    dispatchNotes: '',
    quantity: 0,
    totalAmount: 0
  })

  // Role detection
  const userRole = getCurrentUserRole()
  const isTeamLeader = false // Team leader role removed

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
      // Get current user info for filtering
      const currentUserStr = localStorage.getItem('currentUser')
      const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null
      const userRole = currentUser?.role
      const assignedChannel = currentUser?.assignedChannel
      
      // Team leaders use their own API endpoint
      if (isTeamLeader) {
        const headers = getAuthHeaders()
        const response = await fetch('/api/team-leader/orders', {
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch orders')
        }

        // Transform team leader orders to match Order interface
        const transformedOrders: Order[] = (data.orders || []).map((order: any) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          customerAddress: order.customerAddress,
          storeName: order.channel,
          itemName: order.itemName,
          quantity: order.quantity,
          totalAmount: order.totalAmount,
          cogs: order.cogs || 0, // ACTUAL COGS from database
          orderStatus: order.orderStatus === 'pending' ? 'Pending' : 'Packed',
          parcelStatus: (order.parcelStatus || order.parcel_status || 'PENDING') as any, // Use parcelStatus from API
          paymentStatus: order.paymentStatus as any,
          courier: order.courier || '-',
          trackingNumber: order.trackingNumber || '-',
          orderDate: order.orderDate,
          estimatedDelivery: order.estimatedDelivery,
          deliveryDate: order.deliveryDate,
          notes: order.notes,
          dispatchNotes: '',
          department: order.channel
        }))

        setOrders(transformedOrders)
        setFilteredOrders(transformedOrders)
        setLoading(false)
        return
      }

      // Fetch only packed orders (ready for tracking)
      const data = await apiGet<any[]>('/api/orders?status=Packed')
      
      // Transform data to match Order interface
      let transformedOrders: Order[] = data.map(order => ({
        id: order.id,
        orderNumber: order.id,
        customerName: order.customer_name || 'N/A',
        customerPhone: order.customer_contact || 'N/A',
        customerEmail: undefined,
        customerAddress: order.customer_address || 'N/A',
        storeName: order.store || 'N/A', // Store name
        itemName: order.product ? order.product.replace(/\s*\(\d+\)\s*$/, '') : 'N/A', // Product name - remove (quantity) suffix
        quantity: order.qty || 0,
        totalAmount: order.total || 0,
        cogs: order.cogs || 0, // ACTUAL COGS from database
        orderStatus: order.status as 'Pending' | 'Packed',
        parcelStatus: (order.parcel_status || 'PENDING') as any,
        paymentStatus: (order.payment_status || 'pending') as any,
        courier: order.courier || '-',
        trackingNumber: order.waybill || '-',
        orderDate: order.packed_at || order.date, // Use packed_at timestamp (when marked as packed) instead of original order date
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
      
      // Filter by assigned channel for dept-manager and operations roles
      if (userRole === 'dept-manager' || userRole === 'operations') {
        if (assignedChannel) {
          transformedOrders = transformedOrders.filter(order => order.department === assignedChannel)
        }
      }
      
      setOrders(transformedOrders)
      setFilteredOrders(transformedOrders)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
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
        setFilteredOrders(prevOrders => 
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
        setFilteredOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { ...order, paymentStatus: paymentStatus as any }
              : order
          )
        )
      }

      // Update in background
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

      const updatedOrder = await response.json()
      console.log('[Track Orders] Order updated:', updatedOrder)

      toast.success('Status updated successfully')
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const exportToExcel = () => {
    try {
      // Calculate financial totals using ACTUAL COGS from orders
      const totalQuantity = filteredOrders.reduce((sum, order) => sum + order.quantity, 0)
      const totalAmount = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0)
      const totalCOGS = filteredOrders.reduce((sum, order) => sum + (order.cogs || 0), 0) // Use actual COGS
      const totalProfit = totalAmount - totalCOGS
      const totalProfitMargin = totalAmount > 0 ? ((totalProfit / totalAmount) * 100) : 0

      // Calculate per-status financials using ACTUAL COGS
      const getStatusFinancials = (statusOrders: Order[]) => {
        const qty = statusOrders.reduce((sum, o) => sum + o.quantity, 0)
        const amt = statusOrders.reduce((sum, o) => sum + o.totalAmount, 0)
        const cogs = statusOrders.reduce((sum, o) => sum + (o.cogs || 0), 0) // Use actual COGS
        const profit = amt - cogs
        const margin = amt > 0 ? ((profit / amt) * 100) : 0
        return { qty, amt, cogs, profit, margin }
      }

      const pendingFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'PENDING'))
      const inTransitFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'IN TRANSIT'))
      const onDeliveryFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'ON DELIVERY'))
      const pickupFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'PICKUP'))
      const deliveredFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'DELIVERED'))
      const cancelledFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'CANCELLED'))
      const detainedFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'DETAINED'))
      const problematicFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'PROBLEMATIC'))
      const returnedFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'RETURNED'))

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()
      const wsData: any[][] = []

      // Header Section
      wsData.push(['TRACK ORDERS REPORT - COMPREHENSIVE DATA'])
      wsData.push([`Generated: ${new Date().toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`])
      wsData.push([`Total Orders: ${filteredOrders.length}`])
      wsData.push([]) // Empty row

      // Financial Summary Section
      wsData.push(['FINANCIAL SUMMARY'])
      wsData.push(['Metric', 'Value'])
      wsData.push(['Total Quantity', totalQuantity])
      wsData.push(['Total Amount', totalAmount.toFixed(2)])
      wsData.push(['Total COGS', totalCOGS.toFixed(2)])
      wsData.push(['Total Profit', totalProfit.toFixed(2)])
      wsData.push(['Profit Margin', `${totalProfitMargin.toFixed(2)}%`])
      wsData.push([]) // Empty row

      // Status Breakdown Section
      wsData.push(['STATUS BREAKDOWN'])
      wsData.push(['Status', 'Orders', 'Quantity', 'Amount', 'COGS', 'Profit', '% of Total'])
      
      // Calculate percentage of total orders for each status
      const totalOrdersCount = filteredOrders.length
      const pendingCount = filteredOrders.filter(o => o.parcelStatus === 'PENDING').length
      const inTransitCount = filteredOrders.filter(o => o.parcelStatus === 'IN TRANSIT').length
      const onDeliveryCount = filteredOrders.filter(o => o.parcelStatus === 'ON DELIVERY').length
      const pickupCount = filteredOrders.filter(o => o.parcelStatus === 'PICKUP').length
      const deliveredCount = filteredOrders.filter(o => o.parcelStatus === 'DELIVERED').length
      const cancelledCount = filteredOrders.filter(o => o.parcelStatus === 'CANCELLED').length
      const detainedCount = filteredOrders.filter(o => o.parcelStatus === 'DETAINED').length
      const problematicCount = filteredOrders.filter(o => o.parcelStatus === 'PROBLEMATIC').length
      const returnedCount = filteredOrders.filter(o => o.parcelStatus === 'RETURNED').length
      
      wsData.push(['Total Orders', totalOrdersCount, totalQuantity, totalAmount.toFixed(2), totalCOGS.toFixed(2), totalProfit.toFixed(2), '100.00%'])
      wsData.push(['Pending', pendingCount, pendingFinancials.qty, pendingFinancials.amt.toFixed(2), pendingFinancials.cogs.toFixed(2), pendingFinancials.profit.toFixed(2), `${totalOrdersCount > 0 ? ((pendingCount / totalOrdersCount) * 100).toFixed(2) : '0.00'}%`])
      wsData.push(['In Transit', inTransitCount, inTransitFinancials.qty, inTransitFinancials.amt.toFixed(2), inTransitFinancials.cogs.toFixed(2), inTransitFinancials.profit.toFixed(2), `${totalOrdersCount > 0 ? ((inTransitCount / totalOrdersCount) * 100).toFixed(2) : '0.00'}%`])
      wsData.push(['On Delivery', onDeliveryCount, onDeliveryFinancials.qty, onDeliveryFinancials.amt.toFixed(2), onDeliveryFinancials.cogs.toFixed(2), onDeliveryFinancials.profit.toFixed(2), `${totalOrdersCount > 0 ? ((onDeliveryCount / totalOrdersCount) * 100).toFixed(2) : '0.00'}%`])
      wsData.push(['Pickup', pickupCount, pickupFinancials.qty, pickupFinancials.amt.toFixed(2), pickupFinancials.cogs.toFixed(2), pickupFinancials.profit.toFixed(2), `${totalOrdersCount > 0 ? ((pickupCount / totalOrdersCount) * 100).toFixed(2) : '0.00'}%`])
      wsData.push(['Delivered', deliveredCount, deliveredFinancials.qty, deliveredFinancials.amt.toFixed(2), deliveredFinancials.cogs.toFixed(2), deliveredFinancials.profit.toFixed(2), `${totalOrdersCount > 0 ? ((deliveredCount / totalOrdersCount) * 100).toFixed(2) : '0.00'}%`])
      wsData.push(['Cancelled', cancelledCount, cancelledFinancials.qty, cancelledFinancials.amt.toFixed(2), cancelledFinancials.cogs.toFixed(2), cancelledFinancials.profit.toFixed(2), `${totalOrdersCount > 0 ? ((cancelledCount / totalOrdersCount) * 100).toFixed(2) : '0.00'}%`])
      wsData.push(['Detained', detainedCount, detainedFinancials.qty, detainedFinancials.amt.toFixed(2), detainedFinancials.cogs.toFixed(2), detainedFinancials.profit.toFixed(2), `${totalOrdersCount > 0 ? ((detainedCount / totalOrdersCount) * 100).toFixed(2) : '0.00'}%`])
      wsData.push(['Problematic', problematicCount, problematicFinancials.qty, problematicFinancials.amt.toFixed(2), problematicFinancials.cogs.toFixed(2), problematicFinancials.profit.toFixed(2), `${totalOrdersCount > 0 ? ((problematicCount / totalOrdersCount) * 100).toFixed(2) : '0.00'}%`])
      wsData.push(['Returned', returnedCount, returnedFinancials.qty, returnedFinancials.amt.toFixed(2), returnedFinancials.cogs.toFixed(2), returnedFinancials.profit.toFixed(2), `${totalOrdersCount > 0 ? ((returnedCount / totalOrdersCount) * 100).toFixed(2) : '0.00'}%`])
      wsData.push([]) // Empty row

      // Detailed Orders Section
      wsData.push(['DETAILED ORDERS'])
      wsData.push(['No.', 'Order #', 'Date', 'Sales Channel', 'Store', 'Product', 'Qty', 'Amount', 'COGS', 'Profit', 'Margin', 'Courier', 'Waybill', 'Payment Status', 'Parcel Status'])
      
      filteredOrders.forEach((order, index) => {
        const cogs = order.cogs || 0  // Use ACTUAL COGS from database, not estimate
        const profit = order.totalAmount - cogs
        const margin = order.totalAmount > 0 ? ((profit / order.totalAmount) * 100) : 0
        
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
          order.customerAddress || 'N/A',
          order.itemName,
          order.quantity,
          order.totalAmount.toFixed(2),
          cogs.toFixed(2),
          profit.toFixed(2),
          `${margin.toFixed(2)}%`,
          order.courier || '-',
          order.trackingNumber || '-',
          order.paymentStatus.toUpperCase(),
          order.parcelStatus
        ])
      })

      // Create worksheet from data
      const ws = XLSX.utils.aoa_to_sheet(wsData)

      // Apply number formatting to currency cells
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      
      // Format Financial Summary amounts (rows 8-10, column B)
      for (let row = 7; row <= 9; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: 1 })
        if (ws[cellAddress] && typeof ws[cellAddress].v === 'string') {
          const numValue = parseFloat(ws[cellAddress].v)
          if (!isNaN(numValue)) {
            ws[cellAddress].t = 'n'
            ws[cellAddress].v = numValue
            ws[cellAddress].z = '"₱"#,##0.00'
          }
        }
      }

      // Format Status Breakdown amounts (starting from row 15, columns D, E, F)
      const statusStartRow = 14 // Row 15 in 0-indexed
      for (let row = statusStartRow; row <= statusStartRow + 9; row++) {
        for (let col = 3; col <= 5; col++) { // Columns D, E, F (Amount, COGS, Profit)
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
          if (ws[cellAddress] && typeof ws[cellAddress].v === 'string') {
            const numValue = parseFloat(ws[cellAddress].v)
            if (!isNaN(numValue)) {
              ws[cellAddress].t = 'n'
              ws[cellAddress].v = numValue
              ws[cellAddress].z = '"₱"#,##0.00'
            }
          }
        }
      }

      // Format Detailed Orders amounts (starting from detailed orders section, columns H, I, J)
      const detailedStartRow = statusStartRow + 13 // After status breakdown + empty rows + headers
      for (let row = detailedStartRow; row <= range.e.r; row++) {
        for (let col = 7; col <= 9; col++) { // Columns H, I, J (Amount, COGS, Profit)
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
          if (ws[cellAddress] && typeof ws[cellAddress].v === 'string') {
            const numValue = parseFloat(ws[cellAddress].v)
            if (!isNaN(numValue)) {
              ws[cellAddress].t = 'n'
              ws[cellAddress].v = numValue
              ws[cellAddress].z = '"₱"#,##0.00'
            }
          }
        }
      }

      // Set column widths
      ws['!cols'] = [
        { wch: 15 }, // No./Metric/Status
        { wch: 12 }, // Order #/Value
        { wch: 15 }, // Date/Quantity
        { wch: 15 }, // Sales Channel/Amount
        { wch: 20 }, // Store/COGS
        { wch: 30 }, // Product/Profit
        { wch: 8 },  // Qty/Margin
        { wch: 15 }, // Amount
        { wch: 15 }, // COGS
        { wch: 15 }, // Profit
        { wch: 10 }, // Margin
        { wch: 12 }, // Courier
        { wch: 20 }, // Waybill
        { wch: 15 }, // Payment Status
        { wch: 15 }  // Parcel Status
      ]

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Track Orders Report')

      // Generate Excel file and download
      XLSX.writeFile(wb, `Track_Orders_Comprehensive_Report_${new Date().toISOString().split('T')[0]}.xlsx`)

      toast.success('Excel report downloaded successfully')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      toast.error('Failed to export Excel report')
    }
  }

  const exportToPDF = () => {
    try {
      // Calculate financial totals using ACTUAL COGS from orders
      const totalQuantity = filteredOrders.reduce((sum, order) => sum + order.quantity, 0)
      const totalAmount = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0)
      const totalCOGS = filteredOrders.reduce((sum, order) => sum + (order.cogs || 0), 0) // Use actual COGS
      const totalProfit = totalAmount - totalCOGS
      const totalProfitMargin = totalAmount > 0 ? ((totalProfit / totalAmount) * 100) : 0

      // Calculate per-status financials using ACTUAL COGS
      const getStatusFinancials = (statusOrders: Order[]) => {
        const qty = statusOrders.reduce((sum, o) => sum + o.quantity, 0)
        const amt = statusOrders.reduce((sum, o) => sum + o.totalAmount, 0)
        const cogs = statusOrders.reduce((sum, o) => sum + (o.cogs || 0), 0) // Use actual COGS
        const profit = amt - cogs
        const margin = amt > 0 ? ((profit / amt) * 100) : 0
        return { qty, amt, profit, margin }
      }

      const pendingFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'PENDING'))
      const inTransitFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'IN TRANSIT'))
      const onDeliveryFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'ON DELIVERY'))
      const pickupFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'PICKUP'))
      const deliveredFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'DELIVERED'))
      const cancelledFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'CANCELLED'))
      const detainedFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'DETAINED'))
      const problematicFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'PROBLEMATIC'))
      const returnedFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'RETURNED'))

      // Create a comprehensive printable HTML content
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Track Orders Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page {
              margin: 0;
              size: auto;
            }
            @media print {
              @page { margin: 0; }
              body { margin: 1.6cm; }
            }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 30px; 
              background: white;
              color: #1e293b;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 25px;
              border-bottom: 4px solid #ec540e;
            }
            .page-title {
              font-size: 32px;
              font-weight: 700;
              color: #1e293b;
              margin-bottom: 20px;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .meta { 
              color: #64748b; 
              font-size: 15px;
              line-height: 1.8;
            }
            .meta strong { color: #1e293b; font-weight: 700; }
            
            .financial-summary {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 15px;
              margin-bottom: 35px;
              padding: 25px;
              background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
              border-radius: 12px;
              border: 3px solid #f59e0b;
            }
            .financial-card {
              text-align: center;
              padding: 15px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .financial-card .label {
              font-size: 11px;
              color: #64748b;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
            }
            .financial-card .value {
              font-size: 24px;
              font-weight: 800;
              color: #1e293b;
            }
            .financial-card.profit .value {
              color: #059669;
            }
            .financial-card.margin .value {
              color: #0284c7;
            }
            
            .summary { 
              display: grid; 
              grid-template-columns: repeat(5, 1fr); 
              gap: 12px; 
              margin-bottom: 35px; 
            }
            .summary-card { 
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              padding: 18px 12px;
              border-radius: 10px;
              text-align: center;
              border: 2px solid #e2e8f0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .summary-card .number { 
              font-size: 32px; 
              font-weight: 800; 
              color: #1e293b;
              margin-bottom: 8px;
            }
            .summary-card .label { 
              font-size: 11px; 
              color: #64748b; 
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 10px;
            }
            .summary-card .mini-stats {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 4px;
              margin-top: 10px;
              padding-top: 10px;
              border-top: 1px solid #e2e8f0;
            }
            .summary-card .mini-stat {
              font-size: 8px;
              color: #94a3b8;
              font-weight: 600;
            }
            .summary-card .mini-stat .mini-value {
              font-size: 10px;
              color: #475569;
              font-weight: 700;
              display: block;
              margin-top: 2px;
            }
            
            .summary-row-2 {
              display: grid; 
              grid-template-columns: repeat(5, 1fr); 
              gap: 12px; 
              margin-bottom: 35px;
            }
            
            table { 
              width: 100%; 
              border-collapse: separate;
              border-spacing: 0;
              margin-top: 30px; 
              font-size: 11px;
              border: 1px solid #cbd5e1;
              background: white;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            thead {
              background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
            }
            th { 
              color: white; 
              padding: 14px 12px; 
              text-align: left; 
              font-size: 10px; 
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-right: 1px solid rgba(255,255,255,0.15);
              border-bottom: 2px solid #1e40af;
            }
            th:last-child { border-right: none; }
            td { 
              padding: 12px; 
              border-bottom: 1px solid #e2e8f0;
              border-right: 1px solid #f1f5f9;
              font-size: 11px;
              color: #334155;
              line-height: 1.5;
            }
            td:last-child { border-right: none; }
            tbody tr { 
              transition: background-color 0.15s ease;
            }
            tbody tr:nth-child(even) { 
              background-color: #f8fafc; 
            }
            tbody tr:hover { 
              background-color: #eff6ff;
              box-shadow: inset 0 0 0 1px #dbeafe;
            }
            tbody tr:last-child td {
              border-bottom: none;
            }
            tr:nth-child(even) { background-color: #f8fafc; }
            tr:hover { background-color: #f1f5f9; }
            
            .badge { 
              display: inline-block; 
              padding: 3px 6px; 
              border-radius: 4px; 
              font-size: 7px; 
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.2px;
              white-space: nowrap;
            }
            .badge-pending { background: #fef3c7; color: #92400e; }
            .badge-paid { background: #d1fae5; color: #065f46; }
            .badge-cod { background: #dbeafe; color: #1e40af; }
            .badge-refunded { background: #f3f4f6; color: #374151; }
            .badge-packed { background: #d1fae5; color: #065f46; }
            .badge-delivered { background: #d1fae5; color: #065f46; }
            .badge-transit { background: #dbeafe; color: #1e40af; }
            .badge-on-delivery { background: #dbeafe; color: #1e40af; }
            .badge-pickup { background: #e9d5ff; color: #6b21a8; }
            .badge-cancelled { background: #fee2e2; color: #991b1b; }
            .badge-detained { background: #fed7aa; color: #9a3412; }
            .badge-problematic { background: #fce7f3; color: #9f1239; }
            .badge-returned { background: #f1f5f9; color: #475569; }
            
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e2e8f0;
              text-align: center;
              color: #94a3b8;
              font-size: 11px;
            }
            .footer strong {
              color: #1e293b;
              font-size: 13px;
            }
            
            @media print {
              body { padding: 15px; }
              .page-title { font-size: 28px; }
              .summary { gap: 8px; }
              .summary-card { padding: 12px 8px; }
              .summary-card .number { font-size: 24px; }
              .financial-summary { gap: 10px; padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="page-title">Track Orders Report</h1>
            <div class="meta">
              <strong>Generated:</strong> ${new Date().toLocaleString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}<br>
              <strong>Total Orders:</strong> ${filteredOrders.length} | 
              <strong>Report Type:</strong> Comprehensive Track Orders
            </div>
          </div>

          <div class="financial-summary">
            <div class="financial-card">
              <div class="label">Total Quantity</div>
              <div class="value">${totalQuantity}</div>
            </div>
            <div class="financial-card">
              <div class="label">Total Amount</div>
              <div class="value">₱${totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="financial-card">
              <div class="label">Total COGS</div>
              <div class="value">₱${totalCOGS.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="financial-card profit">
              <div class="label">Total Profit</div>
              <div class="value">₱${totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="financial-card margin">
              <div class="label">Profit Margin</div>
              <div class="value">${totalProfitMargin.toFixed(2)}%</div>
            </div>
          </div>
          
          <div class="summary">
            <div class="summary-card">
              <div class="number">${totalOrders}</div>
              <div class="label">Total Orders</div>
              <div class="mini-stats">
                <div class="mini-stat">Qty: <span class="mini-value">${totalQuantity}</span></div>
                <div class="mini-stat">Amt: <span class="mini-value">₱${totalAmount.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <div class="mini-stat">Profit: <span class="mini-value">₱${totalProfit.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <div class="mini-stat">% of Total: <span class="mini-value">100.0%</span></div>
              </div>
            </div>
            <div class="summary-card">
              <div class="number">${pendingOrders}</div>
              <div class="label">Pending</div>
              <div class="mini-stats">
                <div class="mini-stat">Qty: <span class="mini-value">${pendingFinancials.qty}</span></div>
                <div class="mini-stat">Amt: <span class="mini-value">₱${pendingFinancials.amt.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <div class="mini-stat">Profit: <span class="mini-value">₱${pendingFinancials.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <div class="mini-stat">% of Total: <span class="mini-value">${totalOrders > 0 ? ((pendingOrders / totalOrders) * 100).toFixed(1) : '0.0'}%</span></div>
              </div>
            </div>
            <div class="summary-card">
              <div class="number">${inTransitOrders}</div>
              <div class="label">In Transit</div>
              <div class="mini-stats">
                <div class="mini-stat">Qty: <span class="mini-value">${inTransitFinancials.qty}</span></div>
                <div class="mini-stat">Amt: <span class="mini-value">₱${inTransitFinancials.amt.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <div class="mini-stat">Profit: <span class="mini-value">₱${inTransitFinancials.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <div class="mini-stat">% of Total: <span class="mini-value">${totalOrders > 0 ? ((inTransitOrders / totalOrders) * 100).toFixed(1) : '0.0'}%</span></div>
              </div>
            </div>
            <div class="summary-card">
              <div class="number">${onDeliveryOrders}</div>
              <div class="label">On Delivery</div>
              <div class="mini-stats">
                <div class="mini-stat">Qty: <span class="mini-value">${onDeliveryFinancials.qty}</span></div>
                <div class="mini-stat">Amt: <span class="mini-value">₱${onDeliveryFinancials.amt.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <div class="mini-stat">Profit: <span class="mini-value">₱${onDeliveryFinancials.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <div class="mini-stat">% of Total: <span class="mini-value">${totalOrders > 0 ? ((onDeliveryOrders / totalOrders) * 100).toFixed(1) : '0.0'}%</span></div>
              </div>
            </div>
            <div class="summary-card">
              <div class="number">${pickupOrders}</div>
              <div class="label">Pickup</div>
              <div class="mini-stats">
                <div class="mini-stat">Qty: <span class="mini-value">${pickupFinancials.qty}</span></div>
                <div class="mini-stat">Amt: <span class="mini-value">₱${pickupFinancials.amt.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <div class="mini-stat">Profit: <span class="mini-value">₱${pickupFinancials.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <div class="mini-stat">% of Total: <span class="mini-value">${totalOrders > 0 ? ((pickupOrders / totalOrders) * 100).toFixed(1) : '0.0'}%</span></div>
              </div>
            </div>
          </div>

          <div class="summary-row-2">
            <div class="summary-card">
              <div class="number">${deliveredOrders}</div>
              <div class="label">Delivered</div>
              <div class="mini-stats">
                <div class="mini-stat">Qty: <span class="mini-value">${deliveredFinancials.qty}</span></div>
                <div class="mini-stat">Amt: <span class="mini-value">₱${deliveredFinancials.amt.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <div class="mini-stat">Profit: <span class="mini-value">₱${deliveredFinancials.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <div class="mini-stat">% of Total: <span class="mini-value">${totalOrders > 0 ? ((deliveredOrders / totalOrders) * 100).toFixed(1) : '0.0'}%</span></div>
              </div>
            </div>
            <div class="summary-card">
              <div class="number">${cancelledOrders}</div>
              <div class="label">Cancelled</div>
              <div class="mini-stats">
                <div class="mini-stat">Qty: <span class="mini-value">${cancelledFinancials.qty}</span></div>
                <div class="mini-stat">Amt: <span class="mini-value">₱${cancelledFinancials.amt.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <div class="mini-stat">Profit: <span class="mini-value">₱${cancelledFinancials.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <div class="mini-stat">% of Total: <span class="mini-value">${totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100).toFixed(1) : '0.0'}%</span></div>
              </div>
            </div>
            <div class="summary-card">
              <div class="number">${detainedOrders}</div>
              <div class="label">Detained</div>
              <div class="mini-stats">
                <div class="mini-stat">Qty: <span class="mini-value">${detainedFinancials.qty}</span></div>
                <div class="mini-stat">Amt: <span class="mini-value">₱${detainedFinancials.amt.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <div class="mini-stat">Profit: <span class="mini-value">₱${detainedFinancials.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <div class="mini-stat">% of Total: <span class="mini-value">${totalOrders > 0 ? ((detainedOrders / totalOrders) * 100).toFixed(1) : '0.0'}%</span></div>
              </div>
            </div>
            <div class="summary-card">
              <div class="number">${problematicOrders}</div>
              <div class="label">Problematic</div>
              <div class="mini-stats">
                <div class="mini-stat">Qty: <span class="mini-value">${problematicFinancials.qty}</span></div>
                <div class="mini-stat">Amt: <span class="mini-value">₱${problematicFinancials.amt.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <div class="mini-stat">Profit: <span class="mini-value">₱${problematicFinancials.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <div class="mini-stat">% of Total: <span class="mini-value">${totalOrders > 0 ? ((problematicOrders / totalOrders) * 100).toFixed(1) : '0.0'}%</span></div>
              </div>
            </div>
            <div class="summary-card">
              <div class="number">${returnedOrders}</div>
              <div class="label">Returned</div>
              <div class="mini-stats">
                <div class="mini-stat">Qty: <span class="mini-value">${returnedFinancials.qty}</span></div>
                <div class="mini-stat">Amt: <span class="mini-value">₱${returnedFinancials.amt.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <div class="mini-stat">Profit: <span class="mini-value">₱${returnedFinancials.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
                <div class="mini-stat">% of Total: <span class="mini-value">${totalOrders > 0 ? ((returnedOrders / totalOrders) * 100).toFixed(1) : '0.0'}%</span></div>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Channel</th>
                <th>Store</th>
                <th>Product</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Amount</th>
                <th style="text-align: right;">COGS</th>
                <th>Courier</th>
                <th>Waybill</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Parcel</th>
              </tr>
            </thead>
            <tbody>
              ${filteredOrders.map(order => `
                <tr>
                  <td style="font-weight: 600; font-family: 'Courier New', monospace; color: #1e40af;">#${order.id.slice(-6)}</td>
                  <td style="color: #64748b;">${new Date(order.orderDate).toLocaleDateString('en-US', { 
                    month: '2-digit', 
                    day: '2-digit', 
                    year: '2-digit'
                  })} ${new Date(order.orderDate).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    hour12: false
                  })}</td>
                  <td style="font-weight: 600; color: #0f172a;">${order.department || 'N/A'}</td>
                  <td style="color: #475569;">${order.customerAddress || 'N/A'}</td>
                  <td style="font-weight: 500; color: #0f172a;">${order.itemName}</td>
                  <td style="text-align: center; font-weight: 700; color: #0f172a;">${order.quantity}</td>
                  <td style="text-align: right; font-weight: 600; color: #059669;">₱${order.totalAmount.toLocaleString()}</td>
                  <td style="text-align: right; font-weight: 500; color: #64748b;">₱${(order.cogs || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td style="color: #475569;">${order.courier || '-'}</td>
                  <td style="font-family: 'Courier New', monospace; font-size: 10px; color: #64748b;">${order.trackingNumber || '-'}</td>
                  <td style="font-weight: 600; color: #0f172a;">${order.paymentStatus.toUpperCase()}</td>
                  <td style="font-weight: 600; color: #0f172a;">${order.orderStatus.toUpperCase()}</td>
                  <td style="font-weight: 600; color: #0f172a;">${order.parcelStatus}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p><strong>Vertex Professional Inventory Management System</strong></p>
            <p>Track Orders Report - Confidential Document</p>
          </div>
        </body>
        </html>
      `

      // Open print dialog
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(printContent)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
          printWindow.print()
          toast.success('PDF report ready for printing')
        }, 250)
      }
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      toast.error('Failed to export PDF report')
    }
  }

  const filterOrders = () => {
    let filtered = [...orders]
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(search) ||
        (order.trackingNumber && order.trackingNumber.toLowerCase().includes(search)) ||
        (order.customerName && order.customerName.toLowerCase().includes(search)) ||
        (order.itemName && order.itemName.toLowerCase().includes(search)) ||
        (order.storeName && order.storeName.toLowerCase().includes(search))
      )
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.parcelStatus === statusFilter)
    }
    
    // Sales channel filter (Admin only)
    if (salesChannelFilter !== 'all') {
      filtered = filtered.filter(order => order.department === salesChannelFilter)
    }
    
    // Date filtering
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

  // Calculate pagination
  const totalPages = Math.ceil(filteredOrders.length / pageSize)
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setChannelFilter('all')
    setStartDate(null)
    setEndDate(null)
    toast.success('Filters cleared')
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Packed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    }
    
    const icons = {
      Pending: Clock,
      Packed: PackageCheck,
    }
    
    const Icon = icons[status as keyof typeof icons] || Clock
    const style = styles[status as keyof typeof styles] || styles.Pending
    
    return (
      <Badge className={`${style} border-0 text-[10px] px-1.5 py-0.5`}>
        <Icon className="h-2.5 w-2.5 mr-1" />
        {status}
      </Badge>
    )
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

  const getPaymentBadge = (status: string) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      cod: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      refunded: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
    }
    
    const style = styles[status as keyof typeof styles] || styles.pending
    
    return (
      <Badge className={`${style} text-[10px] px-1.5 py-0.5 border-0`}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  const openDetailsModal = (order: Order) => {
    setSelectedOrder(order)
    setShowDetailsModal(true)
    setIsEditMode(false)
    // Initialize edit form with current order data
    setEditForm({
      customerName: order.customerName,
      customerContact: order.customerPhone,
      customerAddress: order.customerAddress,
      courier: order.courier || '',
      trackingNumber: order.trackingNumber || '',
      dispatchNotes: order.dispatchNotes || '',
      quantity: order.quantity || 0,
      totalAmount: order.totalAmount || 0
    })
  }

  const handleEditMode = () => {
    setIsEditMode(true)
  }

  const handleCancelEdit = () => {
    setIsEditMode(false)
    // Reset form to original values
    if (selectedOrder) {
      setEditForm({
        customerName: selectedOrder.customerName,
        customerContact: selectedOrder.customerPhone,
        customerAddress: selectedOrder.customerAddress,
        courier: selectedOrder.courier || '',
        trackingNumber: selectedOrder.trackingNumber || '',
        dispatchNotes: selectedOrder.dispatchNotes || '',
        quantity: selectedOrder.quantity || 0,
        totalAmount: selectedOrder.totalAmount || 0
      })
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedOrder) return

    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: editForm.customerName,
          customer_contact: editForm.customerContact,
          customer_address: editForm.customerAddress,
          courier: editForm.courier,
          waybill: editForm.trackingNumber,
          dispatch_notes: editForm.dispatchNotes,
          qty: editForm.quantity,
          total: editForm.totalAmount
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update order')
      }

      toast.success('Order updated successfully')
      setIsEditMode(false)
      fetchOrders() // Refresh the list
      setShowDetailsModal(false)
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error('Failed to update order')
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
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
      fetchOrders() // Refresh the list
      setShowDeleteDialog(false)
      setOrderToDelete(null)
    } catch (error: any) {
      console.error('Error deleting order:', error)
      toast.error(error.message || 'Failed to delete order')
    }
  }

  const openDeleteDialog = (orderId: string) => {
    setOrderToDelete(orderId)
    setShowDeleteDialog(true)
  }

  const totalOrders = filteredOrders.length
  const pendingOrders = filteredOrders.filter(o => o.parcelStatus === 'PENDING').length
  const inTransitOrders = filteredOrders.filter(o => o.parcelStatus === 'IN TRANSIT').length
  const onDeliveryOrders = filteredOrders.filter(o => o.parcelStatus === 'ON DELIVERY').length
  const pickupOrders = filteredOrders.filter(o => o.parcelStatus === 'PICKUP').length
  const deliveredOrders = filteredOrders.filter(o => o.parcelStatus === 'DELIVERED').length
  const cancelledOrders = filteredOrders.filter(o => o.parcelStatus === 'CANCELLED').length
  const detainedOrders = filteredOrders.filter(o => o.parcelStatus === 'DETAINED').length
  const problematicOrders = filteredOrders.filter(o => o.parcelStatus === 'PROBLEMATIC').length
  const returnedOrders = filteredOrders.filter(o => o.parcelStatus === 'RETURNED').length

  // Calculate financial metrics for each status
  const getStatusFinancials = (orders: Order[]) => {
    const qty = orders.reduce((sum, o) => sum + o.quantity, 0)
    const amt = orders.reduce((sum, o) => sum + o.totalAmount, 0)
    const cogs = orders.reduce((sum, o) => sum + (o.cogs || 0), 0)  // Use ACTUAL COGS from database
    const profit = amt - cogs
    return { qty, amt, cogs, profit }
  }

  const totalFinancials = getStatusFinancials(filteredOrders)
  const pendingFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'PENDING'))
  const inTransitFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'IN TRANSIT'))
  const onDeliveryFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'ON DELIVERY'))
  const pickupFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'PICKUP'))
  const deliveredFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'DELIVERED'))
  const cancelledFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'CANCELLED'))
  const detainedFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'DETAINED'))
  const problematicFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'PROBLEMATIC'))
  const returnedFinancials = getStatusFinancials(filteredOrders.filter(o => o.parcelStatus === 'RETURNED'))


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
    <div className="max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 py-6 space-y-6">
      {/* Page Header - Professional Style */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold gradient-text">Track Orders Overview</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage customer orders and delivery tracking
            </p>
          </div>
          {/* Date Filter and Export button - Admin only */}
          {!isTeamLeader && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Date Range Picker */}
              <EnterpriseDateRangePicker
                startDate={startDate}
                endDate={endDate}
                onDateChange={(start, end) => {
                  setStartDate(start)
                  setEndDate(end)
                }}
              />
              
              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 gap-2 border-slate-200 dark:border-slate-700">
                    <FileDown className="h-4 w-4" />
                    Export
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={exportToPDF}>
                    <FileDown className="h-4 w-4 mr-2" />
                    <span>Export as PDF</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    <span>Export as Excel</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards - 2 Rows x 5 Columns Professional Corporate Design */}
      <div className="grid gap-3 grid-cols-5">
        {/* Row 1 */}
        {/* Total Orders */}
        <div className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 p-4 rounded-xl bg-white dark:bg-slate-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-slate-500/10 to-slate-600/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50">
                <Package className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Total Orders</p>
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-200 tabular-nums mb-2">
              {totalOrders}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Qty</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{totalFinancials.qty}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Amt</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₱{totalFinancials.amt.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Profit</div>
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400">₱{totalFinancials.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">% of Total</div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">100.0%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 p-4 rounded-xl bg-white dark:bg-slate-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Pending</p>
            <p className="text-2xl font-bold bg-gradient-to-br from-yellow-600 to-yellow-700 bg-clip-text text-transparent tabular-nums mb-2">
              {pendingOrders}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-yellow-200 dark:border-yellow-800">
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Qty</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{pendingFinancials.qty}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Amt</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₱{pendingFinancials.amt.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Profit</div>
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400">₱{pendingFinancials.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">% of Total</div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{totalOrders > 0 ? ((pendingOrders / totalOrders) * 100).toFixed(1) : '0.0'}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* In Transit */}
        <div className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 p-4 rounded-xl bg-white dark:bg-slate-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Truck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">In Transit</p>
            <p className="text-2xl font-bold bg-gradient-to-br from-indigo-600 to-indigo-700 bg-clip-text text-transparent tabular-nums mb-2">
              {inTransitOrders}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-indigo-200 dark:border-indigo-800">
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Qty</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{inTransitFinancials.qty}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Amt</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₱{inTransitFinancials.amt.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Profit</div>
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400">₱{inTransitFinancials.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">% of Total</div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{totalOrders > 0 ? ((inTransitOrders / totalOrders) * 100).toFixed(1) : '0.0'}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* On Delivery */}
        <div className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 p-4 rounded-xl bg-white dark:bg-slate-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">On Delivery</p>
            <p className="text-2xl font-bold bg-gradient-to-br from-blue-600 to-blue-700 bg-clip-text text-transparent tabular-nums mb-2">
              {onDeliveryOrders}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200 dark:border-blue-800">
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Qty</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{onDeliveryFinancials.qty}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Amt</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₱{onDeliveryFinancials.amt.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Profit</div>
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400">₱{onDeliveryFinancials.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">% of Total</div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{totalOrders > 0 ? ((onDeliveryOrders / totalOrders) * 100).toFixed(1) : '0.0'}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pickup */}
        <div className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 p-4 rounded-xl bg-white dark:bg-slate-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Pickup</p>
            <p className="text-2xl font-bold bg-gradient-to-br from-purple-600 to-purple-700 bg-clip-text text-transparent tabular-nums mb-2">
              {pickupOrders}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-200 dark:border-purple-800">
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Qty</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{pickupFinancials.qty}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Amt</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₱{pickupFinancials.amt.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Profit</div>
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400">₱{pickupFinancials.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">% of Total</div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{totalOrders > 0 ? ((pickupOrders / totalOrders) * 100).toFixed(1) : '0.0'}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 */}
        {/* Delivered */}
        <div className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 p-4 rounded-xl bg-white dark:bg-slate-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Delivered</p>
            <p className="text-2xl font-bold bg-gradient-to-br from-green-600 to-green-700 bg-clip-text text-transparent tabular-nums mb-2">
              {deliveredOrders}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-green-200 dark:border-green-800">
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Qty</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{deliveredFinancials.qty}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Amt</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₱{deliveredFinancials.amt.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Profit</div>
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400">₱{deliveredFinancials.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">% of Total</div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{totalOrders > 0 ? ((deliveredOrders / totalOrders) * 100).toFixed(1) : '0.0'}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Cancelled */}
        <div className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 p-4 rounded-xl bg-white dark:bg-slate-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Cancelled</p>
            <p className="text-2xl font-bold bg-gradient-to-br from-red-600 to-red-700 bg-clip-text text-transparent tabular-nums mb-2">
              {cancelledOrders}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-red-200 dark:border-red-800">
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Qty</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{cancelledFinancials.qty}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Amt</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₱{cancelledFinancials.amt.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Profit</div>
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400">₱{cancelledFinancials.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">% of Total</div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100).toFixed(1) : '0.0'}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Detained */}
        <div className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 p-4 rounded-xl bg-white dark:bg-slate-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Ban className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Detained</p>
            <p className="text-2xl font-bold bg-gradient-to-br from-orange-600 to-orange-700 bg-clip-text text-transparent tabular-nums mb-2">
              {detainedOrders}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-orange-200 dark:border-orange-800">
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Qty</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{detainedFinancials.qty}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Amt</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₱{detainedFinancials.amt.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Profit</div>
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400">₱{detainedFinancials.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">% of Total</div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{totalOrders > 0 ? ((detainedOrders / totalOrders) * 100).toFixed(1) : '0.0'}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Problematic */}
        <div className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 p-4 rounded-xl bg-white dark:bg-slate-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-500/10 to-pink-600/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
                <AlertTriangle className="h-4 w-4 text-pink-600 dark:text-pink-400" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Problematic</p>
            <p className="text-2xl font-bold bg-gradient-to-br from-pink-600 to-pink-700 bg-clip-text text-transparent tabular-nums mb-2">
              {problematicOrders}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-pink-200 dark:border-pink-800">
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Qty</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{problematicFinancials.qty}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Amt</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₱{problematicFinancials.amt.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Profit</div>
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400">₱{problematicFinancials.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">% of Total</div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{totalOrders > 0 ? ((problematicOrders / totalOrders) * 100).toFixed(1) : '0.0'}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Returned */}
        <div className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 p-4 rounded-xl bg-white dark:bg-slate-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-slate-500/10 to-slate-600/5 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                <RotateCcw className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Returned</p>
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-200 tabular-nums mb-2">
              {returnedOrders}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Qty</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{returnedFinancials.qty}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Amt</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₱{returnedFinancials.amt.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Profit</div>
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400">₱{returnedFinancials.profit.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">% of Total</div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{totalOrders > 0 ? ((returnedOrders / totalOrders) * 100).toFixed(1) : '0.0'}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters - Professional SaaS Design */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {/* Search Input - Half Width */}
            <div className="w-1/2">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  placeholder="Search by order no. or waybill no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 h-12 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg font-medium placeholder:text-slate-400 transition-all"
                />
              </div>
            </div>
            
            {/* Right Side - Filters and Clear */}
            <div className="flex items-center gap-3 ml-auto">
              {/* Status Filter */}
              <div className="w-[200px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-0">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="all" className="font-semibold">All Status</SelectItem>
                    <SelectItem value="PENDING">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-yellow-600" />
                        <span>PENDING</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="DELIVERED">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                        <span>DELIVERED</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="ON DELIVERY">
                      <div className="flex items-center gap-2">
                        <Truck className="h-3.5 w-3.5 text-blue-600" />
                        <span>ON DELIVERY</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="PICKUP">
                      <div className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-purple-600" />
                        <span>PICKUP</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="IN TRANSIT">
                      <div className="flex items-center gap-2">
                        <Truck className="h-3.5 w-3.5 text-indigo-600" />
                        <span>IN TRANSIT</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="CANCELLED">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-3.5 w-3.5 text-red-600" />
                        <span>CANCELLED</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="DETAINED">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-orange-600" />
                        <span>DETAINED</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="PROBLEMATIC">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-pink-600" />
                        <span>PROBLEMATIC</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="RETURNED">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-3.5 w-3.5 text-slate-600" />
                        <span>RETURNED</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sales Channel Filter - Admin Only */}
              {userRole === 'admin' && (
                <div className="w-[200px]">
                  <Select value={salesChannelFilter} onValueChange={setChannelFilter}>
                    <SelectTrigger className="h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-0">
                      <SelectValue placeholder="All Channels" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="all" className="font-semibold">All Channels</SelectItem>
                      <SelectItem value="Shopee">Shopee</SelectItem>
                      <SelectItem value="Lazada">Lazada</SelectItem>
                      <SelectItem value="TikTok">TikTok</SelectItem>
                      <SelectItem value="Facebook">Facebook</SelectItem>
                      <SelectItem value="Physical Store">Physical Store</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Clear Filters - Text Only */}
              <button
                onClick={clearFilters}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold text-sm transition-colors flex items-center gap-1.5 group"
              >
                <X className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                Clear
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table - Enterprise Grade 10/10 */}
      <Card className="rounded-none border-0 shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                <Package className="h-12 w-12 text-slate-400 dark:text-slate-600" />
              </div>
              <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">No orders found</p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Orders will appear here when packed from Transaction History
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black">
                    <th className="py-3 px-2 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[110px]">Date & Time</th>
                    <th className="py-3 px-2 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[100px]">Customer</th>
                    {userRole !== 'operations' && (
                      <th className="py-3 px-2 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[80px]">Channel</th>
                    )}
                    <th className="py-3 px-2 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[100px]">Store</th>
                    <th className="py-3 px-2 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[160px]">Product</th>
                    <th className="py-3 px-2 text-center text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[40px]">Qty</th>
                    <th className="py-3 px-2 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[70px]">Courier</th>
                    <th className="py-3 px-2 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[160px]">Waybill</th>
                    <th className="py-3 px-2 text-center text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[75px]">Payment</th>
                    <th className="py-3 px-2 text-center text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[70px]">Status</th>
                    <th className="py-3 px-2 text-center text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[95px]">Parcel Status</th>
                    <th className="py-3 px-2 text-center text-[10px] font-bold text-white uppercase tracking-wider w-[65px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedOrders.map((order, index) => (
                    <tr 
                      key={order.id} 
                      className="group hover:bg-blue-50 dark:hover:bg-slate-800/50 transition-all duration-200 h-16"
                    >
                      <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <div>
                            <span className="text-[10px] font-medium text-slate-900 dark:text-white block">
                              {format(parseAsPhilippineTime(order.orderDate), 'MMM dd, yyyy')}
                            </span>
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 block mt-0.5">
                              {format(parseAsPhilippineTime(order.orderDate), 'hh:mm a')}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800">
                        <div className="text-[11px] text-slate-900 dark:text-white font-semibold truncate max-w-[90px]" title={order.customerName}>
                          {order.customerName || 'N/A'}
                        </div>
                      </td>
                      {userRole !== 'operations' && (
                        <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800">
                          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 text-[9px] font-semibold px-1.5 py-0.5 shadow-sm whitespace-nowrap">
                            {order.department || 'FLASH'}
                          </Badge>
                        </td>
                      )}
                      <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800">
                        <div className="text-[11px] text-slate-900 dark:text-white font-semibold truncate max-w-[90px]" title={order.storeName}>
                          {order.storeName}
                        </div>
                      </td>
                      <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800">
                        <div className="text-[11px] text-slate-900 dark:text-white font-medium line-clamp-2 leading-tight max-h-[2.8em]" title={order.itemName}>
                          {order.itemName}
                        </div>
                      </td>
                      <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-center">
                          <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 rounded-md">
                            {order.quantity}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800">
                        <div className="text-[11px] text-slate-700 dark:text-slate-300">{order.courier || '-'}</div>
                      </td>
                      <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800">
                        <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-semibold whitespace-normal break-all">{order.trackingNumber || '-'}</div>
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-100 dark:border-slate-800">
                        {getPaymentBadge(order.paymentStatus)}
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-100 dark:border-slate-800">
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 text-[9px] px-1.5 py-0.5 font-semibold">
                          <PackageCheck className="h-2 w-2 mr-0.5 inline" />
                          Packed
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-100 dark:border-slate-800">
                        {getParcelStatusBadge(order.parcelStatus)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetailsModal(order)}
                          className="h-6 px-1.5 text-[9px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30 transition-colors whitespace-nowrap"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredOrders.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setCurrentPage(1)
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal - Professional Design */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 gap-0 flex flex-col">
          {/* Modal Header - Clean without buttons */}
          <div className="bg-slate-900 dark:bg-slate-950 px-8 py-6 border-b border-slate-700 dark:border-slate-800 flex-shrink-0">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-700 dark:bg-slate-600 rounded-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold tracking-tight" style={{ color: 'white' }}>
                    Order Details
                  </DialogTitle>
                  <p className="text-slate-300 dark:text-slate-400 text-sm mt-1 font-medium">
                    View and manage order information
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>
          {selectedOrder && (
            <>
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
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Full Name
                        </p>
                        <Input
                          value={editForm.customerName}
                          onChange={(e) => setEditForm({...editForm, customerName: e.target.value})}
                          className="h-12 text-base font-medium border-2"
                          placeholder="Enter customer name"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Contact Number
                        </p>
                        <Input
                          value={editForm.customerContact}
                          onChange={(e) => setEditForm({...editForm, customerContact: e.target.value})}
                          className="h-12 text-base font-medium border-2"
                          placeholder="Enter contact number"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Delivery Address
                        </p>
                        <textarea
                          value={editForm.customerAddress}
                          onChange={(e) => setEditForm({...editForm, customerAddress: e.target.value})}
                          rows={3}
                          className="w-full px-3 py-2 rounded-md border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-base resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter delivery address"
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
                        {selectedOrder.itemName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Quantity {(() => {
                          const productName = selectedOrder.itemName || ''
                          const hasMultipleProducts = productName.includes(',') || productName.includes('+') || productName.includes('&')
                          return isEditMode && hasMultipleProducts ? '(Read-only for multiple products)' : ''
                        })()}
                      </p>
                      {isEditMode ? (
                        <Input
                          type="number"
                          value={editForm.quantity}
                          onChange={(e) => {
                            // Check if order has multiple products
                            const productName = selectedOrder.itemName || ''
                            const hasMultipleProducts = productName.includes(',') || productName.includes('+') || productName.includes('&')
                            
                            if (!hasMultipleProducts) {
                              const newQty = parseInt(e.target.value) || 0
                              const unitPrice = selectedOrder.totalAmount && selectedOrder.quantity 
                                ? selectedOrder.totalAmount / selectedOrder.quantity 
                                : 0
                              setEditForm({
                                ...editForm, 
                                quantity: newQty,
                                totalAmount: newQty * unitPrice
                              })
                            }
                          }}
                          className="h-12 text-xl font-bold text-emerald-600 dark:text-emerald-400 border-2"
                          min="1"
                          disabled={(() => {
                            const productName = selectedOrder.itemName || ''
                            return productName.includes(',') || productName.includes('+') || productName.includes('&')
                          })()}
                          title={(() => {
                            const productName = selectedOrder.itemName || ''
                            const hasMultipleProducts = productName.includes(',') || productName.includes('+') || productName.includes('&')
                            return hasMultipleProducts ? 'Quantity cannot be edited for orders with multiple products' : ''
                          })()}
                        />
                      ) : (
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                          {selectedOrder.quantity}
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
                          className="h-12 text-xl font-bold text-emerald-600 dark:text-emerald-400 border-2"
                          min="0"
                          step="0.01"
                        />
                      ) : (
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatCurrency(selectedOrder.totalAmount)}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Sales Channel
                      </p>
                      <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 text-sm font-semibold px-3 py-1.5">
                        {selectedOrder.department || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                </div>

              {/* Tracking Information Card */}
              {(selectedOrder.courier || selectedOrder.trackingNumber || isEditMode) && (
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
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Courier Service
                        </p>
                        <Input
                          value={editForm.courier}
                          onChange={(e) => setEditForm({...editForm, courier: e.target.value})}
                          className="h-12 text-base font-medium border-2"
                          placeholder="Enter courier name"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Tracking Number
                        </p>
                        <Input
                          value={editForm.trackingNumber}
                          onChange={(e) => setEditForm({...editForm, trackingNumber: e.target.value})}
                          className="h-12 text-base font-medium border-2"
                          placeholder="Enter tracking number"
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
                  )}
                </div>
              )}

              {/* Notes - Timeline */}
              {selectedOrder.notes && (
                <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-5 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 mt-0.5">
                      <svg className="h-4 w-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-3">Timeline</p>
                      {(() => {
                        try {
                          const notesData = JSON.parse(selectedOrder.notes)
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
                                  <p className="text-sm font-bold text-slate-900 dark:text-white">{notesData.dispatchedBy}</p>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                    {new Date(notesData.dispatchedAt).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Packed */}
                              {notesData.packedBy && (
                                <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-amber-800">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Packed</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{notesData.packedBy}</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                      {new Date(notesData.packedAt).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        } catch (e) {
                          // Fallback for old format
                          return <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{selectedOrder.notes}</p>
                        }
                      })()}
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>

            {/* Action Buttons - Bottom, side by side, right aligned */}
            <div className="flex-shrink-0 px-8 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex justify-end gap-3">
                {!isEditMode ? (
                  <>
                    <Button
                      onClick={() => {
                        if (selectedOrder) {
                          setShowDetailsModal(false)
                          openDeleteDialog(selectedOrder.id)
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-600/50 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-400 dark:hover:border-red-500/70"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Order
                    </Button>
                    <Button
                      onClick={handleEditMode}
                      size="sm"
                      className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Order
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      size="sm"
                      className="border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveEdit}
                      size="sm"
                      className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900"
                    >
                      Save Changes
                    </Button>
                  </>
                )}
              </div>
            </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog - Professional Red Theme */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md p-0 gap-0 bg-white dark:bg-slate-900 border-0 shadow-2xl overflow-hidden">
          <AlertDialogTitle className="sr-only">Delete Order Confirmation</AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            Confirm deletion of order. This action is permanent and cannot be undone.
          </AlertDialogDescription>
          
          {/* Red Header */}
          <div className="bg-red-600 dark:bg-red-700 px-6 py-8 text-center relative">
            <div className="absolute top-4 right-4">
              <button 
                onClick={() => {
                  setShowDeleteDialog(false)
                  setOrderToDelete(null)
                }}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm">
                <Trash2 className="h-12 w-12 text-white" strokeWidth={2} />
              </div>
            </div>
            <h2 className="text-3xl font-bold !text-white mb-2">Delete Order</h2>
            <p className="!text-white text-sm font-medium">This action is permanent and cannot be undone</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <p className="text-center text-slate-700 dark:text-slate-300 text-base font-medium">
              Are you sure you want to delete this order?
            </p>

            {/* Order Details Box */}
            {orderToDelete && (() => {
              const order = orders.find(o => o.id === orderToDelete)
              return order ? (
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 space-y-3">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Waybill Number
                    </p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {order.trackingNumber || 'N/A'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Product
                    </p>
                    <p className="text-base font-bold text-slate-900 dark:text-white">
                      {order.itemName}
                    </p>
                  </div>
                </div>
              ) : null
            })()}

            {/* Warning Box */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-900 dark:text-red-300 mb-1">
                    Warning: Permanent Action
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">
                    All order data and associated records will be permanently removed from the system.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 p-6 pt-0">
            <AlertDialogCancel 
              onClick={() => {
                setShowDeleteDialog(false)
                setOrderToDelete(null)
              }}
              className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white border-0 font-semibold rounded-full"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (orderToDelete) {
                  handleDeleteOrder(orderToDelete)
                }
              }}
              className="flex-1 h-12 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Order
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
