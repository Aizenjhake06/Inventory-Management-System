"use client"

import { useEffect, useState } from "react"
import { BrandLoader } from '@/components/ui/brand-loader'
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { DollarSign, TrendingUp, TrendingDown, Percent, BarChart3, ChevronLeft, ChevronRight, Calendar, ShoppingCart, Package, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart, Area, AreaChart, Tooltip } from "recharts"
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { EnterpriseDateRangePicker } from "@/components/ui/enterprise-date-range-picker"

import type { SalesReport } from "@/lib/types"
import { formatCurrency, formatNumber } from "@/lib/utils"

export default function AnalyticsPage() {
  const [report, setReport] = useState<SalesReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'daily' | 'monthly'>('daily')
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [salesChannelFilter, setSalesChannelFilter] = useState("all")
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setError(null)
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth()
        
        // Use custom date range if provided, otherwise use view-based dates
        let fetchStartDate, fetchEndDate
        if (startDate && endDate) {
          fetchStartDate = startDate
          fetchEndDate = endDate
        } else if (view === 'monthly') {
          fetchStartDate = new Date(year, 0, 1) // January 1st
          fetchEndDate = new Date(year, 11, 31) // December 31st
        } else {
          fetchStartDate = new Date(year, month, 1)
          fetchEndDate = new Date(year, month + 1, 0)
        }

        const startDateStr = fetchStartDate.toISOString().split('T')[0]
        const endDateStr = fetchEndDate.toISOString().split('T')[0]

        const url = new URL('/api/reports', window.location.origin)
        url.searchParams.append('startDate', startDateStr)
        url.searchParams.append('endDate', endDateStr)
        url.searchParams.append('view', view)
        if (salesChannelFilter && salesChannelFilter !== 'all') {
          url.searchParams.append('salesChannel', salesChannelFilter)
        }

        const reportRes = await fetch(url)

        if (!reportRes.ok) {
          throw new Error(`Failed to fetch data: ${reportRes.status} ${reportRes.statusText}`)
        }

        const reportData = await reportRes.json()
        setReport(reportData)

      } catch (error) {
        console.error("Error fetching data:", error)
        setError(error instanceof Error ? error.message : 'Failed to fetch data')
        setReport(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [view, currentMonth, salesChannelFilter, startDate, endDate])

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
    setLoading(true)
    setError(null)
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
    setLoading(true)
    setError(null)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[600px]">
        <div className="text-center">
          <BrandLoader size="lg" />
          <p className="text-slate-600 dark:text-slate-400 mt-6 text-sm font-medium">
            Loading analytics...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-2">Error loading analytics</div>
          <div className="text-sm text-muted-foreground">{error}</div>
        </div>
      </div>
    )
  }

  const monthYear = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const dailySales = report?.dailySales ?? []
  const rawMonthlySales = report?.monthlySales ?? []
  
  // Ensure all 12 months are displayed (Jan-Dec) with 0 revenue if no data
  const monthlySales = Array.from({ length: 12 }, (_, i) => {
    const monthNum = (i + 1).toString().padStart(2, '0')
    const monthKey = `2026-${monthNum}` // Current year
    const existingData = rawMonthlySales.find(m => m.month === monthKey)
    return existingData || { month: monthKey, revenue: 0 }
  })

  // Calculate additional metrics
  const avgDailyRevenue = dailySales.length > 0 
    ? dailySales.reduce((sum, d) => sum + d.revenue, 0) / dailySales.length 
    : 0
  
  const highestSaleDay = dailySales.length > 0
    ? dailySales.reduce((max, d) => d.revenue > max.revenue ? d : max, dailySales[0])
    : null

  const totalTransactions = dailySales.reduce((sum, d) => sum + (d.revenue > 0 ? 1 : 0), 0)

  const profitMarginTrend = report?.profitMargin && report.profitMargin > 0 ? 'up' : 'down'

  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(var(--primary))",
    },
  }

  return (
    <div className="max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 py-6 space-y-6">
      {/* Page Header - Professional */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold gradient-text mb-1">
            Sales Analytics Overview
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Comprehensive sales performance analysis and business insights
          </p>
        </div>
        <div className="flex-shrink-0">
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

      {/* Sales Performance Metrics - Professional Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30 flex-shrink-0">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 tabular-nums">
                {formatCurrency(report?.totalRevenue || 0)}
              </p>
            </div>
          </div>
        </Card>

        {/* Total Cost */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 shadow-lg shadow-purple-500/30 flex-shrink-0">
              <TrendingDown className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Total Cost</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 tabular-nums">
                {formatCurrency(report?.totalCost || 0)}
              </p>
            </div>
          </div>
        </Card>

        {/* Gross Profit */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 shadow-lg shadow-emerald-500/30 flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Gross Profit</p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 tabular-nums">
                {formatCurrency(report?.totalProfit || 0)}
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
                {(report?.profitMargin || 0).toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Additional Insights - Professional Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Avg Daily Revenue */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30 flex-shrink-0">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Avg Daily Revenue</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 tabular-nums">
                {formatCurrency(avgDailyRevenue)}
              </p>
            </div>
          </div>
        </Card>

        {/* Total Transactions */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 shadow-lg shadow-emerald-500/30 flex-shrink-0">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Total Transactions</p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 tabular-nums">
                {formatNumber(totalTransactions)}
              </p>
            </div>
          </div>
        </Card>

        {/* Highest Sale Day */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-600 shadow-lg shadow-amber-500/30 flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Highest Sale Day</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 tabular-nums">
                {highestSaleDay ? formatCurrency(highestSaleDay.revenue) : '₱0.00'}
              </p>
              {highestSaleDay && (
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                  {new Date(highestSaleDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Controls - Professional */}
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">View Type</Label>
                <div className="flex gap-2">
                  <Button
                    variant={view === 'daily' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setView('daily')}
                    className="h-9 flex-1"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Daily
                  </Button>
                  <Button
                    variant={view === 'monthly' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setView('monthly')}
                    className="h-9 flex-1"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Monthly
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Sales Channel</Label>
                <Select value={salesChannelFilter} onValueChange={setSalesChannelFilter}>
                  <SelectTrigger className="h-9 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20">
                    <SelectValue placeholder="All Channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    <SelectItem value="Shopee">Shopee</SelectItem>
                    <SelectItem value="Lazada">Lazada</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="TikTok">TikTok</SelectItem>
                    <SelectItem value="Physical Store">Physical Store</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {view === 'monthly' && (
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Chart Type</Label>
                  <Select value={chartType} onValueChange={(value: 'bar' | 'line' | 'area') => setChartType(value)}>
                    <SelectTrigger className="h-9 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                      <SelectItem value="line">Line Chart</SelectItem>
                      <SelectItem value="area">Area Chart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {view === 'daily' && (
                <div className="flex items-center gap-2 flex-1">
                  <Button variant="outline" size="sm" onClick={prevMonth} className="h-9 flex-shrink-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white text-center flex-1">
                    {monthYear}
                  </span>
                  <Button variant="outline" size="sm" onClick={nextMonth} className="h-9 flex-shrink-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      {view === 'daily' ? (
        dailySales.length > 0 ? (
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-900 dark:text-white">
                <div className="p-2 rounded-lg bg-blue-600 shadow-sm">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                Daily Sales Calendar — {monthYear}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="min-w-[640px] p-4">
                  <div className="grid grid-cols-7 gap-0.5">
                {/* Weekday Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider border-b-2 border-slate-200 dark:border-slate-700">
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {generateCalendarDays(currentMonth, dailySales).map((cell, index) => (
                  <div key={index} className="relative h-24">
                    {cell.day !== null ? (
                      <div
                        className={cn(
                          "h-full p-2 border border-slate-200 dark:border-slate-700 rounded-[5px] bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 flex flex-col justify-between shadow-sm",
                          cell.revenue > 0 && "border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/20"
                        )}
                      >
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{cell.day}</div>
                        <div className="text-center">
                          {cell.revenue > 0 ? (
                            <>
                              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(cell.revenue)}
                              </div>
                              <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                                {cell.itemsSold} {cell.itemsSold === 1 ? 'unit' : 'units'}
                              </div>
                              <Badge className="mt-1 h-4 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                                Sale
                              </Badge>
                            </>
                          ) : (
                            <div className="text-xs text-slate-400 dark:text-slate-600">No sales</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full p-2 opacity-30 rounded-[5px] bg-slate-100 dark:bg-slate-800/20" />
                    )}
                  </div>
                ))}
              </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Sales Data</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">No sales data available for {monthYear}.</p>
            </CardContent>
          </Card>
        )
      ) : (
        monthlySales.length > 0 ? (
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-6 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900 dark:text-white">
                <div className="p-2 rounded-lg bg-emerald-600 shadow-sm">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-xl font-bold">Monthly Sales Revenue Trend</div>
                  <div className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    Year-to-date performance overview
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="w-full h-[400px]">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  {chartType === 'bar' ? (
                    <BarChart data={monthlySales} margin={{ left: 10, right: 40, top: 30, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={12}
                        minTickGap={32}
                        tickFormatter={(month) => new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' })}
                        className="text-sm font-medium"
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis 
                        tickLine={false}
                        axisLine={false}
                        tickMargin={12}
                        tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                        className="text-sm font-medium"
                        width={60}
                        stroke="hsl(var(--muted-foreground))"
                      />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null
                        const data = payload[0]
                        return (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 min-w-[200px]">
                            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600"></div>
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {new Date(data.payload.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Revenue</p>
                              <p className="text-2xl font-bold bg-gradient-to-br from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
                                {formatCurrency(data.value as number)}
                              </p>
                            </div>
                          </div>
                        )
                      }}
                      cursor={{ stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5 5' }}
                    />
                      <Bar 
                        dataKey="revenue" 
                        fill="url(#colorRevenue)" 
                        radius={[10, 10, 0, 0]}
                        maxBarSize={70}
                      />
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.4} />
                        </linearGradient>
                      </defs>
                    </BarChart>
                ) : chartType === 'line' ? (
                  <LineChart data={monthlySales} margin={{ left: 0, right: 30, top: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      tickMargin={10}
                      minTickGap={32}
                      tickFormatter={(month) => new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' })}
                      className="text-xs"
                    />
                    <YAxis 
                      tickLine={false}
                      tickMargin={10}
                      tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                      className="text-xs"
                      width={45}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null
                        const data = payload[0]
                        return (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 min-w-[200px]">
                            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-600"></div>
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {new Date(data.payload.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Revenue</p>
                              <p className="text-2xl font-bold bg-gradient-to-br from-blue-600 to-blue-700 bg-clip-text text-transparent">
                                {formatCurrency(data.value as number)}
                              </p>
                            </div>
                          </div>
                        )
                      }}
                      cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' }}
                    />
                    <Line 
                      type="monotone"
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                ) : (
                  <AreaChart data={monthlySales} margin={{ left: 0, right: 30, top: 20, bottom: 40 }}>
                    <defs>
                      <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      className="stroke-slate-200 dark:stroke-slate-700" 
                      opacity={0.3} 
                      vertical={false} 
                    />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      minTickGap={32}
                      tickFormatter={(month) => new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' })}
                      className="text-xs fill-slate-400 dark:fill-slate-500"
                    />
                    <YAxis 
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                      className="text-xs fill-slate-400 dark:fill-slate-500"
                      width={50}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null
                        const data = payload[0]
                        return (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 min-w-[200px] animate-in fade-in-0 zoom-in-95 duration-200">
                            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/50"></div>
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {new Date(data.payload.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Revenue</p>
                              <p className="text-2xl font-bold bg-gradient-to-br from-indigo-600 to-indigo-700 bg-clip-text text-transparent tabular-nums">
                                {formatCurrency(data.value as number)}
                              </p>
                            </div>
                          </div>
                        )
                      }}
                      cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5', opacity: 0.5 }}
                    />
                    <Area 
                      type="monotone"
                      dataKey="revenue" 
                      stroke="#6366F1"
                      strokeWidth={3}
                      fill="url(#colorArea)"
                      dot={{ fill: "#6366F1", stroke: "#fff", strokeWidth: 2, r: 4 }}
                      activeDot={{ fill: "#6366F1", stroke: "#fff", strokeWidth: 2, r: 6 }}
                      animationDuration={1000}
                    />
                  </AreaChart>
                )}
              </ChartContainer>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
            <CardContent className="p-12 text-center">
              <BarChart3 className="h-16 w-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Monthly Data</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">No monthly sales data available.</p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  )
}

function generateCalendarDays(month: Date, dailySales: { date: string; revenue: number; itemsSold: number }[]) {
  const year = month.getFullYear()
  const mon = month.getMonth()
  const firstDay = new Date(year, mon, 1)
  const lastDay = new Date(year, mon + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const salesMap = new Map(dailySales.map(d => [d.date, { revenue: d.revenue, itemsSold: d.itemsSold || 0 }]))

  const calendar = []

  // Empty cells before first day
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendar.push({ day: null, revenue: 0, itemsSold: 0 })
  }

  // Days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(mon + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    const data = salesMap.get(dateStr) || { revenue: 0, itemsSold: 0 }
    calendar.push({ day: i, revenue: data.revenue, itemsSold: data.itemsSold })
  }

  // Empty cells after last day to complete weeks
  const totalCells = calendar.length
  const remainingCells = (7 - (totalCells % 7)) % 7
  for (let i = 0; i < remainingCells; i++) {
    calendar.push({ day: null, revenue: 0, itemsSold: 0 })
  }

  return calendar
}
