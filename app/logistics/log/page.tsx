"use client"

import { useState, useMemo, useEffect } from "react"
import { BrandLoader } from '@/components/ui/brand-loader'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EnterpriseDateRangePicker } from "@/components/ui/enterprise-date-range-picker"
import { 
  Database, 
  Search, 
  Filter, 
  X, 
  Activity,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileText,
  Package,
  ShoppingCart,
  RefreshCw,
  Trash2,
  Plus,
  Edit
} from "lucide-react"
import type { Log } from "@/lib/types"
import { toast } from "sonner"
import { apiGet } from "@/lib/api-client"

const ITEMS_PER_PAGE = 50

const OPERATION_CONFIG = {
  create: { label: "Create", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800", icon: Plus },
  update: { label: "Update", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800", icon: Edit },
  delete: { label: "Delete", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800", icon: Trash2 },
  restock: { label: "Restock", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800", icon: RefreshCw },
  sale: { label: "Sale", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800", icon: ShoppingCart },
  cancel: { label: "Cancelled", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800", icon: X },
  restore: { label: "Restored", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800", icon: RefreshCw },
  uncancel: { label: "Restored", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800", icon: RefreshCw },
  'internal-usage': { label: "Internal Usage", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800", icon: Package },
  'demo-display': { label: "Demo/Display", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800", icon: Activity },
  warehouse: { label: "Warehouse", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800", icon: Database },
  'to-be-packed': { label: "To Be Packed", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border border-sky-200 dark:border-sky-800", icon: Package },
  other: { label: "Sale", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800", icon: ShoppingCart }
}

export default function LogisticsLogPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  
  const [searchQuery, setSearchQuery] = useState("")
  const [operationFilter, setOperationFilter] = useState("all")
  const [salesChannelFilter, setSalesChannelFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [currentPage, setCurrentPage] = useState(1)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)

  useEffect(() => {
    let isInitialLoad = true
    
    const fetchLogs = async () => {
      try {
        if (isInitialLoad) {
          setLoading(true)
        }
        const data = await apiGet<Log[]>('/api/logs')
        setLogs(data)
      } catch (error) {
        console.error('Error fetching logs:', error)
        if (isInitialLoad) {
          toast.error('Failed to load logs')
        }
      } finally {
        if (isInitialLoad) {
          setLoading(false)
          isInitialLoad = false
        }
      }
    }
    
    fetchLogs()
    const interval = setInterval(() => {
      fetchLogs()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const filteredLogs = useMemo(() => {
    if (!Array.isArray(logs)) return []
    
    let filtered = [...logs]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(log => 
        log.itemName?.toLowerCase().includes(query) ||
        log.details?.toLowerCase().includes(query) ||
        log.operation?.toLowerCase().includes(query)
      )
    }

    if (operationFilter !== "all") {
      filtered = filtered.filter(log => {
        const operation = log.operation?.toLowerCase() || ''
        
        // Direct match for cancel/restore (case-insensitive)
        if (operationFilter === 'cancel' && (operation === 'cancel' || operation === 'cancelled' || operation === 'transaction-cancelled')) return true
        if (operationFilter === 'restore' && (operation === 'restore' || operation === 'uncancel')) return true
        
        let actualOperation = operation.replace(/\s+/g, '-').replace(/_/g, '-') || 'other'
        
        if (actualOperation.includes('cancelled') || (log.details?.toLowerCase().includes('transaction') && log.details?.toLowerCase().includes('cancelled'))) {
          actualOperation = 'transaction-cancelled'
        }
        
        const explicitOperations = ['create', 'update', 'delete', 'restock', 'transaction-cancelled', 'to-be-packed', 'sale', 'cancel', 'restore']
        const isExplicitOperation = explicitOperations.includes(actualOperation)
        
        if (!isExplicitOperation) {
          const detailsLower = log.details?.toLowerCase() || ''
          if (detailsLower.includes('demo/display') || detailsLower.includes('demo / display')) {
            actualOperation = 'demo-display'
          } else if (detailsLower.includes('internal use') || detailsLower.includes('internal-use')) {
            actualOperation = 'internal-usage'
          } else if (detailsLower.includes('warehouse') || detailsLower.includes('transferred')) {
            actualOperation = 'warehouse'
          }
        }
        
        return actualOperation === operationFilter
      })
    }

    if (salesChannelFilter !== "all") {
      filtered = filtered.filter(log => {
        const detailsLower = log.details?.toLowerCase() || ''
        const channelLower = salesChannelFilter.toLowerCase()
        return detailsLower.includes(channelLower)
      })
    }

    if (startDate || endDate) {
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp)
        const matchesStart = !startDate || logDate >= startDate
        const matchesEnd = !endDate || logDate <= endDate
        return matchesStart && matchesEnd
      })
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime()
      const dateB = new Date(b.timestamp).getTime()
      return sortBy === "newest" ? dateB - dateA : dateA - dateB
    })

    return filtered
  }, [logs, searchQuery, operationFilter, salesChannelFilter, sortBy, startDate, endDate])

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE)
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  useEffect(() => {
    // REMOVED: setCurrentPage(1) - causes pagination to jump back constantly
  }, [searchQuery, operationFilter, salesChannelFilter, sortBy, startDate, endDate])

  const stats = useMemo(() => {
    if (!Array.isArray(logs)) return { total: 0, today: 0, creates: 0, updates: 0, deletes: 0, cancelled: 0 }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return {
      total: logs.length,
      today: logs.filter(log => new Date(log.timestamp) >= today).length,
      creates: logs.filter(log => log.operation?.toLowerCase() === 'create').length,
      updates: logs.filter(log => log.operation?.toLowerCase() === 'update').length,
      deletes: logs.filter(log => log.operation?.toLowerCase() === 'delete').length,
      cancelled: logs.filter(log => {
        const op = log.operation?.toLowerCase() || ''
        return op === 'cancel' || op === 'cancelled' || op.includes('cancelled') || op === 'transaction-cancelled'
      }).length
    }
  }, [logs])

  const clearFilters = () => {
    setSearchQuery("")
    setOperationFilter("all")
    setSalesChannelFilter("all")
    setSortBy("newest")
    setStartDate(null)
    setEndDate(null)
    setCurrentPage(1)
  }

  const getOperationBadge = (operation: string, details: string) => {
    let actualOperation = operation?.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-') || 'other'
    
    if (actualOperation.includes('cancelled') || details?.toLowerCase().includes('transaction') && details?.toLowerCase().includes('cancelled')) {
      actualOperation = 'transaction-cancelled'
    }
    
    const explicitOperations = ['create', 'update', 'delete', 'restock', 'transaction-cancelled', 'to-be-packed', 'sale']
    const isExplicitOperation = explicitOperations.includes(actualOperation)
    
    if (!isExplicitOperation) {
      const detailsLower = details?.toLowerCase() || ''
      if (detailsLower.includes('demo/display') || detailsLower.includes('demo / display')) {
        actualOperation = 'demo-display'
      } else if (detailsLower.includes('internal use') || detailsLower.includes('internal-use')) {
        actualOperation = 'internal-usage'
      } else if (detailsLower.includes('warehouse') || detailsLower.includes('transferred')) {
        actualOperation = 'warehouse'
      }
    }
    
    const config = OPERATION_CONFIG[actualOperation as keyof typeof OPERATION_CONFIG] || OPERATION_CONFIG.other
    const Icon = config.icon
    
    return (
      <Badge className={`${config.color} font-medium px-2.5 py-0.5 flex items-center gap-1.5 w-fit`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getSalesChannel = (details: string) => {
    if (!details) return null
    const detailsLower = details.toLowerCase()
    
    if (detailsLower.includes('shopee')) return 'Shopee'
    if (detailsLower.includes('lazada')) return 'Lazada'
    if (detailsLower.includes('facebook')) return 'Facebook'
    if (detailsLower.includes('tiktok')) return 'TikTok'
    if (detailsLower.includes('office store')) return 'Office Store'
    if (detailsLower.includes('physical store')) return 'Physical Store'
    if (detailsLower.includes('warehouse')) return 'Warehouse'
    
    return null
  }

  const getSalesChannelBadge = (channel: string | null) => {
    if (!channel) return null
    
    const channelConfig: Record<string, { color: string; icon: string }> = {
      'Shopee': { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: '🛍️' },
      'Lazada': { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: '🛒' },
      'Facebook': { color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: '📘' },
      'TikTok': { color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400', icon: '🎵' },
      'Office Store': { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: '🏢' },
      'Physical Store': { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: '🏪' },
      'Warehouse': { color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: '🏭' },
    }
    
    const config = channelConfig[channel]
    if (!config) return null
    
    return (
      <Badge className={`${config.color} font-medium px-2 py-0.5 text-xs w-fit`}>
        {config.icon} {channel}
      </Badge>
    )
  }

  const hasActiveFilters = searchQuery || operationFilter !== "all" || salesChannelFilter !== "all" || sortBy !== "newest" || startDate || endDate

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-2 sm:px-4 lg:px-6 py-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <BrandLoader size="lg" />
            <p className="text-slate-600 dark:text-slate-400 mt-6 text-sm font-medium">Loading activity logs...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-2 sm:px-4 lg:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold gradient-text">Activity Logs Overview</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">View all system operations and changes</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="p-5 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30">
              <Database className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Total Logs</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 tabular-nums">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-600 shadow-lg shadow-green-500/30">
              <Activity className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">Today</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 tabular-nums">{stats.today}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 shadow-lg shadow-purple-500/30">
              <Plus className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Creates</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 tabular-nums">{stats.creates}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-600 shadow-lg shadow-orange-500/30">
              <Edit className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider">Updates</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 tabular-nums">{stats.updates}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 shadow-lg shadow-red-500/30">
              <Trash2 className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Deletes</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100 tabular-nums">{stats.deletes}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters Card */}
      <Card className="mb-6 p-5 border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-5">
          <Filter className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <h3 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">Search & Filters</h3>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400">
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <Select value={operationFilter} onValueChange={setOperationFilter}>
            <SelectTrigger className="h-10 border-slate-200 dark:border-slate-700">
              <SelectValue placeholder="All Operations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Operations</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="restock">Restock</SelectItem>
              <SelectItem value="sale">Sale</SelectItem>
              <SelectItem value="to-be-packed">To Be Packed</SelectItem>
              <SelectItem value="cancel">Cancelled Orders</SelectItem>
              <SelectItem value="restore">Restored Orders</SelectItem>
              <SelectItem value="internal-usage">Internal Usage</SelectItem>
              <SelectItem value="demo-display">Demo/Display</SelectItem>
              <SelectItem value="warehouse">Warehouse</SelectItem>
            </SelectContent>
          </Select>

          <Select value={salesChannelFilter} onValueChange={setSalesChannelFilter}>
            <SelectTrigger className="h-10 border-slate-200 dark:border-slate-700">
              <SelectValue placeholder="All Channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="Shopee">Shopee</SelectItem>
              <SelectItem value="Lazada">Lazada</SelectItem>
              <SelectItem value="Facebook">Facebook</SelectItem>
              <SelectItem value="TikTok">TikTok</SelectItem>
              <SelectItem value="Office Store">Office Store</SelectItem>
              <SelectItem value="Physical Store">Physical Store</SelectItem>
            </SelectContent>
          </Select>

          <EnterpriseDateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateChange={(start, end) => {
              setStartDate(start)
              setEndDate(end)
            }}
          />

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-10 border-slate-200 dark:border-slate-700">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            Showing <span className="font-bold text-slate-900 dark:text-white">{paginatedLogs.length}</span> of <span className="font-bold text-slate-900 dark:text-white">{filteredLogs.length}</span> logs
            {hasActiveFilters && <span className="text-slate-500"> (filtered from {logs.length} total)</span>}
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <CardTitle className="flex items-center gap-3 text-lg font-bold text-slate-900 dark:text-white">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-md shadow-indigo-500/30">
              <Database className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">
                {logs.length === 0 ? 'No operations logged yet' : 'No logs match your filters'}
              </p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="text-purple-600 dark:text-purple-400 font-semibold">
                  Clear filters to see all logs
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                      <th className="py-4 px-6 text-left font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">Date & Time</th>
                      <th className="py-4 px-6 text-left font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">Operation</th>
                      <th className="py-4 px-6 text-left font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">Sales Channel</th>
                      <th className="py-4 px-6 text-left font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">Item</th>
                      <th className="py-4 px-6 text-left font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors duration-150">
                        <td className="py-4 px-6 text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>
                              {new Date(log.timestamp).toLocaleDateString('en-US', { 
                                month: '2-digit', 
                                day: '2-digit', 
                                year: '2-digit'
                              })}
                              {' '}
                              {new Date(log.timestamp).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit', 
                                hour12: false
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          {getOperationBadge(log.operation, log.details)}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          {getSalesChannelBadge(getSalesChannel(log.details))}
                        </td>
                        <td className="py-4 px-6 text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          <div className="max-w-[220px] truncate" title={(log.itemName || '-').replace(/\s*\(\d+\)\s*$/, '')}>
                            {(log.itemName || '-').replace(/\s*\(\d+\)\s*$/, '')}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-600 dark:text-slate-400">
                          <div className="max-w-[600px] leading-relaxed">
                            {log.details}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Page <span className="font-bold text-slate-900 dark:text-white">{currentPage}</span> of <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-9 font-semibold border-slate-200 dark:border-slate-700"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-9 font-semibold border-slate-200 dark:border-slate-700"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
