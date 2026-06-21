'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Users, ShoppingCart, XCircle, CheckCircle, TrendingUp } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { apiGet } from '@/lib/api-client'
import { BrandLoader } from '@/components/ui/brand-loader'
import { EnterpriseDateRangePicker } from '@/components/ui/enterprise-date-range-picker'
import { getCurrentUser } from '@/lib/auth'

interface AgentStats {
  username: string
  displayName: string
  totalOrders: number
  activeOrders: number
  cancelledOrders: number
  revenue: number
  lastActivity: string | null
}

interface DeptStats {
  totalOrders: number
  activeOrders: number
  cancelledOrders: number
  totalRevenue: number
  agents: AgentStats[]
}

export default function AgentsPage() {
  const [stats, setStats] = useState<DeptStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('revenue')
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const d = new Date(); d.setDate(1); return d
  })
  const [endDate, setEndDate] = useState<Date | null>(new Date())

  const currentUser = getCurrentUser()
  const assignedChannel = currentUser?.assignedChannel || ''

  useEffect(() => {
    if (startDate && endDate) fetchStats()
  }, [startDate, endDate])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate.toISOString())
      if (endDate) params.append('endDate', endDate.toISOString())
      if (assignedChannel) params.append('channel', assignedChannel)
      const data = await apiGet<DeptStats>(`/api/dept-manager/stats?${params}`)
      setStats(data)
    } catch (error) {
      console.error('Error fetching agent stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAgents = (stats?.agents || [])
    .filter(a => {
      if (!search) return true
      return a.displayName.toLowerCase().includes(search.toLowerCase()) ||
        a.username.toLowerCase().includes(search.toLowerCase())
    })
    .sort((a, b) => {
      if (sortBy === 'revenue') return b.revenue - a.revenue
      if (sortBy === 'orders') return b.totalOrders - a.totalOrders
      if (sortBy === 'cancelled') return b.cancelledOrders - a.cancelledOrders
      if (sortBy === 'name') return a.displayName.localeCompare(b.displayName)
      return 0
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <BrandLoader size="lg" />
          <p className="text-slate-600 dark:text-slate-400 mt-4 text-sm font-medium">Loading agent data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-2 sm:px-4 lg:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold gradient-text mb-1">Agent Performance</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Individual performance breakdown for all agents in {assignedChannel}
          </p>
        </div>
        <EnterpriseDateRangePicker
          startDate={startDate}
          endDate={endDate}
          onDateChange={(s, e) => { setStartDate(s); setEndDate(e) }}
        />
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search agent by name or username..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-10 border-slate-200 dark:border-slate-700"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-10 w-[180px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Sort: Revenue</SelectItem>
                <SelectItem value="orders">Sort: Total Orders</SelectItem>
                <SelectItem value="cancelled">Sort: Cancelled</SelectItem>
                <SelectItem value="name">Sort: Name A-Z</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-slate-500 dark:text-slate-400 ml-auto">
              <strong className="text-slate-900 dark:text-white">{filteredAgents.length}</strong> agents
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Agent Cards Grid */}
      {filteredAgents.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No agents found</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting the date range or search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAgents.map((agent, index) => {
            const cancelRate = agent.totalOrders > 0
              ? ((agent.cancelledOrders / agent.totalOrders) * 100).toFixed(1)
              : '0.0'
            const isTopAgent = index === 0 && !search

            return (
              <Card key={agent.username} className={`border-2 shadow-lg overflow-hidden ${isTopAgent ? 'border-blue-400 dark:border-blue-600' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-900`}>
                {/* Card Header */}
                <div className={`px-5 py-4 border-b ${isTopAgent ? 'bg-blue-600' : 'bg-slate-900'} border-slate-700`}>
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${isTopAgent ? 'bg-white/20 text-white' : 'bg-white/10 text-white'}`}>
                      {agent.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-white truncate">{agent.displayName}</p>
                        {isTopAgent && (
                          <span className="text-[9px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full flex-shrink-0">⭐ TOP</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300">@{agent.username}</p>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <CardContent className="p-5">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Revenue */}
                    <div className="col-span-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Revenue</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(agent.revenue)}</p>
                    </div>

                    {/* Total Orders */}
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <ShoppingCart className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Total</p>
                      </div>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{formatNumber(agent.totalOrders)}</p>
                    </div>

                    {/* Active Orders */}
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active</p>
                      </div>
                      <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">{formatNumber(agent.activeOrders)}</p>
                    </div>

                    {/* Cancelled */}
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                        <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Cancelled</p>
                      </div>
                      <p className="text-xl font-black text-red-700 dark:text-red-400">{formatNumber(agent.cancelledOrders)}</p>
                    </div>

                    {/* Cancel Rate */}
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp className="h-3 w-3 text-slate-500" />
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cancel Rate</p>
                      </div>
                      <span className={`text-xl font-black ${
                        parseFloat(cancelRate) > 20 ? 'text-red-600 dark:text-red-400'
                        : parseFloat(cancelRate) > 10 ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {cancelRate}%
                      </span>
                    </div>
                  </div>

                  {/* Last Active */}
                  {agent.lastActivity && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3 text-right">
                      Last active: {new Date(agent.lastActivity).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
