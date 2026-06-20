'use client'

import { useState, useEffect, useMemo } from 'react'
import { BrandLoader } from '@/components/ui/brand-loader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EnterpriseDateRangePicker } from '@/components/ui/enterprise-date-range-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Package, Truck, CheckCircle, Clock, Activity, LogOut, RefreshCw,
  PackageCheck, Target, AlertTriangle, XCircle, RotateCcw, ShieldAlert, Filter
} from 'lucide-react'
import { toast } from 'sonner'
import { getCurrentUser } from '@/lib/auth'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { ThemeToggle } from '@/components/theme-toggle'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface PackingQueueOrder {
  id: string
  waybill: string
  customerName: string
  itemName: string
  quantity: number
  channel: string
  orderDate: string
  is_cancelled?: boolean
}

interface PackedOrder {
  id: string
  waybill: string
  itemName: string
  quantity: number
  packedAt: string
  packedBy: string
}

interface TrackedOrder {
  id: string
  customerName: string
  itemName: string
  quantity: number
  totalAmount: number
  parcelStatus: string
  courier: string
  trackingNumber: string
  orderDate: string
  department: string
}

// Convert ALL CAPS or mixed to Title Case
function toTitleCase(str: string): string {
  if (!str) return str
  return str
    .replace(/\s*\(\d+\)\s*$/, '') // remove qty suffix like (1)
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

// Channel color dot
const CHANNEL_COLORS: Record<string, string> = {
  'Shopee':         'bg-orange-400',
  'Lazada':         'bg-blue-500',
  'TikTok':         'bg-slate-900 dark:bg-white',
  'Facebook':       'bg-blue-600',
  'Physical Store': 'bg-emerald-500',
}

const PARCEL_STATUSES = [
  { key: 'PENDING',     label: 'Pending',     color: 'bg-slate-400',  dot: 'bg-slate-400' },
  { key: 'ON DELIVERY', label: 'On Delivery', color: 'bg-blue-500',   dot: 'bg-blue-500' },
  { key: 'IN TRANSIT',  label: 'In Transit',  color: 'bg-indigo-500', dot: 'bg-indigo-500' },
  { key: 'PICKUP',      label: 'For Pickup',  color: 'bg-cyan-500',   dot: 'bg-cyan-500' },
  { key: 'DELIVERED',   label: 'Delivered',   color: 'bg-green-500',  dot: 'bg-green-500' },
  { key: 'RETURNED',    label: 'Returned',    color: 'bg-amber-500',  dot: 'bg-amber-500' },
  { key: 'CANCELLED',   label: 'Cancelled',   color: 'bg-red-500',    dot: 'bg-red-500' },
  { key: 'DETAINED',    label: 'Detained',    color: 'bg-orange-500', dot: 'bg-orange-500' },
  { key: 'PROBLEMATIC', label: 'Problematic', color: 'bg-rose-500',   dot: 'bg-rose-500' },
]

export default function LogisticsAdminDashboard() {
  const [packingQueue, setPackingQueue] = useState<PackingQueueOrder[]>([])
  const [packedHistory, setPackedHistory] = useState<PackedOrder[]>([])
  const [trackedOrders, setTrackedOrders] = useState<TrackedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedChannel, setSelectedChannel] = useState<string>('all')
  const [isDark, setIsDark] = useState(false)

  const CHANNELS = ['Shopee', 'Lazada', 'TikTok', 'Facebook', 'Physical Store']

  const [startDate, setStartDate] = useState<Date | null>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [endDate, setEndDate] = useState<Date | null>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 0)
  })

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Detect and watch dark mode
  useEffect(() => {
    const update = () => setIsDark(document.documentElement.classList.contains('dark'))
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const packedInPeriod = useMemo(() => {
    if (!startDate || !endDate) return packedHistory
    return packedHistory.filter(p => {
      const d = new Date(p.packedAt)
      return d >= startDate && d <= endDate
    })
  }, [packedHistory, startDate, endDate])

  // Channel-filtered tracked orders and queue
  const filteredQueue = useMemo(() =>
    selectedChannel === 'all' ? packingQueue : packingQueue.filter(o => o.channel === selectedChannel)
  , [packingQueue, selectedChannel])

  const filteredTracked = useMemo(() =>
    selectedChannel === 'all' ? trackedOrders : trackedOrders.filter(o => o.department === selectedChannel)
  , [trackedOrders, selectedChannel])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    PARCEL_STATUSES.forEach(s => { counts[s.key] = 0 })
    filteredTracked.forEach(o => {
      counts[o.parcelStatus] = (counts[o.parcelStatus] || 0) + 1
    })
    return counts
  }, [filteredTracked])

  const statusAmounts = useMemo(() => {
    const amounts: Record<string, number> = {}
    PARCEL_STATUSES.forEach(s => { amounts[s.key] = 0 })
    filteredTracked.forEach(o => {
      amounts[o.parcelStatus] = (amounts[o.parcelStatus] || 0) + (o.totalAmount || 0)
    })
    return amounts
  }, [filteredTracked])

  const inTransitCount = useMemo(() =>
    (statusCounts['ON DELIVERY'] || 0) + (statusCounts['IN TRANSIT'] || 0) + (statusCounts['PICKUP'] || 0)
  , [statusCounts])

  const cancelledQueueCount = useMemo(() =>
    filteredQueue.filter(o => o.is_cancelled === true).length
  , [filteredQueue])

  const problematicCount = useMemo(() =>
    (statusCounts['CANCELLED'] || 0) + (statusCounts['RETURNED'] || 0) +
    (statusCounts['PROBLEMATIC'] || 0) + (statusCounts['DETAINED'] || 0)
  , [statusCounts])

  const totalOrders = filteredTracked.length
  const deliveryRate = totalOrders > 0
    ? Math.round(((statusCounts['DELIVERED'] || 0) / totalOrders) * 100) : 0

  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUser(user)
    fetchAllData()
    const interval = setInterval(() => fetchAllData(true), 180000)
    return () => clearInterval(interval)
  }, [])

  const fetchAllData = async (silent = false) => {
    try {
      if (!silent) { setLoading(true); setRefreshing(true) }
      const [queueRes, historyRes, ordersRes] = await Promise.all([
        fetch('/api/packer/queue'),
        fetch('/api/packer/history'),
        fetch('/api/orders?status=Packed')
      ])
      const [queueData, historyData, ordersData] = await Promise.all([
        queueRes.json(), historyRes.json(), ordersRes.json()
      ])
      if (queueData.success) setPackingQueue(queueData.queue || [])
      if (historyData.success) setPackedHistory(historyData.history || [])
      if (Array.isArray(ordersData)) {
        setTrackedOrders(ordersData.map(o => ({
          id: o.id,
          customerName: o.customer_name || 'N/A',
          itemName: o.product || 'N/A',
          quantity: o.qty || 0,
          totalAmount: o.total || 0,
          parcelStatus: o.parcel_status || 'PENDING',
          courier: o.courier || '-',
          trackingNumber: o.waybill || '-',
          orderDate: o.packed_at || o.date,
          department: o.sales_channel || 'N/A'
        })))
      }
    } catch (error) {
      if (!silent) toast.error('Failed to load data')
    } finally {
      setLoading(false)
      if (!silent) setRefreshing(false)
    }
  }

  const handleLogout = () => {
    ['authToken','currentUser','isLoggedIn','username','userRole','displayName'].forEach(k => localStorage.removeItem(k))
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-4">
          <BrandLoader size="lg" />
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading logistics dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 py-6 space-y-6">

        {/* DATE + CHANNEL FILTER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold gradient-text">Operations Overview</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time logistics monitoring</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Sales Channel Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger className="h-9 w-44 text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-0">
                  <SelectValue placeholder="All Channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  {CHANNELS.map(ch => (
                    <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <EnterpriseDateRangePicker startDate={startDate} endDate={endDate}
              onDateChange={(s, e) => { setStartDate(s); setEndDate(e) }} />
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Packing Queue',         value: filteredQueue.length,         sub: filteredQueue.length === 0 ? 'All caught up' : `${filteredQueue.length} awaiting`,     icon: Package,    from: 'from-orange-500', to: 'to-amber-500',  bg: 'bg-orange-50 dark:bg-orange-900/20',   ic: 'text-orange-600 dark:text-orange-400',   ring: 'ring-orange-200 dark:ring-orange-800' },
            { label: 'Packed (Period)',        value: packedInPeriod.length,        sub: `${packedInPeriod.length} completed`,                                                   icon: PackageCheck,from: 'from-emerald-500',to: 'to-green-500',  bg: 'bg-emerald-50 dark:bg-emerald-900/20', ic: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800' },
            { label: 'Cancelled (Packing)',   value: cancelledQueueCount,          sub: cancelledQueueCount === 0 ? 'No cancellations' : `${cancelledQueueCount} cancelled`,    icon: XCircle,    from: 'from-rose-500',   to: 'to-red-500',    bg: 'bg-rose-50 dark:bg-rose-900/20',       ic: 'text-rose-600 dark:text-rose-400',       ring: 'ring-rose-200 dark:ring-rose-800' },
          ].map(s => (
            <Card key={s.label} className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn('p-2.5 rounded-xl ring-1', s.bg, s.ring)}>
                    <s.icon className={cn('h-5 w-5', s.ic)} />
                  </div>
                  <span className={cn('text-3xl font-bold bg-gradient-to-br bg-clip-text text-transparent', s.from, s.to)}>
                    <AnimatedNumber value={s.value} />
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{s.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* PARCEL STATUS AREA CHART */}
        {(() => {
          const chartData = PARCEL_STATUSES.map(s => ({
            status: s.label,
            count: statusCounts[s.key] || 0,
          }))

          const gridColor = isDark ? 'rgba(245,158,11,0.08)' : '#e2e8f0'
          const axisColor = isDark ? '#9ca3af' : '#94a3b8'
          const tooltipBg = isDark ? '#1a1a1a' : 'rgba(255,255,255,0.98)'
          const tooltipBorder = isDark ? 'rgba(245,158,11,0.25)' : '#e2e8f0'
          const tooltipText = isDark ? '#f1f5f9' : '#0f172a'

          return (
            <Card className="shadow-sm">
              <CardHeader className="pb-2 border-b border-slate-100 dark:border-amber-500/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                    <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Parcel Status Overview</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Order count per parcel status</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 pb-2 px-2">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="statusGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={gridColor}
                      opacity={1}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="status"
                      tick={{ fontSize: 10, fill: axisColor }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: axisColor }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        border: `1px solid ${tooltipBorder}`,
                        borderRadius: '10px',
                        fontSize: '12px',
                        color: tooltipText,
                        boxShadow: isDark
                          ? '0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,158,11,0.15)'
                          : '0 4px 16px rgba(0,0,0,0.1)',
                        padding: '8px 12px',
                      }}
                      labelStyle={{
                        fontWeight: 700,
                        color: isDark ? '#fbbf24' : '#0f172a',
                        marginBottom: '2px',
                      }}
                      itemStyle={{ color: tooltipText }}
                      formatter={(value: number) => [value, 'Orders']}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      fill="url(#statusGradient)"
                      dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4, stroke: '#d97706' }}
                      activeDot={{ r: 6, fill: '#fbbf24', stroke: '#f59e0b', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )
        })()}

        {/* MIDDLE ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Packing Queue list */}
          <Card className="lg:col-span-2 border-0 shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
            <div className="bg-slate-900 px-5 py-4 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-1 bg-orange-500 rounded-full flex-shrink-0"></div>
                  <div>
                    <h3 style={{ color: '#ffffff' }} className="text-sm font-bold tracking-tight">Packing Queue</h3>
                    <p style={{ color: '#94a3b8' }} className="text-xs mt-0.5">Awaiting packing</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500 text-white shadow-md shadow-orange-500/30">
                  {filteredQueue.length}
                </span>
              </div>
            </div>
            <CardContent className="p-0">
              {filteredQueue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CheckCircle className="h-8 w-8 text-emerald-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">All caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[320px] overflow-y-auto">
                  {filteredQueue.map((order, i) => (
                    <div key={order.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors">
                      <span className={cn("text-xs font-black w-5 flex-shrink-0", i === 0 ? "text-orange-500" : "text-slate-400 dark:text-slate-500")}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-slate-900 dark:text-white">
                          {toTitleCase(order.itemName)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', CHANNEL_COLORS[order.channel] || 'bg-slate-400')} />
                          <span className="text-xs truncate text-slate-500 dark:text-slate-400">
                            {order.customerName} · {order.channel}
                          </span>
                        </div>
                        {order.waybill && order.waybill !== order.id && (
                          <p className="text-[10px] font-mono mt-0.5 truncate text-slate-400 dark:text-slate-500">
                            {order.waybill}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-bold px-2 py-1 rounded-md flex-shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        ×{order.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parcel Status Breakdown */}
          <Card className="lg:col-span-3 border-0 shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
            <div className="bg-slate-900 px-5 py-4 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <div>
                    <h3 style={{ color: '#ffffff' }} className="text-sm font-bold tracking-tight">Parcel Status Breakdown</h3>
                    <p style={{ color: '#94a3b8' }} className="text-xs mt-0.5">{totalOrders} total tracked orders</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500 text-white shadow-md shadow-blue-500/30">
                  {totalOrders}
                </span>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PARCEL_STATUSES.map(status => {
                  const count = statusCounts[status.key] || 0
                  const amount = statusAmounts[status.key] || 0
                  const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0
                  return (
                    <div key={status.key} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#1a1a1a] hover:bg-slate-100 dark:hover:bg-[#222] transition-colors">
                      <div className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', status.dot)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{status.label}</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{count}</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all duration-500', status.color)} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">{pct}%</span>
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            ₱{amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* BOTTOM ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Needs Attention */}
          <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
            <div className="bg-slate-900 px-5 py-4 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-1 bg-red-500 rounded-full flex-shrink-0"></div>
                  <div>
                    <h3 style={{ color: '#ffffff' }} className="text-sm font-bold tracking-tight">Needs Attention</h3>
                    <p style={{ color: '#94a3b8' }} className="text-xs mt-0.5">Cancelled, returned, detained & problematic</p>
                  </div>
                </div>
                {problematicCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500 text-white shadow-md shadow-red-500/30">
                    {problematicCount}
                  </span>
                )}
              </div>
            </div>
            <CardContent className="p-4">
              {problematicCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle className="h-8 w-8 text-emerald-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No issues — all on track</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    { key: 'CANCELLED',   label: 'Cancelled',   icon: XCircle,       colorClass: 'text-red-500',    bgClass: 'bg-red-50 dark:bg-red-950/40',     borderClass: 'border-red-200 dark:border-red-900/50' },
                    { key: 'RETURNED',    label: 'Returned',    icon: RotateCcw,     colorClass: 'text-amber-500',  bgClass: 'bg-amber-50 dark:bg-amber-950/40', borderClass: 'border-amber-200 dark:border-amber-900/50' },
                    { key: 'DETAINED',    label: 'Detained',    icon: ShieldAlert,   colorClass: 'text-orange-500', bgClass: 'bg-orange-50 dark:bg-orange-950/40',borderClass: 'border-orange-200 dark:border-orange-900/50' },
                    { key: 'PROBLEMATIC', label: 'Problematic', icon: AlertTriangle, colorClass: 'text-rose-500',   bgClass: 'bg-rose-50 dark:bg-rose-950/40',   borderClass: 'border-rose-200 dark:border-rose-900/50' },
                  ].filter(s => (statusCounts[s.key] || 0) > 0).map(s => (
                    <div key={s.key} className={cn("flex items-center justify-between p-3 rounded-xl border", s.bgClass, s.borderClass)}>
                      <div className="flex items-center gap-2.5">
                        <s.icon className={cn("h-4 w-4", s.colorClass)} />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{s.label}</span>
                      </div>
                      <span className={cn("text-xl font-black", s.colorClass)}>{statusCounts[s.key] || 0}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Packed */}
          <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
            <div className="bg-slate-900 px-5 py-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <div className="h-5 w-1 bg-emerald-500 rounded-full flex-shrink-0"></div>
                <div>
                  <h3 style={{ color: '#ffffff' }} className="text-sm font-bold tracking-tight">Recent Packed Orders</h3>
                  <p style={{ color: '#94a3b8' }} className="text-xs mt-0.5">Latest packing activity</p>
                </div>
              </div>
            </div>
            <CardContent className="p-0">
              {packedInPeriod.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Package className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No packed orders yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[260px] overflow-y-auto">
                  {packedInPeriod.slice(0, 8).map(order => (
                    <div key={order.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors">
                      <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                        <PackageCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-slate-900 dark:text-white">
                          {toTitleCase(order.itemName)}
                        </p>
                        <p className="text-xs mt-0.5 text-slate-500 dark:text-slate-400">
                          Packed by <span className="font-semibold text-slate-600 dark:text-slate-300">{order.packedBy}</span>
                          {' · '}
                          {new Date(order.packedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {', '}
                          {new Date(order.packedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {order.waybill && order.waybill !== order.id && (
                          <p className="text-[10px] font-mono mt-0.5 truncate text-slate-400 dark:text-slate-500">
                            {order.waybill}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-bold px-2 py-1 rounded-md flex-shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        ×{order.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Logout Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to sign out?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700">Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
