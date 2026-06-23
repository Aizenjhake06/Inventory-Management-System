import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getInventoryItems, getRestocks } from "@/lib/supabase-db"
import { getCachedData } from "@/lib/cache"
import type { DashboardStats, InventoryItem } from "@/lib/types"
import { 
  filterRevenueOrders, 
  calculateFinancialMetrics,
  getExcludedOrdersSummary,
  EXCLUDED_STATUSES 
} from "@/lib/financial-utils"

/**
 * Dashboard API - Accurate Financial Metrics
 * 
 * Data Source: orders table (Track Orders page)
 * Revenue Recognition: Active orders only (excludes CANCELLED and RETURNED)
 * 
 * This ensures all financial metrics are accurate and consistent across the system.
 */

function emptyDashboardStats(): DashboardStats {
  return {
    totalItems: 0,
    lowStockItems: 0,
    totalValue: 0,
    recentSales: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    profitMargin: 0,
    totalTransactions: 0,
    salesOverTime: [],
    topProducts: [],
    topReturns: [], // NEW
    recentTransactions: [],
    topCategories: [],
    totalCategories: 0,
    totalProducts: 0,
    stockPercentageByCategory: [],
    stocksCountByCategory: [],
    stocksCountByStore: [],
    totalSales: 0,
    returnRate: 0,
    damagedReturnRate: 0,
    supplierReturnRate: 0,
    totalReturns: 0,
    returnValue: 0,
    itemsSoldToday: 0,
    revenueToday: 0,
    supplierReturns: [],
    recentRestocks: [],
    averageOrderValue: 0,
    outOfStockCount: 0,
    inventoryHealthScore: 100,
    insights: [],
    salesVelocity: 0,
    yesterdaySales: 0,
    lastWeekSales: 0,
    lastMonthSales: 0,
    totalCancelledOrders: 0,
    cancelledOrdersValue: 0,
    cancellationRate: 0,
    topCancellationReasons: [],
    cancelledPackingQueue: 0,
    cancelledTrackOrders: 0,
    totalDelivered: 0,
    deliveredPercentage: 0,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'ID'
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    // Get user from headers for department filtering
    const userRole = request.headers.get('x-user-role')
    const assignedChannel = request.headers.get('x-assigned-channel')

    // Parse date parameters
    let startDate: Date | null = null
    let endDate: Date | null = null
    
    if (startDateParam) {
      startDate = new Date(startDateParam)
    }
    if (endDateParam) {
      endDate = new Date(endDateParam)
    }

    // Fetch inventory items and restocks
    let items: InventoryItem[] = []
    let restockHistory: any[] = []

    try {
      items = await getCachedData(
        'inventory-items',
        () => getInventoryItems(),
        60000 // 1 minute
      )
      restockHistory = await getCachedData(
        'restocks',
        () => getRestocks(),
        60000 // 1 minute
      )
      console.log('[Dashboard API] Restocks fetched:', restockHistory.length)
      console.log('[Dashboard API] Sample restock:', restockHistory[0])
      console.log('[Dashboard API] Restock reasons:', [...new Set(restockHistory.map(r => r.reason))])
    } catch (dbError) {
      console.error("[Dashboard API] Database error:", dbError)
      return NextResponse.json(emptyDashboardStats())
    }

    // Fetch orders from orders table - Include BOTH Dispatched (from POS) and Packed (from Track Orders)
    let ordersQuery = supabaseAdmin
      .from('orders')
      .select('*')
      .in('status', ['Dispatched', 'Packed']) // Include both POS dispatches and packed orders

    // DEPARTMENT FILTERING: Operations users only see their department's orders
    if (userRole === 'operations' && assignedChannel) {
      ordersQuery = ordersQuery.eq('sales_channel', assignedChannel)
    }
    // Admin sees all orders

    const { data: allOrders, error: ordersError } = await ordersQuery

    if (ordersError) {
      console.error("[Dashboard API] Error fetching orders:", ordersError)
      return NextResponse.json(emptyDashboardStats())
    }

    // Apply date filters ONLY for KPI cards (not for chart data)
    // Chart data is controlled by period tabs (Day/Week/Month)
    let filteredOrdersForKPIs = allOrders || []
    if (startDate || endDate) {
      const beforeFilter = filteredOrdersForKPIs.length
      filteredOrdersForKPIs = filteredOrdersForKPIs.filter(order => {
        const orderDate = new Date(order.packed_at || order.created_at) // Use packed_at (when revenue recognized)
        
        // Set time boundaries for inclusive date range
        if (startDate) {
          const startOfDay = new Date(startDate)
          startOfDay.setHours(0, 0, 0, 0)
          if (orderDate < startOfDay) return false
        }
        if (endDate) {
          const endOfDay = new Date(endDate)
          endOfDay.setHours(23, 59, 59, 999)
          if (orderDate > endOfDay) return false
        }
        return true
      })
      console.log('[Dashboard API] Date filter applied for KPI cards:', beforeFilter, '->', filteredOrdersForKPIs.length)
    }
    
    // For chart data, ALWAYS use all orders (ignore date filter)
    // Chart is controlled by period tabs (Day/Week/Month)
    const filteredOrders = allOrders || []

    // Map all orders for chart processing (ignore date filter)
    const allOrdersMapped = filteredOrders.map(o => ({
      id: o.id,
      qty: o.qty || 0,
      total: o.total || 0,
      cogs: o.cogs || 0, // Use ACTUAL COGS from order
      parcel_status: o.parcel_status || 'PENDING',
      payment_status: o.payment_status || 'pending',
      sales_channel: o.sales_channel,
      date: o.date,
      created_at: o.created_at // Add created_at for accurate time-based filtering
    }))

    // Map filtered orders for KPI cards (respects date filter)
    const kpiOrdersMapped = filteredOrdersForKPIs.map(o => ({
      id: o.id,
      qty: o.qty || 0,
      total: o.total || 0,
      cogs: o.cogs || 0,
      parcel_status: o.parcel_status || 'PENDING',
      payment_status: o.payment_status || 'pending',
      sales_channel: o.sales_channel,
      date: o.date,
      created_at: o.created_at
    }))

    // Filter to active orders only for revenue calculation (exclude CANCELLED and RETURNED)
    const activeOrders = filterRevenueOrders(allOrdersMapped, 'active') // For chart
    const activeOrdersKPI = filterRevenueOrders(kpiOrdersMapped, 'active') // For KPI cards

    // Calculate overall financial metrics (for KPI cards - respects date filter)
    const financialMetrics = calculateFinancialMetrics(activeOrdersKPI)

    // Calculate excluded orders summary (for KPI cards)
    const excludedSummary = getExcludedOrdersSummary(
      filteredOrdersForKPIs.map(o => ({
        id: o.id,
        qty: o.qty || 0,
        total: o.total || 0,
        cogs: o.cogs || 0, // Use ACTUAL COGS from order
        parcel_status: o.parcel_status || 'PENDING',
        payment_status: o.payment_status || 'pending',
        sales_channel: o.sales_channel,
        date: o.date
      }))
    )

    // Inventory metrics
    const totalItems = items.length
    const lowStockItems = items.filter((item: InventoryItem) => 
      item.quantity > 0 && item.quantity <= item.reorderLevel
    ).length
    const outOfStockCount = items.filter((item: InventoryItem) => item.quantity === 0).length
    const totalValue = items.reduce((sum, item: InventoryItem) => 
      sum + item.quantity * item.sellingPrice, 0
    )

    // Today's metrics for comparison (for Revenue Overview card - ignores date filter)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    // Use activeOrders (all orders, ignores date filter) for chart comparison
    const todayAllOrdersChart = allOrdersMapped.filter(order => {
      const orderDate = new Date(order.created_at)
      return orderDate >= today && orderDate <= todayEnd
    })

    const todayActiveOrdersChart = activeOrders.filter(order => {
      const orderDate = new Date(order.created_at)
      return orderDate >= today && orderDate <= todayEnd
    })

    // For KPI cards (respects date filter)
    const todayAllOrders = kpiOrdersMapped.filter(order => {
      const orderDate = new Date(order.created_at)
      return orderDate >= today && orderDate <= todayEnd
    })

    const todayActiveOrders = activeOrdersKPI.filter(order => {
      const orderDate = new Date(order.created_at)
      return orderDate >= today && orderDate <= todayEnd
    })

    const itemsSoldToday = todayActiveOrders.reduce((sum, o) => sum + o.qty, 0)
    const revenueToday = todayActiveOrders.reduce((sum, o) => sum + o.total, 0)
    const recentSales = todayAllOrders.length // Count ALL orders as transactions

    // Yesterday's sales for comparison (for Revenue Overview card - ignores date filter)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    const yesterdayEnd = new Date(today)
    yesterdayEnd.setHours(0, 0, 0, 0)

    const yesterdayOrders = activeOrders.filter(order => {
      const orderDate = new Date(order.created_at)
      return orderDate >= yesterday && orderDate < yesterdayEnd
    })
    const yesterdaySales = yesterdayOrders.reduce((sum, o) => sum + o.total, 0)
    const yesterdayQuantity = yesterdayOrders.reduce((sum, o) => sum + o.qty, 0)

    // Last week sales (7-14 days ago) (for Revenue Overview card - ignores date filter)
    const lastWeekStart = new Date(today)
    lastWeekStart.setDate(lastWeekStart.getDate() - 14)
    const lastWeekEnd = new Date(today)
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 7)

    const lastWeekOrders = activeOrders.filter(order => {
      const orderDate = new Date(order.created_at)
      return orderDate >= lastWeekStart && orderDate < lastWeekEnd
    })
    const lastWeekSales = lastWeekOrders.reduce((sum, o) => sum + o.total, 0)
    const lastWeekQuantity = lastWeekOrders.reduce((sum, o) => sum + o.qty, 0)

    // Last month sales (for Revenue Overview card - ignores date filter)
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    lastMonthStart.setHours(0, 0, 0, 0)
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 1)
    lastMonthEnd.setHours(0, 0, 0, 0)

    const lastMonthOrders = activeOrders.filter(order => {
      const orderDate = new Date(order.created_at)
      return orderDate >= lastMonthStart && orderDate < lastMonthEnd
    })
    const lastMonthSales = lastMonthOrders.reduce((sum, o) => sum + o.total, 0)
    const lastMonthQuantity = lastMonthOrders.reduce((sum, o) => sum + o.qty, 0)

    // Sales over time based on period
    let salesOverTime: { date: string; purchases: number; sales: number; quantity: number; orders: number }[] = []

    if (period === 'ID') {
      // Today: Hourly data
      salesOverTime = Array.from({ length: 24 }, (_, i) => {
        const hourStart = new Date(today)
        hourStart.setHours(i, 0, 0, 0)
        const hourEnd = new Date(today)
        hourEnd.setHours(i, 59, 59, 999)

        const hourStr = i.toString().padStart(2, '0') + ':00'

        const hourOrders = activeOrders.filter(order => {
          const orderDate = new Date(order.date) // Use packed_at (stored in date field) for revenue recognition
          return orderDate >= hourStart && orderDate <= hourEnd
        })

        const sales = hourOrders.reduce((sum, o) => sum + o.total, 0)
        const quantity = hourOrders.reduce((sum, o) => sum + o.qty, 0)
        const orders = hourOrders.length

        return { date: hourStr, purchases: 0, sales, quantity, orders }
      })
    } else if (period === '1W') {
      // Last 7 days
      salesOverTime = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(today)
        day.setDate(today.getDate() - (6 - i))
        day.setHours(0, 0, 0, 0)
        const nextDay = new Date(day)
        nextDay.setDate(day.getDate() + 1)

        const dayStr = day.toISOString().split('T')[0]

        const dayOrders = activeOrders.filter(order => {
          const orderDate = new Date(order.date) // Use packed_at (stored in date field) for revenue recognition
          return orderDate >= day && orderDate < nextDay
        })

        const sales = dayOrders.reduce((sum, o) => sum + o.total, 0)
        const quantity = dayOrders.reduce((sum, o) => sum + o.qty, 0)
        const orders = dayOrders.length

        return { date: dayStr, purchases: 0, sales, quantity, orders }
      })
    } else if (period === '1M') {
      // Current month
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

      salesOverTime = Array.from({ length: daysInMonth }, (_, i) => {
        const day = new Date(today.getFullYear(), today.getMonth(), i + 1)
        day.setHours(0, 0, 0, 0)
        const nextDay = new Date(day)
        nextDay.setDate(nextDay.getDate() + 1)

        const dayStr = `${today.toLocaleDateString('en-US', { month: 'short' })} ${i + 1}`

        const dayOrders = activeOrders.filter(order => {
          const orderDate = new Date(order.date) // Use packed_at (stored in date field) for revenue recognition
          return orderDate >= day && orderDate < nextDay
        })

        const sales = dayOrders.reduce((sum, o) => sum + o.total, 0)
        const quantity = dayOrders.reduce((sum, o) => sum + o.qty, 0)
        const orders = dayOrders.length

        return { date: dayStr, purchases: 0, sales, quantity, orders }
      })
    }

    // Top products by quantity sold - Group by first product name only (for KPI cards)
    const productSales = filteredOrdersForKPIs.reduce((acc: { [key: string]: { quantity: number; revenue: number; status: string } }, order) => {
      const fullProduct = order.product || 'Unknown'
      // Extract first product name (before comma or parenthesis)
      const product = fullProduct.split(',')[0].split('(')[0].trim()
      
      if (!acc[product]) {
        acc[product] = { quantity: 0, revenue: 0, status: order.parcel_status }
      }
      // Only count active orders for revenue
      if (!EXCLUDED_STATUSES.includes(order.parcel_status)) {
        acc[product].quantity += order.qty || 0
        acc[product].revenue += order.total || 0
      }
      return acc
    }, {})

    const topProducts = Object.entries(productSales)
      .sort(([, a], [, b]) => (b as { quantity: number; revenue: number }).quantity - (a as { quantity: number; revenue: number }).quantity)
      .slice(0, 4)
      .map(([name, data]) => {
        const typedData = data as { quantity: number; revenue: number }
        return {
          name,
          sales: typedData.quantity,
          revenue: typedData.revenue
        }
      })

    // Recent transactions (last 5 active orders) (for KPI cards)
    const recentTransactions = filteredOrdersForKPIs
      .filter(order => !EXCLUDED_STATUSES.includes(order.parcel_status))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(order => {
        const actualCOGS = order.cogs || 0
        const actualTotal = order.total || 0
        const actualProfit = actualTotal - actualCOGS
        
        return {
          id: order.id,
          itemId: order.id, // Using order ID as itemId
          itemName: order.product || 'Unknown',
          quantity: order.qty || 0,
          costPrice: actualCOGS / (order.qty || 1),
          sellingPrice: actualTotal / (order.qty || 1),
          totalCost: actualCOGS,
          totalRevenue: actualTotal,
          profit: actualProfit,
          timestamp: order.date,
          type: 'sale' as const,
          transactionType: 'sale' as const,
          status: (order.parcel_status === 'DELIVERED' ? 'completed' : 'pending') as 'completed' | 'pending'
        }
      })

    // Top categories (from inventory items) (for KPI cards)
    const categorySales = items.reduce((acc: { [key: string]: number }, item: InventoryItem) => {
      const sales = filteredOrdersForKPIs
        .filter(order => 
          order.product?.includes(item.name) && 
          !EXCLUDED_STATUSES.includes(order.parcel_status)
        )
        .reduce((sum, order) => sum + (order.qty || 0), 0)
      acc[item.category] = (acc[item.category] || 0) + sales
      return acc
    }, {})

    const topCategories = Object.entries(categorySales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name, sales]) => ({ name, sales }))

    // Stock metrics by category
    const totalCategories = new Set(items.map((item: InventoryItem) => item.category)).size
    const totalProducts = totalItems

    const stockValueByCategory = items.reduce((acc: { [key: string]: number }, item: InventoryItem) => {
      const value = item.quantity * item.costPrice
      acc[item.category] = (acc[item.category] || 0) + value
      return acc
    }, {})

    const stockPercentageByCategory = Object.entries(stockValueByCategory)
      .map(([name, value]) => ({
        name,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
      }))
      .sort((a, b) => b.percentage - a.percentage)

    const stocksCountByCategory = items.reduce((acc: { [key: string]: number }, item: InventoryItem) => {
      acc[item.category] = (acc[item.category] || 0) + item.quantity
      return acc
    }, {})

    const stocksCountByCategorySorted = Object.entries(stocksCountByCategory)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    // Sales performance by sales channel (Department Performance - for left chart) (for KPI cards)
    const salesByChannel = activeOrdersKPI.reduce((acc: { [key: string]: number }, order) => {
      const channel = order.sales_channel || 'Unknown'
      acc[channel] = (acc[channel] || 0) + order.total
      return acc
    }, {})

    const stocksCountByStoreSorted = Object.entries(salesByChannel)
      .map(([name, revenue]) => ({ name, count: revenue })) // Using 'count' for backward compatibility
      .sort((a, b) => b.count - a.count)

    // Store performance by actual store names (Store Performance - for right chart) (for KPI cards)
    // Use the store field directly from orders table
    const storePerformance = filteredOrdersForKPIs
      .filter(o => !EXCLUDED_STATUSES.includes(o.parcel_status)) // Only active orders
      .reduce((acc: { [key: string]: number }, order) => {
        const storeName = order.store || 'Unknown'
        acc[storeName] = (acc[storeName] || 0) + (order.total || 0)
        return acc
      }, {})

    const storePerformanceSorted = Object.entries(storePerformance)
      .map(([name, revenue]) => ({ name, count: revenue as number }))
      .sort((a, b) => b.count - a.count)

    // Return metrics - Now using restocks table (customer-return) instead of orders
    const customerReturnsForKPI = restockHistory.filter(r => r.reason === 'customer-return')
    console.log('[Dashboard API] Customer Returns for KPI:', customerReturnsForKPI.length)
    console.log('[Dashboard API] Sample KPI return:', customerReturnsForKPI[0])
    
    const totalReturns = customerReturnsForKPI.reduce((sum, r) => sum + (r.quantity || 0), 0)
    const returnValue = customerReturnsForKPI.reduce((sum, r) => sum + (r.totalCost || 0), 0)
    
    console.log('[Dashboard API] Total Returns:', totalReturns)
    console.log('[Dashboard API] Return Value:', returnValue)
    
    // Calculate return rate based on total orders (not just active orders) (for KPI cards)
    const totalOrdersQuantity = filteredOrdersForKPIs.reduce((sum, o) => sum + (o.qty || 0), 0)
    const returnRate = totalOrdersQuantity > 0 ? (totalReturns / totalOrdersQuantity) * 100 : 0
    
    // For backward compatibility with restock history metrics
    const damagedReturns = 0 // Not tracked in orders table
    const supplierReturnsCount = 0 // Not tracked in orders table
    const damagedReturnRate = 0
    const supplierReturnRate = 0

    // Supplier returns (empty for now, not tracked in orders table)
    const topSupplierReturns: { itemName: string; quantity: number; value: number }[] = []

    // Recent restocks
    const recentRestocks = restockHistory
      .filter(r => r.reason !== 'supplier-return')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)

    // Top Returns - from restocks table where reason = 'customer-return'
    const customerReturns = restockHistory.filter(r => r.reason === 'customer-return')
    console.log('[Dashboard API] Customer Returns found:', customerReturns.length)
    console.log('[Dashboard API] Sample customer return:', customerReturns[0])
    
    const returnsGrouped = customerReturns.reduce((acc: { [key: string]: number }, r) => {
      const itemName = r.itemName || 'Unknown'
      acc[itemName] = (acc[itemName] || 0) + (r.quantity || 0)
      return acc
    }, {})
    console.log('[Dashboard API] Returns grouped:', returnsGrouped)
    
    const topReturns = Object.entries(returnsGrouped)
      .map(([name, returns]) => ({ name, returns }))
      .sort((a, b) => b.returns - a.returns)
      .slice(0, 5)
    console.log('[Dashboard API] Top Returns:', topReturns)

    // Cancelled orders metrics (for KPI cards)
    const cancelledOrders = filteredOrdersForKPIs.filter(o => o.parcel_status === 'CANCELLED')
    
    const totalCancelledOrders = cancelledOrders.length
    const cancelledOrdersValue = cancelledOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    const totalOrdersCount = filteredOrdersForKPIs.length
    const cancellationRate = totalOrdersCount > 0 ? (totalCancelledOrders / totalOrdersCount) * 100 : 0

    // Cancellation reasons - use actual cancellation_reason field from orders
    const cancellationReasonMap = cancelledOrders.reduce((acc: { [key: string]: number }, order) => {
      const reason = order.cancellation_reason || 'Unknown'
      acc[reason] = (acc[reason] || 0) + 1
      return acc
    }, {})
    const topCancellationReasons = Object.entries(cancellationReasonMap)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // NEW: Cancelled orders in Packing Queue (status='Pending' AND is_cancelled=true)
    // These are orders cancelled BEFORE packing started
    let cancelledPackingQueueQuery = supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact' })
      .eq('status', 'Pending')
      .eq('is_cancelled', true)

    // Apply department filtering for operations users
    if (userRole === 'operations' && assignedChannel) {
      cancelledPackingQueueQuery = cancelledPackingQueueQuery.eq('sales_channel', assignedChannel)
    }

    // Apply date filters if set
    if (startDate) {
      const startOfDay = new Date(startDate)
      startOfDay.setHours(0, 0, 0, 0)
      cancelledPackingQueueQuery = cancelledPackingQueueQuery.gte('created_at', startOfDay.toISOString())
    }
    if (endDate) {
      const endOfDay = new Date(endDate)
      endOfDay.setHours(23, 59, 59, 999)
      cancelledPackingQueueQuery = cancelledPackingQueueQuery.lte('created_at', endOfDay.toISOString())
    }

    const { count: cancelledPackingQueueCount } = await cancelledPackingQueueQuery

    // NEW: Cancelled orders in Track Orders (status='Packed' AND parcel_status='CANCELLED')
    // These are orders cancelled AFTER packing (already in Track Orders)
    const cancelledTrackOrders = cancelledOrders.length

    // NEW: Total Delivered orders (status='Packed' AND parcel_status='DELIVERED')
    // Count all delivered orders
    let deliveredOrdersQuery = supabaseAdmin
      .from('orders')
      .select('id, qty', { count: 'exact' })
      .eq('status', 'Packed')
      .eq('parcel_status', 'DELIVERED')

    // Apply department filtering for operations users
    if (userRole === 'operations' && assignedChannel) {
      deliveredOrdersQuery = deliveredOrdersQuery.eq('sales_channel', assignedChannel)
    }

    // Apply date filters if set
    if (startDate) {
      const startOfDay = new Date(startDate)
      startOfDay.setHours(0, 0, 0, 0)
      deliveredOrdersQuery = deliveredOrdersQuery.gte('created_at', startOfDay.toISOString())
    }
    if (endDate) {
      const endOfDay = new Date(endDate)
      endOfDay.setHours(23, 59, 59, 999)
      deliveredOrdersQuery = deliveredOrdersQuery.lte('created_at', endOfDay.toISOString())
    }

    const { data: deliveredOrdersData, count: deliveredOrdersCount } = await deliveredOrdersQuery
    const totalDelivered = deliveredOrdersData?.reduce((sum, o) => sum + (o.qty || 0), 0) || 0
    
    // Calculate delivered percentage (total delivered / total orders)
    // totalOrdersCount already declared earlier in the code
    const deliveredPercentage = totalOrdersCount > 0 ? (deliveredOrdersCount || 0) / totalOrdersCount * 100 : 0

    // Update return rate calculation to use (returns / delivered * 100)
    const returnRateByDelivered = totalDelivered > 0 ? (totalReturns / totalDelivered) * 100 : 0

    // Return Count by Sales Channel - Not applicable for restocks, return empty
    const returnedOrdersByChannel = {}

    // Average order value
    const averageOrderValue = financialMetrics.totalOrders > 0 
      ? financialMetrics.totalRevenue / financialMetrics.totalOrders 
      : 0

    // Inventory health score
    const stockHealthPercent = totalItems > 0 ? ((totalItems - outOfStockCount) / totalItems) * 100 : 100
    const returnHealthPercent = 100 - Math.min(returnRate * 10, 100)
    const lowStockHealthPercent = totalItems > 0 ? ((totalItems - lowStockItems) / totalItems) * 100 : 100
    const inventoryHealthScore = Math.round(
      (stockHealthPercent * 0.4 + returnHealthPercent * 0.3 + lowStockHealthPercent * 0.3)
    )

    // Business insights
    const insights = []

    if (topProducts.length > 0) {
      insights.push({
        type: 'success',
        message: `Best seller: ${topProducts[0].name} with ₱${topProducts[0].revenue.toLocaleString()} revenue`
      })
    }

    if (lowStockItems > 0) {
      insights.push({
        type: 'warning',
        message: `${lowStockItems} items need restocking soon`
      })
    }

    if (outOfStockCount > 0) {
      insights.push({
        type: 'error',
        message: `${outOfStockCount} items are out of stock - immediate action required`
      })
    }

    if (financialMetrics.profitMargin >= 30) {
      insights.push({
        type: 'success',
        message: `Excellent profit margin of ${financialMetrics.profitMargin.toFixed(1)}% - keep it up!`
      })
    } else if (financialMetrics.profitMargin < 15) {
      insights.push({
        type: 'warning',
        message: `Profit margin is ${financialMetrics.profitMargin.toFixed(1)}% - consider reviewing pricing`
      })
    }

    if (returnRate > 10) {
      insights.push({
        type: 'error',
        message: `High return rate of ${returnRate.toFixed(1)}% - check product quality`
      })
    }

    if (totalCancelledOrders > 0) {
      insights.push({
        type: 'info',
        message: `${totalCancelledOrders} orders cancelled (₱${cancelledOrdersValue.toLocaleString()}) - excluded from revenue`
      })
    }

    const stats: DashboardStats = {
      totalItems,
      lowStockItems,
      totalValue,
      recentSales,
      totalRevenue: financialMetrics.totalRevenue,
      totalCost: financialMetrics.totalCOGS,
      totalProfit: financialMetrics.totalProfit,
      profitMargin: financialMetrics.profitMargin,
      totalTransactions: activeOrdersKPI.length, // Active orders only (excludes CANCELLED, RETURNED, etc.)
      salesOverTime,
      topProducts,
      topReturns, // NEW: Top 5 items with highest returns
      recentTransactions,
      topCategories,
      totalCategories,
      totalProducts,
      stockPercentageByCategory,
      stocksCountByCategory: stocksCountByCategorySorted,
      stocksCountByStore: stocksCountByStoreSorted,
      storePerformance: storePerformanceSorted,
      totalSales: financialMetrics.totalQuantity,
      returnRate: Math.round(returnRateByDelivered * 100) / 100, // Updated to use returns/delivered calculation
      damagedReturnRate: Math.round(damagedReturnRate * 100) / 100,
      supplierReturnRate: Math.round(supplierReturnRate * 100) / 100,
      totalReturns,
      returnValue,
      itemsSoldToday,
      revenueToday,
      supplierReturns: topSupplierReturns,
      recentRestocks,
      averageOrderValue,
      outOfStockCount,
      inventoryHealthScore,
      insights,
      salesVelocity: itemsSoldToday,
      yesterdaySales,
      lastWeekSales,
      lastMonthSales,
      yesterdayQuantity,
      lastWeekQuantity,
      lastMonthQuantity,
      totalCancelledOrders,
      cancelledOrdersValue,
      cancellationRate,
      topCancellationReasons,
      cancelledOrdersByChannel: returnedOrdersByChannel, // Return Count by Sales Channel
      cancelledPackingQueue: cancelledPackingQueueCount || 0,
      cancelledTrackOrders: cancelledTrackOrders,
      totalDelivered: totalDelivered,
      deliveredPercentage: Math.round(deliveredPercentage * 100) / 100,
    }

    console.log('[Dashboard API] Financial Metrics Summary:', {
      source: 'orders table (Track Orders)',
      totalOrders: financialMetrics.totalOrders,
      activeOrders: activeOrders.length,
      excludedOrders: excludedSummary.total.totalOrders,
      cancelled: excludedSummary.cancelled.totalOrders,
      returned: excludedSummary.returned.totalOrders,
      totalRevenue: financialMetrics.totalRevenue,
      totalProfit: financialMetrics.totalProfit,
      profitMargin: financialMetrics.profitMargin
    })

    return NextResponse.json(stats)
  } catch (error) {
    console.error("[Dashboard API] Error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch dashboard stats",
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 })
  }
}
