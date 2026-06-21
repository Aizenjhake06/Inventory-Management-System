"use client"

import { useEffect, useState, useRef } from "react"
import { BrandLoader } from '@/components/ui/brand-loader'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Target, BarChart3, Package, DollarSign, Percent, RefreshCw, TrendingUpIcon, Search, X, RotateCcw } from "lucide-react"
import type { ABCAnalysis, InventoryTurnover, PredictiveAnalytics } from "@/lib/types"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { apiGet } from "@/lib/api-client"
import { getCurrentUserRole } from '@/lib/role-utils'
import { getCurrentUser } from '@/lib/auth'

export default function InsightsPage() {
  const [abcAnalysis, setAbcAnalysis] = useState<ABCAnalysis[]>([])
  const [turnover, setTurnover] = useState<InventoryTurnover[]>([])
  const [fastMoving, setFastMoving] = useState<any[]>([])
  const [slowMoving, setSlowMoving] = useState<any[]>([])
  const [deadStock, setDeadStock] = useState<any[]>([])
  const [profitMargin, setProfitMargin] = useState<any[]>([])
  const [forecasts, setForecasts] = useState<PredictiveAnalytics[]>([])
  const [returnAnalytics, setReturnAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("abc")
  
  // Role detection
  const userRole = getCurrentUserRole()
  const isTeamLeader = false // Team leader role removed
  const currentUser = getCurrentUser()
  const teamLeaderChannel = null
  const isDepartment = userRole === 'operations'
  const userChannel = currentUser?.assignedChannel || null
  
  // Global Sales Channel Filter
  // Department accounts: auto-set to their assigned channel
  const [salesChannelFilter, setSalesChannelFilter] = useState(
    isDepartment && userChannel ? userChannel : "all"
  )
  
  // Filter states
  const [abcSearch, setAbcSearch] = useState("")
  const [abcCategoryFilter, setAbcCategoryFilter] = useState("all")
  const [abcSortBy, setAbcSortBy] = useState("revenue-desc")
  
  const [turnoverSearch, setTurnoverSearch] = useState("")
  const [turnoverStatusFilter, setTurnoverStatusFilter] = useState("all")
  const [turnoverSortBy, setTurnoverSortBy] = useState("ratio-desc")
  
  const [forecastSearch, setForecastSearch] = useState("")
  const [forecastTrendFilter, setForecastTrendFilter] = useState("all")
  const [forecastSortBy, setForecastSortBy] = useState("demand-desc")
  
  const [profitSearch, setProfitSearch] = useState("")
  const [profitSortBy, setProfitSortBy] = useState("margin-desc")
  
  const [deadStockSearch, setDeadStockSearch] = useState("")
  const [deadStockCategoryFilter, setDeadStockCategoryFilter] = useState("all")
  const [deadStockSortBy, setDeadStockSortBy] = useState("days-desc")
  
  const [returnSearch, setReturnSearch] = useState("")
  const [returnSortBy, setReturnSortBy] = useState("quantity-desc")
  
  const [fastMovingSearch, setFastMovingSearch] = useState("")
  const [fastMovingSortBy, setFastMovingSortBy] = useState("ratio-desc")
  
  const [slowMovingSearch, setSlowMovingSearch] = useState("")
  const [slowMovingSortBy, setSlowMovingSortBy] = useState("days-desc")
  
  // Tab scroll state for gradient indicators
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const tabsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [salesChannelFilter])
  
  // Detect scroll overflow for gradient indicators
  useEffect(() => {
    const checkScroll = () => {
      if (!tabsRef.current) return
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
    }
    
    const tabsElement = tabsRef.current
    if (tabsElement) {
      checkScroll()
      tabsElement.addEventListener('scroll', checkScroll, { passive: true })
      window.addEventListener('resize', checkScroll)
      return () => {
        tabsElement.removeEventListener('scroll', checkScroll)
        window.removeEventListener('resize', checkScroll)
      }
    }
  }, [])

  async function fetchAnalytics() {
    setLoading(true)
    try {
      // Build query params
      const params = new URLSearchParams()
      params.append('type', 'all')
      if (salesChannelFilter && salesChannelFilter !== 'all') {
        params.append('salesChannel', salesChannelFilter)
      }

      const forecastParams = new URLSearchParams()
      forecastParams.append('type', 'forecast')
      if (salesChannelFilter && salesChannelFilter !== 'all') {
        forecastParams.append('salesChannel', salesChannelFilter)
      }

      const itemsParams = new URLSearchParams()
      if (salesChannelFilter && salesChannelFilter !== 'all') {
        itemsParams.append('salesChannel', salesChannelFilter)
      }

      const [analyticsData, forecastData, itemsData] = await Promise.all([
        apiGet<any>(`/api/analytics?${params}`),
        apiGet<PredictiveAnalytics[]>(`/api/analytics?${forecastParams}`),
        apiGet<any[]>(`/api/items${itemsParams.toString() ? '?' + itemsParams : ''}`)
      ])

      setAbcAnalysis(analyticsData.abc || [])
      setTurnover(analyticsData.turnover || [])
      setProfitMargin(analyticsData.profitMargin || [])
      setForecasts(Array.isArray(forecastData) ? forecastData : [])
      setReturnAnalytics(analyticsData.returns || null)
      
      // Categorize items by turnover speed
      const turnoverData = analyticsData.turnover || []
      
      // Fast Moving: turnover ratio > 4 (sells in < 90 days)
      const fastMovingItems = turnoverData
        .filter(t => t.status === 'fast-moving')
        .map(t => {
          const item = itemsData.find(i => i.id === t.itemId)
          return item ? { ...item, daysToSell: t.daysToSell, turnoverRatio: t.turnoverRatio } : null
        })
        .filter(Boolean)
      
      // Slow Moving: turnover ratio 1-2 (sells in 180-365 days)
      const slowMovingItems = turnoverData
        .filter(t => t.status === 'slow-moving')
        .map(t => {
          const item = itemsData.find(i => i.id === t.itemId)
          return item ? { ...item, daysToSell: t.daysToSell, turnoverRatio: t.turnoverRatio } : null
        })
        .filter(Boolean)
      
      setFastMoving(fastMovingItems)
      setSlowMoving(slowMovingItems)
      
      // Use turnover data for dead stock (items with 180+ days to sell)
      const deadStockItems = turnoverData
        .filter(t => t.status === 'dead-stock')
        .map(t => {
          const item = itemsData.find(i => i.id === t.itemId)
          return item ? { ...item, daysToSell: t.daysToSell, turnoverRatio: t.turnoverRatio } : null
        })
        .filter(Boolean)
      
      setDeadStock(deadStockItems)
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }



  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-red-600" />
      default: return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fast-moving': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
      case 'normal': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
      case 'slow-moving': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
      case 'dead-stock': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'A': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
      case 'B': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
      case 'C': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']

  const abcChartData = [
    { name: 'A Items', value: abcAnalysis.filter(a => a.category === 'A').length },
    { name: 'B Items', value: abcAnalysis.filter(a => a.category === 'B').length },
    { name: 'C Items', value: abcAnalysis.filter(a => a.category === 'C').length },
  ]

  const turnoverChartData = [
    { name: 'Fast Moving', value: turnover.filter(t => t.status === 'fast-moving').length },
    { name: 'Normal', value: turnover.filter(t => t.status === 'normal').length },
    { name: 'Slow Moving', value: turnover.filter(t => t.status === 'slow-moving').length },
    { name: 'Dead Stock', value: turnover.filter(t => t.status === 'dead-stock').length },
  ]

  // Calculate stats
  const totalItems = abcAnalysis.length
  const categoryAItems = abcAnalysis.filter(a => a.category === 'A').length
  const avgTurnoverRatio = turnover.length > 0 
    ? turnover.reduce((sum, t) => sum + t.turnoverRatio, 0) / turnover.length 
    : 0
  const totalDeadStockValue = deadStock.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0)

  // Filtered data
  const filteredAbcAnalysis = abcAnalysis
    .filter(item => {
      const matchesSearch = item.itemName.toLowerCase().includes(abcSearch.toLowerCase())
      const matchesCategory = abcCategoryFilter === "all" || item.category === abcCategoryFilter
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      if (abcSortBy === "revenue-desc") return b.revenueContribution - a.revenueContribution
      if (abcSortBy === "revenue-asc") return a.revenueContribution - b.revenueContribution
      if (abcSortBy === "name-asc") return a.itemName.localeCompare(b.itemName)
      return 0
    })

  const filteredTurnover = turnover
    .filter(item => {
      const matchesSearch = item.itemName.toLowerCase().includes(turnoverSearch.toLowerCase())
      const matchesStatus = turnoverStatusFilter === "all" || item.status === turnoverStatusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (turnoverSortBy === "ratio-desc") return b.turnoverRatio - a.turnoverRatio
      if (turnoverSortBy === "ratio-asc") return a.turnoverRatio - b.turnoverRatio
      if (turnoverSortBy === "days-asc") return a.daysToSell - b.daysToSell
      if (turnoverSortBy === "name-asc") return a.itemName.localeCompare(b.itemName)
      return 0
    })

  const filteredForecasts = forecasts
    .filter(item => {
      const matchesSearch = item.itemName.toLowerCase().includes(forecastSearch.toLowerCase())
      const matchesTrend = forecastTrendFilter === "all" || item.trend === forecastTrendFilter
      return matchesSearch && matchesTrend
    })
    .sort((a, b) => {
      if (forecastSortBy === "demand-desc") return b.predictedDemand - a.predictedDemand
      if (forecastSortBy === "demand-asc") return a.predictedDemand - b.predictedDemand
      if (forecastSortBy === "confidence-desc") return b.confidence - a.confidence
      if (forecastSortBy === "name-asc") return a.itemName.localeCompare(b.itemName)
      return 0
    })

  const filteredProfitMargin = profitMargin
    .filter(item => item.category.toLowerCase().includes(profitSearch.toLowerCase()))
    .sort((a, b) => {
      if (profitSortBy === "margin-desc") return b.margin - a.margin
      if (profitSortBy === "margin-asc") return a.margin - b.margin
      if (profitSortBy === "revenue-desc") return b.revenue - a.revenue
      if (profitSortBy === "profit-desc") return b.profit - a.profit
      return 0
    })

  const filteredDeadStock = deadStock
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(deadStockSearch.toLowerCase())
      const matchesCategory = deadStockCategoryFilter === "all" || item.category === deadStockCategoryFilter
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      if (deadStockSortBy === "value-desc") return (b.quantity * b.costPrice) - (a.quantity * a.costPrice)
      if (deadStockSortBy === "value-asc") return (a.quantity * a.costPrice) - (b.quantity * b.costPrice)
      if (deadStockSortBy === "quantity-desc") return b.quantity - a.quantity
      if (deadStockSortBy === "days-desc") return (b.daysToSell || 0) - (a.daysToSell || 0)
      if (deadStockSortBy === "name-asc") return a.name.localeCompare(b.name)
      return 0
    })

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[600px]">
        <div className="text-center">
          <BrandLoader size="lg" />
          <p className="text-slate-600 dark:text-slate-400 mt-6 text-sm font-medium">
            Loading insights...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto py-5 space-y-6">
      {/* Page Header - Professional */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold gradient-text mb-1">Business Insights Overview</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            AI-powered analytics and strategic recommendations for data-driven decisions
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-shrink-0">
          <Select 
            value={salesChannelFilter} 
            onValueChange={setSalesChannelFilter}
            disabled={isDepartment}
          >
            <SelectTrigger className="h-10 w-full sm:w-[180px] border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20">
              <SelectValue placeholder={isDepartment ? userChannel : "All Channels"} />
            </SelectTrigger>
            <SelectContent>
              {!isDepartment && <SelectItem value="all">All Channels</SelectItem>}
              <SelectItem value="Shopee">Shopee</SelectItem>
              <SelectItem value="Lazada">Lazada</SelectItem>
              <SelectItem value="Facebook">Facebook</SelectItem>
              <SelectItem value="TikTok">TikTok</SelectItem>
              <SelectItem value="Physical Store">Physical Store</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={fetchAnalytics}
            variant="outline"
            size="sm"
            className="h-10 gap-2 flex-shrink-0 border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards - Professional Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Analyzed Items */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30 flex-shrink-0">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Analyzed Items</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 tabular-nums">
                {formatNumber(totalItems)}
              </p>
            </div>
          </div>
        </Card>

        {/* High Value Items */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 shadow-lg shadow-emerald-500/30 flex-shrink-0">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">High Value Items</p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 tabular-nums">
                {formatNumber(categoryAItems)}
              </p>
            </div>
          </div>
        </Card>

        {/* Turnover Ratio */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 shadow-lg shadow-purple-500/30 flex-shrink-0">
              <TrendingUpIcon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Turnover Ratio</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 tabular-nums">
                {avgTurnoverRatio.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        {/* Dead Stock Value */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 shadow-lg shadow-red-500/30 flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Value at Risk</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100 tabular-nums">
                {formatCurrency(totalDeadStockValue)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="relative enterprise-tab-container">
          {/* Left Gradient Fade Indicator */}
          <div 
            className={`absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white dark:from-slate-900 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${
              canScrollLeft ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden="true"
          />
          
          {/* Right Gradient Fade Indicator */}
          <div 
            className={`absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-slate-900 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${
              canScrollRight ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden="true"
          />
          
          <TabsList 
            ref={tabsRef}
            role="tablist"
            aria-label="Business insights navigation"
            className="enterprise-tabs-list bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-0 h-auto rounded-none w-full justify-start overflow-x-auto scrollbar-hide scroll-smooth"
            style={{
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-x',
            }}
          >
            <TabsTrigger 
              value="abc"
              role="tab"
              aria-selected={activeTab === 'abc'}
              aria-controls="abc-panel"
              className="enterprise-tab relative data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300 data-[state=active]:font-semibold data-[state=active]:shadow-[0_0_20px_rgba(37,99,235,0.3)] rounded-lg px-6 md:px-8 py-3 font-medium text-base whitespace-nowrap transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              style={{ scrollSnapAlign: 'start' }}
            >
              ABC Analysis
            </TabsTrigger>
            <TabsTrigger 
              value="turnover"
              role="tab"
              aria-selected={activeTab === 'turnover'}
              aria-controls="turnover-panel"
              className="enterprise-tab relative data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300 data-[state=active]:font-semibold data-[state=active]:shadow-[0_0_20px_rgba(37,99,235,0.3)] rounded-lg px-6 md:px-8 py-3 font-medium text-base whitespace-nowrap transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              style={{ scrollSnapAlign: 'start' }}
            >
              Turnover
            </TabsTrigger>
            <TabsTrigger 
              value="forecast"
              role="tab"
              aria-selected={activeTab === 'forecast'}
              aria-controls="forecast-panel"
              className="enterprise-tab relative data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300 data-[state=active]:font-semibold data-[state=active]:shadow-[0_0_20px_rgba(37,99,235,0.3)] rounded-lg px-6 md:px-8 py-3 font-medium text-base whitespace-nowrap transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              style={{ scrollSnapAlign: 'start' }}
            >
              Forecast
            </TabsTrigger>
            <TabsTrigger 
              value="profit"
              role="tab"
              aria-selected={activeTab === 'profit'}
              aria-controls="profit-panel"
              className="enterprise-tab relative data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300 data-[state=active]:font-semibold data-[state=active]:shadow-[0_0_20px_rgba(37,99,235,0.3)] rounded-lg px-6 md:px-8 py-3 font-medium text-base whitespace-nowrap transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              style={{ scrollSnapAlign: 'start' }}
            >
              Profit
            </TabsTrigger>
            <TabsTrigger 
              value="fast-moving"
              role="tab"
              aria-selected={activeTab === 'fast-moving'}
              aria-controls="fast-moving-panel"
              className="enterprise-tab relative data-[state=active]:bg-green-100 dark:data-[state=active]:bg-green-900/30 data-[state=active]:text-green-700 dark:data-[state=active]:text-green-300 data-[state=active]:font-semibold data-[state=active]:shadow-[0_0_20px_rgba(34,197,94,0.3)] rounded-lg px-6 md:px-8 py-3 font-medium text-base whitespace-nowrap transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              style={{ scrollSnapAlign: 'start' }}
            >
              Fast Moving
            </TabsTrigger>
            <TabsTrigger 
              value="slow-moving"
              role="tab"
              aria-selected={activeTab === 'slow-moving'}
              aria-controls="slow-moving-panel"
              className="enterprise-tab relative data-[state=active]:bg-amber-100 dark:data-[state=active]:bg-amber-900/30 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300 data-[state=active]:font-semibold data-[state=active]:shadow-[0_0_20px_rgba(245,158,11,0.3)] rounded-lg px-6 md:px-8 py-3 font-medium text-base whitespace-nowrap transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              style={{ scrollSnapAlign: 'start' }}
            >
              Slow Moving
            </TabsTrigger>
            <TabsTrigger 
              value="deadstock"
              role="tab"
              aria-selected={activeTab === 'deadstock'}
              aria-controls="deadstock-panel"
              className="enterprise-tab relative data-[state=active]:bg-red-100 dark:data-[state=active]:bg-red-900/30 data-[state=active]:text-red-700 dark:data-[state=active]:text-red-300 data-[state=active]:font-semibold data-[state=active]:shadow-[0_0_20px_rgba(239,68,68,0.3)] rounded-lg px-6 md:px-8 py-3 font-medium text-base whitespace-nowrap transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              style={{ scrollSnapAlign: 'start' }}
            >
              Dead Stock
            </TabsTrigger>
            <TabsTrigger 
              value="returns"
              role="tab"
              aria-selected={activeTab === 'returns'}
              aria-controls="returns-panel"
              className="enterprise-tab relative data-[state=active]:bg-purple-100 dark:data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300 data-[state=active]:font-semibold data-[state=active]:shadow-[0_0_20px_rgba(168,85,247,0.3)] rounded-lg px-6 md:px-8 py-3 font-medium text-base whitespace-nowrap transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              style={{ scrollSnapAlign: 'start' }}
            >
              Returns
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ABC Analysis */}
        <TabsContent value="abc" id="abc-panel" role="tabpanel" aria-labelledby="abc-tab" className="space-y-4 mt-4">

          {/* How ABC Analysis works */}
          <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0 mt-0.5">
                  <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">How is ABC Analysis calculated?</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ranks products by their contribution to total revenue. Based on all active sales orders.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                  <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider mb-1">Category A — Top 20%</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">~80% of total revenue</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">High-value products — prioritize stock, never let these run out</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                  <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">Category B — Middle 30%</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">~15% of total revenue</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Medium-value products — maintain standard stock levels</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Category C — Bottom 50%</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">~5% of total revenue</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Low-value products — keep minimal stock, review regularly</p>
                </div>
              </div>
              <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-start gap-2">
                <span className="text-blue-500 text-sm font-bold flex-shrink-0">ℹ</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Formula: Each product's cumulative revenue share is computed. Top 80% = A, next 15% = B, remaining 5% = C. Products with no sales are automatically classified as C.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-900 dark:text-white">
                  <div className="p-2 rounded-lg bg-blue-600 shadow-sm">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  ABC Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={abcChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {abcChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-slate-900 dark:text-white">ABC Analysis Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-[5px] border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-900 dark:text-white">Category A</span>
                      <Badge className="bg-green-600 text-white border-0">High Value</Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {abcAnalysis.filter(a => a.category === 'A').length} items • ~80% of revenue
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-[5px] border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-900 dark:text-white">Category B</span>
                      <Badge className="bg-blue-600 text-white border-0">Medium Value</Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {abcAnalysis.filter(a => a.category === 'B').length} items • ~15% of revenue
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-[5px] border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-900 dark:text-white">Category C</span>
                      <Badge className="bg-amber-600 text-white border-0">Low Value</Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {abcAnalysis.filter(a => a.category === 'C').length} items • ~5% of revenue
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search products..."
                      value={abcSearch}
                      onChange={(e) => setAbcSearch(e.target.value)}
                      className="pl-10 h-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Category</Label>
                  <Select value={abcCategoryFilter} onValueChange={setAbcCategoryFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="A">Category A</SelectItem>
                      <SelectItem value="B">Category B</SelectItem>
                      <SelectItem value="C">Category C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Sort By</Label>
                  <Select value={abcSortBy} onValueChange={setAbcSortBy}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue-desc">Revenue % (High to Low)</SelectItem>
                      <SelectItem value="revenue-asc">Revenue % (Low to High)</SelectItem>
                      <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(abcSearch || abcCategoryFilter !== "all") && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Showing {filteredAbcAnalysis.length} of {abcAnalysis.length} items
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAbcSearch("")
                      setAbcCategoryFilter("all")
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-slate-900 dark:text-white">Detailed ABC Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black">
                        <th className="py-3 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Product</th>
                        <th className="py-3 px-3 text-center text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Category</th>
                        <th className="py-3 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Revenue %</th>
                        <th className="py-3 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider">Recommendation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {filteredAbcAnalysis.slice(0, 20).map((item) => (
                        <tr key={item.itemId} className="transition-all duration-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-xs font-medium text-slate-800 dark:text-slate-200">{item.itemName}</td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge className={`${getCategoryColor(item.category)} border text-xs px-1.5 py-0.5`}>
                              {item.category}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                            {item.revenueContribution.toFixed(2)}%
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400">
                            {item.recommendation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Turnover */}
        <TabsContent value="turnover" className="space-y-4 mt-4">

          {/* How Inventory Turnover works */}
          <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex-shrink-0 mt-0.5">
                  <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">How is Inventory Turnover calculated?</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Measures how fast each product sells relative to its inventory value. Uses last 90 days of sales.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30">
                  <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-1">Turnover Ratio</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">COGS Sold ÷ Inventory Value</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Higher = product sells faster</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                  <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider mb-1">Fast Moving</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">Days to Sell &lt; 90</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Sells out in under 3 months</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Slow Moving</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">90 ≤ Days &lt; 180</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Takes 3–6 months to sell</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                  <p className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">Dead Stock</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">Days ≥ 180</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">180+ days — urgent action needed</p>
                </div>
              </div>
              <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-start gap-2">
                <span className="text-indigo-500 text-sm font-bold flex-shrink-0">ℹ</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Days to Sell = 90 ÷ Turnover Ratio. If no sales in 90 days, uses days since last sale instead. Products with no sales history are marked Normal.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-slate-900 dark:text-white">Turnover Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={turnoverChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-slate-900 dark:text-white">Key Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-[5px]">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Avg Turnover Ratio</span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {avgTurnoverRatio.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-[5px]">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Fast Moving Items</span>
                    <span className="text-lg font-bold text-green-600">
                      {turnover.filter(t => t.status === 'fast-moving').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-[5px]">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Slow Moving Items</span>
                    <span className="text-lg font-bold text-amber-600">
                      {turnover.filter(t => t.status === 'slow-moving').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-[5px]">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Dead Stock Items</span>
                    <span className="text-lg font-bold text-red-600">
                      {turnover.filter(t => t.status === 'dead-stock').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search products..."
                      value={turnoverSearch}
                      onChange={(e) => setTurnoverSearch(e.target.value)}
                      className="pl-10 h-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Status</Label>
                  <Select value={turnoverStatusFilter} onValueChange={setTurnoverStatusFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="fast-moving">Fast Moving</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="slow-moving">Slow Moving</SelectItem>
                      <SelectItem value="dead-stock">Dead Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Sort By</Label>
                  <Select value={turnoverSortBy} onValueChange={setTurnoverSortBy}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ratio-desc">Turnover Ratio (High to Low)</SelectItem>
                      <SelectItem value="ratio-asc">Turnover Ratio (Low to High)</SelectItem>
                      <SelectItem value="days-asc">Days to Sell (Low to High)</SelectItem>
                      <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(turnoverSearch || turnoverStatusFilter !== "all") && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Showing {filteredTurnover.length} of {turnover.length} items
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTurnoverSearch("")
                      setTurnoverStatusFilter("all")
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-slate-900 dark:text-white">Inventory Turnover Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black">
                      <th className="py-3 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Product</th>
                      <th className="py-3 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Turnover Ratio</th>
                      <th className="py-3 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Days to Sell</th>
                      <th className="py-3 px-3 text-center text-[10px] font-bold text-white uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {filteredTurnover.slice(0, 20).map((item) => (
                      <tr key={item.itemId} className="transition-all duration-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 text-xs font-medium text-slate-800 dark:text-slate-200">{item.itemName}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{item.turnoverRatio}</td>
                        <td className="py-2.5 px-3 text-right text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                            {item.daysToSell !== null && item.daysToSell !== undefined 
                              ? `${item.daysToSell} days` 
                              : <span className="text-slate-500 dark:text-slate-500">No Sales</span>
                            }
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge className={`${getStatusColor(item.status)} border text-xs px-1.5 py-0.5`}>
                              {item.status.replace('-', ' ').toUpperCase()}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Forecast */}
        <TabsContent value="forecast" className="space-y-4 mt-4">
          {/* How Forecast works */}
          <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex-shrink-0 mt-0.5">
                  <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">How is Sales Forecast calculated?</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Uses linear regression on historical sales data to predict future demand per product.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30">
                  <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-1">Trend Direction</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">Slope of sales over time</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Increasing / Stable / Decreasing — based on recent sales pattern</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30">
                  <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-1">Predicted Next Month</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">Avg daily sales × 30</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Estimated units to sell in the next 30 days</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30">
                  <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-1">Restock Needed?</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">Forecast &gt; Current Stock</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">If predicted demand exceeds current stock — reorder recommended</p>
                </div>
              </div>
              <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-start gap-2">
                <span className="text-purple-500 text-sm font-bold flex-shrink-0">ℹ</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Requires at least 2 data points (sales transactions) per product to generate a forecast. Products with no sales history will not appear here.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search products..."
                      value={forecastSearch}
                      onChange={(e) => setForecastSearch(e.target.value)}
                      className="pl-10 h-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Trend</Label>
                  <Select value={forecastTrendFilter} onValueChange={setForecastTrendFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Trends</SelectItem>
                      <SelectItem value="increasing">Increasing</SelectItem>
                      <SelectItem value="stable">Stable</SelectItem>
                      <SelectItem value="decreasing">Decreasing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Sort By</Label>
                  <Select value={forecastSortBy} onValueChange={setForecastSortBy}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="demand-desc">Predicted Demand (High to Low)</SelectItem>
                      <SelectItem value="demand-asc">Predicted Demand (Low to High)</SelectItem>
                      <SelectItem value="confidence-desc">Confidence (High to Low)</SelectItem>
                      <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(forecastSearch || forecastTrendFilter !== "all") && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Showing {filteredForecasts.length} of {forecasts.length} items
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setForecastSearch("")
                      setForecastTrendFilter("all")
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-900 dark:text-white">
                <div className="p-2 rounded-lg bg-purple-600 shadow-sm">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                Predictive Sales Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredForecasts.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Forecast Data</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Forecast data will appear here once enough sales history is available.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black">
                        <th className="py-3 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Product</th>
                        <th className="py-3 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Predicted Demand</th>
                        <th className="py-3 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Recommended Reorder</th>
                        <th className="py-3 px-3 text-center text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Trend</th>
                        <th className="py-3 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {filteredForecasts.slice(0, 20).map((item) => (
                        <tr key={item.itemId} className="transition-all duration-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-xs font-medium text-slate-800 dark:text-slate-200">{item.itemName}</td>
                          <td className="py-2.5 px-3 text-right text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{item.predictedDemand}</td>
                          <td className="py-2.5 px-3 text-right text-xs font-bold text-blue-600 tabular-nums">{item.recommendedReorderQty}</td>
                          <td className="py-2.5 px-3 text-center">{getTrendIcon(item.trend)}</td>
                          <td className="py-2.5 px-3 text-right text-xs text-slate-600 dark:text-slate-400 tabular-nums">{item.confidence}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profit Margins */}
        <TabsContent value="profit" className="space-y-4 mt-4">
          {/* How Profit Margin works */}
          <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex-shrink-0 mt-0.5">
                  <Percent className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">How is Profit Margin calculated?</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Gross profit percentage per product category, based on all active sales orders.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Gross Profit</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">Revenue − COGS</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Revenue from orders minus actual cost of goods sold</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Profit Margin %</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">(Gross Profit ÷ Revenue) × 100</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">How much of each peso earned is actual profit</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">Benchmark</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300">≥ 30% Excellent · 15–29% Good · &lt; 15% Review pricing</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Grouped by product category for easy comparison</p>
                </div>
              </div>
              <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-start gap-2">
                <span className="text-emerald-500 text-sm font-bold flex-shrink-0">ℹ</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Example: Category earns ₱50,000 revenue with ₱30,000 COGS → Gross Profit = ₱20,000 → Margin = 40% → <span className="text-emerald-600 font-semibold">Excellent ✓</span>. CANCELLED and RETURNED orders are excluded.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search categories..."
                      value={profitSearch}
                      onChange={(e) => setProfitSearch(e.target.value)}
                      className="pl-10 h-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Sort By</Label>
                  <Select value={profitSortBy} onValueChange={setProfitSortBy}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="margin-desc">Margin % (High to Low)</SelectItem>
                      <SelectItem value="margin-asc">Margin % (Low to High)</SelectItem>
                      <SelectItem value="revenue-desc">Revenue (High to Low)</SelectItem>
                      <SelectItem value="profit-desc">Profit (High to Low)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {profitSearch && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Showing {filteredProfitMargin.length} of {profitMargin.length} items
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setProfitSearch("")}
                    className="h-7 text-xs gap-1"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-slate-900 dark:text-white">Profit Margin by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredProfitMargin.length === 0 ? (
                <div className="text-center py-12">
                  <Percent className="h-16 w-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Profit Data</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Profit margin data will appear here once sales are recorded.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={filteredProfitMargin}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="margin" fill="#10B981" name="Profit Margin %" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {filteredProfitMargin.length > 0 && (
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-slate-900 dark:text-white">Category Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-6 px-6">
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black">
                        <th className="py-3 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Category</th>
                        <th className="py-3 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Revenue</th>
                        <th className="py-3 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Profit</th>
                        <th className="py-3 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {filteredProfitMargin.map((item, index) => (
                        <tr key={index} className="transition-all duration-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-xs font-medium text-slate-800 dark:text-slate-200">{item.category}</td>
                          <td className="py-2.5 px-3 text-right text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{formatCurrency(item.revenue)}</td>
                          <td className="py-2.5 px-3 text-right text-xs font-bold text-green-600 tabular-nums">{formatCurrency(item.profit)}</td>
                          <td className="py-2.5 px-3 text-right text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums">{item.margin.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Fast Moving Items */}
        <TabsContent value="fast-moving" className="space-y-4 mt-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
                    <TrendingUp className="h-6 w-6" />
                    Fast Moving Items
                  </CardTitle>
                  <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                    High turnover products (sells in &lt; 90 days)
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-lg px-4 py-2">
                  {fastMoving.length} Items
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* How it's calculated */}
          <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 flex-shrink-0 mt-0.5">
                  <BarChart3 className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">How is this calculated?</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Based on the last 90 days of sales data per product.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                  <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider mb-1">Step 1 — Turnover Ratio</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">COGS Sold (90 days) ÷ Inventory Value</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">How many times the stock "turned over" in 90 days</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                  <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider mb-1">Step 2 — Days to Sell</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">90 ÷ Turnover Ratio</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Estimated days to sell out current stock at current pace</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                  <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider mb-1">Fast Moving = ?</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">Days to Sell &lt; 90 days</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Product sells out in under 3 months — high demand, restock regularly</p>
                </div>
              </div>
              <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-start gap-2">
                <span className="text-green-500 text-sm font-bold flex-shrink-0">ℹ</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Example: If a product's inventory value is ₱10,000 and ₱15,000 worth was sold in the last 90 days → Turnover = 1.5 → Days to Sell = 60 days → <span className="text-green-600 font-semibold">Fast Moving ✓</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search fast moving products..."
                      value={fastMovingSearch}
                      onChange={(e) => setFastMovingSearch(e.target.value)}
                      className="pl-10 h-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Sort By</Label>
                  <Select value={fastMovingSortBy} onValueChange={setFastMovingSortBy}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ratio-desc">Turnover Ratio (High to Low)</SelectItem>
                      <SelectItem value="ratio-asc">Turnover Ratio (Low to High)</SelectItem>
                      <SelectItem value="days-asc">Days to Sell (Low to High)</SelectItem>
                      <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-slate-900 dark:text-white">Fast Moving Products</CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                These products have high demand and quick turnover
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-6 px-6">
                <div className="min-w-full inline-block align-middle">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black">
                        <th className="py-3 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Product</th>
                        <th className="py-3 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">SKU</th>
                        <th className="py-3 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Stock</th>
                        <th className="py-3 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Turnover Ratio</th>
                        <th className="py-3 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Days to Sell</th>
                        <th className="py-3 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {fastMoving
                        .filter(item => item.name.toLowerCase().includes(fastMovingSearch.toLowerCase()))
                        .sort((a, b) => {
                          if (fastMovingSortBy === "ratio-desc") return b.turnoverRatio - a.turnoverRatio
                          if (fastMovingSortBy === "ratio-asc") return a.turnoverRatio - b.turnoverRatio
                          if (fastMovingSortBy === "days-asc") return a.daysToSell - b.daysToSell
                          if (fastMovingSortBy === "name-asc") return a.name.localeCompare(b.name)
                          return 0
                        })
                        .map((item) => (
                        <tr key={item.id} className="transition-all duration-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-xs font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                          <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400">{item.sku}</td>
                          <td className="py-2.5 px-3 text-right text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right text-xs font-bold text-green-600 dark:text-green-400 tabular-nums">{item.turnoverRatio.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                            {item.daysToSell !== null && item.daysToSell !== undefined 
                              ? `${item.daysToSell} days` 
                              : <span className="text-slate-500 dark:text-slate-500">No Sales</span>
                            }
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs text-slate-800 dark:text-slate-200 tabular-nums">{formatCurrency(item.sellingPrice || item.costPrice || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {fastMoving.length === 0 && (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                      No fast moving items found
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Slow Moving Items */}
        <TabsContent value="slow-moving" className="space-y-4 mt-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <TrendingDown className="h-6 w-6" />
                    Slow Moving Items
                  </CardTitle>
                  <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                    Low turnover products (sells in 180-365 days)
                  </p>
                </div>
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-lg px-4 py-2">
                  {slowMoving.length} Items
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* How it's calculated */}
          <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex-shrink-0 mt-0.5">
                  <BarChart3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">How is this calculated?</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Based on the last 90 days of sales data per product.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Step 1 — Turnover Ratio</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">COGS Sold (90 days) ÷ Inventory Value</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Low ratio = few sales relative to stock on hand</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Step 2 — Days to Sell</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">90 ÷ Turnover Ratio</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Estimated days to sell out at current pace</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Slow Moving = ?</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">90 ≤ Days to Sell &lt; 180 days</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Takes 3–6 months to sell — consider promotions or price adjustments</p>
                </div>
              </div>
              <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-start gap-2">
                <span className="text-amber-500 text-sm font-bold flex-shrink-0">ℹ</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Example: Inventory value ₱10,000, sold ₱5,000 in 90 days → Turnover = 0.5 → Days to Sell = 180 days → <span className="text-amber-600 font-semibold">Slow Moving ⚠</span>. Consider running promos or bundling with fast-moving items.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search slow moving products..."
                      value={slowMovingSearch}
                      onChange={(e) => setSlowMovingSearch(e.target.value)}
                      className="pl-10 h-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Sort By</Label>
                  <Select value={slowMovingSortBy} onValueChange={setSlowMovingSortBy}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days-desc">Days to Sell (High to Low)</SelectItem>
                      <SelectItem value="days-asc">Days to Sell (Low to High)</SelectItem>
                      <SelectItem value="ratio-asc">Turnover Ratio (Low to High)</SelectItem>
                      <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-slate-900 dark:text-white">Slow Moving Products</CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                These products have low demand and may need promotional strategies
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-6 px-6">
                <div className="min-w-full inline-block align-middle">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black">
                        <th className="py-3 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Product</th>
                        <th className="py-3 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">SKU</th>
                        <th className="py-3 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Stock</th>
                        <th className="py-3 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Turnover Ratio</th>
                        <th className="py-3 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Days to Sell</th>
                        <th className="py-3 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {slowMoving
                        .filter(item => item.name.toLowerCase().includes(slowMovingSearch.toLowerCase()))
                        .sort((a, b) => {
                          if (slowMovingSortBy === "days-desc") return b.daysToSell - a.daysToSell
                          if (slowMovingSortBy === "days-asc") return a.daysToSell - b.daysToSell
                          if (slowMovingSortBy === "ratio-asc") return a.turnoverRatio - b.turnoverRatio
                          if (slowMovingSortBy === "name-asc") return a.name.localeCompare(b.name)
                          return 0
                        })
                        .map((item) => (
                        <tr key={item.id} className="transition-all duration-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-xs font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                          <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400">{item.sku}</td>
                          <td className="py-2.5 px-3 text-right text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">{item.turnoverRatio.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                            {item.daysToSell !== null && item.daysToSell !== undefined 
                              ? `${item.daysToSell} days` 
                              : <span className="text-slate-500 dark:text-slate-500">No Sales</span>
                            }
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs text-slate-800 dark:text-slate-200 tabular-nums">{formatCurrency((item.sellingPrice || item.costPrice || 0) * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {slowMoving.length === 0 && (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                      No slow moving items found
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dead Stock */}
        <TabsContent value="deadstock" className="space-y-4 mt-4">

          {/* Header */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6" />
                    Dead Stock
                  </CardTitle>
                  <p className="text-sm text-red-600 dark:text-red-500 mt-1">
                    Stagnant products (180+ days with no movement)
                  </p>
                </div>
                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-lg px-4 py-2">
                  {deadStock.length} Items
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* How it's calculated */}
          <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 flex-shrink-0 mt-0.5">
                  <BarChart3 className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">How is this calculated?</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Based on sales history and days since last sale per product.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                  <p className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">Scenario A — Has Recent Sales</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">Days to Sell = 90 ÷ Turnover Ratio</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">If projected days to sell ≥ 180, classified as Dead Stock</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                  <p className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">Scenario B — No Recent Sales</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">Days = days since last sale</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">If last sale was 180+ days ago with no activity, it's Dead Stock</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                  <p className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">Dead Stock = ?</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">Days to Sell ≥ 180 days</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Product ties up capital — consider clearance sale, bundle, or write-off</p>
                </div>
              </div>
              <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-start gap-2">
                <span className="text-red-500 text-sm font-bold flex-shrink-0">⚠</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Example: Last sale was 250 days ago and no orders since → Days to Sell = 250 → <span className="text-red-600 font-semibold">Dead Stock ✗</span>. Action needed: run a sale, include in bundles, or reallocate to another channel.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search products..."
                      value={deadStockSearch}
                      onChange={(e) => setDeadStockSearch(e.target.value)}
                      className="pl-10 h-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Category</Label>
                  <Select value={deadStockCategoryFilter} onValueChange={setDeadStockCategoryFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {Array.from(new Set(deadStock.map(item => item.category))).map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 block">Sort By</Label>
                  <Select value={deadStockSortBy} onValueChange={setDeadStockSortBy}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days-desc">Days to Sell (High to Low)</SelectItem>
                      <SelectItem value="value-desc">Value (High to Low)</SelectItem>
                      <SelectItem value="value-asc">Value (Low to High)</SelectItem>
                      <SelectItem value="quantity-desc">Quantity (High to Low)</SelectItem>
                      <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(deadStockSearch || deadStockCategoryFilter !== "all") && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Showing {filteredDeadStock.length} of {deadStock.length} items
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeadStockSearch("")
                      setDeadStockCategoryFilter("all")
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-900 dark:text-white">
                <div className="p-2 rounded-lg bg-red-600 shadow-sm">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                Dead Stock Alert ({filteredDeadStock.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredDeadStock.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Dead Stock Found!</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Excellent! All items are moving well. Keep up the good inventory management.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <div className="min-w-full inline-block align-middle">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black">
                        <th className="py-3 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Product</th>
                        <th className="py-3 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Category</th>
                        <th className="py-3 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Quantity</th>
                        <th className="py-3 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Days to Sell</th>
                        <th className="py-3 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">Value</th>
                        <th className="py-3 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {filteredDeadStock.map((item) => (
                        <tr key={item.id} className="transition-all duration-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-xs font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                          <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400">{item.category}</td>
                          <td className="py-2.5 px-3 text-right text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right text-xs font-bold text-red-600 tabular-nums">
                            {item.daysToSell !== null && item.daysToSell !== undefined 
                              ? `${item.daysToSell} days` 
                              : <span className="text-red-700 dark:text-red-400">No Sales</span>
                            }
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs font-bold text-red-600 tabular-nums">{formatCurrency(item.quantity * item.costPrice)}</td>
                          <td className="py-2.5 px-3">
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800 border text-xs px-1.5 py-0.5">
                              Slow Moving (180+ days)
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Returns Analytics */}
        <TabsContent value="returns" className="space-y-4 mt-4">
          {/* How Returns Analytics works */}
          <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 flex-shrink-0 mt-0.5">
                  <RotateCcw className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">How is Returns Analytics calculated?</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tracks all orders marked as RETURNED in Track Orders. Measures return volume, value, and rate.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                  <p className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">Total Returns</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">Count of returned order quantities</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Sum of qty from all orders where parcel_status = RETURNED</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                  <p className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">Return Rate %</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">(Returned Orders ÷ Delivered Orders) × 100</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Percentage based on number of orders, not item quantities</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                  <p className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1">Return Value</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">Sum of total from returned orders</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Total revenue lost due to returns — excluded from gross profit</p>
                </div>
              </div>
              <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-start gap-2">
                <span className="text-red-500 text-sm font-bold flex-shrink-0">ℹ</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Example: 100 delivered orders, 5 returned → Return Rate = 5%. A rate above 10% is a warning sign — check product quality or packaging. Returned orders are fully excluded from revenue calculations.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Total Returns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {returnAnalytics?.totalReturns || 0}
                </div>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Items returned
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Return Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {formatCurrency(returnAnalytics?.totalReturnValue || 0)}
                </div>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  Total cost of returns
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Return Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {returnAnalytics?.returnRate?.toFixed(2) || 0}%
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Of total sales
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-400 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Affected Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {returnAnalytics?.returnsByItem?.length || 0}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Products with returns
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Returns by Reason Chart */}
          {returnAnalytics?.returnsByReason && returnAnalytics.returnsByReason.length > 0 && (
            <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Returns by Reason</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={returnAnalytics.returnsByReason}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis dataKey="reason" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgb(15 23 42)', 
                        border: '1px solid rgb(51 65 85)',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="count" fill="#EF4444" name="Quantity" />
                    <Bar dataKey="value" fill="#F97316" name="Value (₱)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Returns by Item Table */}
          <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-900 dark:text-white">Returns by Item</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search items..."
                      value={returnSearch}
                      onChange={(e) => setReturnSearch(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={returnSortBy} onValueChange={setReturnSortBy}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quantity-desc">Quantity (High to Low)</SelectItem>
                      <SelectItem value="quantity-asc">Quantity (Low to High)</SelectItem>
                      <SelectItem value="value-desc">Value (High to Low)</SelectItem>
                      <SelectItem value="rate-desc">Return Rate (High to Low)</SelectItem>
                      <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Item Name</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Quantity Returned</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Return Value</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Return Rate</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnAnalytics?.returnsByItem
                      ?.filter((item: any) => item.itemName.toLowerCase().includes(returnSearch.toLowerCase()))
                      .sort((a: any, b: any) => {
                        if (returnSortBy === "quantity-desc") return b.quantity - a.quantity
                        if (returnSortBy === "quantity-asc") return a.quantity - b.quantity
                        if (returnSortBy === "value-desc") return b.value - a.value
                        if (returnSortBy === "rate-desc") return b.returnRate - a.returnRate
                        if (returnSortBy === "name-asc") return a.itemName.localeCompare(b.itemName)
                        return 0
                      })
                      .map((item: any) => (
                        <tr key={item.itemId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-4 text-sm text-slate-900 dark:text-white font-medium">{item.itemName}</td>
                          <td className="py-3 px-4 text-sm text-right text-slate-700 dark:text-slate-300">{item.quantity}</td>
                          <td className="py-3 px-4 text-sm text-right text-slate-700 dark:text-slate-300">{formatCurrency(item.value)}</td>
                          <td className="py-3 px-4 text-sm text-right">
                            <span className={`font-semibold ${item.returnRate > 10 ? 'text-red-600 dark:text-red-400' : item.returnRate > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                              {item.returnRate.toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={`${item.returnRate > 10 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' : item.returnRate > 5 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'}`}>
                              {item.returnRate > 10 ? 'High Return Rate' : item.returnRate > 5 ? 'Moderate' : 'Low'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {(!returnAnalytics?.returnsByItem || returnAnalytics.returnsByItem.length === 0) && (
                  <div className="text-center py-12">
                    <RotateCcw className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">No returns data available</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Returns will appear here when items are returned</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
