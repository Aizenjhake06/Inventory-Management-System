/**
 * Dashboard Data Aggregation & Comparison Utilities
 * 
 * Provides efficient data processing functions for dashboard metrics
 * without duplicating backend filtering logic.
 * 
 * @module dashboard-utils
 */

import type { DashboardStats } from "./types"
import type { ChartDataPoint, PeriodComparison, TimePeriod } from "@/components/dashboard/revenue-chart"

// ============================================================================
// DATA FORMATTING
// ============================================================================

/**
 * Format sales data for chart display based on time period
 * 
 * @param salesOverTime - Raw sales data from API
 * @param timePeriod - Current time period filter
 * @returns Formatted chart data points
 */
export function formatChartData(
  salesOverTime: Array<{ date: string; sales: number; purchases: number; quantity: number; orders: number }> | undefined,
  timePeriod: TimePeriod
): ChartDataPoint[] {
  if (!salesOverTime || salesOverTime.length === 0) return []

  return salesOverTime.map(item => {
    let displayDate = item.date

    if (timePeriod === "ID") {
      // Day: show hour only (e.g., "14:00")
      displayDate = item.date.split(' ')[1] || item.date
    } else if (timePeriod === "1W") {
      // Week: format as "Mon 15", "Tue 16", etc.
      try {
        const datePart = item.date.split(' ')[0]
        if (datePart && datePart.includes('-')) {
          const dateObj = new Date(datePart)
          if (!isNaN(dateObj.getTime())) {
            displayDate = dateObj.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })
          }
        }
      } catch (e) {
        console.error('Date parsing error:', e, item.date)
        displayDate = item.date
      }
    } else if (timePeriod === "1M") {
      // Month: date is already formatted from API
      displayDate = item.date
    }

    return {
      date: displayDate,
      sales: item.sales,
      purchases: item.purchases,
      quantity: item.quantity || 0,
      orders: item.orders || 0
    }
  })
}

// ============================================================================
// PERIOD COMPARISON
// ============================================================================

/**
 * Calculate period-over-period comparison metrics
 * 
 * Uses data already calculated by the backend API to avoid
 * duplicate filtering and calculation logic.
 * 
 * @param stats - Dashboard stats from API
 * @param timePeriod - Current time period
 * @returns Comparison metrics with change calculations
 */
export function calculatePeriodComparison(
  stats: DashboardStats | null,
  timePeriod: TimePeriod
): PeriodComparison {
  if (!stats) {
    return {
      current: 0,
      previous: 0,
      change: 0,
      changePercent: 0,
      currentQuantity: 0,
      previousQuantity: 0
    }
  }

  // Calculate current period total from salesOverTime
  const current = stats.salesOverTime?.reduce((sum, item) => sum + item.sales, 0) || 0
  const currentQuantity = stats.salesOverTime?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0

  // Get previous period total from API (already calculated)
  let previous = 0
  let previousQuantity = 0
  if (timePeriod === 'ID') {
    // Day: use yesterday's sales
    previous = stats.yesterdaySales || 0
    previousQuantity = stats.yesterdayQuantity || 0
  } else if (timePeriod === '1W') {
    // Week: use last week's sales
    previous = stats.lastWeekSales || 0
    previousQuantity = stats.lastWeekQuantity || 0
  } else if (timePeriod === '1M') {
    // Month: use last month's sales
    previous = stats.lastMonthSales || 0
    previousQuantity = stats.lastMonthQuantity || 0
  }

  // Calculate change
  const change = current - previous
  const changePercent = previous > 0 ? (change / previous) * 100 : 0

  return {
    current,
    previous,
    change,
    changePercent,
    currentQuantity,
    previousQuantity
  }
}

// ============================================================================
// VALIDATION & HELPERS
// ============================================================================

/**
 * Validate that chart data is ready for display
 * 
 * @param data - Chart data points
 * @returns True if data is valid and non-empty
 */
export function isChartDataValid(data: ChartDataPoint[]): boolean {
  return Array.isArray(data) && data.length > 0
}

/**
 * Get smart Y-axis domain for better chart scaling
 * 
 * @param data - Chart data points
 * @returns [min, max] domain with padding
 */
export function getChartDomain(data: ChartDataPoint[]): [number, number] {
  if (!isChartDataValid(data)) return [0, 100]

  const allValues = data.flatMap(item => [item.sales, item.purchases])
  const max = Math.max(...allValues)
  const min = Math.min(...allValues, 0)

  // Add 10% padding to top
  const paddedMax = max * 1.1

  return [min, paddedMax]
}

/**
 * Calculate aggregate metrics from chart data
 * 
 * @param data - Chart data points
 * @returns Aggregated totals
 */
export function calculateChartAggregates(data: ChartDataPoint[]) {
  if (!isChartDataValid(data)) {
    return {
      totalSales: 0,
      totalPurchases: 0,
      netProfit: 0,
      averageSales: 0,
      averagePurchases: 0
    }
  }

  const totalSales = data.reduce((sum, item) => sum + item.sales, 0)
  const totalPurchases = data.reduce((sum, item) => sum + item.purchases, 0)
  const netProfit = totalSales - totalPurchases

  return {
    totalSales,
    totalPurchases,
    netProfit,
    averageSales: totalSales / data.length,
    averagePurchases: totalPurchases / data.length
  }
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

/**
 * Export chart data to CSV format
 * 
 * @param data - Chart data points
 * @param timePeriod - Current time period
 * @returns CSV string
 */
export function exportChartDataToCSV(
  data: ChartDataPoint[],
  timePeriod: TimePeriod
): string {
  if (!isChartDataValid(data)) return ''

  const headers = ['Date', 'Sales', 'Purchases', 'Net Profit']
  const rows = data.map(item => [
    item.date,
    item.sales.toFixed(2),
    item.purchases.toFixed(2),
    (item.sales - item.purchases).toFixed(2)
  ])

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return csv
}
