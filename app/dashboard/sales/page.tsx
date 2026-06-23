'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, BarChart3, TrendingUp, DollarSign, Package, Users, ShoppingCart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { apiGet } from '@/lib/api-client';
import { BrandLoader } from '@/components/ui/brand-loader';
import { EnterpriseDateRangePicker } from '@/components/ui/enterprise-date-range-picker';

interface SalesData {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  totalOrders: number;
  dailySales: Array<{
    date: string;
    revenue: number;
    itemsSold: number;
    profit: number;
  }>;
  monthlySales: Array<{
    month: string;
    revenue: number;
    itemsSold: number;
    profit: number;
  }>;
}

export default function SalesAnalyticsPage() {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchSalesData();
  }, [startDate, endDate]); // Fetch when date filter changes

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      // Build API URL with date filters if provided
      let apiUrl = '/api/reports';
      const params = new URLSearchParams();
      
      if (startDate) {
        params.append('startDate', startDate.toISOString());
      }
      if (endDate) {
        params.append('endDate', endDate.toISOString());
      }
      
      if (params.toString()) {
        apiUrl += `?${params.toString()}`;
      }
      
      const data = await apiGet<SalesData>(apiUrl);
      console.log('Sales Analytics Data:', data); // Debug log
      console.log('Total Orders:', data.totalOrders); // Debug log
      console.log('Total Revenue:', data.totalRevenue); // Debug log
      console.log('Daily Sales:', data.dailySales); // Debug log
      console.log('Monthly Sales:', data.monthlySales); // Debug log
      setSalesData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[600px]">
        <div className="text-center">
          <BrandLoader size="lg" />
          <p className="text-slate-600 dark:text-slate-400 mt-6 text-sm font-medium">
            Loading sales data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchSalesData}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!salesData) {
    return (
      <div className="min-h-screen w-full max-w-full overflow-x-hidden p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Sales Analytics
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base">
            Track your sales performance and trends
          </p>
        </div>
        <Card className="w-full max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-xl font-semibold mb-2">No Sales Data Available</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Start making sales to see analytics and insights here.
              </p>
              <Button onClick={fetchSalesData}>Refresh Data</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Calculate profit margin to ensure accuracy
  const calculatedProfitMargin = salesData.totalRevenue > 0 ? salesData.totalProfit / salesData.totalRevenue : 0;

  // Check if there's any sales data - be more lenient
  const hasNoSales = !salesData || (salesData.totalOrders === 0 && salesData.totalRevenue === 0 && (!salesData.dailySales || salesData.dailySales.length === 0));
  
  console.log('Sales Check:', {
    totalOrders: salesData?.totalOrders,
    totalRevenue: salesData?.totalRevenue,
    dailySalesLength: salesData?.dailySales?.length,
    hasNoSales
  }); // Debug log

  if (hasNoSales) {
    return (
      <div className="min-h-screen w-full max-w-full overflow-x-hidden">
        <div className="mb-8 animate-in fade-in-0 slide-in-from-top-4 duration-700">
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Sales Analytics
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base">
            Track your sales performance and trends
          </p>
        </div>
        
        <Card className="w-full max-w-2xl mx-auto border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="bg-blue-100 dark:bg-blue-900/20 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">
                No Sales Data Yet
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                Start processing sales through the Warehouse Dispatch page to see analytics, trends, and insights here.
              </p>
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={() => window.location.href = '/dashboard/pos'}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Go to Warehouse Dispatch
                </Button>
                <Button 
                  variant="outline"
                  onClick={fetchSalesData}
                >
                  Refresh Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden pt-2">
      {/* Page Header */}
      <div className="mb-6 animate-in fade-in-0 slide-in-from-top-4 duration-700 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Sales Analytics
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base">
            Track your sales performance and trends
          </p>
        </div>
        <div className="flex-shrink-0">
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div></div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant={viewMode === 'daily' ? 'default' : 'outline'}
            onClick={() => setViewMode('daily')}
            className="flex items-center gap-2 flex-1 sm:flex-initial bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <Calendar className="h-4 w-4" />
            Daily View
          </Button>
          <Button
            variant={viewMode === 'monthly' ? 'default' : 'outline'}
            onClick={() => setViewMode('monthly')}
            className="flex items-center gap-2 flex-1 sm:flex-initial bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <BarChart3 className="h-4 w-4" />
            Monthly View
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-100">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-50">Total Orders</CardTitle>
            <Package className="h-5 w-5 text-white opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{salesData.totalOrders}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-50">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-white opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(salesData.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-50">Total Cost</CardTitle>
            <Package className="h-5 w-5 text-white opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(salesData.totalCost)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-50">Total Profit</CardTitle>
            <TrendingUp className="h-5 w-5 text-white opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(salesData.totalProfit)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500 to-pink-600 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-pink-50">Profit Margin</CardTitle>
            <Users className="h-5 w-5 text-white opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatPercentage(calculatedProfitMargin)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {viewMode === 'daily' ? (
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-900 dark:text-white">Daily Sales Calendar</CardTitle>
              <div className="flex items-center gap-2">
                <select
                  value={currentMonth.getMonth()}
                  onChange={(e) => {
                    const newMonth = new Date(currentMonth.getFullYear(), parseInt(e.target.value), 1)
                    setCurrentMonth(newMonth)
                  }}
                  className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                    <option key={index} value={index}>{month}</option>
                  ))}
                </select>
                <select
                  value={currentMonth.getFullYear()}
                  onChange={(e) => {
                    const newMonth = new Date(parseInt(e.target.value), currentMonth.getMonth(), 1)
                    setCurrentMonth(newMonth)
                  }}
                  className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i
                    return <option key={year} value={year}>{year}</option>
                  })}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 31 }, (_, i) => {
                const day = i + 1;
                const dayData = salesData.dailySales?.find(d => {
                  const date = new Date(d.date);
                  const matches = date.getDate() === day && date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear();
                  
                  // Debug: Log data for days with sales
                  if (matches && dayData) {
                    console.log(`Day ${day} data:`, dayData);
                  }
                  
                  return matches;
                });

                return (
                  <div
                    key={day}
                    className="aspect-square border rounded-[5px] p-2 flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{day}</div>
                    {dayData ? (
                      <>
                        <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                          {formatCurrency(dayData.revenue)}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          {dayData.orders || 0} {(dayData.orders || 0) === 1 ? 'order' : 'orders'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {dayData.itemsSold} units
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-400 dark:text-slate-600">
                        No sales
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-200">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">Monthly Sales Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center py-20">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-600 dark:text-slate-400">Chart will be recreated here</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
