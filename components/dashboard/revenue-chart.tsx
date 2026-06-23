"use client"

/**
 * Enterprise Revenue Chart Component
 * 
 * Features:
 * - Dynamic time period filtering (Day/Week/Month)
 * - Period-over-period comparison with % change
 * - Dual-axis visualization (Sales vs Purchases)
 * - Smart Y-axis scaling with currency formatting
 * - Enhanced tooltips with net profit calculation
 * - Smooth animations and loading states
 * - Dark mode compatible
 * - Mobile-responsive with adaptive date labels
 * 
 * @component
 */

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts"
import { ArrowUpRight, ArrowDownRight, TrendingUp, Minus } from "lucide-react"
import { formatNumber } from "@/lib/utils"
import { cn } from "@/lib/utils"

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type TimePeriod = "ID" | "1W" | "1M"

export interface ChartDataPoint {
  date: string
  sales: number
  purchases: number
  quantity: number
  orders: number
}

export interface PeriodComparison {
  current: number
  previous: number
  change: number
  changePercent: number
  currentQuantity: number
  previousQuantity: number
}

export interface RevenueChartProps {
  data: ChartDataPoint[]
  timePeriod: TimePeriod
  onPeriodChange: (period: TimePeriod) => void
  comparison: PeriodComparison
  loading?: boolean
}

// ============================================================================
// CHART CONFIGURATION
// ============================================================================

const CHART_CONFIG = {
  height: 320,
  margins: { top: 10, bottom: 30, left: 10, right: 10 },
  colors: {
    sales: {
      stroke: "#6366F1",
      fill: "url(#salesGradient)",
      activeDot: { fill: "#6366F1", stroke: "#fff", strokeWidth: 2, r: 6 }
    },
    purchases: {
      stroke: "#F97316",
      strokeDasharray: "5 5",
      strokeWidth: 2
    }
  },
  animation: {
    duration: 1000,
    easing: "ease-in-out"
  }
}

const PERIOD_LABELS = {
  ID: { current: "Today", previous: "Yesterday" },
  "1W": { current: "This Week", previous: "Last Week" },
  "1M": { current: "This Month", previous: "Last Month" }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format currency value for display
 */
const formatCurrency = (value: number): string => {
  return `₱${formatNumber(value)}`
}

/**
 * Format Y-axis ticks with smart scaling
 */
const formatYAxis = (value: number): string => {
  if (value >= 1000000) return `₱${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `₱${(value / 1000).toFixed(0)}k`
  return `₱${value}`
}

/**
 * Calculate net profit from sales and purchases
 */
const calculateNetProfit = (sales: number, purchases: number): number => {
  return sales - purchases
}

/**
 * Get trend indicator component based on change
 */
const getTrendIndicator = (change: number) => {
  if (change > 0) {
    return {
      icon: ArrowUpRight,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30"
    }
  } else if (change < 0) {
    return {
      icon: ArrowDownRight,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30"
    }
  }
  return {
    icon: Minus,
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800"
  }
}

// ============================================================================
// CUSTOM TOOLTIP COMPONENT
// ============================================================================

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null

  const sales = payload[0]?.value || 0
  const purchases = payload[1]?.value || 0
  const quantity = payload[0]?.payload?.quantity || 0
  const orders = payload[0]?.payload?.orders || 0
  
  // Note: "purchases" here represents restock costs, not COGS
  // Net profit calculation is simplified (doesn't account for actual COGS)
  const netProfit = sales - purchases

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 min-w-[200px]">
      {/* Date/Time Label */}
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-medium">
        {label}
      </p>

      {/* Total Orders */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-cyan-500" />
          <span className="text-xs text-slate-600 dark:text-slate-300">Total Orders</span>
        </div>
        <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">
          {orders}
        </span>
      </div>

      {/* Total Items */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-500" />
          <span className="text-xs text-slate-600 dark:text-slate-300">Total Items</span>
        </div>
        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
          {quantity}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200 dark:border-slate-700 my-2" />

      {/* Sales Revenue */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-slate-600 dark:text-slate-300">Sales Revenue</span>
        </div>
        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
          {formatCurrency(sales)}
        </span>
      </div>

      {/* Purchases/Restocks */}
      {purchases > 0 && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-orange-500" />
            <span className="text-xs text-slate-600 dark:text-slate-300">Restock Costs</span>
          </div>
          <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
            {formatCurrency(purchases)}
          </span>
        </div>
      )}

      {/* Net (Sales - Restocks) - only show if there are purchases */}
      {purchases > 0 && (
        <>
          <div className="border-t border-slate-200 dark:border-slate-700 my-2" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Net (Sales - Restocks)
            </span>
            <span className={cn(
              "text-sm font-bold",
              netProfit >= 0 
                ? "text-green-600 dark:text-green-400" 
                : "text-red-600 dark:text-red-400"
            )}>
              {formatCurrency(netProfit)}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RevenueChart({
  data,
  timePeriod,
  onPeriodChange,
  comparison,
  loading = false
}: RevenueChartProps) {
  
  // Detect mobile screen size
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Memoize formatted data to prevent unnecessary recalculations
  const chartData = useMemo(() => data, [data])

  // Get period labels
  const labels = PERIOD_LABELS[timePeriod]

  // Get trend indicator
  const trend = getTrendIndicator(comparison.change)
  const TrendIcon = trend.icon

  // Calculate totals for current period
  const currentTotal = useMemo(() => 
    chartData.reduce((sum, item) => sum + item.sales, 0),
    [chartData]
  )
  
  // Calculate interval for X-axis based on screen size and period
  const getXAxisInterval = () => {
    if (isMobile) {
      // Mobile: Show fewer labels to prevent crowding
      if (timePeriod === '1M') return 6  // Show ~5 labels for month (every 6th day)
      if (timePeriod === '1W') return 1  // Show every other day (3-4 labels)
      return 2  // Day view: Show every 3rd hour (8 labels instead of 24)
    } else {
      // Desktop: Show more labels for better detail
      if (timePeriod === '1M') return 4  // Show ~7 labels for month
      if (timePeriod === '1W') return 0  // Show all days
      return 0  // Show all hours for day view
    }
  }

  return (
    <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-200 border-0 shadow-lg">
      <CardHeader className="pb-4">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Revenue Overview
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sales performance and purchase costs
              </p>
            </div>
          </div>

          {/* Time Period Tabs */}
          <Tabs value={timePeriod} onValueChange={(value) => onPeriodChange(value as TimePeriod)}>
            <TabsList className="bg-slate-100 dark:bg-slate-800 w-full sm:w-auto">
              <TabsTrigger value="ID" className="text-xs flex-1 sm:flex-none">Day</TabsTrigger>
              <TabsTrigger value="1W" className="text-xs flex-1 sm:flex-none">Week</TabsTrigger>
              <TabsTrigger value="1M" className="text-xs flex-1 sm:flex-none">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* Comparison Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {/* Current Period */}
          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3 sm:p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
              {labels.current}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(comparison.current)}
              </span>
              {comparison.previous > 0 && comparison.changePercent !== 0 && (
                <div className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full",
                  trend.bgColor
                )}>
                  <TrendIcon className={cn("h-3 w-3", trend.color)} />
                  <span className={cn("text-xs font-medium", trend.color)}>
                    {comparison.changePercent > 0 ? '+' : ''}
                    {comparison.changePercent.toFixed(1)}%
                  </span>
                </div>
              )}
              {comparison.previous === 0 && comparison.current > 0 && (
                <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                  New sales!
                </Badge>
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {comparison.currentQuantity.toLocaleString()} {comparison.currentQuantity === 1 ? 'unit' : 'units'} sold
            </div>
          </div>

          {/* Previous Period */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 sm:p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
              {labels.previous}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-bold text-slate-400 dark:text-slate-500">
                {formatCurrency(comparison.previous)}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {comparison.previous === 0 
                ? 'No sales recorded' 
                : `${comparison.previousQuantity.toLocaleString()} ${comparison.previousQuantity === 1 ? 'unit' : 'units'} sold`
              }
            </div>
          </div>

          {/* Change Amount */}
          <div className={cn(
            "rounded-lg p-3 sm:p-4",
            comparison.change >= 0 
              ? "bg-green-50 dark:bg-green-900/10" 
              : "bg-red-50 dark:bg-red-900/10"
          )}>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
              Change
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xl sm:text-2xl font-bold",
                comparison.change >= 0 
                  ? "text-green-600 dark:text-green-400" 
                  : "text-red-600 dark:text-red-400"
              )}>
                {comparison.change >= 0 ? '+' : ''}
                {formatCurrency(comparison.change)}
              </span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 rounded-full bg-gradient-to-r from-blue-500 to-blue-600" />
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Sales Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-orange-500" style={{ borderTop: '2px dashed' }} />
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Restock Costs</span>
          </div>
          <div className="sm:ml-auto text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Note:</span> Restock costs shown when items are restocked
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center h-[320px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Loading chart data...</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          /* Empty State */
          <div className="flex items-center justify-center h-[320px]">
            <div className="text-center">
              <TrendingUp className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                No data available
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Sales data will appear here once transactions are recorded
              </p>
            </div>
          </div>
        ) : (
          /* Chart */
          <ResponsiveContainer width="100%" height={CHART_CONFIG.height}>
            <AreaChart 
              data={chartData} 
              margin={isMobile 
                ? { top: 10, bottom: 55, left: 0, right: 5 }  // Extra bottom space for angled labels
                : CHART_CONFIG.margins
              }
            >
              {/* Gradient Definitions */}
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0.05}/>
                </linearGradient>
              </defs>

              {/* Grid */}
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="stroke-slate-200 dark:stroke-slate-700" 
                opacity={0.3} 
                vertical={false} 
              />

              {/* X Axis */}
              <XAxis 
                dataKey="date" 
                className="fill-slate-400 dark:fill-slate-500" 
                fontSize={isMobile ? 9 : 10}
                tickLine={false}
                axisLine={false}
                interval={getXAxisInterval()}
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? "end" : "middle"}
                height={isMobile ? 65 : 30}
                dy={isMobile ? 3 : 10}
                dx={isMobile ? -5 : 0}
              />

              {/* Y Axis */}
              <YAxis 
                className="fill-slate-400 dark:fill-slate-500" 
                fontSize={isMobile ? 9 : 10}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
                width={isMobile ? 45 : 50}
              />

              {/* Custom Tooltip */}
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{ stroke: '#6366F1', strokeWidth: 1, strokeDasharray: '5 5' }}
              />

              {/* Sales Area */}
              <Area 
                type="monotone" 
                dataKey="sales" 
                stroke={CHART_CONFIG.colors.sales.stroke}
                strokeWidth={3} 
                fill={CHART_CONFIG.colors.sales.fill}
                dot={false}
                activeDot={CHART_CONFIG.colors.sales.activeDot}
                animationDuration={CHART_CONFIG.animation.duration}
              />

              {/* Purchases Line */}
              <Area 
                type="monotone" 
                dataKey="purchases" 
                stroke={CHART_CONFIG.colors.purchases.stroke}
                strokeWidth={CHART_CONFIG.colors.purchases.strokeWidth}
                strokeDasharray={CHART_CONFIG.colors.purchases.strokeDasharray}
                fill="transparent" 
                dot={false}
                animationDuration={CHART_CONFIG.animation.duration}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
