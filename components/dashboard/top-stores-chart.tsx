"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Store, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface TopStore {
  name: string
  revenue: number
}

interface TopStoresChartProps {
  data: TopStore[]
  loading?: boolean
}

// Color palette for bars (pink/cyan gradient as per image)
const COLORS = [
  "#EC4899", // Pink
  "#F472B6", // Light Pink
  "#FB7185", // Rose
  "#06B6D4", // Cyan
  "#22D3EE", // Light Cyan
  "#67E8F9", // Lighter Cyan
  "#A78BFA", // Purple
  "#C084FC", // Light Purple
  "#60A5FA", // Blue
  "#93C5FD", // Light Blue
]

const formatCurrency = (value: number): string => {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0].payload

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
        {data.name}
      </p>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].fill }} />
        <span className="text-sm font-bold text-pink-600 dark:text-pink-400">
          {formatCurrency(data.revenue)}
        </span>
      </div>
    </div>
  )
}

export function TopStoresChart({ data, loading = false }: TopStoresChartProps) {
  // Reverse for display (highest at top)
  let chartData: TopStore[] = []
  
  try {
    // Validate data is an array
    if (!Array.isArray(data)) {
      console.error('[TopStoresChart] Invalid data: expected array, got:', typeof data)
      chartData = []
    } else {
      chartData = data
        .filter(item => item && typeof item.name === 'string' && typeof item.revenue === 'number')
        .slice()
        .reverse()
    }
  } catch (error) {
    console.error('[TopStoresChart] Error processing chart data:', error)
    chartData = []
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-cyan-500 text-white shadow-md">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              Top Stores by Revenue
            </CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Store performance in your channel
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4" />
              <p className="text-sm text-slate-600 dark:text-slate-400">Loading stores...</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-center">
              <Store className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                No store data available
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Sales data will appear here once transactions are recorded
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="stroke-slate-200 dark:stroke-slate-700" 
                opacity={0.3}
                horizontal={false}
              />
              <XAxis 
                type="number"
                className="fill-slate-400 dark:fill-slate-500"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
              />
              <YAxis 
                type="category"
                dataKey="name"
                className="fill-slate-600 dark:fill-slate-400"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={120}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(236, 72, 153, 0.1)' }} />
              <Bar 
                dataKey="revenue" 
                radius={[0, 8, 8, 0]}
                maxBarSize={35}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Summary */}
        {!loading && chartData.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Showing {chartData.length} store{chartData.length > 1 ? 's' : ''}</span>
              <span className="font-medium">
                Total: {formatCurrency(chartData.reduce((sum, item) => sum + item.revenue, 0))}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
