"use client"

import { useState, useMemo, useEffect } from "react"
import { BrandLoader } from '@/components/ui/brand-loader'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Edit,
  Truck,
  Download
} from "lucide-react"
import type { Log } from "@/lib/types"
import { toast } from "sonner"
import { apiGet } from "@/lib/api-client"
import { getCurrentUserRole } from "@/lib/role-utils"
import { getCurrentUser } from "@/lib/auth"
import { EnterpriseDateRangePicker } from "@/components/ui/enterprise-date-range-picker"
import * as XLSX from 'xlsx'

const ITEMS_PER_PAGE = 50

// Operation type configuration
const OPERATION_CONFIG = {
  create: { label: "Create", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800", icon: Plus },
  update: { label: "Update", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800", icon: Edit },
  delete: { label: "Delete", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800", icon: Trash2 },
  restock: { label: "Restock", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800", icon: RefreshCw },
  sale: { label: "Sale", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800", icon: ShoppingCart },
  cancel: { label: "Cancelled", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800", icon: X },
  uncancel: { label: "Uncancelled", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800", icon: RefreshCw },
  restore: { label: "Restored", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800", icon: RefreshCw },
  'transaction-cancelled': { label: "Cancelled", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800", icon: X },
  'internal-usage': { label: "Internal Usage", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800", icon: Package },
  'demo-display': { label: "Demo/Display", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800", icon: Activity },
  warehouse: { label: "Warehouse", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800", icon: Database },
  'to-be-packed': { label: "To Be Packed", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border border-sky-200 dark:border-sky-800", icon: Package },
  other: { label: "Sale", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800", icon: ShoppingCart }
}

export default function LogPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  
  // Role detection
  const userRole = getCurrentUserRole()
  const currentUser = getCurrentUser()
  const isDepartment = userRole === 'operations'
  const userChannel = currentUser?.assignedChannel || null
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [operationFilter, setOperationFilter] = useState("all")
  const [salesChannelFilter, setSalesChannelFilter] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [currentPage, setCurrentPage] = useState(1)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)

  // Fetch logs
  useEffect(() => {
    let isInitialLoad = true
    
    const fetchLogs = async () => {
      try {
        // Only show loading spinner on initial load, not on auto-refresh
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
    
    // Initial fetch
    fetchLogs()
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchLogs()
    }, 5000)
    
    // Cleanup interval on unmount
    return () => clearInterval(interval)
  }, [])

  // Filter and sort logs
  const filteredLogs = useMemo(() => {
    if (!Array.isArray(logs)) return []
    
    let filtered = [...logs]

    // Department auto-filter: Only show logs for their assigned channel
    if (isDepartment && userChannel) {
      filtered = filtered.filter(log => {
        const detailsLower = log.details?.toLowerCase() || ''
        const channelLower = userChannel.toLowerCase()
        return detailsLower.includes(channelLower)
      })
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(log => 
        log.itemName?.toLowerCase().includes(query) ||
        log.details?.toLowerCase().includes(query) ||
        log.operation?.toLowerCase().includes(query)
      )
    }

    // Operation filter (now includes cancel, uncancel, restore)
    if (operationFilter !== "all") {
      filtered = filtered.filter(log => {
        const operation = log.operation?.toLowerCase() || ''
        
        // Direct case-insensitive match for cancel/restore/uncancel
        if (operationFilter === 'cancel' && (operation === 'cancel' || operation === 'cancelled' || operation === 'transaction-cancelled')) return true
        if (operationFilter === 'restore' && (operation === 'restore' || operation === 'uncancel')) return true
        
        // Use the same logic as getOperationBadge to determine actual operation
        let actualOperation = operation.replace(/\s+/g, '-').replace(/_/g, '-') || 'other'
        
        // Check if it's a cancellation operation
        if (actualOperation.includes('cancelled') || (log.details?.toLowerCase().includes('transaction') && log.details?.toLowerCase().includes('cancelled'))) {
          actualOperation = 'transaction-cancelled'
        }
        
        // Only override based on details if operation is still unclear
        const explicitOperations = ['create', 'update', 'delete', 'restock', 'transaction-cancelled', 'to-be-packed', 'sale', 'cancel', 'restore', 'uncancel']
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

    // Sales Channel filter - Admin only (departments are auto-filtered above)
    if (!isDepartment && salesChannelFilter !== "all") {
      filtered = filtered.filter(log => {
        const detailsLower = log.details?.toLowerCase() || ''
        const channelLower = salesChannelFilter.toLowerCase()
        return detailsLower.includes(channelLower)
      })
    }

    // Date filter
    if (startDate || endDate) {
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp)
        const matchesStart = !startDate || logDate >= startDate
        const matchesEnd = !endDate || logDate <= endDate
        return matchesStart && matchesEnd
      })
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime()
      const dateB = new Date(b.timestamp).getTime()
      return sortBy === "newest" ? dateB - dateA : dateA - dateB
    })

    return filtered
  }, [logs, searchQuery, operationFilter, salesChannelFilter, sortBy, startDate, endDate])

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE)
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset to page 1 when filters change
  // REMOVED - causes pagination to jump back to page 1 constantly
  // useEffect(() => {
  //   setCurrentPage(1)
  // }, [searchQuery, operationFilter, salesChannelFilter, sortBy, startDate, endDate])

  // Statistics
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

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("")
    setOperationFilter("all")
    setSalesChannelFilter("all")
    setSortBy("newest")
    setStartDate(null)
    setEndDate(null)
    setCurrentPage(1)
  }

  // Get operation badge
  const getOperationBadge = (operation: string, details: string) => {
    // Normalize operation: convert to lowercase, replace spaces and underscores with dashes
    let actualOperation = operation?.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-') || 'other'
    
    // Direct mapping for cancel/uncancel
    if (actualOperation === 'cancel') {
      actualOperation = 'cancel'
    } else if (actualOperation === 'uncancel') {
      actualOperation = 'uncancel'
    }
    // Check if it's a cancellation operation
    else if (actualOperation.includes('cancelled') || details?.toLowerCase().includes('transaction') && details?.toLowerCase().includes('cancelled')) {
      actualOperation = 'transaction-cancelled'
    }
    
    // Only override based on details if operation is still unclear
    const explicitOperations = ['create', 'update', 'delete', 'restock', 'transaction-cancelled', 'to-be-packed', 'sale', 'cancel', 'uncancel']
    const isExplicitOperation = explicitOperations.includes(actualOperation)
    
    if (!isExplicitOperation) {
      // Override based on details content for backward compatibility
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

  // Extract sales channel from details
  const getSalesChannel = (details: string) => {
    if (!details) return null
    const detailsLower = details.toLowerCase()
    
    // Check for specific sales channels
    if (detailsLower.includes('shopee')) return 'Shopee'
    if (detailsLower.includes('lazada')) return 'Lazada'
    if (detailsLower.includes('facebook')) return 'Facebook'
    if (detailsLower.includes('tiktok')) return 'TikTok'
    if (detailsLower.includes('office store')) return 'Office Store'
    if (detailsLower.includes('physical store')) return 'Physical Store'
    if (detailsLower.includes('warehouse')) return 'Warehouse'
    
    return null
  }

  // Get sales channel badge
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
      <div className="max-w-[1600px] mx-auto py-5">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold gradient-text">Activity Logs Overview</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">View all system operations and changes</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <BrandLoader size="lg" />
            <p className="text-slate-600 dark:text-slate-400 mt-6 text-sm font-medium">Loading logs...</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Export Activity Logs to Excel ─────────────────────────────────────────
  const exportLogsToExcel = () => {
    try {
      const dataToExport = filteredLogs.map(log => ({
        'Date & Time': new Date(log.timestamp).toLocaleString('en-US', {
          month: '2-digit', day: '2-digit', year: '2-digit',
          hour: '2-digit', minute: '2-digit', hour12: false
        }),
        'Operation': log.operation,
        'Staff': log.staffName || '-',
        'Item': (log.itemName || '-').replace(/\s*\(\d+\)\s*$/, ''),
        'Details': log.details,
      }))

      const ws = XLSX.utils.json_to_sheet(dataToExport)
      ws['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 28 }, { wch: 60 }]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Activity Logs')

      const date = new Date().toISOString().split('T')[0]
      XLSX.writeFile(wb, `Activity_Logs_${date}.xlsx`)
      toast.success(`Exported ${filteredLogs.length} log entries`)
    } catch (err) {
      console.error('Export error:', err)
      toast.error('Failed to export logs')
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto py-5 space-y-6">
      {/* Page Header with Date Filter - Professional Style */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold gradient-text">Activity Logs Overview</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">View all system operations and changes</p>
        </div>
        
        {/* Date Range + Export */}
        <div className="flex items-center gap-3">
          <Button
            onClick={exportLogsToExcel}
            disabled={filteredLogs.length === 0}
            size="sm"
            className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold gap-2 shadow-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
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

      {/* Statistics Cards - Professional Corporate Design */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {/* Total Logs - Blue */}
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

        {/* Today - Green */}
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

        {/* Creates - Purple */}
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

        {/* Updates - Orange */}
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

        {/* Deletes - Red */}
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

        {/* Cancelled - Amber */}
        <Card className="p-5 border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-600 shadow-lg shadow-amber-500/30">
              <X className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Cancelled</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 tabular-nums">{stats.cancelled}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters Section - SaaS Professional Design */}
      <div className="mb-4">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">Search & Filter Logs</h3>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Clear All Button - Aligned with title */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <X className="h-3 w-3" />
                Clear All
              </Button>
            )}
            
            {/* Results Summary - Above filters on right */}
            <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
              Showing <span className="font-bold text-slate-900 dark:text-white">{paginatedLogs.length}</span> of <span className="font-bold text-slate-900 dark:text-white">{filteredLogs.length}</span> logs
              {hasActiveFilters && ` (filtered from ${logs.length} total)`}
            </div>
          </div>
        </div>

        {/* Search and Filters Row */}
        <div className="flex gap-3">
          {/* Search - Fixed width */}
          <div className="relative" style={{ width: '450px' }}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-slate-800"
            />
          </div>

          {/* Spacer to push filters to the right */}
          <div className="flex-1" />

          {/* Operation Filter */}
          <Select value={operationFilter} onValueChange={setOperationFilter}>
            <SelectTrigger className="h-10 w-[200px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
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
              {!isDepartment && <SelectItem value="cancel">Cancelled Orders</SelectItem>}
              {!isDepartment && <SelectItem value="restore">Restored Orders</SelectItem>}
              <SelectItem value="internal-usage">Internal Usage</SelectItem>
              <SelectItem value="demo-display">Demo/Display</SelectItem>
              <SelectItem value="warehouse">Warehouse</SelectItem>
            </SelectContent>
          </Select>

          {/* Sales Channel Filter - Admin Only */}
          {!isDepartment && (
            <Select value={salesChannelFilter} onValueChange={setSalesChannelFilter}>
              <SelectTrigger className="h-10 w-[180px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
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
          )}
        </div>
      </div>

      {/* Logs Table - Professional Design */}
      <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardContent className="pt-6">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {logs.length === 0 ? 'No operations logged yet' : 'No logs match your filters'}
              </h3>
              {hasActiveFilters && (
                <Button
                  variant="link"
                  onClick={clearFilters}
                  className="text-blue-600 dark:text-blue-400 font-semibold"
                >
                  Clear filters to see all logs
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] lg:min-w-full text-sm table-fixed">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-black dark:bg-black">
                      <th className="py-3 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[180px]">Date & Time</th>
                      <th className="py-3 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[140px]">Operation</th>
                      <th className="py-3 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[140px]">Sales Channel</th>
                      <th className="py-3 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[220px]">Item</th>
                      <th className="py-3 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {paginatedLogs.map((log) => (
                      <tr 
                        key={log.id} 
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3 px-3 text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
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
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {getOperationBadge(log.operation, log.details)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {getSalesChannelBadge(getSalesChannel(log.details))}
                        </td>
                        <td className="py-3 px-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                          <div className="truncate" title={(log.itemName || '-').replace(/\s*\(\d+\)\s*$/, '')}>
                            {(log.itemName || '-').replace(/\s*\(\d+\)\s*$/, '')}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-400">
                          <div className="line-clamp-2 leading-relaxed">
                            {log.details}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination - Professional Design */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Page <span className="font-bold text-slate-900 dark:text-white">{currentPage}</span> of <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-9 px-4 font-semibold"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-9 px-4 font-semibold"
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
