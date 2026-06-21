'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Search, FileText, ChevronLeft, ChevronRight,
  Package, CheckCircle, XCircle, Clock, RefreshCw
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { apiGet } from '@/lib/api-client'
import { BrandLoader } from '@/components/ui/brand-loader'
import { EnterpriseDateRangePicker } from '@/components/ui/enterprise-date-range-picker'
import { getCurrentUser } from '@/lib/auth'

interface Order {
  id: string
  date: string
  sales_channel: string
  store: string
  courier: string | null
  waybill: string | null
  qty: number
  cogs: number
  total: number
  product: string
  status: string
  parcel_status: string
  dispatched_by: string
  agent_username: string | null
  packed_by: string | null
  packed_at: string | null
  is_cancelled: boolean
  cancellation_reason: string | null
  customer_name: string | null
  customer_address: string | null
  created_at: string
  updated_at: string
}

interface Agent {
  username: string
  display_name: string
}

interface LogResponse {
  orders: Order[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  agents: Agent[]
}

export default function DeptManagerLogPage() {
  const [data, setData] = useState<LogResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filterAgent, setFilterAgent] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const d = new Date(); d.setDate(1); return d
  })
  const [endDate, setEndDate] = useState<Date | null>(new Date())

  const currentUser = getCurrentUser()
  const assignedChannel = currentUser?.assignedChannel || ''

  const fetchLog = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate.toISOString())
      if (endDate) params.append('endDate', endDate.toISOString())
      if (assignedChannel) params.append('channel', assignedChannel)
      if (filterAgent !== 'all') params.append('agent', filterAgent)
      if (filterStatus !== 'all') params.append('status', filterStatus)
      if (search) params.append('search', search)
      params.append('page', String(page))
      params.append('pageSize', '50')

      const result = await apiGet<LogResponse>(`/api/dept-manager/log?${params}`)
      setData(result)
    } catch (error) {
      console.error('Error fetching log:', error)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, assignedChannel, filterAgent, filterStatus, search, page])

  useEffect(() => {
    if (startDate && endDate) fetchLog()
  }, [fetchLog])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [startDate, endDate, filterAgent, filterStatus, search])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
  }

  const getStatusBadge = (order: Order) => {
    if (order.is_cancelled) {
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 text-[10px] font-bold">
          <XCircle className="h-2.5 w-2.5 mr-1" />Cancelled
        </Badge>
      )
    }
    if (order.status === 'Packed' || order.status === 'Shipped' || order.status === 'Delivered') {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[10px] font-bold">
          <CheckCircle className="h-2.5 w-2.5 mr-1" />Packed
        </Badge>
      )
    }
    return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[10px] font-bold">
        <Clock className="h-2.5 w-2.5 mr-1" />Pending
      </Badge>
    )
  }

  const agentDisplayName = (order: Order) => {
    if (!data?.agents) return order.agent_username || order.dispatched_by
    const found = data.agents.find(a => a.username === order.agent_username || a.username === order.dispatched_by)
    return found?.display_name || order.agent_username || order.dispatched_by || '—'
  }

  return (
    <div className="max-w-[1400px] mx-auto px-2 sm:px-4 lg:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold gradient-text mb-1">Order Log</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Full order history for {assignedChannel} — all agents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchLog}
            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <EnterpriseDateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateChange={(s, e) => { setStartDate(s); setEndDate(e) }}
          />
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search Order ID, waybill, customer, product..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-9 h-10 border-slate-200 dark:border-slate-700 pr-16"
              />
              <Button
                type="submit"
                size="sm"
                className="absolute right-1 top-1 h-8 px-2 text-xs bg-slate-900 dark:bg-white dark:text-slate-900 text-white"
              >
                Search
              </Button>
            </form>

            {/* Agent Filter */}
            <Select value={filterAgent} onValueChange={setFilterAgent}>
              <SelectTrigger className="h-10 w-[180px] border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {data?.agents.map(a => (
                  <SelectItem key={a.username} value={a.username}>
                    {a.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-10 w-[160px] border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active (Not Cancelled)</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="packed">Packed / Shipped</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Results count */}
            {data && (
              <span className="text-sm text-slate-500 dark:text-slate-400 ml-auto">
                <strong className="text-slate-900 dark:text-white">{data.total.toLocaleString()}</strong> orders
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
        <div className="bg-slate-900 px-6 py-3.5 border-b border-slate-700 flex items-center gap-2">
          <div className="h-5 w-1 bg-indigo-500 rounded-full flex-shrink-0"></div>
          <div>
            <h3 style={{ color: '#ffffff' }} className="text-sm font-bold tracking-tight">Order History</h3>
            <p style={{ color: '#94a3b8' }} className="text-xs mt-0.5">{assignedChannel} channel — all agents</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <BrandLoader size="md" />
              <p className="text-slate-500 dark:text-slate-400 mt-3 text-sm">Loading orders...</p>
            </div>
          </div>
        ) : !data || data.orders.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No orders found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting filters or date range</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-300 uppercase tracking-wider">Order ID</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-300 uppercase tracking-wider">Date</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-300 uppercase tracking-wider">Agent</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-300 uppercase tracking-wider">Product</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-300 uppercase tracking-wider">Waybill</th>
                  <th className="py-2.5 px-4 text-center text-[10px] font-bold text-slate-300 uppercase tracking-wider">Qty</th>
                  <th className="py-2.5 px-4 text-right text-[10px] font-bold text-slate-300 uppercase tracking-wider">Total</th>
                  <th className="py-2.5 px-4 text-center text-[10px] font-bold text-slate-300 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.orders.map((order) => (
                  <tr
                    key={order.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${order.is_cancelled ? 'opacity-60' : ''}`}
                  >
                    {/* Order ID */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
                        {order.id}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4">
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        {new Date(order.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit', minute: '2-digit', hour12: true
                        })}
                      </div>
                    </td>

                    {/* Agent */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">
                            {(agentDisplayName(order)).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                            {agentDisplayName(order)}
                          </p>
                          {order.agent_username && (
                            <p className="text-[10px] text-slate-400">@{order.agent_username}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Product */}
                    <td className="py-3 px-4 max-w-[180px]">
                      <p className="text-xs text-slate-700 dark:text-slate-300 truncate" title={order.product}>
                        {order.product}
                      </p>
                      {order.store && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">{order.store}</p>
                      )}
                    </td>

                    {/* Waybill */}
                    <td className="py-3 px-4">
                      {order.waybill ? (
                        <div>
                          <p className="font-mono text-xs text-slate-700 dark:text-slate-200">{order.waybill}</p>
                          {order.courier && (
                            <p className="text-[10px] text-slate-400">{order.courier}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </td>

                    {/* Qty */}
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{order.qty}</span>
                    </td>

                    {/* Total */}
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold text-sm ${order.is_cancelled ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                        {formatCurrency(order.total)}
                      </span>
                      {order.is_cancelled && order.cancellation_reason && (
                        <p className="text-[10px] text-red-500 dark:text-red-400 mt-0.5 max-w-[120px] ml-auto truncate" title={order.cancellation_reason}>
                          {order.cancellation_reason}
                        </p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(order)}
                      {order.packed_by && !order.is_cancelled && (
                        <p className="text-[10px] text-slate-400 mt-0.5">by {order.packed_by}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, data.total)} of {data.total.toLocaleString()} orders
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                let pageNum: number
                if (data.totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= data.totalPages - 2) {
                  pageNum = data.totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    className={`h-8 w-8 p-0 text-xs ${page === pageNum ? 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white border-0' : ''}`}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
