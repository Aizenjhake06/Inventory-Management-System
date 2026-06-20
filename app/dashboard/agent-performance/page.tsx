'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Users, ShoppingCart, XCircle, CheckCircle, TrendingUp,
  RefreshCw, Trophy, Store, Package, BarChart3, Truck,
  Activity, DollarSign, Percent
} from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { apiGet } from '@/lib/api-client'
import { BrandLoader } from '@/components/ui/brand-loader'
import { EnterpriseDateRangePicker } from '@/components/ui/enterprise-date-range-picker'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
  PieChart, Pie
} from 'recharts'

// ── Types ────────────────────────────────────────────────────────────────────

interface Agent { username: string; displayName: string; assignedChannel: string }

interface AgentStats {
  username: string; displayName: string
  totalOrders: number; activeOrders: number; cancelledOrders: number
  revenue: number; lastActivity: string | null
}

interface DeptStats {
  totalOrders: number; activeOrders: number; cancelledOrders: number
  totalRevenue: number; agents: AgentStats[]
}

interface TrendPoint { label: string; revenue: number; orders: number; cancelled: number }
interface ProductSale { product: string; revenue: number; orders: number; qty: number }
interface StoreSale   { store: string; revenue: number; orders: number; qty: number }
interface AgentRank   {
  username: string; displayName: string
  revenue: number; orders: number; cancelled: number; qty: number
  topStore: string; topProduct: string
}
interface RevenueShare { name: string; username: string; value: number; percentage: number }
interface CancelReason { reason: string; count: number }
interface CourierData  { courier: string; orders: number; revenue: number; qty: number }
interface AgentMetric  {
  username: string; displayName: string
  activeDays: number; periodDays: number; consistencyRate: number
  packRate: number; packedOrders: number; totalDispatchedOrders: number
  avgOrderValue: number
}
interface Analytics {
  salesTrend: TrendPoint[]
  productSales: ProductSale[]
  storeSales: StoreSale[]
  agentRanking: AgentRank[]
  revenueShare: RevenueShare[]
  cancellationReasons: CancelReason[]
  courierBreakdown: CourierData[]
  agentMetrics: AgentMetric[]
  summary: {
    totalRevenue: number; totalOrders: number; cancelledOrders: number
    avgOrderValue: number; totalQty: number; grossMargin: number
  }
}

// ── Chart colours ────────────────────────────────────────────────────────────
const CHART_COLORS = ['#6366f1','#22c55e','#f59e0b','#ec4899','#14b8a6','#f97316','#8b5cf6','#06b6d4','#84cc16','#ef4444']
const AREA_GRADIENT_ID = 'revenueGradient'

// ── Custom tooltip ────────────────────────────────────────────────────────────
const RevenueTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 shadow-xl min-w-[160px]">
      <p className="text-xs text-slate-400 font-medium mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="text-xs text-slate-300">{p.name}</span>
          <span className="text-xs font-bold" style={{ color: p.color }}>
            {p.name === 'Revenue' ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 shadow-xl min-w-[180px]">
      <p className="text-xs text-slate-300 font-semibold mb-2 truncate max-w-[200px]">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="text-xs text-slate-400">{p.name}</span>
          <span className="text-xs font-bold text-white">
            {p.name === 'Revenue' ? formatCurrency(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Pie tooltip ──────────────────────────────────────────────────────────────
const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 shadow-xl min-w-[170px]">
      <p className="text-xs text-white font-semibold mb-1 truncate">{d.name}</p>
      <p className="text-xs text-indigo-400 font-bold">{formatCurrency(d.value)}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{d.payload.percentage}% of team revenue</p>
    </div>
  )
}

// ── Donut label ───────────────────────────────────────────────────────────────
const DonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
  if (percentage < 8) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
      {percentage}%
    </text>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AgentPerformancePage() {
  const [agents, setAgents]           = useState<Agent[]>([])
  const [stats, setStats]             = useState<DeptStats | null>(null)
  const [analytics, setAnalytics]     = useState<Analytics | null>(null)
  const [trend, setTrend]             = useState<TrendPoint[]>([])
  const [loading, setLoading]         = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [trendLoading, setTrendLoading]         = useState(true)

  const [selectedAgent, setSelectedAgent] = useState('all')
  const [sortBy, setSortBy]               = useState('revenue')
  const [period, setPeriod]               = useState<'today' | 'week' | 'month'>('month')
  const [channelName, setChannelName]     = useState('')
  const [startDate, setStartDate]         = useState<Date | null>(() => {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d
  })
  const [endDate, setEndDate]             = useState<Date | null>(new Date())

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const ch = localStorage.getItem('assignedChannel') || ''
    setChannelName(ch)
    fetchAgents(ch)
    fetchStats(ch, startDate, endDate)
    fetchAnalytics(ch, 'all', startDate, endDate)
    fetchTrend(ch, 'month', 'all')
  }, [])

  // Period toggle → only re-fetch trend chart
  useEffect(() => {
    const ch = localStorage.getItem('assignedChannel') || ''
    if (ch) fetchTrend(ch, period, selectedAgent)
  }, [period])

  // Agent filter → re-fetch both analytics and trend
  useEffect(() => {
    const ch = localStorage.getItem('assignedChannel') || ''
    if (!ch) return
    fetchAnalytics(ch, selectedAgent, startDate, endDate)
    fetchTrend(ch, period, selectedAgent)
  }, [selectedAgent])

  // Date range → re-fetch stats + analytics only (NOT trend chart)
  useEffect(() => {
    const ch = localStorage.getItem('assignedChannel') || ''
    if (!ch || !startDate || !endDate) return
    fetchStats(ch, startDate, endDate)
    fetchAnalytics(ch, selectedAgent, startDate, endDate)
  }, [startDate, endDate])

  // ── Fetchers ──────────────────────────────────────────────────────────────
  const fetchAgents = async (channel: string) => {
    if (!channel) return
    try {
      const data = await apiGet<Agent[]>(`/api/dept-manager/agents?channel=${encodeURIComponent(channel)}`)
      setAgents(data || [])
    } catch (e) { console.error('fetchAgents', e) }
  }

  const fetchStats = async (channel: string, start?: Date | null, end?: Date | null) => {
    if (!channel) { setLoading(false); return }
    try {
      setLoading(true)
      const s = start || new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      const e = end || new Date()
      const params = new URLSearchParams({
        channel,
        startDate: s.toISOString(),
        endDate: e.toISOString()
      })
      const data = await apiGet<DeptStats>(`/api/dept-manager/stats?${params}`)
      setStats(data)
    } catch (err) { console.error('fetchStats', err) }
    finally { setLoading(false) }
  }

  const fetchAnalytics = async (channel: string, agent: string, start?: Date | null, end?: Date | null) => {
    if (!channel) { setAnalyticsLoading(false); return }
    try {
      setAnalyticsLoading(true)
      const params = new URLSearchParams({ channel, agent })
      if (start) params.append('startDate', start.toISOString())
      if (end)   params.append('endDate', end.toISOString())
      const data = await apiGet<Analytics>(`/api/dept-manager/analytics?${params}`)
      setAnalytics(data)
    } catch (err) { console.error('fetchAnalytics', err) }
    finally { setAnalyticsLoading(false) }
  }

  // Trend chart — uses period (today/week/month), NOT date range picker
  const fetchTrend = async (channel: string, p: string, agent: string) => {
    if (!channel) { setTrendLoading(false); return }
    try {
      setTrendLoading(true)
      const params = new URLSearchParams({ channel, period: p, agent, trendOnly: 'true' })
      const data = await apiGet<Analytics>(`/api/dept-manager/analytics?${params}`)
      setTrend(data.salesTrend || [])
    } catch (err) { console.error('fetchTrend', err) }
    finally { setTrendLoading(false) }
  }

  const handleRefresh = () => {
    const ch = localStorage.getItem('assignedChannel') || ''
    fetchStats(ch, startDate, endDate)
    fetchAnalytics(ch, selectedAgent, startDate, endDate)
    fetchTrend(ch, period, selectedAgent)
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredAgentCards = (stats?.agents || [])
    .filter(a => selectedAgent === 'all' || a.username === selectedAgent)
    .sort((a, b) => {
      if (sortBy === 'revenue')   return b.revenue - a.revenue
      if (sortBy === 'orders')    return b.totalOrders - a.totalOrders
      if (sortBy === 'cancelled') return b.cancelledOrders - a.cancelledOrders
      return a.displayName.localeCompare(b.displayName)
    })

  const summary = analytics?.summary
  const cancelRate = summary && summary.totalOrders > 0
    ? ((summary.cancelledOrders / summary.totalOrders) * 100).toFixed(1)
    : '0.0'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[1400px] mx-auto py-5 space-y-6">

      {/* ── PAGE HEADER ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-1">Team Performance</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {channelName ? `${channelName} channel` : 'Department'} · Comprehensive team sales analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <EnterpriseDateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateChange={(s, e) => { setStartDate(s); setEndDate(e) }}
          />
          <Button variant="ghost" size="sm" onClick={handleRefresh}
            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── KPI SUMMARY CARDS ── */}
      {analyticsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-0 shadow-lg bg-white dark:bg-slate-900 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: 'Total Revenue', value: formatCurrency(summary?.totalRevenue || 0), icon: TrendingUp, color: 'indigo', sub: 'Gross sales' },
            { label: 'Total Orders', value: formatNumber(summary?.totalOrders || 0), icon: ShoppingCart, color: 'blue', sub: `${(summary?.totalOrders || 0) - (summary?.cancelledOrders || 0)} active` },
            { label: 'Cancelled', value: formatNumber(summary?.cancelledOrders || 0), icon: XCircle, color: 'red', sub: `${cancelRate}% cancel rate` },
            { label: 'Avg Order Value', value: formatCurrency(summary?.avgOrderValue || 0), icon: BarChart3, color: 'emerald', sub: 'Per active order' },
            { label: 'Units Sold', value: formatNumber(summary?.totalQty || 0), icon: Package, color: 'amber', sub: 'Total quantity' },
            { label: 'Gross Margin', value: `${summary?.grossMargin ?? 0}%`, icon: Percent, color: 'purple', sub: 'Revenue vs COGS' },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <Card key={label} className="border-0 shadow-lg bg-white dark:bg-slate-900">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p style={{ color: `var(--tw-${color})` }} className={`text-[10px] font-bold text-${color}-600 dark:text-${color}-400 uppercase tracking-wider`}>{label}</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white mt-1 truncate">{value}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
                  </div>
                  <div className={`p-2 rounded-xl bg-${color}-600 shadow-lg flex-shrink-0 ml-2`}>
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── SALES TREND AREA CHART ── */}
      <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 border-b border-slate-700 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 bg-indigo-500 rounded-full" />
            <div>
              <h3 style={{ color: '#ffffff' }} className="text-sm font-bold">Sales Trend</h3>
              <p style={{ color: '#cbd5e1' }} className="text-xs mt-0.5">
                Revenue & orders over time · {selectedAgent === 'all' ? 'All team members' : agents.find(a => a.username === selectedAgent)?.displayName || selectedAgent}
              </p>
            </div>
          </div>
          {/* Period toggle */}
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
            {(['today', 'week', 'month'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  period === p
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === 'today' ? 'Today' : p === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
        </div>
        <CardContent className="p-6">
          {trendLoading ? (
            <div className="h-64 flex items-center justify-center">
              <BrandLoader size="md" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={AREA_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={period === 'today' ? 2 : period === 'week' ? 0 : 4}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₱${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                  formatter={(val) => <span className="text-slate-400">{val}</span>}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill={`url(#${AREA_GRADIENT_ID})`}
                  dot={false}
                  activeDot={{ r: 5, fill: '#6366f1' }}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  name="Orders"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="transparent"
                  dot={false}
                  activeDot={{ r: 5, fill: '#22c55e' }}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="cancelled"
                  name="Cancelled"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  fill="transparent"
                  dot={false}
                  activeDot={{ r: 4, fill: '#ef4444' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── PRODUCT SALES + STORE SALES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Product Sales Bar Chart */}
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
          <div className="bg-slate-900 px-5 py-3.5 border-b border-slate-700 flex items-center gap-2">
            <div className="h-5 w-1 bg-amber-500 rounded-full" />
            <div>
              <h3 style={{ color: '#ffffff' }} className="text-sm font-bold">Top Products by Revenue</h3>
              <p style={{ color: '#cbd5e1' }} className="text-xs mt-0.5">Top 10 · {period === 'today' ? 'Today' : period === 'week' ? 'This week' : 'This month'}</p>
            </div>
          </div>
          <CardContent className="p-5">
            {analyticsLoading ? (
              <div className="h-64 flex items-center justify-center"><BrandLoader size="md" /></div>
            ) : !analytics?.productSales.length ? (
              <div className="h-64 flex items-center justify-center flex-col gap-2">
                <Package className="h-10 w-10 text-slate-200 dark:text-slate-700" />
                <p className="text-xs text-slate-400">No product data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={analytics.productSales}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₱${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="product"
                    width={110}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v.length > 16 ? v.slice(0, 15) + '…' : v}
                  />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {(analytics.productSales).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Store Sales Bar Chart */}
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
          <div className="bg-slate-900 px-5 py-3.5 border-b border-slate-700 flex items-center gap-2">
            <div className="h-5 w-1 bg-emerald-500 rounded-full" />
            <div>
              <h3 style={{ color: '#ffffff' }} className="text-sm font-bold">Top Stores by Revenue</h3>
              <p style={{ color: '#cbd5e1' }} className="text-xs mt-0.5">Top 10 · {period === 'today' ? 'Today' : period === 'week' ? 'This week' : 'This month'}</p>
            </div>
          </div>
          <CardContent className="p-5">
            {analyticsLoading ? (
              <div className="h-64 flex items-center justify-center"><BrandLoader size="md" /></div>
            ) : !analytics?.storeSales.length ? (
              <div className="h-64 flex items-center justify-center flex-col gap-2">
                <Store className="h-10 w-10 text-slate-200 dark:text-slate-700" />
                <p className="text-xs text-slate-400">No store data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={analytics.storeSales}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₱${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="store"
                    width={110}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v.length > 16 ? v.slice(0, 15) + '…' : v}
                  />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {(analytics.storeSales).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── AGENT RANKING TABLE ── */}
      <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 border-b border-slate-700 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 bg-purple-500 rounded-full" />
            <div>
              <h3 style={{ color: '#ffffff' }} className="text-sm font-bold">Agent Rankings</h3>
              <p style={{ color: '#cbd5e1' }} className="text-xs mt-0.5">Revenue · Orders · Cancel rate · Top store & product · Includes manager</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="h-8 w-[180px] bg-slate-800 border-slate-700 text-white text-xs">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Team Members</SelectItem>
                {agents.map(a => (
                  <SelectItem key={a.username} value={a.username}>{a.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 w-[150px] bg-slate-800 border-slate-700 text-white text-xs">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Sort: Revenue</SelectItem>
                <SelectItem value="orders">Sort: Orders</SelectItem>
                <SelectItem value="cancelled">Sort: Cancelled</SelectItem>
                <SelectItem value="name">Sort: Name A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <BrandLoader size="md" />
          </div>
        ) : filteredAgentCards.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No agents found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting the date range or team filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-300 uppercase tracking-wider w-8">#</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-300 uppercase tracking-wider">Agent</th>
                  <th className="py-2.5 px-4 text-right text-[10px] font-bold text-slate-300 uppercase tracking-wider">Revenue</th>
                  <th className="py-2.5 px-4 text-center text-[10px] font-bold text-slate-300 uppercase tracking-wider">Orders</th>
                  <th className="py-2.5 px-4 text-center text-[10px] font-bold text-slate-300 uppercase tracking-wider">Active</th>
                  <th className="py-2.5 px-4 text-center text-[10px] font-bold text-slate-300 uppercase tracking-wider">Cancel %</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-300 uppercase tracking-wider">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAgentCards.map((agent, index) => {
                  const cancelRate = agent.totalOrders > 0
                    ? ((agent.cancelledOrders / agent.totalOrders) * 100).toFixed(1)
                    : '0.0'
                  const isTop = index === 0 && selectedAgent === 'all'
                  const rankColors = ['text-yellow-500', 'text-slate-400', 'text-amber-600']

                  return (
                    <tr key={agent.username} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Rank */}
                      <td className="py-3 px-4 text-center">
                        {index < 3 ? (
                          <Trophy className={`h-4 w-4 mx-auto ${rankColors[index]}`} />
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">{index + 1}</span>
                        )}
                      </td>

                      {/* Agent */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                            isTop ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}>
                            {agent.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-xs text-slate-900 dark:text-white">{agent.displayName}</p>
                            <p className="text-[10px] text-slate-400">@{agent.username}</p>
                          </div>
                          {isTop && (
                            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-0 text-[9px] ml-1">
                              ⭐ TOP
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Revenue */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-black text-sm text-slate-900 dark:text-white">{formatCurrency(agent.revenue)}</span>
                      </td>

                      {/* Total Orders */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{formatNumber(agent.totalOrders)}</span>
                      </td>

                      {/* Active */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{formatNumber(agent.activeOrders)}</span>
                      </td>

                      {/* Cancel Rate */}
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          parseFloat(cancelRate) > 20 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : parseFloat(cancelRate) > 10 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}>
                          {cancelRate}%
                        </span>
                      </td>

                      {/* Last Active */}
                      <td className="py-3 px-4">
                        <span className="text-xs text-slate-400">
                          {agent.lastActivity
                            ? new Date(agent.lastActivity).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—'
                          }
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── NEW SECTION 1: REVENUE SHARE + CANCELLATION REASONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Revenue Share Donut */}
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
          <div className="bg-slate-900 px-5 py-3.5 border-b border-slate-700 flex items-center gap-2">
            <div className="h-5 w-1 bg-indigo-500 rounded-full" />
            <div>
              <h3 style={{ color: '#ffffff' }} className="text-sm font-bold">Revenue Share by Agent</h3>
              <p style={{ color: '#cbd5e1' }} className="text-xs mt-0.5">% contribution to total team revenue</p>
            </div>
          </div>
          <CardContent className="p-5">
            {analyticsLoading ? (
              <div className="h-64 flex items-center justify-center"><BrandLoader size="md" /></div>
            ) : !analytics?.revenueShare?.length ? (
              <div className="h-64 flex items-center justify-center flex-col gap-2">
                <Activity className="h-10 w-10 text-slate-200 dark:text-slate-700" />
                <p className="text-xs text-slate-400">No revenue data</p>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie
                        data={analytics.revenueShare}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        dataKey="value"
                        nameKey="name"
                        labelLine={false}
                        label={DonutLabel}
                      >
                        {analytics.revenueShare.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  {analytics.revenueShare.map((item, i) => (
                    <div key={item.username} className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{item.name}</p>
                          <span className="text-[10px] font-bold text-slate-500 flex-shrink-0">{item.percentage}%</span>
                        </div>
                        <div className="mt-0.5 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatCurrency(item.value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cancellation Reasons */}
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
          <div className="bg-slate-900 px-5 py-3.5 border-b border-slate-700 flex items-center gap-2">
            <div className="h-5 w-1 bg-red-500 rounded-full" />
            <div>
              <h3 style={{ color: '#ffffff' }} className="text-sm font-bold">Cancellation Reasons</h3>
              <p style={{ color: '#cbd5e1' }} className="text-xs mt-0.5">Why orders are being cancelled</p>
            </div>
          </div>
          <CardContent className="p-5">
            {analyticsLoading ? (
              <div className="h-64 flex items-center justify-center"><BrandLoader size="md" /></div>
            ) : !analytics?.cancellationReasons?.length ? (
              <div className="h-64 flex items-center justify-center flex-col gap-2">
                <CheckCircle className="h-10 w-10 text-emerald-200 dark:text-emerald-900/40 mx-auto" />
                <p className="text-xs text-slate-400">No cancellations recorded</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={analytics.cancellationReasons}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="reason"
                    width={130}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v.length > 18 ? v.slice(0, 17) + '…' : v}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 shadow-xl">
                          <p className="text-xs text-white font-semibold mb-1">{label}</p>
                          <p className="text-xs text-red-400 font-bold">{payload[0].value} cancellations</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="count" name="Cancellations" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {analytics.cancellationReasons.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#ef4444' : i === 1 ? '#f97316' : i === 2 ? '#f59e0b' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── NEW SECTION 2: COURIER BREAKDOWN + AGENT OPERATIONAL METRICS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Courier Breakdown */}
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
          <div className="bg-slate-900 px-5 py-3.5 border-b border-slate-700 flex items-center gap-2">
            <div className="h-5 w-1 bg-cyan-500 rounded-full" />
            <div>
              <h3 style={{ color: '#ffffff' }} className="text-sm font-bold">Courier Breakdown</h3>
              <p style={{ color: '#cbd5e1' }} className="text-xs mt-0.5">Orders and revenue by courier</p>
            </div>
          </div>
          <CardContent className="p-5">
            {analyticsLoading ? (
              <div className="h-64 flex items-center justify-center"><BrandLoader size="md" /></div>
            ) : !analytics?.courierBreakdown?.length ? (
              <div className="h-64 flex items-center justify-center flex-col gap-2">
                <Truck className="h-10 w-10 text-slate-200 dark:text-slate-700" />
                <p className="text-xs text-slate-400">No courier data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={analytics.courierBreakdown}
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="courier"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v.length > 8 ? v.slice(0, 7) + '…' : v}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₱${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<BarTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar yAxisId="right" dataKey="orders" name="Orders" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Agent Operational Metrics */}
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
          <div className="bg-slate-900 px-5 py-3.5 border-b border-slate-700 flex items-center gap-2">
            <div className="h-5 w-1 bg-orange-500 rounded-full" />
            <div>
              <h3 style={{ color: '#ffffff' }} className="text-sm font-bold">Agent Operational Metrics</h3>
              <p style={{ color: '#cbd5e1' }} className="text-xs mt-0.5">Pack rate · Consistency · Avg order value</p>
            </div>
          </div>
          <CardContent className="p-0">
            {analyticsLoading ? (
              <div className="flex items-center justify-center py-16"><BrandLoader size="md" /></div>
            ) : !analytics?.agentMetrics?.filter(m => m.totalDispatchedOrders > 0).length ? (
              <div className="text-center py-12">
                <Users className="h-10 w-10 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No agent activity data</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
                      <th className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-300 uppercase tracking-wider">Agent</th>
                      <th className="py-2.5 px-3 text-center text-[10px] font-bold text-slate-300 uppercase tracking-wider">Active Days</th>
                      <th className="py-2.5 px-3 text-center text-[10px] font-bold text-slate-300 uppercase tracking-wider">Pack Rate</th>
                      <th className="py-2.5 px-3 text-right text-[10px] font-bold text-slate-300 uppercase tracking-wider">Avg Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {analytics.agentMetrics
                      .filter(m => m.totalDispatchedOrders > 0)
                      .map((m) => (
                      <tr key={m.username} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-slate-300 flex-shrink-0">
                              {m.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{m.displayName}</p>
                              <p className="text-[10px] text-slate-400">@{m.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{m.activeDays}</span>
                            <span className="text-[10px] text-slate-400"> / {m.periodDays}d</span>
                            <div className="mt-1 h-1.5 w-16 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{ width: `${m.consistencyRate}%` }}
                              />
                            </div>
                            <p className="text-[9px] text-slate-400 mt-0.5">{m.consistencyRate}%</p>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            m.packRate >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : m.packRate >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>{m.packRate}%</span>
                          <p className="text-[9px] text-slate-400 mt-0.5">{m.packedOrders}/{m.totalDispatchedOrders}</p>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(m.avgOrderValue)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
