'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { BrandLoader } from '@/components/ui/brand-loader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { BarcodeScanner } from '@/components/barcode-scanner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EnterpriseDateRangePicker } from '@/components/ui/enterprise-date-range-picker'
import { Search, Package, RefreshCw, Camera, Eye, CheckCircle, Clock, TrendingUp, Zap, Target, Timer, Award, Truck, User } from 'lucide-react'
import { toast } from 'sonner'
import { getCurrentUser } from '@/lib/auth'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { TablePagination } from '@/components/ui/table-pagination'

interface Order {
  id: string
  orderNumber: string
  waybill: string
  customerName: string
  customerPhone: string
  customerAddress: string
  itemName: string
  quantity: number
  totalAmount: number
  orderStatus: string
  parcelStatus: string
  orderDate: string
  channel: string
  store: string
  courier: string
  is_cancelled?: boolean
}

interface PackedOrder {
  id: string
  waybill: string
  orderNumber?: string  // Added for consistency with Order interface
  itemName: string
  quantity: number
  totalAmount: number
  customerName: string
  packedAt: string
  packedBy: string
}

export default function PackerDashboard() {
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [packedHistory, setPackedHistory] = useState<PackedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedChannel, setSelectedChannel] = useState<string>('All')
  const [statusFilter, setStatusFilter] = useState<string>('Pending')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [packing, setPacking] = useState(false)
  
  // Voice notification states
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [previousOrderCount, setPreviousOrderCount] = useState(0)
  const [announcedOrderIds, setAnnouncedOrderIds] = useState<Set<string>>(new Set())
  const [announcedCancelledIds, setAnnouncedCancelledIds] = useState<Set<string>>(new Set())
  
  // Date filter states - using same format as Admin/Operations dashboard (Date objects, not strings)
  // Default to current month
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [endDate, setEndDate] = useState<Date | null>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 0)
  })
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Get unique channels
  const channels = useMemo(() => {
    const uniqueChannels = Array.from(new Set(pendingOrders.map(o => o.channel)))
    return ['All', ...uniqueChannels.sort()]
  }, [pendingOrders])

  // Performance metrics - filtered by date range
  const todayPacked = useMemo(() => {
    if (!startDate || !endDate) return packedHistory
    
    return packedHistory.filter(p => {
      const packedDate = new Date(p.packedAt)
      return packedDate >= startDate && packedDate <= endDate
    })
  }, [packedHistory, startDate, endDate])

  // Filtered packed history by date range
  const filteredPackedHistory = useMemo(() => {
    if (!startDate || !endDate) return packedHistory
    
    return packedHistory.filter(p => {
      const packedDate = new Date(p.packedAt)
      return packedDate >= startDate && packedDate <= endDate
    })
  }, [packedHistory, startDate, endDate])

  // Pending count filtered by channel
  const pendingCount = useMemo(() => {
    if (selectedChannel === 'All') return pendingOrders.length
    return pendingOrders.filter(o => o.channel === selectedChannel).length
  }, [pendingOrders, selectedChannel])

  // Count cancelled orders in the date range
  const cancelledCount = useMemo(() => {
    return pendingOrders.filter(o => o.is_cancelled === true).length
  }, [pendingOrders])

  const avgPackingTime = useMemo(() => {
    if (todayPacked.length < 2) return 0
    const times = todayPacked.slice(0, 10).map(p => new Date(p.packedAt).getTime())
    const diffs = times.slice(1).map((t, i) => t - times[i])
    const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length
    return Math.round(avg / 1000)
  }, [todayPacked])

  const packsPerHour = useMemo(() => {
    if (avgPackingTime === 0) return 0
    return Math.round(3600 / avgPackingTime)
  }, [avgPackingTime])

  // Voice notification function - Using pre-recorded audio files
  const speakNewOrder = useCallback((channel: string) => {
    if (!voiceEnabled) return
    
    try {
      console.log('[Voice] New order from channel:', channel)
      
      // Map channel name to audio file name (case-insensitive)
      const channelMap: { [key: string]: string } = {
        'shopee': 'shopee',
        'lazada': 'lazada',
        'tiktok': 'tiktok',
        'facebook': 'facebook',
        'physical store': 'physical-store'
      }
      
      const channelLower = channel.toLowerCase()
      const audioFileName = channelMap[channelLower] || 'shopee' // Default to shopee if channel not found
      const audioPath = `/sounds/new-order-${audioFileName}.mp3`
      
      console.log('[Voice] Playing audio:', audioPath)
      
      // Create and play audio
      const audio = new Audio(audioPath)
      audio.volume = 1.0 // Full volume
      
      // Play the audio
      audio.play().catch(error => {
        console.error('[Voice] Error playing audio:', error)
        console.error('[Voice] Audio path:', audioPath)
        // Fallback to text-to-speech if audio fails
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(`New order from ${channel}`)
          utterance.rate = 1.0
          utterance.pitch = 1.0
          utterance.volume = 1.0
          window.speechSynthesis.speak(utterance)
        }
      })
    } catch (error) {
      console.error('[Voice] Error in voice notification:', error)
    }
  }, [voiceEnabled])

  // Voice notification for cancelled orders
  const speakCancelledOrder = useCallback((channel: string) => {
    if (!voiceEnabled) return
    
    try {
      console.log('[Voice] Order cancelled from channel:', channel)
      
      // Map channel name to audio file name (case-insensitive)
      const channelMap: { [key: string]: string } = {
        'shopee': 'shopee',
        'lazada': 'lazada',
        'tiktok': 'tiktok',
        'facebook': 'facebook',
        'physical store': 'physical-store'
      }
      
      const channelLower = channel.toLowerCase()
      const audioFileName = channelMap[channelLower] || 'shopee' // Default to shopee if channel not found
      const audioPath = `/sounds/order-cancelled-${audioFileName}.mp3`
      
      console.log('[Voice] Playing audio:', audioPath)
      
      // Create and play audio
      const audio = new Audio(audioPath)
      audio.volume = 1.0 // Full volume
      
      // Play the audio
      audio.play().catch(error => {
        console.error('[Voice] Error playing cancellation audio:', error)
        console.error('[Voice] Audio path:', audioPath)
        // Fallback to text-to-speech if audio fails
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(`Order cancelled from ${channel}`)
          utterance.rate = 1.0
          utterance.pitch = 1.0
          utterance.volume = 1.0
          window.speechSynthesis.speak(utterance)
        }
      })
    } catch (error) {
      console.error('[Voice] Error in cancellation voice notification:', error)
    }
  }, [voiceEnabled])

  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUser(user)
    fetchData()

    // Auto-refresh every 1 second silently in the background
    const interval = setInterval(() => {
      fetchData(true) // Silent refresh
    }, 1000) // 1 second
    
    return () => clearInterval(interval)
  }, [])

  // Use useMemo for filtering instead of useEffect to prevent unnecessary re-renders
  const filteredOrders = useMemo(() => {
    let filtered = pendingOrders

    // Filter by status
    if (statusFilter === 'Pending') {
      filtered = filtered.filter(order => !order.is_cancelled)
    } else if (statusFilter === 'Cancelled') {
      filtered = filtered.filter(order => order.is_cancelled)
    } else if (statusFilter === 'Packed') {
      // Show packed history - convert PackedOrder to Order format
      filtered = packedHistory.map((packed: PackedOrder) => ({
        id: packed.id,
        orderNumber: packed.orderNumber,
        waybill: packed.waybill,
        customerName: packed.customerName,
        customerPhone: '',
        customerAddress: '',
        itemName: packed.itemName,
        quantity: packed.quantity,
        totalAmount: packed.totalAmount,
        orderStatus: 'Packed',
        parcelStatus: 'PACKED',
        orderDate: packed.packedAt,
        channel: '',
        store: '',
        courier: '',
        is_cancelled: false
      })) as Order[]
    } else if (statusFilter === 'All') {
      // Show all pending orders (both cancelled and not cancelled)
      filtered = pendingOrders
    }

    // Filter by channel (skip for packed orders as they don't have channel info)
    if (selectedChannel !== 'All' && statusFilter !== 'Packed') {
      filtered = filtered.filter(order => order.channel === selectedChannel)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.waybill.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }, [searchTerm, selectedChannel, statusFilter, pendingOrders, packedHistory])

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true)

      // Fetch pending orders
      const queueResponse = await fetch('/api/packer/queue')
      const queueData = await queueResponse.json()

      if (!queueResponse.ok) {
        throw new Error(queueData.error || 'Failed to fetch queue')
      }

      // Only update state if data actually changed (prevents flickering)
      const newQueue = queueData.queue || []
      
      console.log('[Fetch Data] Received queue data:', {
        count: newQueue.length,
        cancelledOrders: newQueue.filter((o: Order) => o.is_cancelled).map((o: Order) => ({
          id: o.id.slice(-6),
          channel: o.channel,
          is_cancelled: o.is_cancelled
        }))
      })
      
      // Detect new orders and cancelled orders
      setPendingOrders(prev => {
        console.log('[State Update] Previous orders:', prev.length, 'New orders:', newQueue.length)
        
        const prevIds = prev.map(o => o.id).join(',')
        const newIds = newQueue.map((o: Order) => o.id).join(',')
        
        // Create a map of previous orders with their cancellation status
        const prevOrderMap = new Map(prev.map(o => [o.id, o]))
        
        // Check if any order's cancellation status changed
        let hasCancellationChange = false
        newQueue.forEach((order: Order) => {
          const prevOrder = prevOrderMap.get(order.id)
          if (prevOrder && prevOrder.is_cancelled !== order.is_cancelled) {
            console.log('[Cancellation Status Changed]', {
              orderId: order.id.slice(-6),
              channel: order.channel,
              wasPrevCancelled: prevOrder.is_cancelled,
              isNowCancelled: order.is_cancelled
            })
            hasCancellationChange = true
          }
        })
        
        console.log('[Change Detection]', {
          idsChanged: prevIds !== newIds,
          lengthChanged: prev.length !== newQueue.length,
          hasCancellationChange,
          willProcess: prevIds !== newIds || prev.length !== newQueue.length || hasCancellationChange
        })
        
        // If data changed (IDs, length, or cancellation status), check for new orders and cancellations
        if (prevIds !== newIds || prev.length !== newQueue.length || hasCancellationChange) {
          const prevIdSet = new Set(prev.map(o => o.id))
          const newOrders = newQueue.filter((order: Order) => !prevIdSet.has(order.id))
          
          // Only announce if this is NOT the first load (prev.length > 0)
          // This prevents voice notification on initial page load
          if (prev.length > 0) {
            // Announce each new order (only if not already announced)
            newOrders.forEach((order: Order) => {
              if (!announcedOrderIds.has(order.id)) {
                console.log('[New Order Detected]', order.channel, order.id.slice(-6))
                // Voice notification (if app is open)
                speakNewOrder(order.channel || 'Unknown')
                
                setAnnouncedOrderIds(prevAnnounced => new Set([...prevAnnounced, order.id]))
              }
            })
          }
          
          // Check for newly cancelled orders (also skip on first load)
          if (prev.length > 0) {
            console.log('[Checking Cancellations] Processing', newQueue.length, 'orders')
            newQueue.forEach((order: Order) => {
              const prevOrder = prevOrderMap.get(order.id)
              
              // Debug logging for ALL orders
              console.log('[Order Check]', {
                orderId: order.id.slice(-6),
                channel: order.channel,
                existsInPrev: !!prevOrder,
                wasPrevCancelled: prevOrder?.is_cancelled,
                isNowCancelled: order.is_cancelled,
                shouldAnnounce: prevOrder && !prevOrder.is_cancelled && order.is_cancelled
              })
              
              // If order exists in previous state but wasn't cancelled, and now it is cancelled
              if (prevOrder && !prevOrder.is_cancelled && order.is_cancelled) {
                console.log('[🔴 CANCELLATION DETECTED!]', {
                  orderId: order.id.slice(-6),
                  channel: order.channel,
                  alreadyAnnounced: announcedCancelledIds.has(order.id)
                })
                
                // Announce cancellation (only if not already announced)
                if (!announcedCancelledIds.has(order.id)) {
                  console.log('[🔊 PLAYING CANCELLATION AUDIO]', order.channel)
                  
                  // Voice notification (if app is open)
                  speakCancelledOrder(order.channel || 'Unknown')
                  
                  setAnnouncedCancelledIds(prevAnnounced => new Set([...prevAnnounced, order.id]))
                } else {
                  console.log('[Voice] Cancellation already announced for:', order.id.slice(-6))
                }
              }
            })
          } else {
            console.log('[Skip Cancellation Check] First load, prev.length =', prev.length)
          }
          
          return newQueue
        }
        
        console.log('[No Changes] Keeping previous state')
        return prev
      })

      // Fetch packed history
      const historyResponse = await fetch('/api/packer/history')
      const historyData = await historyResponse.json()

      if (!historyResponse.ok) {
        throw new Error(historyData.error || 'Failed to fetch history')
      }

      const newHistory = historyData.history || []
      setPackedHistory(prev => {
        const prevIds = prev.map((o: PackedOrder) => o.id).join(',')
        const newIds = newHistory.map((o: PackedOrder) => o.id).join(',')
        return prevIds === newIds ? prev : newHistory
      })

    } catch (error) {
      console.error('Error fetching data:', error)
      if (!silent) {
        toast.error('Failed to load data')
      }
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    let filtered = pendingOrders

    // Filter by status
    if (statusFilter === 'Pending') {
      filtered = filtered.filter(order => !order.is_cancelled)
    } else if (statusFilter === 'Cancelled') {
      filtered = filtered.filter(order => order.is_cancelled)
    } else if (statusFilter === 'Packed') {
      // Show packed history - convert PackedOrder to Order format
      filtered = packedHistory.map((packed: PackedOrder) => ({
        id: packed.id,
        orderNumber: packed.orderNumber,
        waybill: packed.waybill,
        customerName: packed.customerName,
        customerPhone: '',
        customerAddress: '',
        itemName: packed.itemName,
        quantity: packed.quantity,
        totalAmount: packed.totalAmount,
        orderStatus: 'Packed',
        parcelStatus: 'PACKED',
        orderDate: packed.packedAt,
        channel: '',
        store: '',
        courier: '',
        is_cancelled: false
      })) as Order[]
    } else if (statusFilter === 'All') {
      // Show all pending orders (both cancelled and not cancelled)
      filtered = pendingOrders
    }

    // Filter by channel (skip for packed orders as they don't have channel info)
    if (selectedChannel !== 'All' && statusFilter !== 'Packed') {
      filtered = filtered.filter(order => order.channel === selectedChannel)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.waybill.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Note: Filtering logic exists but result is not used
    // TODO: Either implement filtered display or remove this function
  }

  const handleScan = async (waybill: string) => {
    // Find order by waybill
    const order = pendingOrders.find(o => 
      o.waybill.toLowerCase() === waybill.toLowerCase()
    )

    if (!order) {
      toast.error('Order not found in queue')
      throw new Error('Order not found')
    }

    // Check if order is cancelled
    if ((order as any).is_cancelled) {
      toast.error('⚠️ This order is already cancelled', {
        description: 'This order was cancelled by the department and cannot be packed.',
        duration: 4000,
        position: 'top-center',
        style: {
          background: '#ef4444',
          color: 'white',
          fontSize: '16px',
          fontWeight: '600',
          padding: '16px 24px',
        }
      })
      throw new Error('Order cancelled')
    }

    // Auto-pack immediately after scan and WAIT for it to complete
    await handleAutoPackOrder(order)
  }

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order)
    setShowOrderDetails(true)
  }

  const handleAutoPackOrder = async (order: Order) => {
    if (!currentUser) return

    try {
      setPacking(true)

      // OPTIMISTIC UPDATE: Remove from pending immediately
      setPendingOrders(prev => prev.filter(o => o.id !== order.id))

      const response = await fetch(`/api/packer/pack/${order.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          packedBy: currentUser.displayName || currentUser.username
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // ROLLBACK: Add back to pending if failed
        setPendingOrders(prev => [...prev, order])
        throw new Error(data.error || 'Failed to pack order')
      }

      // Show quick success notification (auto-dismiss after 2 seconds)
      toast.success(
        `✅ Successfully packed! Waybill: ${order.waybill}`,
        {
          duration: 2000,
          position: 'top-center',
          style: {
            background: '#10b981',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            padding: '16px 24px',
          }
        }
      )
      
      // Refresh data in background (to sync with server)
      await fetchData(true)

      // Scanner stays open for next scan - no need to reopen
    } catch (error) {
      console.error('Error packing order:', error)
      toast.error('❌ Failed to pack order. Please try again.')
    } finally {
      setPacking(false)
    }
  }

  const handleConfirmPack = async () => {
    if (!selectedOrder) return
    setShowOrderDetails(false)
    await handleAutoPackOrder(selectedOrder)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[600px]">
        <div className="text-center">
          <BrandLoader size="lg" />
          <p className="text-slate-600 dark:text-slate-400 mt-6 text-sm font-medium">
            Loading packer dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 sm:space-y-6 pb-6 sm:pb-8 px-2 sm:px-4 lg:px-6">
      {/* Page Header - Mobile Responsive */}
      <div className="flex flex-col gap-3 pt-4 sm:pt-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-1 sm:mb-2">Packer Dashboard</h1>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
              Scan and pack orders for dispatch
            </p>
          </div>
          
          {/* Desktop: Date picker on the right */}
          <div className="hidden sm:block">
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
        
        {/* Mobile & Desktop: Date picker and buttons row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Mobile: Date picker */}
          <div className="sm:hidden">
            <EnterpriseDateRangePicker
              startDate={startDate}
              endDate={endDate}
              onDateChange={(start, end) => {
                setStartDate(start)
                setEndDate(end)
              }}
            />
          </div>
          
          {/* Buttons Row */}
          <div className="flex items-center gap-3 sm:ml-auto">
            {/* Voice Notification Toggle */}
            <Button 
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              variant={voiceEnabled ? "default" : "outline"}
              className={`flex-1 sm:flex-none h-12 sm:h-10 px-4 sm:px-4 gap-2 text-sm font-semibold ${
                voiceEnabled 
                  ? 'bg-green-600 hover:bg-green-700 text-white border-0' 
                  : 'border-2 border-slate-300 dark:border-slate-600'
              }`}
              title={voiceEnabled ? 'Voice notifications enabled' : 'Voice notifications disabled'}
            >
              <svg className="h-5 w-5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {voiceEnabled ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                )}
              </svg>
              <span>Voice Notification</span>
            </Button>
            
            <Button 
              onClick={() => setScannerOpen(true)} 
              className="flex-1 sm:flex-none h-12 sm:h-10 px-4 sm:px-4 gap-2 text-sm font-semibold border-0 text-white shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:via-orange-700 hover:to-orange-800"
            >
              <Camera className="h-5 w-5 sm:h-4 sm:w-4" />
              <span>Scan Barcode</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards - Mobile Optimized */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {/* Pending Orders */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-600 shadow-lg shadow-orange-500/30 flex-shrink-0">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider">Pending Queue</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 tabular-nums">
                <AnimatedNumber value={pendingCount} />
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-500 flex items-center gap-1 mt-0.5">
                <Package className="h-3 w-3" />
                {pendingCount === 0 ? 'All caught up' : `${pendingCount} ready`}
              </p>
            </div>
          </div>
        </Card>

        {/* Today's Packed */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-600 shadow-lg shadow-green-500/30 flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">Today's Progress</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 tabular-nums">
                <AnimatedNumber value={todayPacked.length} />
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1 mt-0.5">
                <CheckCircle className="h-3 w-3" />
                {todayPacked.length > 0 ? `${todayPacked.length} packed` : 'Start packing'}
              </p>
            </div>
          </div>
        </Card>

        {/* Cancelled Orders */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 shadow-lg shadow-red-500/30 flex-shrink-0">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Cancelled</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100 tabular-nums">
                <AnimatedNumber value={cancelledCount} />
              </p>
              <p className="text-xs text-red-600 dark:text-red-500 flex items-center gap-1 mt-0.5">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {cancelledCount === 0 ? 'No cancellations' : `${cancelledCount} cancelled`}
              </p>
            </div>
          </div>
        </Card>

        {/* Packs Per Hour */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 shadow-lg shadow-purple-500/30 flex-shrink-0">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Productivity</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 tabular-nums">
                {packsPerHour > 0 ? (
                  <><AnimatedNumber value={packsPerHour} />/h</>
                ) : (
                  '--'
                )}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-500 flex items-center gap-1 mt-0.5">
                <Award className="h-3 w-3" />
                {packsPerHour >= 30 ? 'Excellent!' : packsPerHour >= 20 ? 'Great!' : packsPerHour > 0 ? 'Good!' : 'Start packing'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Packing Queue */}
      <Card className="shadow-lg overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-3 sm:p-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  Packing Queue
                </CardTitle>
                <CardDescription className="mt-1 text-xs sm:text-sm">
                  {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'} ready
                </CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap justify-end flex-shrink-0">
                {selectedChannel !== 'All' && (
                  <Badge variant="secondary" className="text-xs whitespace-nowrap">
                    {selectedChannel}
                  </Badge>
                )}
                {searchTerm && (
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    Searching
                  </Badge>
                )}
                {!searchTerm && selectedChannel === 'All' && (
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    All Orders
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {/* Filters */}
          <div className="mb-3 sm:mb-4 space-y-2 sm:space-y-0 sm:flex sm:gap-3 sm:items-center">
            {/* Search - Now First */}
            <div className="sm:w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search order, waybill..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 text-sm"
                />
              </div>
            </div>

            {/* Status Filter - First */}
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-0 focus:border-slate-300 dark:focus:border-slate-600 transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
              >
                <option value="All">All Orders</option>
                <option value="Pending">Pending</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Packed">Packed</option>
              </select>
            </div>

            {/* Channel Filter - Second */}
            <div className="sm:w-48">
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-0 focus:border-slate-300 dark:focus:border-slate-600 transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-10"
              >
                {channels.map(channel => (
                  <option key={channel} value={channel}>
                    {channel === 'All' ? 'All Channels' : channel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400 font-medium">
                {searchTerm ? 'No matching orders' : 'No orders in queue'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                {searchTerm ? 'Try different search' : 'All packed! 🎉'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  {/* Desktop Header - Hidden on Mobile */}
                  <thead className="sticky top-0 z-10 hidden md:table-header-group">
                    <tr className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black">
                      <th className="text-left py-4 px-3 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50" style={{ width: '10%' }}>
                        Date
                      </th>
                      <th className="text-left py-4 px-3 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50" style={{ width: '12%' }}>
                        Name
                      </th>
                      <th className="text-left py-4 px-3 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50" style={{ width: '18%' }}>
                        Address
                      </th>
                      <th className="text-left py-4 px-3 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50" style={{ width: '11%' }}>
                        Contact No.
                      </th>
                      <th className="text-left py-4 px-3 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50" style={{ width: '16%' }}>
                        Items
                      </th>
                      <th className="text-left py-4 px-3 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50" style={{ width: '10%' }}>
                        Price
                      </th>
                      <th className="text-left py-4 px-3 text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50" style={{ width: '11%' }}>
                        Tracking
                      </th>
                      <th className="text-center py-4 px-3 text-[11px] font-bold text-white uppercase tracking-wider" style={{ width: '12%' }}>
                        Action
                      </th>
                    </tr>
                  </thead>

                  {/* Mobile Header - Only Date, Waybill, Action */}
                  <thead className="sticky top-0 z-10 md:hidden">
                    <tr className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black">
                      <th className="text-left py-3 px-3 text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">
                        Date
                      </th>
                      <th className="text-left py-3 px-3 text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50">
                        Waybill Number
                      </th>
                      <th className="text-center py-3 px-3 text-[10px] font-bold text-white uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {paginatedOrders.map((order) => (
                      <tr
                        key={order.id}
                        className={`transition-all duration-200 cursor-pointer ${
                          order.is_cancelled 
                            ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        {/* Desktop View - All Columns */}
                        <td className="py-3 px-3 hidden md:table-cell">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                              {new Date(order.orderDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: '2-digit', 
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {new Date(order.orderDate).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit', 
                                hour12: true
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 hidden md:table-cell">
                          <span className="text-[11px] text-slate-900 dark:text-white font-medium whitespace-nowrap">
                            {order.customerName}
                          </span>
                        </td>
                        <td className="py-3 px-3 hidden md:table-cell">
                          <span className="text-[11px] text-slate-700 dark:text-slate-300 block break-words leading-relaxed">
                            {order.customerAddress}
                          </span>
                        </td>
                        <td className="py-3 px-3 hidden md:table-cell">
                          <span className="text-[11px] font-mono text-slate-900 dark:text-white font-medium whitespace-nowrap">
                            {order.customerPhone}
                          </span>
                        </td>
                        <td className="py-3 px-3 hidden md:table-cell">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-slate-900 dark:text-white font-medium">
                              {order.itemName.replace(/\s*\(\d+\)\s*$/, '')}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              Qty: {order.quantity}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 hidden md:table-cell">
                          <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                            ₱{order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-3 px-3 hidden md:table-cell">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                {order.waybill}
                              </span>
                              {order.is_cancelled && (
                                <Badge className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 font-bold whitespace-nowrap">
                                  CANCELLED
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {order.courier}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 hidden md:table-cell">
                          <div className="flex items-center justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewOrder(order)}
                              className="h-8 px-3 text-[11px] font-medium border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-200 whitespace-nowrap rounded-lg"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                              View Details
                            </Button>
                          </div>
                        </td>

                        {/* Mobile View - Simplified: Date, Waybill, Action */}
                        <td className="py-3 px-3 md:hidden">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                              {new Date(order.orderDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: '2-digit'
                              })}
                            </span>
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {new Date(order.orderDate).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit', 
                                hour12: true
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 md:hidden">
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                              {order.waybill}
                            </span>
                            {order.is_cancelled && (
                              <Badge className="bg-red-600 text-white text-[8px] px-1.5 py-0.5 font-bold whitespace-nowrap w-fit">
                                CANCELLED
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 md:hidden">
                          <div className="flex items-center justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewOrder(order)}
                              className="h-8 px-3 text-[10px] font-medium border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 whitespace-nowrap rounded-lg"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {filteredOrders.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredOrders.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </CardContent>
      </Card>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
      />

      {/* Order Details Dialog (for View button) - Professional Design matching Tracker */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 gap-0 flex flex-col">
          {/* Modal Header with Gradient */}
          <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-8 py-6 border-b border-slate-600 flex-shrink-0">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <span className="text-white">Order Details</span>
              </DialogTitle>
              <p className="text-slate-200 text-sm mt-2 font-medium">
                Review order information before packing
              </p>
            </DialogHeader>
          </div>

          {selectedOrder && (
            <>
              {/* Scrollable Content */}
              <div className="overflow-y-auto flex-1 px-8 py-6">
                <div className="space-y-6">
                  {/* Customer Information Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-600 rounded-lg">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                        Customer Information
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Full Name
                        </p>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">
                          {selectedOrder.customerName}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Phone Number
                        </p>
                        <p className="text-base font-mono font-semibold text-slate-900 dark:text-white">
                          {selectedOrder.customerPhone}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Delivery Address
                        </p>
                        <p className="text-base font-medium text-slate-900 dark:text-white leading-relaxed">
                          {selectedOrder.customerAddress}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Order Information Card */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-6 border border-emerald-100 dark:border-emerald-800">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-emerald-600 rounded-lg">
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                        Order Information
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Order Number
                        </p>
                        <p className="text-base font-mono font-bold text-slate-900 dark:text-white">
                          #{selectedOrder.orderNumber.slice(-6)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Order Date
                        </p>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">
                          {new Date(selectedOrder.orderDate).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Product Items
                        </p>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">
                          {selectedOrder.itemName.replace(/\s*\(\d+\)\s*$/, '')}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          Qty: {selectedOrder.quantity}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Total Amount
                        </p>
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          ₱{selectedOrder.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tracking Information Card */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-100 dark:border-purple-800">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-purple-600 rounded-lg">
                        <Truck className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                        Tracking Information
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Courier Service
                        </p>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">
                          {selectedOrder.courier}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Waybill Number
                        </p>
                        <p className="text-base font-mono font-bold text-purple-600 dark:text-purple-400">
                          {selectedOrder.waybill}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Sales Channel
                        </p>
                        <Badge variant="secondary" className="text-sm font-semibold">
                          {selectedOrder.channel}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Store
                        </p>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">
                          {selectedOrder.store}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer with Action Buttons - Fixed at bottom */}
              <div className="border-t border-slate-200 dark:border-slate-700 px-8 py-6 bg-slate-50 dark:bg-slate-900/50 flex-shrink-0">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                      {selectedOrder.is_cancelled ? 'Order Cancelled' : 'Ready to Pack?'}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {selectedOrder.is_cancelled 
                        ? 'This order has been cancelled and cannot be packed.' 
                        : 'Confirm that all items are packed and ready for dispatch. This action will mark the order as packed.'}
                    </p>
                  </div>
                  
                  {selectedOrder.is_cancelled && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                            Order Cancelled
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                            This order was cancelled by the department and cannot be packed.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowOrderDetails(false)}
                      disabled={packing}
                      className="flex-1 h-12 text-base border-2"
                    >
                      {selectedOrder.is_cancelled ? 'Close' : 'Cancel'}
                    </Button>
                    <Button
                      onClick={handleConfirmPack}
                      disabled={packing || selectedOrder.is_cancelled}
                      className="flex-1 h-12 text-base bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {packing ? (
                        <>
                          <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                          Packing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Mark as Packed
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
