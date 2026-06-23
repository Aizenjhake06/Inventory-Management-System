/**
 * Email Reports Library
 * Handles generation and sending of automated email reports
 */

import * as XLSX from 'xlsx'
import { formatCurrency, formatNumber } from './utils'

export interface ReportData {
  orders: any[]
  dateRange: string
  totalOrders: number
  totalAmount: number
  totalCOGS: number
  totalProfit: number
  statusBreakdown: {
    pending: number
    inTransit: number
    delivered: number
    cancelled: number
  }
}

export interface EmailAttachment {
  filename: string
  content: Buffer
}

/**
 * Generate Excel report buffer - EXACT COPY from Track Orders Page
 */
export function generateExcelReport(data: ReportData): Buffer {
  const wb = XLSX.utils.book_new()
  const wsData: any[][] = []

  // Calculate financial totals
  const totalQuantity = data.orders.reduce((sum, order) => sum + order.quantity, 0)
  const totalAmount = data.totalAmount
  const totalCOGS = data.totalCOGS
  const totalProfit = data.totalProfit
  const totalProfitMargin = totalAmount > 0 ? ((totalProfit / totalAmount) * 100) : 0

  // Calculate per-status financials
  const getStatusFinancials = (statusOrders: any[]) => {
    const qty = statusOrders.reduce((sum, o) => sum + o.quantity, 0)
    const amt = statusOrders.reduce((sum, o) => sum + o.totalAmount, 0)
    const cogs = amt * 0.6
    const profit = amt - cogs
    const margin = amt > 0 ? ((profit / amt) * 100) : 0
    return { qty, amt, cogs, profit, margin }
  }

  const pendingFinancials = getStatusFinancials(data.orders.filter(o => o.parcelStatus === 'PENDING'))
  const inTransitFinancials = getStatusFinancials(data.orders.filter(o => o.parcelStatus === 'IN TRANSIT'))
  const onDeliveryFinancials = getStatusFinancials(data.orders.filter(o => o.parcelStatus === 'ON DELIVERY'))
  const pickupFinancials = getStatusFinancials(data.orders.filter(o => o.parcelStatus === 'PICKUP'))
  const deliveredFinancials = getStatusFinancials(data.orders.filter(o => o.parcelStatus === 'DELIVERED'))
  const cancelledFinancials = getStatusFinancials(data.orders.filter(o => o.parcelStatus === 'CANCELLED'))
  const detainedFinancials = getStatusFinancials(data.orders.filter(o => o.parcelStatus === 'DETAINED'))
  const problematicFinancials = getStatusFinancials(data.orders.filter(o => o.parcelStatus === 'PROBLEMATIC'))
  const returnedFinancials = getStatusFinancials(data.orders.filter(o => o.parcelStatus === 'RETURNED'))

  // Header Section
  wsData.push(['TRACK ORDERS REPORT - COMPREHENSIVE DATA'])
  wsData.push([`Generated: ${new Date().toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`])
  wsData.push([`Total Orders: ${data.totalOrders}`])
  wsData.push([]) // Empty row

  // Financial Summary Section
  wsData.push(['FINANCIAL SUMMARY'])
  wsData.push(['Metric', 'Value'])
  wsData.push(['Total Quantity', totalQuantity])
  wsData.push(['Total Amount', totalAmount.toFixed(2)])
  wsData.push(['Total COGS', totalCOGS.toFixed(2)])
  wsData.push(['Total Profit', totalProfit.toFixed(2)])
  wsData.push(['Profit Margin', `${totalProfitMargin.toFixed(2)}%`])
  wsData.push([]) // Empty row

  // Status Breakdown Section
  wsData.push(['STATUS BREAKDOWN'])
  wsData.push(['Status', 'Orders', 'Quantity', 'Amount', 'COGS', 'Profit', '% of Total'])
  
  // Calculate percentage of total orders for each status
  const totalOrdersCount = data.totalOrders
  const pendingCount = data.orders.filter(o => o.parcelStatus === 'PENDING').length
  const inTransitCount = data.orders.filter(o => o.parcelStatus === 'IN TRANSIT').length
  const onDeliveryCount = data.orders.filter(o => o.parcelStatus === 'ON DELIVERY').length
  const pickupCount = data.orders.filter(o => o.parcelStatus === 'PICKUP').length
  const deliveredCount = data.orders.filter(o => o.parcelStatus === 'DELIVERED').length
  const cancelledCount = data.orders.filter(o => o.parcelStatus === 'CANCELLED').length
  const detainedCount = data.orders.filter(o => o.parcelStatus === 'DETAINED').length
  const problematicCount = data.orders.filter(o => o.parcelStatus === 'PROBLEMATIC').length
  const returnedCount = data.orders.filter(o => o.parcelStatus === 'RETURNED').length
  
  wsData.push(['Total Orders', totalOrdersCount, totalQuantity, totalAmount.toFixed(2), totalCOGS.toFixed(2), totalProfit.toFixed(2), '100.00%'])
  wsData.push(['Pending', pendingCount, pendingFinancials.qty, pendingFinancials.amt.toFixed(2), pendingFinancials.cogs.toFixed(2), pendingFinancials.profit.toFixed(2), `${totalOrdersCount > 0 ? ((pendingCount / totalOrdersCount) * 100).toFixed(2) : '0.00'}%`])
  wsData.push(['In Transit', inTransitCount, inTransitFinancials.qty, inTransitFinancials.amt.toFixed(2), inTransitFinancials.cogs.toFixed(2), inTransitFinancials.profit.toFixed(2), `${totalOrdersCount > 0 ? ((inTransitCount / totalOrdersCount) * 100).toFixed(2) : '0.00'}%`])
  wsData.push(['On Delivery', onDeliveryCount, onDeliveryFinancials.qty, onDeliveryFinancials.amt.toFixed(2), onDeliveryFinancials.cogs.toFixed(2), onDeliveryFinancials.profit.toFixed(2), `${totalOrdersCount > 0 ? ((onDeliveryCount / totalOrdersCount) * 100).toFixed(2) : '0.00'}%`])
  wsData.push(['Pickup', pickupCount, pickupFinancials.qty, pickupFinancials.amt.toFixed(2), pickupFinancials.cogs.toFixed(2), pickupFinancials.profit.toFixed(2), `${totalOrdersCount > 0 ? ((pickupCount / totalOrdersCount) * 100).toFixed(2) : '0.00'}%`])
  wsData.push(['Delivered', deliveredCount, deliveredFinancials.qty, deliveredFinancials.amt.toFixed(2), deliveredFinancials.cogs.toFixed(2), deliveredFinancials.profit.toFixed(2), `${totalOrdersCount > 0 ? ((deliveredCount / totalOrdersCount) * 100).toFixed(2) : '0.00'}%`])
  wsData.push(['Cancelled', cancelledCount, cancelledFinancials.qty, cancelledFinancials.amt.toFixed(2), cancelledFinancials.cogs.toFixed(2), cancelledFinancials.profit.toFixed(2), `${totalOrdersCount > 0 ? ((cancelledCount / totalOrdersCount) * 100).toFixed(2) : '0.00'}%`])
  wsData.push(['Detained', detainedCount, detainedFinancials.qty, detainedFinancials.amt.toFixed(2), detainedFinancials.cogs.toFixed(2), detainedFinancials.profit.toFixed(2), `${totalOrdersCount > 0 ? ((detainedCount / totalOrdersCount) * 100).toFixed(2) : '0.00'}%`])
  wsData.push(['Problematic', problematicCount, problematicFinancials.qty, problematicFinancials.amt.toFixed(2), problematicFinancials.cogs.toFixed(2), problematicFinancials.profit.toFixed(2), `${totalOrdersCount > 0 ? ((problematicCount / totalOrdersCount) * 100).toFixed(2) : '0.00'}%`])
  wsData.push(['Returned', returnedCount, returnedFinancials.qty, returnedFinancials.amt.toFixed(2), returnedFinancials.cogs.toFixed(2), returnedFinancials.profit.toFixed(2), `${totalOrdersCount > 0 ? ((returnedCount / totalOrdersCount) * 100).toFixed(2) : '0.00'}%`])
  wsData.push([]) // Empty row

  // Detailed Orders Section
  wsData.push(['DETAILED ORDERS'])
  wsData.push(['Waybill No.', 'Date', 'Sales Channel', 'Store', 'Product', 'Qty', 'Amount', 'COGS', 'Profit', 'Margin', 'Courier', 'Payment Status', 'Parcel Status'])
  
  data.orders.forEach((order) => {
    const cogs = order.totalAmount * 0.6
    const profit = order.totalAmount - cogs
    const margin = order.totalAmount > 0 ? ((profit / order.totalAmount) * 100) : 0
    
    wsData.push([
      order.waybill || order.trackingNumber || '-',
      new Date(order.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      order.salesChannel || order.department || 'N/A',
      order.store || order.customerAddress || 'N/A',
      order.itemName || 'N/A',
      order.quantity,
      order.totalAmount.toFixed(2),
      cogs.toFixed(2),
      profit.toFixed(2),
      `${margin.toFixed(2)}%`,
      order.courier || '-',
      (order.paymentStatus || 'PENDING').toUpperCase(),
      order.parcelStatus || 'PENDING'
    ])
  })

  // Create worksheet from data
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // Waybill
    { wch: 12 }, // Date
    { wch: 15 }, // Sales Channel
    { wch: 15 }, // Store
    { wch: 30 }, // Product
    { wch: 8 },  // Qty
    { wch: 15 }, // Amount
    { wch: 15 }, // COGS
    { wch: 15 }, // Profit
    { wch: 10 }, // Margin
    { wch: 12 }, // Courier
    { wch: 15 }, // Payment Status
    { wch: 15 }  // Parcel Status
  ]

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Track Orders Report')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

/**
 * Generate PDF report - DISABLED (requires puppeteer)
 * COMMENTED OUT: Puppeteer is not installed to reduce deployment size
 * To enable: npm install puppeteer and uncomment this function
 */
export async function generatePDFReport(data: ReportData): Promise<Buffer> {
  // PDF generation temporarily disabled - puppeteer not installed
  throw new Error('PDF generation is currently disabled. Use Excel export instead.')
  
  /* COMMENTED OUT - REQUIRES PUPPETEER
  const puppeteer = require('puppeteer')
  
  const totalQuantity = data.orders.reduce((sum, order) => sum + order.quantity, 0)
  const totalProfitMargin = data.totalAmount > 0 ? ((data.totalProfit / data.totalAmount) * 100) : 0

  // Calculate per-status financials
  const getStatusFinancials = (statusOrders: any[]) => {
    const qty = statusOrders.reduce((sum, o) => sum + o.quantity, 0)
    const amt = statusOrders.reduce((sum, o) => sum + o.totalAmount, 0)
    const cogs = amt * 0.6
    const profit = amt - cogs
    const margin = amt > 0 ? ((profit / amt) * 100) : 0
    return { qty, amt, cogs, profit, margin }
  }

  const pendingFinancials = getStatusFinancials(data.orders.filter(o => o.parcelStatus === 'PENDING'))
  const inTransitFinancials = getStatusFinancials(data.orders.filter(o => o.parcelStatus === 'IN TRANSIT'))
  const onDeliveryFinancials = getStatusFinancials(data.orders.filter(o => o.parcelStatus === 'ON DELIVERY'))
  const pickupFinancials = getStatusFinancials(data.orders.filter(o => o.parcelStatus === 'PICKUP'))
  const deliveredFinancials = getStatusFinancials(data.orders.filter(o => o.parcelStatus === 'DELIVERED'))
  const cancelledFinancials = getStatusFinancials(data.orders.filter(o => o.parcelStatus === 'CANCELLED'))
  const detainedFinancials = getStatusFinancials(data.orders.filter(o => o.parcelStatus === 'DETAINED'))
  const problematicFinancials = getStatusFinancials(data.orders.filter(o => o.parcelStatus === 'PROBLEMATIC'))
  const returnedFinancials = getStatusFinancials(data.orders.filter(o => o.parcelStatus === 'RETURNED'))

  // Count orders by status
  const pendingCount = data.orders.filter(o => o.parcelStatus === 'PENDING').length
  const inTransitCount = data.orders.filter(o => o.parcelStatus === 'IN TRANSIT').length
  const onDeliveryCount = data.orders.filter(o => o.parcelStatus === 'ON DELIVERY').length
  const pickupCount = data.orders.filter(o => o.parcelStatus === 'PICKUP').length
  const deliveredCount = data.orders.filter(o => o.parcelStatus === 'DELIVERED').length
  const cancelledCount = data.orders.filter(o => o.parcelStatus === 'CANCELLED').length
  const detainedCount = data.orders.filter(o => o.parcelStatus === 'DETAINED').length
  const problematicCount = data.orders.filter(o => o.parcelStatus === 'PROBLEMATIC').length
  const returnedCount = data.orders.filter(o => o.parcelStatus === 'RETURNED').length

  // Generate HTML - EXACT COPY from Track Orders page
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Track Orders Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { margin: 0; size: auto; }
        @media print {
          @page { margin: 0; }
          body { margin: 1cm; }
        }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          padding: 20px; 
          background: white;
          color: #1e293b;
        }
        .header {
          text-align: center;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 4px solid #ec540e;
        }
        .page-title {
          font-size: 26px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 12px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .meta { 
          color: #64748b; 
          font-size: 12px;
          line-height: 1.6;
        }
        .meta strong { color: #1e293b; font-weight: 700; }
        
        .financial-summary {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-bottom: 20px;
          padding: 15px;
          background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
          border-radius: 8px;
          border: 2px solid #f59e0b;
        }
        .financial-card {
          text-align: center;
          padding: 10px;
          background: white;
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .financial-card .label {
          font-size: 9px;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 6px;
        }
        .financial-card .value {
          font-size: 18px;
          font-weight: 800;
          color: #1e293b;
        }
        .financial-card.profit .value { color: #059669; }
        .financial-card.margin .value { color: #0284c7; }
        
        .summary { 
          display: grid; 
          grid-template-columns: repeat(5, 1fr); 
          gap: 8px; 
          margin-bottom: 20px; 
        }
        .summary-card { 
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 12px 8px;
          border-radius: 8px;
          text-align: center;
          border: 2px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .summary-card .number { 
          font-size: 24px; 
          font-weight: 800; 
          color: #1e293b;
          margin-bottom: 6px;
        }
        .summary-card .label { 
          font-size: 9px; 
          color: #64748b; 
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 8px;
        }
        .summary-card .mini-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 3px;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #e2e8f0;
        }
        .summary-card .mini-stat {
          font-size: 7px;
          color: #94a3b8;
          font-weight: 600;
        }
        .summary-card .mini-stat .mini-value {
          font-size: 8px;
          color: #475569;
          font-weight: 700;
          display: block;
          margin-top: 2px;
        }
        
        .summary-row-2 {
          display: grid; 
          grid-template-columns: repeat(5, 1fr); 
          gap: 8px; 
          margin-bottom: 20px;
        }
        
        table { 
          width: 100%; 
          border-collapse: separate;
          border-spacing: 0;
          margin-top: 20px; 
          font-size: 9px;
          border: 1px solid #cbd5e1;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        thead {
          background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
        }
        th { 
          color: white; 
          padding: 10px 6px; 
          text-align: left; 
          font-size: 8px; 
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          border-right: 1px solid rgba(255,255,255,0.15);
          border-bottom: 2px solid #1e40af;
        }
        th:last-child { border-right: none; }
        td { 
          padding: 8px 6px; 
          border-bottom: 1px solid #e2e8f0;
          border-right: 1px solid #f1f5f9;
          font-size: 9px;
          color: #334155;
          line-height: 1.4;
        }
        td:last-child { border-right: none; }
        tbody tr:nth-child(even) { background-color: #f8fafc; }
        tbody tr:hover { background-color: #eff6ff; }
        tbody tr:last-child td { border-bottom: none; }
        
        .footer {
          margin-top: 25px;
          padding-top: 15px;
          border-top: 2px solid #e2e8f0;
          text-align: center;
          color: #94a3b8;
          font-size: 10px;
        }
        .footer strong {
          color: #1e293b;
          font-size: 11px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="page-title">Track Orders Report</h1>
        <div class="meta">
          <strong>Generated:</strong> ${new Date().toLocaleString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}<br>
          <strong>Total Orders:</strong> ${data.totalOrders} | 
          <strong>Report Type:</strong> Comprehensive Track Orders
        </div>
      </div>

      <div class="financial-summary">
        <div class="financial-card">
          <div class="label">Total Quantity</div>
          <div class="value">${totalQuantity}</div>
        </div>
        <div class="financial-card">
          <div class="label">Total Amount</div>
          <div class="value">${formatCurrency(data.totalAmount)}</div>
        </div>
        <div class="financial-card">
          <div class="label">Total COGS</div>
          <div class="value">${formatCurrency(data.totalCOGS)}</div>
        </div>
        <div class="financial-card profit">
          <div class="label">Total Profit</div>
          <div class="value">${formatCurrency(data.totalProfit)}</div>
        </div>
        <div class="financial-card margin">
          <div class="label">Profit Margin</div>
          <div class="value">${totalProfitMargin.toFixed(2)}%</div>
        </div>
      </div>
      
      <div class="summary">
        <div class="summary-card">
          <div class="number">${data.totalOrders}</div>
          <div class="label">Total Orders</div>
          <div class="mini-stats">
            <div class="mini-stat">Qty: <span class="mini-value">${totalQuantity}</span></div>
            <div class="mini-stat">Amt: <span class="mini-value">${formatCurrency(data.totalAmount).replace('₱', 'P')}</span></div>
            <div class="mini-stat">Profit: <span class="mini-value">${formatCurrency(data.totalProfit).replace('₱', 'P')}</span></div>
            <div class="mini-stat">% of Total: <span class="mini-value">100.0%</span></div>
          </div>
        </div>
        <div class="summary-card">
          <div class="number">${pendingCount}</div>
          <div class="label">Pending</div>
          <div class="mini-stats">
            <div class="mini-stat">Qty: <span class="mini-value">${pendingFinancials.qty}</span></div>
            <div class="mini-stat">Amt: <span class="mini-value">${formatCurrency(pendingFinancials.amt).replace('₱', 'P')}</span></div>
            <div class="mini-stat">Profit: <span class="mini-value">${formatCurrency(pendingFinancials.profit).replace('₱', 'P')}</span></div>
            <div class="mini-stat">% of Total: <span class="mini-value">${data.totalOrders > 0 ? ((pendingCount / data.totalOrders) * 100).toFixed(1) : '0.0'}%</span></div>
          </div>
        </div>
        <div class="summary-card">
          <div class="number">${inTransitCount}</div>
          <div class="label">In Transit</div>
          <div class="mini-stats">
            <div class="mini-stat">Qty: <span class="mini-value">${inTransitFinancials.qty}</span></div>
            <div class="mini-stat">Amt: <span class="mini-value">${formatCurrency(inTransitFinancials.amt).replace('₱', 'P')}</span></div>
            <div class="mini-stat">Profit: <span class="mini-value">${formatCurrency(inTransitFinancials.profit).replace('₱', 'P')}</span></div>
            <div class="mini-stat">% of Total: <span class="mini-value">${data.totalOrders > 0 ? ((inTransitCount / data.totalOrders) * 100).toFixed(1) : '0.0'}%</span></div>
          </div>
        </div>
        <div class="summary-card">
          <div class="number">${onDeliveryCount}</div>
          <div class="label">On Delivery</div>
          <div class="mini-stats">
            <div class="mini-stat">Qty: <span class="mini-value">${onDeliveryFinancials.qty}</span></div>
            <div class="mini-stat">Amt: <span class="mini-value">${formatCurrency(onDeliveryFinancials.amt).replace('₱', 'P')}</span></div>
            <div class="mini-stat">Profit: <span class="mini-value">${formatCurrency(onDeliveryFinancials.profit).replace('₱', 'P')}</span></div>
            <div class="mini-stat">% of Total: <span class="mini-value">${data.totalOrders > 0 ? ((onDeliveryCount / data.totalOrders) * 100).toFixed(1) : '0.0'}%</span></div>
          </div>
        </div>
        <div class="summary-card">
          <div class="number">${pickupCount}</div>
          <div class="label">Pickup</div>
          <div class="mini-stats">
            <div class="mini-stat">Qty: <span class="mini-value">${pickupFinancials.qty}</span></div>
            <div class="mini-stat">Amt: <span class="mini-value">${formatCurrency(pickupFinancials.amt).replace('₱', 'P')}</span></div>
            <div class="mini-stat">Profit: <span class="mini-value">${formatCurrency(pickupFinancials.profit).replace('₱', 'P')}</span></div>
            <div class="mini-stat">% of Total: <span class="mini-value">${data.totalOrders > 0 ? ((pickupCount / data.totalOrders) * 100).toFixed(1) : '0.0'}%</span></div>
          </div>
        </div>
      </div>

      <div class="summary-row-2">
        <div class="summary-card">
          <div class="number">${deliveredCount}</div>
          <div class="label">Delivered</div>
          <div class="mini-stats">
            <div class="mini-stat">Qty: <span class="mini-value">${deliveredFinancials.qty}</span></div>
            <div class="mini-stat">Amt: <span class="mini-value">${formatCurrency(deliveredFinancials.amt).replace('₱', 'P')}</span></div>
            <div class="mini-stat">Profit: <span class="mini-value">${formatCurrency(deliveredFinancials.profit).replace('₱', 'P')}</span></div>
            <div class="mini-stat">% of Total: <span class="mini-value">${data.totalOrders > 0 ? ((deliveredCount / data.totalOrders) * 100).toFixed(1) : '0.0'}%</span></div>
          </div>
        </div>
        <div class="summary-card">
          <div class="number">${cancelledCount}</div>
          <div class="label">Cancelled</div>
          <div class="mini-stats">
            <div class="mini-stat">Qty: <span class="mini-value">${cancelledFinancials.qty}</span></div>
            <div class="mini-stat">Amt: <span class="mini-value">${formatCurrency(cancelledFinancials.amt).replace('₱', 'P')}</span></div>
            <div class="mini-stat">Profit: <span class="mini-value">${formatCurrency(cancelledFinancials.profit).replace('₱', 'P')}</span></div>
            <div class="mini-stat">% of Total: <span class="mini-value">${data.totalOrders > 0 ? ((cancelledCount / data.totalOrders) * 100).toFixed(1) : '0.0'}%</span></div>
          </div>
        </div>
        <div class="summary-card">
          <div class="number">${detainedCount}</div>
          <div class="label">Detained</div>
          <div class="mini-stats">
            <div class="mini-stat">Qty: <span class="mini-value">${detainedFinancials.qty}</span></div>
            <div class="mini-stat">Amt: <span class="mini-value">${formatCurrency(detainedFinancials.amt).replace('₱', 'P')}</span></div>
            <div class="mini-stat">Profit: <span class="mini-value">${formatCurrency(detainedFinancials.profit).replace('₱', 'P')}</span></div>
            <div class="mini-stat">% of Total: <span class="mini-value">${data.totalOrders > 0 ? ((detainedCount / data.totalOrders) * 100).toFixed(1) : '0.0'}%</span></div>
          </div>
        </div>
        <div class="summary-card">
          <div class="number">${problematicCount}</div>
          <div class="label">Problematic</div>
          <div class="mini-stats">
            <div class="mini-stat">Qty: <span class="mini-value">${problematicFinancials.qty}</span></div>
            <div class="mini-stat">Amt: <span class="mini-value">${formatCurrency(problematicFinancials.amt).replace('₱', 'P')}</span></div>
            <div class="mini-stat">Profit: <span class="mini-value">${formatCurrency(problematicFinancials.profit).replace('₱', 'P')}</span></div>
            <div class="mini-stat">% of Total: <span class="mini-value">${data.totalOrders > 0 ? ((problematicCount / data.totalOrders) * 100).toFixed(1) : '0.0'}%</span></div>
          </div>
        </div>
        <div class="summary-card">
          <div class="number">${returnedCount}</div>
          <div class="label">Returned</div>
          <div class="mini-stats">
            <div class="mini-stat">Qty: <span class="mini-value">${returnedFinancials.qty}</span></div>
            <div class="mini-stat">Amt: <span class="mini-value">${formatCurrency(returnedFinancials.amt).replace('₱', 'P')}</span></div>
            <div class="mini-stat">Profit: <span class="mini-value">${formatCurrency(returnedFinancials.profit).replace('₱', 'P')}</span></div>
            <div class="mini-stat">% of Total: <span class="mini-value">${data.totalOrders > 0 ? ((returnedCount / data.totalOrders) * 100).toFixed(1) : '0.0'}%</span></div>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Waybill No.</th>
            <th>Date</th>
            <th>Channel</th>
            <th>Store</th>
            <th>Product</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Amount</th>
            <th style="text-align: right;">COGS</th>
            <th>Courier</th>
            <th>Payment</th>
            <th>Status</th>
            <th>Parcel</th>
          </tr>
        </thead>
        <tbody>
          ${data.orders.map(order => {
            const cogs = order.totalAmount * 0.6
            return `
            <tr>
              <td style="font-weight: 600; font-family: 'Courier New', monospace; color: #000000; font-size: 8px;">${order.waybill || order.trackingNumber || '-'}</td>
              <td style="color: #000000; font-size: 8px; white-space: nowrap;">${new Date(order.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
              <td style="font-weight: 600; color: #000000; font-size: 8px;">${order.salesChannel || order.department || 'N/A'}</td>
              <td style="color: #000000; font-size: 8px;">${order.store || order.customerAddress || 'N/A'}</td>
              <td style="font-weight: 500; color: #000000; font-size: 8px; max-width: 150px; overflow: hidden; text-overflow: ellipsis;">${order.itemName}</td>
              <td style="text-align: center; font-weight: 700; color: #000000; font-size: 8px;">${order.quantity}</td>
              <td style="text-align: right; font-weight: 600; color: #000000; font-size: 8px; white-space: nowrap;">${formatCurrency(order.totalAmount)}</td>
              <td style="text-align: right; font-weight: 500; color: #000000; font-size: 8px; white-space: nowrap;">${formatCurrency(cogs)}</td>
              <td style="color: #000000; font-size: 8px;">${order.courier || '-'}</td>
              <td style="font-weight: 600; color: #000000; font-size: 8px;">${(order.paymentStatus || 'PENDING').toUpperCase()}</td>
              <td style="font-weight: 600; color: #000000; font-size: 8px;">${(order.orderStatus || 'PACKED').toUpperCase()}</td>
              <td style="font-weight: 600; color: #000000; font-size: 8px;">${order.parcelStatus || 'PENDING'}</td>
            </tr>
          `}).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p><strong>Vertex Professional Inventory Management System</strong></p>
        <p>Track Orders Report - Confidential Document</p>
      </div>
    </body>
    </html>
  `

  // Convert HTML to PDF using puppeteer directly (same as browser print)
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })
  
  const pdfBuffer = await page.pdf({
    format: 'A3',
    landscape: true,
    printBackground: true,
    margin: {
      top: '0.3cm',
      right: '0.3cm',
      bottom: '0.3cm',
      left: '0.3cm'
    }
  })
  
  await browser.close()
  return Buffer.from(pdfBuffer)
  */
}
}

/**
 * Generate email HTML template - Professional and concise
 */
export function generateEmailTemplate(data: ReportData): string {
  const deliveryRate = data.totalOrders > 0 
    ? ((data.statusBreakdown.delivered / data.totalOrders) * 100).toFixed(1)
    : '0.0'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
        .summary { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .stat { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
        .stat:last-child { border-bottom: none; }
        .stat-label { color: #64748b; font-weight: 600; }
        .stat-value { color: #1e293b; font-weight: bold; }
        .attachments { background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">TRACK ORDERS REPORT</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">${data.dateRange}</p>
        </div>
        
        <div class="content">
          <p style="margin-bottom: 20px;">Please find attached your Track Orders report with complete order details and financial summary.</p>
          
          <div class="summary">
            <h3 style="margin-top: 0; color: #1e293b; font-size: 16px;">📦 Summary</h3>
            <div class="stat">
              <span class="stat-label">Total Orders</span>
              <span class="stat-value">${data.totalOrders}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Total Amount</span>
              <span class="stat-value">${formatCurrency(data.totalAmount)}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Total Profit</span>
              <span class="stat-value">${formatCurrency(data.totalProfit)}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Delivered</span>
              <span class="stat-value">${data.statusBreakdown.delivered} (${deliveryRate}%)</span>
            </div>
            <div class="stat">
              <span class="stat-label">In Transit</span>
              <span class="stat-value">${data.statusBreakdown.inTransit}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Pending</span>
              <span class="stat-value">${data.statusBreakdown.pending}</span>
            </div>
          </div>

          <div class="attachments">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #1e293b;">📎 Attachments:</p>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Track_Orders_Report.xlsx - Detailed Excel report</li>
              <li>Track_Orders_Report.pdf - Printable PDF report</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/track-orders" class="button">
              View Online Dashboard
            </a>
          </div>
        </div>

        <div class="footer">
          <p>Automated report from Vertex Inventory Management System</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </body>
    </html>
  `
}
