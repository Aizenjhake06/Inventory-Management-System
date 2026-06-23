import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getCachedData } from "@/lib/cache"
import type { SalesReport, DailySales, MonthlySales } from "@/lib/types"
import { 
  filterRevenueOrders, 
  calculateFinancialMetrics,
  EXCLUDED_STATUSES 
} from "@/lib/financial-utils"

function emptySalesReport(): SalesReport {
  return {
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    profitMargin: 0,
    itemsSold: 0,
    totalOrders: 0,
    transactions: [],
    dailySales: [],
    monthlySales: [],
    salesOverTime: [],
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const period = searchParams.get("period")
    const view = searchParams.get("view")
    const salesChannelFilter = searchParams.get("salesChannel")

    // Get user from headers for department filtering
    const userRole = request.headers.get('x-user-role')
    const assignedChannel = request.headers.get('x-assigned-channel')

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
      console.error("[Reports API] Error fetching orders:", ordersError)
      return NextResponse.json(emptySalesReport())
    }

    let orders = allOrders || []

    console.log('[Reports API] Total orders fetched:', orders.length)
    if (userRole === 'operations') {
      console.log('[Reports API] Filtered by channel:', assignedChannel)
    }
    console.log('[Reports API] Sample order:', orders[0])

    // Apply date filters
    if (startDate) {
      orders = orders.filter(order => {
        const orderDate = new Date(order.date)
        return orderDate >= new Date(startDate)
      })
    }

    if (endDate) {
      orders = orders.filter(order => {
        const orderDate = new Date(order.date)
        return orderDate <= new Date(endDate)
      })
    }

    // Apply sales channel filter
    if (salesChannelFilter && salesChannelFilter !== 'all') {
      orders = orders.filter(order => order.sales_channel === salesChannelFilter)
    }

    // Filter to active orders only (exclude CANCELLED and RETURNED)
    const activeOrders = filterRevenueOrders(
      orders.map(o => ({
        id: o.id,
        qty: o.qty || 0,
        total: o.total || 0,
        cogs: o.cogs || (o.total * 0.6) || 0, // Calculate COGS if missing (60% of total)
        parcel_status: o.parcel_status || 'PENDING',
        payment_status: o.payment_status || 'pending',
        sales_channel: o.sales_channel,
        date: o.date,
        product: o.product
      })),
      'active'
    )

    console.log('[Reports API] Total orders:', orders.length)
    console.log('[Reports API] Active orders (for revenue):', activeOrders.length)

    // Calculate financial metrics
    const financialMetrics = calculateFinancialMetrics(activeOrders)

    const totalRevenue = financialMetrics.totalRevenue
    const totalCost = financialMetrics.totalCOGS
    const totalProfit = financialMetrics.totalProfit
    const profitMargin = financialMetrics.profitMargin
    const itemsSold = financialMetrics.totalQuantity
    const totalOrdersCount = activeOrders.length

    console.log('[Reports API] Calculated:', {
      totalRevenue,
      totalCost,
      totalProfit,
      itemsSold,
      totalOrders: totalOrdersCount
    })

    // Generate daily sales data
    const dailyMap = new Map<string, { revenue: number; itemsSold: number; profit: number; orders: number }>()

    activeOrders.forEach((order) => {
      const orderDate = new Date(order.date)
      const dateStr = orderDate.toISOString().split("T")[0]
      
      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, { revenue: 0, itemsSold: 0, profit: 0, orders: 0 })
      }
      const dayData = dailyMap.get(dateStr)!
      dayData.revenue += order.total
      dayData.itemsSold += order.qty
      dayData.profit += (order.total - order.cogs)
      dayData.orders += 1 // Count each order
    })

    const dailySales: DailySales[] = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Generate monthly sales data
    const monthlySalesMap = new Map<string, { revenue: number; itemsSold: number; profit: number; orders: number }>()

    activeOrders.forEach((order) => {
      const orderDate = new Date(order.date)
      const month = orderDate.toISOString().slice(0, 7) // YYYY-MM
      
      if (!monthlySalesMap.has(month)) {
        monthlySalesMap.set(month, { revenue: 0, itemsSold: 0, profit: 0, orders: 0 })
      }
      const monthData = monthlySalesMap.get(month)!
      monthData.revenue += order.total
      monthData.itemsSold += order.qty
      monthData.profit += (order.total - order.cogs)
      monthData.orders += 1 // Count each order
    })

    const monthlySales: MonthlySales[] = Array.from(monthlySalesMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))

    console.log('[Reports API] Sample monthly sales:', monthlySales[0])

    // Generate salesOverTime (for backward compatibility)
    const salesOverTime = dailySales.map(d => ({ date: d.date, revenue: d.revenue }))

    // Convert orders to transaction format for backward compatibility
    const transactions = activeOrders.map(order => ({
      id: order.id,
      itemId: order.id,
      itemName: order.product || 'Unknown',
      quantity: order.qty,
      costPrice: order.cogs / (order.qty || 1),
      sellingPrice: order.total / (order.qty || 1),
      totalCost: order.cogs,
      totalRevenue: order.total,
      profit: order.total - order.cogs,
      timestamp: order.date,
      type: 'sale' as const,
      transactionType: 'sale' as const,
      status: (order.parcel_status === 'DELIVERED' ? 'completed' : 'pending') as 'completed' | 'pending'
    }))

    const report: SalesReport = {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      itemsSold,
      totalOrders: totalOrdersCount,
      transactions,
      dailySales,
      monthlySales,
      salesOverTime,
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error("[Reports API] Error:", error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}
