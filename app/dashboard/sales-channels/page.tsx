"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { 
  Store, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  BarChart3,
  FileSpreadsheet,
  FileDown,
  ChevronDown
} from "lucide-react"
import { Loader2 } from "lucide-react"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { apiGet } from "@/lib/api-client"
import { BrandLoader } from '@/components/ui/brand-loader'
import { toast } from "sonner"
import { 
  formatCurrencyForExport,
  formatDateForExport,
  formatNumberForExport,
  formatPercentageForExport
} from "@/lib/export-utils"
import { EnterpriseDateRangePicker } from '@/components/ui/enterprise-date-range-picker'
import { getCurrentUserRole } from '@/lib/role-utils'

interface Department {
  name: string
  type: 'sale' | 'demo' | 'internal' | 'transfer'
  revenue: number
  cost: number
  profit: number
  transactions: number
  quantity: number
  parcelStatus?: {
    pending: number
    inTransit: number
    delivered: number
    total: number
  }
  averageOrderValue?: number
  fulfillmentRate?: number
}

interface DepartmentsData {
  departments: Department[]
  totals: {
    revenue: number
    cost: number
    profit: number
    transactions: number
    quantity: number
  }
  dateRange: {
    start: string | null
    end: string | null
  }
}

export default function SalesChannelsPage() {
  const router = useRouter()
  const [data, setData] = useState<DepartmentsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)

  // Role detection
  const userRole = getCurrentUserRole()
  const isTeamLeader = false // Team leader role removed

  useEffect(() => {
    // Set default date range (last 30 days)
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    
    setStartDate(start)
    setEndDate(end)
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      fetchData()
    }
  }, [startDate, endDate])

  async function fetchData() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate.toISOString())
      if (endDate) params.append('endDate', endDate.toISOString())

      const result = await apiGet<DepartmentsData>(`/api/departments?${params}`)
      setData(result)
    } catch (error) {
      console.error("Error fetching departments:", error)
    } finally {
      setLoading(false)
    }
  }

  const getChannelIcon = (name: string) => {
    const nameLower = name.toLowerCase()
    if (nameLower.includes('facebook')) return '/facebook.png'
    if (nameLower.includes('tiktok')) return '/tiktok.png'
    if (nameLower.includes('lazada')) return '/Lazada.png'
    if (nameLower.includes('shopee')) return '/Shopee.png'
    if (nameLower.includes('physical')) return '/Physical Store.png'
    return '/placeholder.svg'
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'demo': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'internal': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'transfer': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

  const chartData = data?.departments.map(d => ({
    name: d.name,
    revenue: d.revenue
  })) || []

  // Export Functions
  async function handleExportAllChannels(format: 'excel' | 'pdf') {
    if (!data || !data.departments || data.departments.length === 0) {
      toast.error("No data available to export")
      return
    }

    const filters = []
    if (startDate) filters.push({ label: 'Start Date', value: startDate.toLocaleDateString() })
    if (endDate) filters.push({ label: 'End Date', value: endDate.toLocaleDateString() })

    const summary = [
      { label: 'Total Sales Channels', value: formatNumberForExport(data.departments.length) },
      { label: 'Total Revenue', value: formatCurrencyForExport(data.totals.revenue) },
      { label: 'Total Cost', value: formatCurrencyForExport(data.totals.cost) },
      { label: 'Total Profit', value: formatCurrencyForExport(data.totals.profit) },
      { label: 'Profit Margin', value: formatPercentageForExport(data.totals.revenue > 0 ? (data.totals.profit / data.totals.revenue) * 100 : 0) },
      { label: 'Total Transactions', value: formatNumberForExport(data.totals.transactions) },
      { label: 'Total Items Sold', value: formatNumberForExport(data.totals.quantity) },
    ]

    const columns = [
      { header: 'Sales Channel', key: 'name', width: 25 },
      { header: 'Revenue', key: 'revenue', width: 15, format: formatCurrencyForExport },
      { header: '% of Total', key: 'revenuePercentage', width: 10, format: formatPercentageForExport },
      { header: 'Cost', key: 'cost', width: 15, format: formatCurrencyForExport },
      { header: 'Profit', key: 'profit', width: 15, format: formatCurrencyForExport },
      { 
        header: 'Profit Margin %', 
        key: 'profitMargin', 
        width: 12,
        format: formatPercentageForExport
      },
      { header: 'Transactions', key: 'transactions', width: 12, format: formatNumberForExport },
      { header: 'Items Sold', key: 'quantity', width: 12, format: formatNumberForExport },
    ]

    const channelsWithMargin = data.departments.map(d => ({
      ...d,
      profitMargin: d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0,
      revenuePercentage: data.totals.revenue > 0 ? (d.revenue / data.totals.revenue) * 100 : 0
    }))

    const toastId = toast.loading(`Generating ${format.toUpperCase()} report...`)
    
    try {
      if (format === 'excel') {
        const XLSX = await import('xlsx')
        const wb = XLSX.utils.book_new()

        // Summary Sheet
        const summaryData: any[][] = []
        summaryData.push(['All Sales Channels Report'])
        summaryData.push([])
        summaryData.push(['Generated:', new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })])
        summaryData.push([])
        
        if (filters.length > 0) {
          summaryData.push(['Applied Filters:'])
          filters.forEach(filter => summaryData.push([filter.label, filter.value]))
          summaryData.push([])
        }

        summaryData.push(['Summary:'])
        summary.forEach(item => summaryData.push([item.label, item.value]))

        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

        // Sales Channels Sheet
        const channelsData: any[][] = []
        channelsData.push(['Sales Channels Performance'])
        channelsData.push([])
        channelsData.push(columns.map(col => col.header))
        channelsWithMargin.forEach((row: any) => {
          channelsData.push(columns.map(col => {
            const value = row[col.key]
            return col.format ? col.format(value) : value
          }))
        })

        const channelsWs = XLSX.utils.aoa_to_sheet(channelsData)
        channelsWs['!cols'] = columns.map(col => ({ wch: col.width || 15 }))
        XLSX.utils.book_append_sheet(wb, channelsWs, 'Sales Channels')

        // Save Excel file
        const filename = `All-Sales-Channels-Report-${new Date().toISOString().split('T')[0]}-${String(new Date().getHours()).padStart(2, '0')}${String(new Date().getMinutes()).padStart(2, '0')}.xlsx`
        XLSX.writeFile(wb, filename)
        
        toast.success('Excel report downloaded successfully!', { id: toastId })
      } else {
        // PDF Export
        const jsPDF = (await import('jspdf')).default
        const autoTable = (await import('jspdf-autotable')).default

        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        }) as any

        let yPosition = 20

        // Title
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        doc.text('All Sales Channels Report', 14, yPosition)
        yPosition += 10

        // Timestamp
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Generated: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}`, 14, yPosition)
        yPosition += 8

        // Filters
        if (filters.length > 0) {
          doc.setFont('helvetica', 'bold')
          doc.text('Applied Filters:', 14, yPosition)
          yPosition += 5
          doc.setFont('helvetica', 'normal')
          filters.forEach((filter: any) => {
            doc.text(`${filter.label}: ${filter.value}`, 14, yPosition)
            yPosition += 5
          })
          yPosition += 3
        }

        // Summary (remove ₱ symbols for PDF)
        const pdfSummary = summary.map(item => ({
          ...item,
          value: typeof item.value === 'string' ? item.value.replace(/₱/g, '') : item.value
        }))

        doc.setFont('helvetica', 'bold')
        doc.text('Summary:', 14, yPosition)
        yPosition += 5
        doc.setFont('helvetica', 'normal')
        pdfSummary.forEach((item: any) => {
          doc.text(`${item.label}: ${item.value}`, 14, yPosition)
          yPosition += 5
        })
        yPosition += 10

        // Sales Channels Table
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Sales Channels Performance', 14, yPosition)
        yPosition += 5

        const tableData = channelsWithMargin.map((row: any) => 
          columns.map(col => {
            const value = row[col.key]
            const formatted = col.format ? col.format(value) : String(value ?? '')
            return typeof formatted === 'string' ? formatted.replace(/₱/g, '') : formatted
          })
        )

        autoTable(doc, {
          head: [columns.map(col => col.header)],
          body: tableData,
          startY: yPosition,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 2 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        })

        // Footer
        const pageCount = doc.internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i)
          const pageSize = doc.internal.pageSize
          const pageHeight = pageSize.height || pageSize.getHeight()
          
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.text(`Page ${i} of ${pageCount}`, 14, pageHeight - 10)
          doc.text(`Total Channels: ${data.departments.length}`, pageSize.width - 50, pageHeight - 10)
        }

        // Save PDF
        const filename = `All-Sales-Channels-Report-${new Date().toISOString().split('T')[0]}-${String(new Date().getHours()).padStart(2, '0')}${String(new Date().getMinutes()).padStart(2, '0')}.pdf`
        doc.save(filename)
        
        toast.success('PDF report downloaded successfully!', { id: toastId })
      }
    } catch (error) {
      toast.error(`Failed to export ${format.toUpperCase()} report`, { id: toastId })
      console.error(error)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[600px]">
        <div className="text-center">
          <BrandLoader size="lg" />
          <p className="text-slate-600 dark:text-slate-400 mt-6 text-sm font-medium">
            Loading sales channels...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto py-5 space-y-6">
      {/* Page Header - Professional Shopify Style */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold gradient-text">
            Sales Channels Overview
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Performance analytics and insights per sales channel
          </p>
        </div>
        
        {/* Actions - Shopify Style with Date Picker and Export */}
        <div className="flex items-center gap-3">
          {/* Date Range Picker - No wrapper, direct component */}
          <EnterpriseDateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateChange={(start, end) => {
              setStartDate(start)
              setEndDate(end)
            }}
          />

          {/* Export Button - Square corners, same height as date picker - Admin only */}
          {!isTeamLeader && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  disabled={loading || !data}
                  variant="outline"
                  className="h-10 px-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm transition-all duration-200 rounded-md font-normal"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleExportAllChannels('pdf')}>
                  <FileDown className="h-4 w-4 mr-2" />
                  <span>Export as PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportAllChannels('excel')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  <span>Export as Excel</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Summary Cards - Professional Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-600 shadow-lg shadow-green-500/30 flex-shrink-0">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 tabular-nums">
                {formatCurrency(data?.totals.revenue || 0)}
              </p>
            </div>
          </div>
        </Card>

        {/* Gross Profit */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 shadow-lg shadow-purple-500/30 flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Gross Profit</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 tabular-nums">
                {formatCurrency(data?.totals.profit || 0)}
              </p>
            </div>
          </div>
        </Card>

        {/* Transactions */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30 flex-shrink-0">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Transactions</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 tabular-nums">
                {formatNumber(data?.totals.transactions || 0)}
              </p>
            </div>
          </div>
        </Card>

        {/* Items Sold */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-600 shadow-lg shadow-amber-500/30 flex-shrink-0">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Items Sold</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 tabular-nums">
                {formatNumber(data?.totals.quantity || 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Revenue by Channel Bar Chart */}
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-900 dark:text-white">
              <div className="p-2 rounded-lg bg-blue-600 shadow-sm">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <span>Revenue by Channel</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="revenue" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Distribution Pie Chart */}
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-900 dark:text-white">
              <div className="p-2 rounded-lg bg-emerald-600 shadow-sm">
                <Store className="h-5 w-5 text-white" />
              </div>
              <span>Revenue Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => {
                        // Shorten label on mobile
                        const shortName = name.length > 15 ? name.substring(0, 12) + '...' : name
                        return `${shortName}: ${(percent * 100).toFixed(0)}%`
                      }}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="revenue"
                      style={{ fontSize: '11px' }}
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channels List */}
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
        <div className="bg-slate-900 px-6 py-5 border-b border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-5 w-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                <h2 className="text-lg font-bold tracking-tight text-white">
                  All Sales Channels ({data?.departments.length || 0})
                </h2>
              </div>
              <p className="text-xs ml-3 text-slate-400">
                View performance metrics and detailed analytics for each sales channel
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 border border-blue-500 rounded-lg flex-shrink-0 shadow-md shadow-blue-500/30">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <span className="text-sm font-bold text-white whitespace-nowrap">
                Click to view details
              </span>
            </div>
          </div>
        </div>
        <CardContent className="pt-6">
          {data?.departments && data.departments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.departments.map((dept) => {
                const profitMargin = dept.revenue > 0 ? (dept.profit / dept.revenue) * 100 : 0
                const isPositive = dept.profit >= 0

                return (
                  <button
                    key={dept.name}
                    onClick={() => {
                      setNavigatingTo(dept.name)
                      router.push(`/dashboard/sales-channels/${encodeURIComponent(dept.name)}?startDate=${startDate}&endDate=${endDate}`)
                    }}
                    disabled={navigatingTo !== null}
                    className="group text-left rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-500 hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 ease-out relative overflow-hidden cursor-pointer disabled:cursor-wait disabled:pointer-events-none"
                  >
                    {/* Hover gradient effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                    {/* Loading overlay - shown when this card is being navigated */}
                    {navigatingTo === dept.name && (
                      <div className="absolute inset-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3 rounded-xl">
                        <div className="relative">
                          <div className="h-12 w-12 rounded-full border-4 border-blue-200 dark:border-blue-800"></div>
                          <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Loading {dept.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Fetching performance data...</p>
                        </div>
                      </div>
                    )}

                    {/* Card header - clean corporate */}
                    <div
                      className={`relative px-4 py-3.5 bg-slate-50 border-b border-slate-200 ${navigatingTo && navigatingTo !== dept.name ? 'opacity-40' : ''}`}
                    >
                      {/* Click indicator badge */}
                      {navigatingTo !== dept.name && (
                        <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-bold shadow-md">
                            <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            VIEW
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 p-1.5">
                          <img
                            src={getChannelIcon(dept.name)}
                            alt={dept.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm leading-tight text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-amber-400 transition-colors">
                            {dept.name}
                          </h3>
                          <Badge className={`${getTypeColor(dept.type)} text-[10px] mt-0.5`}>
                            {dept.type}
                          </Badge>
                        </div>
                        <div className="flex-shrink-0">
                          {isPositive ? (
                            <ArrowUpRight className="h-4 w-4 text-green-600 group-hover:scale-125 transition-transform" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-500 group-hover:scale-125 transition-transform" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card body */}
                    <div className={`relative p-4 space-y-2 ${navigatingTo && navigatingTo !== dept.name ? 'opacity-40' : ''}`}>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Revenue</p>
                          <p className="text-xl font-bold text-slate-900 dark:text-white">
                            {formatCurrency(dept.revenue)}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Profit</p>
                            <p className={`text-sm font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatCurrency(dept.profit)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Margin</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {profitMargin.toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">COGS</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {formatCurrency(dept.cost)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">AOV</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {dept.transactions > 0 ? formatCurrency(dept.revenue / dept.transactions) : '₱0'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Transactions</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {formatNumber(dept.transactions)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Items</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {formatNumber(dept.quantity)}
                            </p>
                          </div>
                        </div>

                      {/* Parcel Status Indicators */}
                      {dept.parcelStatus && dept.parcelStatus.total > 0 && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">Parcel Status</p>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {dept.parcelStatus.pending}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {dept.parcelStatus.inTransit}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {dept.parcelStatus.delivered}
                              </span>
                            </div>
                            <div className="ml-auto">
                              <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-[10px] font-bold px-1.5 py-0">
                                {dept.parcelStatus.total > 0 
                                  ? `${((dept.parcelStatus.delivered / dept.parcelStatus.total) * 100).toFixed(0)}%`
                                  : '0%'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Store className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No Sales Channels Found
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No transactions found for the selected date range
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
