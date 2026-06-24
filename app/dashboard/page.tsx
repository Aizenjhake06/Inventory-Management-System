"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Package, AlertTriangle, DollarSign, TrendingUp, BarChart2, ShoppingCart, Activity, ArrowUpRight, ArrowDownRight, Percent, Plus, FileText, AlertCircle, PackageX, PackageOpen, RotateCcw, Download, Calendar, CheckCircle } from "lucide-react"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { ChartTooltip } from "@/components/ui/chart-tooltip"
import { GaugeChart } from "@/components/charts/gauge-chart"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import type { DashboardStats, InventoryItem } from "@/lib/types"
import type { TimePeriod } from "@/components/dashboard/revenue-chart"
import { formatNumber } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { PremiumDashboardLoading } from "@/components/premium-loading"
import { BrandLoader } from "@/components/ui/brand-loader"
import { apiGet } from "@/lib/api-client"
import { formatChartData, calculatePeriodComparison } from "@/lib/dashboard-utils"
import { getCurrentUser } from "@/lib/auth"
import { getCurrentUserRole } from "@/lib/role-utils"
import { EnterpriseDateRangePicker } from "@/components/ui/enterprise-date-range-picker"

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([])
  const [outOfStockItems, setOutOfStockItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("ID")
  
  // Default to current month (first day to last day)
  const getDefaultDateRange = () => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { firstDay, lastDay }
  }
  
  const { firstDay, lastDay } = getDefaultDateRange()
  const [startDate, setStartDate] = useState<Date | null>(firstDay)
  const [endDate, setEndDate] = useState<Date | null>(lastDay)
  const currentUser = getCurrentUser()

  const fetchData = async () => {
    try {
      setRefreshing(true)
      console.log('[Dashboard] Fetching data for period:', timePeriod)
      
      // Build API URL
      // - Tabs (Day/Week/Month) control chart data with their own date ranges
      // - Date picker controls KPI cards and other metrics
      let apiUrl = `/api/dashboard?period=${timePeriod}`
      
      // Add date filter for KPI cards (if set)
      if (startDate) {
        apiUrl += `&startDate=${startDate.toISOString()}`
      }
      if (endDate) {
        apiUrl += `&endDate=${endDate.toISOString()}`
      }
      
      const [stats, items] = await Promise.all([
        apiGet<DashboardStats>(apiUrl),
        apiGet<InventoryItem[]>("/api/items")
      ])

      console.log('[Dashboard] Data received:', {
        stats: stats,
        items: items
      })

      setStats(stats)
      setLowStockItems(items.filter((item: InventoryItem) => item.quantity > 0 && item.quantity <= item.reorderLevel))
      setOutOfStockItems(items.filter((item: InventoryItem) => item.quantity === 0))
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      setStats(null)
      setLowStockItems([])
      setOutOfStockItems([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [timePeriod, startDate, endDate]) // Refetch when tab OR date filter changes

  // Show loading state with branded loader (consistent with other pages)
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[600px]">
        <div className="text-center">
          <BrandLoader size="lg" />
          <p className="text-slate-600 dark:text-slate-400 mt-6 text-sm font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Calculate additional metrics
  // Note: totalProfit already excludes returns (calculated from filtered orders)
  const netProfit = stats?.totalProfit || 0
  const lowStockCount = lowStockItems.length
  const outOfStockCount = outOfStockItems.length

  const stocksCountData = stats?.stocksCountByCategory?.map((cat) => ({
    name: cat.name,
    count: cat.count,
  })) || []

  const stocksCountByStoreData = stats?.stocksCountByStore?.map((store) => ({
    name: store.name,
    count: store.count,
  })) || []

  const storePerformanceData = stats?.storePerformance?.map((store) => ({
    name: store.name,
    count: store.count,
  })) || []

  // Period comparison helper — compares today vs yesterday
  const revenueChange = stats?.revenueToday !== undefined && stats?.yesterdaySales !== undefined && stats.yesterdaySales > 0
    ? ((stats.revenueToday - stats.yesterdaySales) / stats.yesterdaySales) * 100
    : null

  const salesChange = stats?.itemsSoldToday !== undefined && stats?.yesterdayQuantity !== undefined && stats.yesterdayQuantity > 0
    ? ((stats.itemsSoldToday - stats.yesterdayQuantity) / stats.yesterdayQuantity) * 100
    : null

  // Small comparison badge component
  const ComparisonBadge = ({ pct }: { pct: number | null }) => {
    if (pct === null) return null
    const isUp = pct >= 0
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1 ${
        isUp
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      }`}>
        {isUp ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
        {Math.abs(pct).toFixed(1)}%
      </span>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto py-5 space-y-6">
      {/* Page Header - Professional Shopify Style */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold gradient-text">Dashboard Overview</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Welcome back! Here's what's happening with your inventory.</p>
        </div>
        
        {/* Actions - Date Picker Only */}
        <div className="flex items-center gap-3">
          {/* Date Range Picker - No wrapper, direct component */}
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

      {/* Redesigned KPI Cards */}
      
      {/* Conditional Layout: Admin (2 rows) vs Logistics (1 row) */}
      {currentUser?.role === 'logistics-admin' ? (
        /* Logistics Admin: 1 Row with 3 Cards */
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Total Sold */}
          <Card className="p-5 border-0 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30 flex-shrink-0">
                <ShoppingCart className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Total Sold</p>
                <div className="flex items-center gap-1">
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 tabular-nums">
                    <AnimatedNumber value={stats?.totalSales || 0} duration={1500} />
                  </p>
                  <ComparisonBadge pct={salesChange} />
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-500 flex items-center gap-1 mt-0.5">
                  {stats?.itemsSoldToday !== undefined && stats.itemsSoldToday > 0
                    ? `${stats.itemsSoldToday} units today`
                    : 'All-time quantity'}
                </p>
              </div>
            </div>
          </Card>

          {/* Total Orders */}
          <Card className="p-5 border-0 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-600 shadow-lg shadow-cyan-500/30 flex-shrink-0">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">Total Orders</p>
                <p className="text-2xl font-bold text-cyan-900 dark:text-cyan-100 tabular-nums">
                  <AnimatedNumber value={stats?.totalTransactions || 0} duration={1500} />
                </p>
                <p className="text-xs text-cyan-600 dark:text-cyan-500 flex items-center gap-1 mt-0.5">
                  Transactions
                </p>
              </div>
            </div>
          </Card>

          {/* Total Returns */}
          <Card className="p-5 border-0 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-600 shadow-lg shadow-red-500/30 flex-shrink-0">
                <RotateCcw className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Total Returns</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100 tabular-nums">
                  <AnimatedNumber value={stats?.totalReturns || 0} duration={1500} />
                </p>
                <p className="text-xs text-red-600 dark:text-red-500 flex items-center gap-1 mt-0.5">
                  {stats?.returnRate !== undefined ? `${stats.returnRate.toFixed(1)}% return rate` : 'Customer returns'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        /* Admin: 2 Rows (Row 1: 4 cards, Row 2: 3 cards) */
        <>
          {/* Row 1: Financial Metrics (4 cards) */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Sold */}
            <Card className="p-5 border-0 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30 flex-shrink-0">
                  <ShoppingCart className="h-5 w-5 text-white" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Total Sold</p>
                  <div className="flex items-center gap-1">
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 tabular-nums">
                      <AnimatedNumber value={stats?.totalSales || 0} duration={1500} />
                    </p>
                    <ComparisonBadge pct={salesChange} />
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-500 flex items-center gap-1 mt-0.5">
                    {stats?.itemsSoldToday !== undefined && stats.itemsSoldToday > 0
                      ? `${stats.itemsSoldToday} units today`
                      : 'All-time quantity'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Total Revenue */}
            <Card className="p-5 border-0 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-600 shadow-lg shadow-green-500/30 flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-white" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">Total Revenue</p>
                  <div className="flex items-center gap-1">
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100 tabular-nums">
                      ₱<AnimatedNumber value={stats?.totalRevenue || 0} duration={1500} />
                    </p>
                    {!startDate && !endDate && <ComparisonBadge pct={revenueChange} />}
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1 mt-0.5">
                    {startDate || endDate ? (
                      stats?.totalRevenue && stats.totalRevenue > 0 ? (
                        <><ArrowUpRight className="h-3 w-3" />Filtered period</>
                      ) : "No sales in period"
                    ) : (
                      stats?.revenueToday !== undefined && stats.revenueToday > 0 ? (
                        <><ArrowUpRight className="h-3 w-3" />₱{formatNumber(stats.revenueToday)} today</>
                      ) : "No sales today yet"
                    )}
                  </p>
                </div>
              </div>
            </Card>

            {/* Gross Profit */}
            <Card className="p-5 border-0 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-600 shadow-lg shadow-purple-500/30 flex-shrink-0">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Gross Profit</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 tabular-nums">
                    ₱<AnimatedNumber value={netProfit} duration={1500} />
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-500 flex items-center gap-1 mt-0.5">
                    {stats?.returnValue !== undefined && stats.returnValue > 0 ? (
                      <>
                        <ArrowDownRight className="h-3 w-3" />
                        ₱{formatNumber(stats.returnValue)} returns
                      </>
                    ) : (
                      "No returns"
                    )}
                  </p>
                </div>
              </div>
            </Card>

            {/* Profit Margin */}
            <Card className="p-5 border-0 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-600 shadow-lg shadow-amber-500/30 flex-shrink-0">
                  <Percent className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Profit Margin</p>
                  <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 tabular-nums">
                    <AnimatedNumber value={stats?.profitMargin || 0} decimals={1} duration={1500} />%
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1 mt-0.5">
                    {(stats?.profitMargin || 0) >= 30 ? (
                      "🏆 Excellent!"
                    ) : (stats?.profitMargin || 0) >= 15 ? (
                      "✓ Good"
                    ) : (
                      "⚠ Improve"
                    )}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Row 2: Sales Performance Metrics (3 cards) */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {/* Average Order Value */}
            <Card className="p-5 border-0 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-600 shadow-lg shadow-purple-500/30 flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Avg Order Value</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 tabular-nums">
                    ₱<AnimatedNumber value={stats?.totalSales && stats.totalSales > 0 ? (stats?.totalRevenue || 0) / stats.totalSales : 0} duration={1500} decimals={0} />
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-500 flex items-center gap-1 mt-0.5">
                    Per order
                  </p>
                </div>
              </div>
            </Card>

            {/* Total Orders */}
            <Card className="p-5 border-0 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-600 shadow-lg shadow-cyan-500/30 flex-shrink-0">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">Total Orders</p>
                  <p className="text-2xl font-bold text-cyan-900 dark:text-cyan-100 tabular-nums">
                    <AnimatedNumber value={stats?.totalTransactions || 0} duration={1500} />
                  </p>
                  <p className="text-xs text-cyan-600 dark:text-cyan-500 flex items-center gap-1 mt-0.5">
                    Transactions
                  </p>
                </div>
              </div>
            </Card>

            {/* Total Returns */}
            <Card className="p-5 border-0 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-600 shadow-lg shadow-red-500/30 flex-shrink-0">
                  <RotateCcw className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Total Returns</p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100 tabular-nums">
                    <AnimatedNumber value={stats?.totalReturns || 0} duration={1500} />
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-500 flex items-center gap-1 mt-0.5">
                    {stats?.returnRate !== undefined ? `${stats.returnRate.toFixed(1)}% return rate` : 'Customer returns'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Quick Actions & Alerts */}
      <div className={cn(
        "grid gap-5",
        currentUser?.role === 'admin' ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
      )}>
        {/* Quick Actions - Admin Only */}
        {currentUser?.role === 'admin' && (
          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="h-auto py-3 text-xs justify-start" asChild>
                  <Link href="/dashboard/inventory/create">
                    <Plus className="h-3.5 w-3.5 mr-2" />
                    Add Product
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="h-auto py-3 text-xs justify-start" asChild>
                  <Link href="/dashboard/pos">
                    <ShoppingCart className="h-3.5 w-3.5 mr-2" />
                    New Sale
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="h-auto py-3 text-xs justify-start" asChild>
                  <Link href="/dashboard/inventory/low-stock">
                    <Package className="h-3.5 w-3.5 mr-2" />
                    Restock
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="h-auto py-3 text-xs justify-start" asChild>
                  <Link href="/dashboard/analytics">
                    <FileText className="h-3.5 w-3.5 mr-2" />
                    Analytics
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Critical Alerts - Redesigned Compact */}
        <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Inventory Alerts
              {(outOfStockCount + lowStockCount) > 0 && (
                <Badge variant="destructive" className="ml-auto text-xs px-2 py-0.5">
                  {outOfStockCount + lowStockCount}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(outOfStockCount > 0 || lowStockCount > 0) ? (
              <div className="grid grid-cols-2 gap-2">
                {/* Out of Stock Card */}
                <Card className="rounded-lg shadow-sm hover:shadow-md transition-all duration-300">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <div className="text-xl font-bold text-red-600 dark:text-red-400">
                          {outOfStockCount}
                        </div>
                        <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                          Out of Stock
                        </div>
                      </div>
                      <PackageX className="h-6 w-6 text-red-400 dark:text-red-500" />
                    </div>
                    {outOfStockCount > 0 && (
                      <Button 
                        size="sm" 
                        variant="link" 
                        className="text-red-600 dark:text-red-400 h-auto p-0 text-xs font-medium" 
                        asChild
                      >
                        <Link href="/dashboard/inventory/out-of-stock">
                          View Items →
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Low Stock Card */}
                <Card className="rounded-lg shadow-sm hover:shadow-md transition-all duration-300">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                          {lowStockCount}
                        </div>
                        <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          Low Stock
                        </div>
                      </div>
                      <PackageOpen className="h-6 w-6 text-amber-400 dark:text-amber-500" />
                    </div>
                    {lowStockCount > 0 && (
                      <Button 
                        size="sm" 
                        variant="link" 
                        className="text-amber-600 dark:text-amber-400 h-auto p-0 text-xs font-medium" 
                        asChild
                      >
                        <Link href="/dashboard/inventory/low-stock">
                          Restock Now →
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-5">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 mb-1.5">
                  <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">All inventory levels are healthy</p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">No immediate action required</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Revenue Chart - Enterprise Level - Hidden for logistics-admin */}
      {currentUser?.role !== 'logistics-admin' && (
        <RevenueChart
          data={formatChartData(stats?.salesOverTime, timePeriod)}
          timePeriod={timePeriod}
          onPeriodChange={setTimePeriod}
          comparison={calculatePeriodComparison(stats, timePeriod)}
          loading={refreshing}
        />
      )}

      {/* Performance Analytics */}
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
        {/* Top Products Chart */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-amber-500/10">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 bg-emerald-500 rounded-full flex-shrink-0"></div>
              <h3 className="text-slate-900 dark:text-white text-sm font-bold tracking-tight">Top Products</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5 ml-3">Units sold by product</p>
          </div>
          <CardContent className="pt-4 pb-2">
            {stats?.topProducts && stats.topProducts.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={Math.max(160, stats.topProducts.slice(0,5).length * 52)}>
                  <BarChart
                    data={stats.topProducts.slice(0, 5).map((p: any) => ({ ...p, name: p.name.length > 18 ? p.name.substring(0, 18) + '…' : p.name }))}
                    layout="vertical"
                    margin={{ left: 10, right: 10, top: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.07} horizontal={false} vertical={true} />
                    <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                    <YAxis type="category" dataKey="name" fontSize={10} tickLine={false} axisLine={false} width={100} tick={{ fill: '#64748b' }} />
                    <Tooltip
                      content={<ChartTooltip formatter={(value, name) => [value.toString(), 'Units Sold']} />}
                      cursor={{ fill: 'rgba(16,185,129,0.06)' }}
                    />
                    <Bar dataKey="sales" fill="#10B981" radius={[0, 6, 6, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                  {stats.topProducts.slice(0, 5).map((p: any, i: number) => (
                    <div key={p.name} className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs ${i === 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`h-5 w-5 rounded flex items-center justify-center text-[10px] font-black flex-shrink-0 ${i === 0 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{i + 1}</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate">{p.name}</span>
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex-shrink-0">{p.sales}x</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <TrendingUp className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">No sales data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Returns - NEW SECTION */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-amber-500/10">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 bg-red-500 rounded-full flex-shrink-0"></div>
              <h3 className="text-slate-900 dark:text-white text-sm font-bold tracking-tight">Returns</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5 ml-3">Top items with highest returns</p>
          </div>
          <CardContent className="pt-4 pb-2">
            {stats?.topReturns && stats.topReturns.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={Math.max(160, stats.topReturns.slice(0,5).length * 52)}>
                  <BarChart
                    data={stats.topReturns.slice(0, 5).map((r: any) => ({ ...r, name: r.name.length > 18 ? r.name.substring(0, 18) + '…' : r.name }))}
                    layout="vertical"
                    margin={{ left: 10, right: 10, top: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.07} horizontal={false} vertical={true} />
                    <XAxis type="number" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8' }} />
                    <YAxis type="category" dataKey="name" fontSize={10} tickLine={false} axisLine={false} width={100} tick={{ fill: '#64748b' }} />
                    <Tooltip
                      content={<ChartTooltip formatter={(value, name) => [value.toString(), 'Returns']} />}
                      cursor={{ fill: 'rgba(239,68,68,0.06)' }}
                    />
                    <Bar dataKey="returns" fill="#EF4444" radius={[0, 6, 6, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                  {stats.topReturns.slice(0, 5).map((r: any, i: number) => (
                    <div key={r.name} className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs ${i === 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`h-5 w-5 rounded flex items-center justify-center text-[10px] font-black flex-shrink-0 ${i === 0 ? 'bg-red-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{i + 1}</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate">{r.name}</span>
                      </div>
                      <span className="font-bold text-red-600 dark:text-red-400 flex-shrink-0">{r.returns}x</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <RotateCcw className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">No returns data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
        {/* Recent Sales */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-amber-500/10">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 bg-emerald-500 rounded-full flex-shrink-0"></div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Recent Sales</h3>
            </div>
            <p className="text-xs mt-0.5 ml-3 text-slate-600 dark:text-slate-400">Latest completed transactions</p>
          </div>
          <CardContent className="pt-4 pb-3">
            <div className="space-y-2">
              {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
                stats.recentTransactions.map((tx, index) => (
                  <div key={index} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-[#1a1a1a] hover:bg-slate-100 dark:hover:bg-[#222] transition-colors border border-transparent hover:border-slate-200 dark:hover:border-amber-500/15">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        <ShoppingCart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs truncate text-slate-900 dark:text-white">{tx.itemName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                          <span>{tx.quantity} units</span>
                          {tx.staffName && <><span>·</span><span className="truncate">{tx.staffName}</span></>}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-bold flex-shrink-0 ml-2 text-emerald-600 dark:text-emerald-400">
                      ₱{formatNumber(tx.totalRevenue)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <ShoppingCart className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No recent sales</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Restocks */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-amber-500/10">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 bg-blue-500 rounded-full flex-shrink-0"></div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Recent Restocks</h3>
            </div>
            <p className="text-xs mt-0.5 ml-3 text-slate-600 dark:text-slate-400">Latest inventory replenishments</p>
          </div>
          <CardContent className="pt-4 pb-3">
            <div className="space-y-2">
              {stats?.recentRestocks && stats.recentRestocks.length > 0 ? (
                stats.recentRestocks.map((restock, index) => (
                  <div key={index} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-[#1a1a1a] hover:bg-slate-100 dark:hover:bg-[#222] transition-colors border border-transparent hover:border-slate-200 dark:hover:border-amber-500/15">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs truncate text-slate-900 dark:text-white">{restock.itemName}</div>
                        <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{restock.quantity} units added</div>
                      </div>
                    </div>
                    <div className="text-sm font-bold flex-shrink-0 ml-2 text-blue-600 dark:text-blue-400">
                      ₱{formatNumber(restock.totalCost)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <Package className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No recent restocks</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights & Health */}
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-3">
        {/* Business Insights */}
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-amber-500/10">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 bg-violet-500 rounded-full flex-shrink-0"></div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Business Insights</h3>
            </div>
            <p className="text-xs mt-0.5 ml-3 text-slate-600 dark:text-slate-400">Automated performance analysis</p>
          </div>
          <CardContent className="pt-4 pb-3">
            <div className="space-y-2">
              {stats?.insights && stats.insights.length > 0 ? (
                stats.insights.map((insight, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 rounded-lg border-l-4",
                      insight.type === 'success' && "border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/15",
                      insight.type === 'warning' && "border-l-amber-500 bg-amber-50 dark:bg-amber-900/15",
                      insight.type === 'error'   && "border-l-red-500 bg-red-50 dark:bg-red-900/15"
                    )}
                  >
                    <div className={cn(
                      "h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                      insight.type === 'success' && "bg-emerald-500",
                      insight.type === 'warning' && "bg-amber-500",
                      insight.type === 'error'   && "bg-red-500"
                    )}>
                      <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {insight.type === 'success'
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v4m0 4h.01" />}
                      </svg>
                    </div>
                    <p className={cn(
                      "text-xs font-semibold leading-relaxed",
                      insight.type === 'success' && "text-emerald-700 dark:text-emerald-300",
                      insight.type === 'warning' && "text-amber-700 dark:text-amber-300",
                      insight.type === 'error'   && "text-red-700 dark:text-red-300"
                    )}>
                      {insight.message}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <Activity className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No insights available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Inventory Health Score */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-amber-500/10">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 bg-emerald-500 rounded-full flex-shrink-0"></div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Inventory Health</h3>
            </div>
            <p className="text-xs mt-0.5 ml-3 text-slate-600 dark:text-slate-400">Overall stock status score</p>
          </div>
          <CardContent className="pt-5 pb-4">
            {/* Score */}
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">Health Score</p>
                <div className="flex items-end gap-1.5">
                  <span className="text-4xl font-black leading-none text-slate-900 dark:text-white">
                    {stats?.inventoryHealthScore || 0}
                  </span>
                  <span className="text-base mb-0.5 text-slate-400 dark:text-slate-500">/ 100</span>
                </div>
              </div>
              {/* Circular indicator */}
              <div className={cn(
                "h-14 w-14 rounded-full flex items-center justify-center border-4",
                (stats?.inventoryHealthScore || 0) >= 80 ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" :
                (stats?.inventoryHealthScore || 0) >= 60 ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20" :
                "border-red-500 bg-red-50 dark:bg-red-900/20"
              )}>
                <Activity className={cn("h-6 w-6",
                  (stats?.inventoryHealthScore || 0) >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                  (stats?.inventoryHealthScore || 0) >= 60 ? "text-amber-600 dark:text-amber-400" :
                  "text-red-600 dark:text-red-400"
                )} />
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000 ease-out",
                  (stats?.inventoryHealthScore || 0) >= 80 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" :
                  (stats?.inventoryHealthScore || 0) >= 60 ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                  "bg-gradient-to-r from-red-500 to-red-400"
                )}
                style={{ width: `${stats?.inventoryHealthScore || 0}%` }}
              />
            </div>
            <div className="flex justify-center mb-4">
              <span className={cn(
                "text-[11px] font-bold px-3 py-1 rounded-full",
                (stats?.inventoryHealthScore || 0) >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                (stats?.inventoryHealthScore || 0) >= 60 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}>
                {(stats?.inventoryHealthScore || 0) >= 80 ? "Excellent Health" :
                 (stats?.inventoryHealthScore || 0) >= 60 ? "Good Health" :
                 (stats?.inventoryHealthScore || 0) >= 40 ? "Fair Health" : "Needs Attention"}
              </span>
            </div>

            {/* Metrics */}
            <div className="space-y-2 border-t border-slate-100 dark:border-amber-500/10 pt-3">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#1a1a1a]">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Package className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Stock Levels</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {Math.round(((stats?.totalItems || 0) - (stats?.outOfStockCount || 0)) / (stats?.totalItems || 1) * 100)}%
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#1a1a1a]">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Return Rate</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {(stats?.returnRate || 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#1a1a1a]">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Low Stock Items</span>
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{lowStockCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
