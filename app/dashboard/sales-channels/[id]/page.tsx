"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
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
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Package,
  Calendar,
  Percent,
  FileDown,
  FileSpreadsheet,
  ChevronDown,
  AlertTriangle
} from "lucide-react"
import { formatCurrency, formatNumber } from "@/lib/utils"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { apiGet } from "@/lib/api-client"
import { toast } from "sonner"
import { 
  exportToExcel, 
  exportToPDF,
  formatCurrencyForExport,
  formatDateForExport,
  formatNumberForExport,
  formatPercentageForExport
} from "@/lib/export-utils"
import { EnterpriseDateRangePicker } from '@/components/ui/enterprise-date-range-picker'
import { getCurrentUserRole } from '@/lib/role-utils'

interface DepartmentDetail {
  name: string
  metrics: {
    totalRevenue: number
    totalCost: number
    totalProfit: number
    transactionCount: number
    totalQuantity: number
    profitMargin: number
  }
  parcelStatusCounts?: {
    pending: number
    pendingAmount?: number
    pendingPercentage?: number
    undelivered?: number
    undeliveredAmount?: number
    undeliveredPercentage?: number
    inTransit: number
    delivered: number
    deliveredAmount?: number
    deliveredPercentage?: number
    lossRevenue?: number
    lossRevenueAmount?: number
    lossRevenuePercentage?: number
    returned?: number
    returnedAmount?: number
    returnedPercentage?: number
    cancelled?: number
    cancelledAmount?: number
    cancelledPercentage?: number
    cancelledPackingQueue?: number
    cancelledPackingQueueAmount?: number
    cancelledTrackOrders?: number
    cancelledTrackOrdersAmount?: number
    detained?: number
    detainedAmount?: number
    detainedPercentage?: number
    problematic?: number
    problematicAmount?: number
    problematicPercentage?: number
    total: number
  }
  cashFlow: Array<{
    date: string
    revenue: number
    cost: number
    profit: number
  }>
  topProducts: Array<{
    name: string
    quantity: number
    revenue: number
    cost: number
    profit: number
    orders: number
  }>
  storeBreakdown: Array<{
    name: string
    revenue: number
    cost: number
    profit: number
    transactions: number
    quantity: number
  }>
  recentTransactions: Array<{
    id: string
    itemName: string
    quantity: number
    revenue: number
    cost: number
    profit: number
    timestamp: string
    staffName?: string
    notes?: string
  }>
}

export default function SalesChannelDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const departmentName = decodeURIComponent(params.id as string)
  const [data, setData] = useState<DepartmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState<Date | null>(
    searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : null
  )
  const [endDate, setEndDate] = useState<Date | null>(
    searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : null
  )
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month'>('week')

  // Role detection
  const userRole = getCurrentUserRole()
  const isTeamLeader = false // Team leader role removed

  useEffect(() => {
    if (!startDate || !endDate) {
      // Set default date range (last 30 days)
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      
      setStartDate(start)
      setEndDate(end)
    }
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      fetchData()
    }
  }, [startDate, endDate, departmentName])

  async function fetchData() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate.toISOString())
      if (endDate) params.append('endDate', endDate.toISOString())

      console.log('[Sales Channel Page] Fetching data with params:', {
        channel: departmentName,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      })

      const result = await apiGet<{ department: DepartmentDetail }>(`/api/departments/${encodeURIComponent(departmentName)}?${params}`)
      
      console.log('[Sales Channel Page] Received data:', {
        revenue: result.department.metrics.totalRevenue,
        orderCount: result.department.metrics.transactionCount,
        parcelStatusTotal: result.department.parcelStatusCounts?.total
      })
      
      setData(result.department)
    } catch (error) {
      console.error("Error fetching department details:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading channel details...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400">Channel not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const isPositive = data.metrics.totalProfit >= 0

  // Aggregate cash flow data based on selected period
  const getAggregatedCashFlow = () => {
    if (!data?.cashFlow) return []
    
    if (chartPeriod === 'day') {
      return data.cashFlow
    }
    
    const aggregated: { [key: string]: { revenue: number; cost: number; profit: number; count: number } } = {}
    
    data.cashFlow.forEach(item => {
      const date = new Date(item.date)
      let key: string
      
      if (chartPeriod === 'week') {
        // Get week start (Sunday)
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
      } else {
        // Month
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
      }
      
      if (!aggregated[key]) {
        aggregated[key] = { revenue: 0, cost: 0, profit: 0, count: 0 }
      }
      
      aggregated[key].revenue += item.revenue
      aggregated[key].cost += item.cost
      aggregated[key].profit += item.profit
      aggregated[key].count++
    })
    
    return Object.entries(aggregated)
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.profit
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const chartData = getAggregatedCashFlow()

  const formatXAxisDate = (date: string) => {
    const d = new Date(date)
    if (chartPeriod === 'day') {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else if (chartPeriod === 'week') {
      return `Week ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }
  }

  // Export Function for Sales Channel Report
  async function handleExportChannel(format: 'excel' | 'pdf') {
    if (!data) {
      toast.error("No data available to export")
      return
    }

    const filters = []
    if (startDate) filters.push({ label: 'Start Date', value: startDate.toLocaleDateString() })
    if (endDate) filters.push({ label: 'End Date', value: endDate.toLocaleDateString() })

    const summary = [
      { label: 'Sales Channel', value: data.name },
      { label: 'Total Revenue', value: formatCurrencyForExport(data.metrics.totalRevenue) },
      { label: 'Total Cost', value: formatCurrencyForExport(data.metrics.totalCost) },
      { label: 'Total Profit', value: formatCurrencyForExport(data.metrics.totalProfit) },
      { label: 'Profit Margin', value: formatPercentageForExport(data.metrics.profitMargin) },
      { label: 'Total Transactions', value: formatNumberForExport(data.metrics.transactionCount) },
      { label: 'Total Items Sold', value: formatNumberForExport(data.metrics.totalQuantity) },
    ]

    // Separate transactions by status
    const salesTransactions = data.recentTransactions.filter((t: any) => !t.status || t.status === 'completed')
    const cancelledTransactions = data.recentTransactions.filter((t: any) => t.status === 'cancelled')
    const returnedTransactions = data.recentTransactions.filter((t: any) => t.status === 'returned')

    const columns = [
      { header: 'Date & Time', key: 'timestamp', width: 20, format: formatDateForExport },
      { header: 'Item Name', key: 'itemName', width: 30 },
      { header: 'Quantity', key: 'quantity', width: 12, format: formatNumberForExport },
      { header: 'Revenue', key: 'revenue', width: 15, format: formatCurrencyForExport },
      { header: 'Cost', key: 'cost', width: 15, format: formatCurrencyForExport },
      { header: 'Profit', key: 'profit', width: 15, format: formatCurrencyForExport },
      { header: 'Staff', key: 'staffName', width: 20 },
    ]

    const toastId = toast.loading(`Generating ${format.toUpperCase()} report...`)
    
    try {
      if (format === 'excel') {
        // For Excel, create multiple sheets
        const XLSX = await import('xlsx')
        const wb = XLSX.utils.book_new()

        // Summary Sheet
        const summaryData: any[][] = []
        summaryData.push([`${data.name} - Sales Channel Report`])
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
        summaryData.push([])
        summaryData.push(['Transaction Breakdown:'])
        summaryData.push(['Sales Transactions', salesTransactions.length])
        summaryData.push(['Cancelled Transactions', cancelledTransactions.length])
        summaryData.push(['Returned Transactions', returnedTransactions.length])
        summaryData.push(['Total Transactions', data.recentTransactions.length])

        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

        // Sales Transactions Sheet
        if (salesTransactions.length > 0) {
          const salesData: any[][] = []
          salesData.push(['Sales Transactions'])
          salesData.push([])
          salesData.push(columns.map(col => col.header))
          salesTransactions.forEach((row: any) => {
            salesData.push(columns.map(col => {
              const value = row[col.key]
              return col.format ? col.format(value) : value
            }))
          })
          salesData.push([])
          salesData.push(['Total Sales:', salesTransactions.length])

          const salesWs = XLSX.utils.aoa_to_sheet(salesData)
          salesWs['!cols'] = columns.map(col => ({ wch: col.width || 15 }))
          XLSX.utils.book_append_sheet(wb, salesWs, 'Sales')
        }

        // Cancelled Transactions Sheet
        if (cancelledTransactions.length > 0) {
          const cancelledData: any[][] = []
          cancelledData.push(['Cancelled Transactions'])
          cancelledData.push([])
          cancelledData.push(columns.map(col => col.header))
          cancelledTransactions.forEach((row: any) => {
            cancelledData.push(columns.map(col => {
              const value = row[col.key]
              return col.format ? col.format(value) : value
            }))
          })
          cancelledData.push([])
          cancelledData.push(['Total Cancelled:', cancelledTransactions.length])

          const cancelledWs = XLSX.utils.aoa_to_sheet(cancelledData)
          cancelledWs['!cols'] = columns.map(col => ({ wch: col.width || 15 }))
          XLSX.utils.book_append_sheet(wb, cancelledWs, 'Cancelled')
        }

        // Returned Transactions Sheet
        if (returnedTransactions.length > 0) {
          const returnedData: any[][] = []
          returnedData.push(['Returned Transactions'])
          returnedData.push([])
          returnedData.push(columns.map(col => col.header))
          returnedTransactions.forEach((row: any) => {
            returnedData.push(columns.map(col => {
              const value = row[col.key]
              return col.format ? col.format(value) : value
            }))
          })
          returnedData.push([])
          returnedData.push(['Total Returned:', returnedTransactions.length])

          const returnedWs = XLSX.utils.aoa_to_sheet(returnedData)
          returnedWs['!cols'] = columns.map(col => ({ wch: col.width || 15 }))
          XLSX.utils.book_append_sheet(wb, returnedWs, 'Returned')
        }

        // Top Products Sheet
        if (data.topProducts && data.topProducts.length > 0) {
          const topProductsData: any[][] = []
          topProductsData.push(['Top Products'])
          topProductsData.push([])
          topProductsData.push(['Product Name', 'Quantity Sold', 'Revenue'])
          data.topProducts.forEach((product: any) => {
            topProductsData.push([
              product.name,
              formatNumberForExport(product.quantity),
              formatCurrencyForExport(product.revenue)
            ])
          })

          const topProductsWs = XLSX.utils.aoa_to_sheet(topProductsData)
          topProductsWs['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 15 }]
          XLSX.utils.book_append_sheet(wb, topProductsWs, 'Top Products')
        }

        // Save Excel file
        const filename = `Sales-Channel-Report-${data.name}-${new Date().toISOString().split('T')[0]}-${String(new Date().getHours()).padStart(2, '0')}${String(new Date().getMinutes()).padStart(2, '0')}.xlsx`
        XLSX.writeFile(wb, filename)
        
        toast.success('Excel report downloaded successfully!', { id: toastId })
      } else {
        // For PDF, create sections for each transaction type
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
        doc.text(`${data.name} - Sales Channel Report`, 14, yPosition)
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
        yPosition += 5

        // Transaction breakdown
        doc.setFont('helvetica', 'bold')
        doc.text('Transaction Breakdown:', 14, yPosition)
        yPosition += 5
        doc.setFont('helvetica', 'normal')
        doc.text(`Sales: ${salesTransactions.length}`, 14, yPosition)
        yPosition += 5
        doc.text(`Cancelled: ${cancelledTransactions.length}`, 14, yPosition)
        yPosition += 5
        doc.text(`Returned: ${returnedTransactions.length}`, 14, yPosition)
        yPosition += 10

        // Sales Transactions Table
        if (salesTransactions.length > 0) {
          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          doc.text('Sales Transactions', 14, yPosition)
          yPosition += 5

          const salesTableData = salesTransactions.map((row: any) => 
            columns.map(col => {
              const value = row[col.key]
              const formatted = col.format ? col.format(value) : String(value ?? '')
              return typeof formatted === 'string' ? formatted.replace(/₱/g, '') : formatted
            })
          )

          autoTable(doc, {
            head: [columns.map(col => col.header)],
            body: salesTableData,
            startY: yPosition,
            theme: 'striped',
            headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
          })

          yPosition = (doc as any).lastAutoTable.finalY + 10
        }

        // Cancelled Transactions Table
        if (cancelledTransactions.length > 0) {
          if (yPosition > 180) {
            doc.addPage()
            yPosition = 20
          }

          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          doc.text('Cancelled Transactions', 14, yPosition)
          yPosition += 5

          const cancelledTableData = cancelledTransactions.map((row: any) => 
            columns.map(col => {
              const value = row[col.key]
              const formatted = col.format ? col.format(value) : String(value ?? '')
              return typeof formatted === 'string' ? formatted.replace(/₱/g, '') : formatted
            })
          )

          autoTable(doc, {
            head: [columns.map(col => col.header)],
            body: cancelledTableData,
            startY: yPosition,
            theme: 'striped',
            headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
          })

          yPosition = (doc as any).lastAutoTable.finalY + 10
        }

        // Returned Transactions Table
        if (returnedTransactions.length > 0) {
          if (yPosition > 180) {
            doc.addPage()
            yPosition = 20
          }

          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          doc.text('Returned Transactions', 14, yPosition)
          yPosition += 5

          const returnedTableData = returnedTransactions.map((row: any) => 
            columns.map(col => {
              const value = row[col.key]
              const formatted = col.format ? col.format(value) : String(value ?? '')
              return typeof formatted === 'string' ? formatted.replace(/₱/g, '') : formatted
            })
          )

          autoTable(doc, {
            head: [columns.map(col => col.header)],
            body: returnedTableData,
            startY: yPosition,
            theme: 'striped',
            headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
          })
        }

        // Footer on all pages
        const pageCount = doc.internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i)
          const pageSize = doc.internal.pageSize
          const pageHeight = pageSize.height || pageSize.getHeight()
          
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.text(`Page ${i} of ${pageCount}`, 14, pageHeight - 10)
          doc.text(`Total Records: ${data.recentTransactions.length}`, pageSize.width - 50, pageHeight - 10)
        }

        // Save PDF
        const filename = `Sales-Channel-Report-${data.name}-${new Date().toISOString().split('T')[0]}-${String(new Date().getHours()).padStart(2, '0')}${String(new Date().getMinutes()).padStart(2, '0')}.pdf`
        doc.save(filename)
        
        toast.success('PDF report downloaded successfully!', { id: toastId })
      }
    } catch (error) {
      toast.error(`Failed to export ${format.toUpperCase()} report`, { id: toastId })
      console.error(error)
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto py-5 space-y-6">
      {/* Page Header */}
      <div className="mb-6 animate-in fade-in-0 slide-in-from-top-4 duration-700">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sales Channels
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">
              {data.name}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-base">
              Detailed performance analytics and cash flow
            </p>
          </div>
          
          {/* Date Filter and Export Button - Admin only */}
          {!isTeamLeader && (
            <div className="flex items-center gap-3">
              {/* Date Range Picker */}
              <EnterpriseDateRangePicker
                startDate={startDate}
                endDate={endDate}
                onDateChange={(start, end) => {
                  setStartDate(start)
                  setEndDate(end)
                }}
                className="h-11 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg font-semibold transition-all shadow-sm"
              />
              
              {/* Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="group relative inline-flex items-center justify-center p-0.5 text-sm font-medium text-gray-900 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 group-hover:from-purple-500 group-hover:to-pink-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-purple-200 dark:focus:ring-purple-800 transition-all duration-200">
                    <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0 flex items-center gap-2">
                      <FileDown className="h-4 w-4" />
                      Export Report
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleExportChannel('pdf')}>
                    <FileDown className="h-4 w-4 mr-2" />
                    <span>Export as PDF</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportChannel('excel')}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    <span>Export as Excel</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      {data.metrics.transactionCount === 0 && (
        <div className="mb-6 p-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100">No Orders Found</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                No orders were packed in the selected date range ({startDate?.toLocaleDateString()} - {endDate?.toLocaleDateString()}). 
                Try expanding your date range to see data.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-[5px] bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {formatCurrency(data.metrics.totalRevenue)}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Revenue</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-[5px] bg-red-100 dark:bg-red-900/30">
                <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {formatCurrency(data.metrics.totalCost)}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Cost</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-[5px] ${isPositive ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                <DollarSign className={`h-4 w-4 ${isPositive ? 'text-purple-600 dark:text-purple-400' : 'text-red-600 dark:text-red-400'}`} />
              </div>
            </div>
            <div className={`text-2xl font-bold mb-1 ${isPositive ? 'text-slate-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(data.metrics.totalProfit)}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Profit</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-[5px] bg-amber-100 dark:bg-amber-900/30">
                <Percent className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {data.metrics.profitMargin.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Margin</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-[5px] bg-blue-100 dark:bg-blue-900/30">
                <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {formatNumber(data.metrics.transactionCount)}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Orders Sold</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-[5px] bg-indigo-100 dark:bg-indigo-900/30">
                <Package className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {formatNumber(data.metrics.totalQuantity)}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">Items Sold</div>
          </CardContent>
        </Card>
      </div>

      {/* Parcel Status Cards */}
      {data.parcelStatusCounts && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Parcel Status Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pending Card */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-[5px] bg-amber-200 dark:bg-amber-700/50">
                    <Package className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                  </div>
                  <Badge className="bg-amber-200 text-amber-800 dark:bg-amber-700/50 dark:text-amber-200 border-0">
                    Pending
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-amber-900 dark:text-amber-100 mb-1">
                  {formatNumber(data.parcelStatusCounts.pending)}
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-300 mb-2">
                  Awaiting Dispatch
                </div>
                <div className="mt-2 pt-2 border-t border-amber-300 dark:border-amber-700">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-amber-600 dark:text-amber-400">Amount:</span>
                    <span className="font-semibold text-amber-900 dark:text-amber-100">
                      ₱{formatNumber(data.parcelStatusCounts.pendingAmount || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-amber-600 dark:text-amber-400">% of Total:</span>
                    <span className="font-semibold text-amber-900 dark:text-amber-100">
                      {(data.parcelStatusCounts.pendingPercentage || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Undelivered Card (replaces In Transit) */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-[5px] bg-orange-200 dark:bg-orange-700/50">
                    <TrendingUp className="h-4 w-4 text-orange-700 dark:text-orange-300" />
                  </div>
                  <Badge className="bg-orange-200 text-orange-800 dark:bg-orange-700/50 dark:text-orange-200 border-0">
                    Undelivered
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-orange-900 dark:text-orange-100 mb-1">
                  {formatNumber(data.parcelStatusCounts.undelivered)}
                </div>
                <div className="text-xs text-orange-700 dark:text-orange-300 mb-2">
                  In Progress
                </div>
                <div className="mt-2 pt-2 border-t border-orange-300 dark:border-orange-700">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-orange-600 dark:text-orange-400">Amount:</span>
                    <span className="font-semibold text-orange-900 dark:text-orange-100">
                      ₱{formatNumber(data.parcelStatusCounts.undeliveredAmount || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-orange-600 dark:text-orange-400">% of Total:</span>
                    <span className="font-semibold text-orange-900 dark:text-orange-100">
                      {(data.parcelStatusCounts.undeliveredPercentage || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivered Card */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-[5px] bg-green-200 dark:bg-green-700/50">
                    <ShoppingCart className="h-4 w-4 text-green-700 dark:text-green-300" />
                  </div>
                  <Badge className="bg-green-200 text-green-800 dark:bg-green-700/50 dark:text-green-200 border-0">
                    Delivered
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-green-900 dark:text-green-100 mb-1">
                  {formatNumber(data.parcelStatusCounts.delivered)}
                </div>
                <div className="text-xs text-green-700 dark:text-green-300 mb-2">
                  Successfully Delivered
                </div>
                <div className="mt-2 pt-2 border-t border-green-300 dark:border-green-700">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-green-600 dark:text-green-400">Amount:</span>
                    <span className="font-semibold text-green-900 dark:text-green-100">
                      ₱{formatNumber(data.parcelStatusCounts.deliveredAmount || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-green-600 dark:text-green-400">% of Total:</span>
                    <span className="font-semibold text-green-900 dark:text-green-100">
                      {(data.parcelStatusCounts.deliveredPercentage || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Loss Revenue Card (NEW) */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-[5px] bg-red-200 dark:bg-red-700/50">
                    <AlertTriangle className="h-4 w-4 text-red-700 dark:text-red-300" />
                  </div>
                  <Badge className="bg-red-200 text-red-800 dark:bg-red-700/50 dark:text-red-200 border-0">
                    Loss Revenue
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-red-900 dark:text-red-100 mb-1">
                  {formatNumber(data.parcelStatusCounts.lossRevenue)}
                </div>
                <div className="text-xs text-red-700 dark:text-red-300 mb-2">
                  Cancelled/Returned/Issues
                </div>
                <div className="mt-2 pt-2 border-t border-red-300 dark:border-red-700">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-red-600 dark:text-red-400">Amount:</span>
                    <span className="font-semibold text-red-900 dark:text-red-100">
                      ₱{formatNumber(data.parcelStatusCounts.lossRevenueAmount || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] mb-2">
                    <span className="text-red-600 dark:text-red-400">% of Total:</span>
                    <span className="font-semibold text-red-900 dark:text-red-100">
                      {(data.parcelStatusCounts.lossRevenuePercentage || 0).toFixed(1)}%
                    </span>
                  </div>
                  {/* Breakdown */}
                  <div className="mt-2 pt-2 border-t border-red-300 dark:border-red-700 space-y-1">
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-red-600 dark:text-red-400">Cancelled (Packing Queue):</span>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-red-800 dark:text-red-200">{data.parcelStatusCounts.cancelledPackingQueue || 0}</span>
                        <span className="text-red-700 dark:text-red-300">₱{formatNumber(data.parcelStatusCounts.cancelledPackingQueueAmount || 0)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-red-600 dark:text-red-400">Cancelled (Track Orders):</span>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-red-800 dark:text-red-200">{data.parcelStatusCounts.cancelledTrackOrders || 0}</span>
                        <span className="text-red-700 dark:text-red-300">₱{formatNumber(data.parcelStatusCounts.cancelledTrackOrdersAmount || 0)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-red-600 dark:text-red-400">Returned:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-red-800 dark:text-red-200">{data.parcelStatusCounts.returned}</span>
                        <span className="text-red-700 dark:text-red-300">₱{formatNumber(data.parcelStatusCounts.returnedAmount || 0)}</span>
                        <span className="text-red-600 dark:text-red-400">({(data.parcelStatusCounts.returnedPercentage || 0).toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-red-600 dark:text-red-400">Detained:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-red-800 dark:text-red-200">{data.parcelStatusCounts.detained || 0}</span>
                        <span className="text-red-700 dark:text-red-300">₱{formatNumber(data.parcelStatusCounts.detainedAmount || 0)}</span>
                        <span className="text-red-600 dark:text-red-400">({(data.parcelStatusCounts.detainedPercentage || 0).toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-red-600 dark:text-red-400">Problematic:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-red-800 dark:text-red-200">{data.parcelStatusCounts.problematic}</span>
                        <span className="text-red-700 dark:text-red-300">₱{formatNumber(data.parcelStatusCounts.problematicAmount || 0)}</span>
                        <span className="text-red-600 dark:text-red-400">({(data.parcelStatusCounts.problematicPercentage || 0).toFixed(1)}%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Cash Flow Chart */}
      <Card className="mb-6 border-0 shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
        {/* Dark header matching Store Performance */}
        <div className="bg-slate-900 px-6 py-5 border-b border-slate-700">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <div className="h-6 w-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                <span style={{ color: '#ffffff' }}>Cash Flow Over Time</span>
              </h2>
              <p className="text-xs mt-0.5 ml-3" style={{ color: '#94a3b8' }}>
                Revenue, cost and profit trend for {departmentName}
              </p>
            </div>
            {/* Period toggle - pill style */}
            <div className="flex items-center gap-0 bg-slate-800 border border-slate-700 rounded-lg p-1 flex-shrink-0">
              {(['day', 'week', 'month'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setChartPeriod(period)}
                  className={`h-7 px-3 text-xs font-semibold rounded-md transition-all duration-200 capitalize ${
                    chartPeriod === period
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>

        <CardContent className="px-2 md:px-4 pt-6 pb-4">
          {/* Legend row */}
          <div className="flex items-center gap-5 mb-4 px-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20"></div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500 ring-2 ring-red-500/20"></div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Cost</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-violet-500 ring-2 ring-violet-500/20"></div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Profit</span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <div className="min-w-[300px]">
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.07} vertical={false} />
                  <XAxis
                    dataKey="date"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0', strokeOpacity: 0.5 }}
                    tickFormatter={formatXAxisDate}
                    textAnchor="middle"
                    height={36}
                    interval="preserveStartEnd"
                    tick={{ fill: '#94a3b8' }}
                  />
                  <YAxis
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                    tick={{ fill: '#94a3b8' }}
                    width={48}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                    labelFormatter={(date) => {
                      const d = new Date(date)
                      if (chartPeriod === 'day') {
                        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      } else if (chartPeriod === 'week') {
                        return `Week of ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                      } else {
                        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                      }
                    }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: '10px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                      fontSize: '12px',
                      color: '#f1f5f9'
                    }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}
                    itemStyle={{ color: '#f1f5f9' }}
                    cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    name="Revenue"
                    fill="url(#colorRevenue)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#10B981', strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="Cost"
                    fill="url(#colorCost)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#EF4444', strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="#8B5CF6"
                    strokeWidth={2.5}
                    name="Profit"
                    fill="url(#colorProfit)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#8B5CF6', strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mobile Scroll Hint */}
          <div className="md:hidden text-center mt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">← Swipe to view full chart →</p>
          </div>
        </CardContent>
      </Card>

      {/* Store/Warehouse Breakdown */}
      {data.storeBreakdown && data.storeBreakdown.length > 1 && (
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 mb-6 overflow-hidden">
          {/* Professional Header */}
          <div className="bg-slate-900 px-6 py-5 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <div className="h-6 w-1 bg-orange-500 rounded-full flex-shrink-0"></div>
                  <span style={{ color: '#ffffff' }}>Store Performance Breakdown</span>
                </h2>
                <p className="text-xs mt-0.5 ml-3" style={{ color: '#cbd5e1' }}>
                  Individual store contribution to {departmentName} total sales
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#94a3b8' }}>Total Channel Revenue</p>
                <p className="text-lg font-bold" style={{ color: '#ffffff' }}>{formatCurrency(data.metrics.totalRevenue)}</p>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.storeBreakdown.map((store) => {
                const profitMargin = store.revenue > 0 ? (store.profit / store.revenue) * 100 : 0
                const revenueShare = data.metrics.totalRevenue > 0
                  ? (store.revenue / data.metrics.totalRevenue) * 100
                  : 0
                const isPositive = store.profit >= 0
                const isTopStore = store.revenue === Math.max(...data.storeBreakdown.map(s => s.revenue))

                return (
                  <div
                    key={store.name}
                    className={`relative p-5 rounded-xl border-2 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                      isTopStore
                        ? 'border-orange-400 dark:border-orange-500 bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-900/10 dark:to-slate-800'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {/* Top store crown badge */}
                    {isTopStore && (
                      <div className="absolute -top-2.5 left-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full shadow-md shadow-orange-500/30">
                          ★ TOP STORE
                        </span>
                      </div>
                    )}

                    {/* Store name + arrow */}
                    <div className="flex items-start justify-between mb-4 mt-1">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-black ${
                          isTopStore
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          {store.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">
                            {store.name}
                          </h3>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {formatNumber(store.transactions)} transactions
                          </span>
                        </div>
                      </div>
                      {isPositive ? (
                        <ArrowUpRight className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                    </div>

                    {/* Revenue + Share badge */}
                    <div className="mb-4">
                      <div className="flex items-end justify-between mb-1.5">
                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Revenue</p>
                          <p className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                            {formatCurrency(store.revenue)}
                          </p>
                        </div>
                        {/* % of total revenue - the key feature */}
                        <div className={`flex flex-col items-end`}>
                          <span className={`text-2xl font-black leading-none ${
                            revenueShare >= 50 ? 'text-orange-600 dark:text-orange-400'
                            : revenueShare >= 25 ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            {revenueShare.toFixed(1)}%
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">of channel</span>
                        </div>
                      </div>
                      {/* Progress bar showing share of channel revenue */}
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            revenueShare >= 50 ? 'bg-gradient-to-r from-orange-500 to-orange-400'
                            : revenueShare >= 25 ? 'bg-gradient-to-r from-blue-500 to-blue-400'
                            : 'bg-gradient-to-r from-slate-400 to-slate-300'
                          }`}
                          style={{ width: `${Math.min(revenueShare, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Metrics grid */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Profit</p>
                        <p className={`text-sm font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(store.profit)}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Margin</p>
                        <p className={`text-sm font-bold ${
                          profitMargin >= 50 ? 'text-green-600 dark:text-green-400'
                          : profitMargin >= 25 ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                        }`}>
                          {profitMargin.toFixed(1)}%
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Items Sold</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {formatNumber(store.quantity)}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg Order</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {store.transactions > 0 ? formatCurrency(store.revenue / store.transactions) : '₱0'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Products & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
        {/* Top Products */}
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
          <CardHeader className="pb-3 px-4 md:px-6">
            <div>
              <CardTitle className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white">
                Top Products
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Revenue & quantity by product</p>
            </div>
          </CardHeader>
          <CardContent className="px-2 md:px-6">
            {data.topProducts.length > 0 ? (
              <>
                {/* Bar Chart */}
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[300px]">
                    <ResponsiveContainer width="100%" height={Math.max(180, data.topProducts.slice(0,5).length * 52)}>
                      <BarChart
                        data={data.topProducts.slice(0, 5).map(p => ({
                          ...p,
                          name: p.name.length > 18 ? p.name.substring(0, 18) + '…' : p.name
                        }))}
                        layout="vertical"
                        margin={{ left: 20, right: 20 }}
                        barCategoryGap="25%"
                        barGap={3}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                        <XAxis
                          type="number"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          width={120}
                          tick={(props) => {
                            const { x, y, payload } = props
                            return (
                              <text x={x} y={y} dy={4} textAnchor="end" fill="#64748b" fontSize={11}>
                                {payload.value}
                              </text>
                            )
                          }}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            if (name === 'revenue') return [formatCurrency(value), 'Revenue']
                            if (name === 'estimatedProfit') return [formatCurrency(value), 'Est. Profit']
                            return [value, name]
                          }}
                          contentStyle={{
                            backgroundColor: 'rgba(255,255,255,0.97)',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                        <Bar dataKey="revenue" fill="#3B82F6" radius={[0, 6, 6, 0]} name="revenue" />
                        <Bar dataKey="estimatedProfit" fill="#10B981" radius={[0, 6, 6, 0]} name="estimatedProfit" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-1 mb-4 px-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-500"></div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Revenue</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Profit</span>
                  </div>
                </div>

                {/* Products ranked table */}
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                  {data.topProducts.slice(0, 5).map((product, index) => {
                    const totalProductRevenue = data.topProducts.reduce((sum, p) => sum + p.revenue, 0)
                    const share = totalProductRevenue > 0 ? (product.revenue / totalProductRevenue) * 100 : 0
                    const isTop = index === 0

                    return (
                      <div
                        key={product.name}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                          isTop
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                            : 'bg-slate-50 dark:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`h-5 w-5 rounded flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                            isTop ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white truncate">{product.name}</span>
                          <span className="text-slate-400 flex-shrink-0">{product.quantity}x</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                          <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(product.revenue)}</span>
                          <span className={`font-bold w-10 text-right ${
                            share >= 50 ? 'text-orange-600 dark:text-orange-400'
                            : share >= 25 ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-400'
                          }`}>{share.toFixed(0)}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Column headers */}
                <div className="flex items-center justify-between px-3 mt-1 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Product</span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span>Revenue</span>
                    <span className="w-10 text-right">Share</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400 text-sm">No product data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Store Average */}
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
          <CardHeader className="pb-3 px-4 md:px-6">
            <div>
              <CardTitle className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white">
                Store Performance
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Revenue comparison by store</p>
            </div>
          </CardHeader>
          <CardContent className="px-2 md:px-6">
            {data.storeBreakdown.length > 0 ? (
              <>
                {/* Bar Chart - matching Top Products style */}
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[300px]">
                    <ResponsiveContainer width="100%" height={Math.max(180, data.storeBreakdown.length * 52)}>
                      <BarChart
                        data={[...data.storeBreakdown]
                          .sort((a, b) => b.revenue - a.revenue)
                          .slice(0, 5)
                          .map(s => ({ ...s, name: s.name.length > 18 ? s.name.substring(0, 18) + '…' : s.name }))}
                        layout="vertical"
                        margin={{ left: 20, right: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                        <XAxis
                          type="number"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          width={120}
                          tick={(props) => {
                            const { x, y, payload } = props
                            return (
                              <text x={x} y={y} dy={4} textAnchor="end" fill="#64748b" fontSize={11}>
                                {payload.value}
                              </text>
                            )
                          }}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            if (name === 'revenue') return [formatCurrency(value), 'Revenue']
                            if (name === 'profit') return [formatCurrency(value), 'Profit']
                            return [value, name]
                          }}
                          contentStyle={{
                            backgroundColor: 'rgba(255,255,255,0.97)',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                        <Bar dataKey="revenue" fill="#3B82F6" radius={[0, 6, 6, 0]} name="revenue" />
                        <Bar dataKey="profit" fill="#10B981" radius={[0, 6, 6, 0]} name="profit" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-1 mb-4 px-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-500"></div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Revenue</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Profit</span>
                  </div>
                </div>

                {/* Store stats table below chart */}
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                  {[...data.storeBreakdown]
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 5)
                    .map((store, index) => {
                      const avgOrder = store.transactions > 0 ? store.revenue / store.transactions : 0
                      const margin = store.revenue > 0 ? (store.profit / store.revenue) * 100 : 0
                      const share = data.metrics.totalRevenue > 0 ? (store.revenue / data.metrics.totalRevenue) * 100 : 0
                      const isTop = index === 0

                      return (
                        <div
                          key={store.name}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                            isTop
                              ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                              : 'bg-slate-50 dark:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`h-5 w-5 rounded flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                              isTop ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white truncate">{store.name}</span>
                            <span className="text-slate-400 flex-shrink-0">{store.transactions}x</span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                            <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(avgOrder)}<span className="text-slate-400 font-normal">/order</span></span>
                            <span className={`font-bold w-12 text-right ${
                              margin >= 50 ? 'text-emerald-600 dark:text-emerald-400'
                              : margin >= 25 ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                            }`}>{margin.toFixed(1)}%</span>
                            <span className={`font-bold w-10 text-right ${
                              share >= 50 ? 'text-orange-600 dark:text-orange-400'
                              : share >= 25 ? 'text-blue-600 dark:text-blue-400'
                              : 'text-slate-400'
                            }`}>{share.toFixed(0)}%</span>
                          </div>
                        </div>
                      )
                    })}
                </div>

                {/* Column headers for table */}
                <div className="flex items-center justify-between px-3 mt-1 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Store</span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="w-[5.5rem] text-right">Avg/Order</span>
                    <span className="w-12 text-right">Margin</span>
                    <span className="w-10 text-right">Share</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400 text-sm">No store data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
