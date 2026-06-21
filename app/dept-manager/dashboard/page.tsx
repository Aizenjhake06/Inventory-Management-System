'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Package, ShoppingCart, TrendingUp, Users, XCircle, CheckCircle } from 'lucide-react'
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

export default function DeptManagerDashboard() {
  const [stats, setStats] = useState<DeptStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState('all')
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
      console.error('Error fetching dept stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredAgents = stats?.agents.filter(a =>
    selectedAgent === 'all' || a.username === selectedAgent
  ) || []

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <BrandLoader size="lg" />
          <p className="text-slate-600 dark:text-slate-400 mt-4 text-sm font-medium">Loading department data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-2 sm:px-4 lg:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold gradient-text mb-1">
            {assignedChannel} Department Overview
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitor agent performance and department activity
          </p>
        </div>
        <EnterpriseDateRangePicker
          startDate={startDate}
          endDate={endDate}
          onDateChange={(s, e) => { setStartDate(s); setEndDate(e) }}
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30 flex-shrink-0">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Total Orders</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 tabular-nums">{stats?.totalOrders || 0}</p>
              <p className="text-xs text-blue-600 dark:text-blue-500 flex items-center gap-1 mt-0.5">
                <ShoppingCart className="h-3 w-3" />
                All orders
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 shadow-lg shadow-emerald-500/30 flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Active Orders</p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 tabular-nums">{stats?.activeOrders || 0}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500 flex items-center gap-1 mt-0.5">
                <CheckCircle className="h-3 w-3" />
                In progress
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 shadow-lg shadow-red-500/30 flex-shrink-0">
              <XCircle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Cancelled</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100 tabular-nums">{stats?.cancelledOrders || 0}</p>
              <p className="text-xs text-red-600 dark:text-red-500 flex items-center gap-1 mt-0.5">
                <XCircle className="h-3 w-3" />
                Cancelled
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 shadow-lg shadow-purple-500/30 flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 tabular-nums">{formatCurrency(stats?.totalRevenue || 0)}</p>
              <p className="text-xs text-purple-600 dark:text-purple-500 flex items-center gap-1 mt-0.5">
                <TrendingUp className="h-3 w-3" />
                Revenue
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Agent Filter + Table */}
      <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 bg-blue-500 rounded-full flex-shrink-0"></div>
            <div>
              <h3 style={{ color: '#ffffff' }} className="text-sm font-bold tracking-tight">Agent Performance</h3>
              <p style={{ color: '#94a3b8' }} className="text-xs mt-0.5">Individual agent breakdown for {assignedChannel}</p>
            </div>
          </div>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="h-8 w-[180px] bg-slate-800 border-slate-700 text-white text-xs">
              <SelectValue placeholder="All Agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              {stats?.agents.map(a => (
                <SelectItem key={a.username} value={a.username}>{a.displayName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <CardContent className="p-0">
          {filteredAgents.length === 0 ? (
            <div className="text-center py-16">
              <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No agent data found</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting the date range</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-slate-800 to-slate-900">
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold text-white uppercase tracking-wider">Agent</th>
                  <th className="py-2.5 px-4 text-center text-[10px] font-bold text-white uppercase tracking-wider">Total Orders</th>
                  <th className="py-2.5 px-4 text-center text-[10px] font-bold text-white uppercase tracking-wider">Active</th>
                  <th className="py-2.5 px-4 text-center text-[10px] font-bold text-white uppercase tracking-wider">Cancelled</th>
                  <th className="py-2.5 px-4 text-center text-[10px] font-bold text-white uppercase tracking-wider">Cancel Rate</th>
                  <th className="py-2.5 px-4 text-right text-[10px] font-bold text-white uppercase tracking-wider">Revenue</th>
                  <th className="py-2.5 px-4 text-center text-[10px] font-bold text-white uppercase tracking-wider">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAgents.map((agent, index) => {
                  const cancelRate = agent.totalOrders > 0
                    ? ((agent.cancelledOrders / agent.totalOrders) * 100).toFixed(1)
                    : '0.0'
                  const isTopAgent = index === 0 && selectedAgent === 'all'
                  return (
                    <tr key={agent.username} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${isTopAgent ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                            {agent.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-xs text-slate-900 dark:text-white">{agent.displayName}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">@{agent.username}</p>
                          </div>
                          {isTopAgent && (
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 text-[9px]">Top Agent</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{formatNumber(agent.totalOrders)}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{formatNumber(agent.activeOrders)}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-sm text-red-600 dark:text-red-400">{formatNumber(agent.cancelledOrders)}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                          parseFloat(cancelRate) > 20 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : parseFloat(cancelRate) > 10 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {cancelRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{formatCurrency(agent.revenue)}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {agent.lastActivity
                            ? new Date(agent.lastActivity).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : '—'
                          }
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
