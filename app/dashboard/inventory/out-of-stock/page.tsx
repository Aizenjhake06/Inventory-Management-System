"use client"

import { useEffect, useState } from "react"
import { BrandLoader } from '@/components/ui/brand-loader'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Search, Pencil, Trash2, PackagePlus, XCircle, Package, DollarSign, CheckCircle2, X, AlertTriangle, AlertCircle } from "lucide-react"
import type { InventoryItem } from "@/lib/types"
import { cn, formatCurrency, formatNumber } from "@/lib/utils"
import { EditItemDialog } from "@/components/edit-item-dialog"
import { apiGet, apiPost, apiDelete } from "@/lib/api-client"
import { getCurrentUser } from "@/lib/auth"
import { toast } from "sonner"
import { TablePagination } from "@/components/ui/table-pagination"

export default function OutOfStockPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [restockDialogOpen, setRestockDialogOpen] = useState(false)
  const [selectedRestockItem, setSelectedRestockItem] = useState<InventoryItem | null>(null)
  const [restockAmount, setRestockAmount] = useState(0)
  const [restockReason, setRestockReason] = useState("")
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  
  // Resizable columns state
  const [columnWidths, setColumnWidths] = useState({
    product: 240,
    category: 180,
    reorder: 100,
    cost: 100,
    price: 100,
    actions: 130
  })
  const [resizing, setResizing] = useState<string | null>(null)
  const [startX, setStartX] = useState(0)
  const [startWidth, setStartWidth] = useState(0)
  
  // Delete confirmation modal state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Handle column resize
  const handleMouseDown = (e: React.MouseEvent, column: string) => {
    setResizing(column)
    setStartX(e.clientX)
    setStartWidth(columnWidths[column as keyof typeof columnWidths])
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return
      
      const diff = e.clientX - startX
      const newWidth = Math.max(80, startWidth + diff) // Minimum 80px
      
      setColumnWidths(prev => ({
        ...prev,
        [resizing]: newWidth
      }))
    }

    const handleMouseUp = () => {
      setResizing(null)
    }

    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [resizing, startX, startWidth])

  useEffect(() => {
    fetchItems()
  }, [])

  useEffect(() => {
    let filtered = items.filter((item) => item.quantity === 0)

    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower),
      )
    }

    // Sort alphabetically by name
    filtered.sort((a, b) => a.name.localeCompare(b.name))

    setFilteredItems(filtered)
  }, [search, items])

  // Pagination calculations
  const totalPages = Math.ceil(filteredItems.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedItems = filteredItems.slice(startIndex, endIndex)

  async function fetchItems() {
    try {
      const data = await apiGet<InventoryItem[]>("/api/items")
      const itemsArray = Array.isArray(data) ? data : []
      setItems(itemsArray)
    } catch (error) {
      console.error("[Out of Stock] Error fetching items:", error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      setIsDeleting(true)
      await apiDelete(`/api/items/${id}`)
      fetchItems()
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    } catch (error) {
      console.error("Error deleting item:", error)
    } finally {
      setIsDeleting(false)
    }
  }
  
  function openDeleteDialog(id: string, name: string) {
    setItemToDelete({ id, name })
    setDeleteDialogOpen(true)
  }

  function handleEdit(item: InventoryItem) {
    setSelectedItem(item)
    setEditDialogOpen(true)
  }

  function handleRestock(item: InventoryItem) {
    setSelectedRestockItem(item)
    const suggestedAmount = Math.max(item.reorderLevel * 2, 10)
    setRestockAmount(suggestedAmount)
    setRestockReason("")
    setRestockDialogOpen(true)
  }

  async function handleRestockSubmit() {
    if (!selectedRestockItem || restockAmount <= 0 || !restockReason) return

    try {
      await apiPost(`/api/items/${selectedRestockItem.id}/restock`, { 
        amount: restockAmount, 
        reason: restockReason 
      })

      setRestockDialogOpen(false)
      setSelectedRestockItem(null)
      setRestockReason("")
      fetchItems()
      toast.success("Item restocked successfully!")
    } catch (error) {
      console.error("Error restocking item:", error)
      toast.error("Failed to restock item")
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[600px]">
        <div className="text-center">
          <BrandLoader size="lg" />
          <p className="text-slate-600 dark:text-slate-400 mt-6 text-sm font-medium">
            Loading out of stock items...
          </p>
        </div>
      </div>
    )
  }

  const outOfStockItems = items.filter((item) => item.quantity === 0)
  const totalLostRevenue = outOfStockItems.reduce((sum, item) => sum + (item.sellingPrice * item.reorderLevel), 0)
  const highValueItems = outOfStockItems.filter(item => item.sellingPrice >= 500).length

  return (
    <div className="max-w-[1400px] mx-auto py-5 space-y-6">
      {/* Page Header - Professional */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold gradient-text mb-1">
          Out of Stock Items
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Items that are completely out of stock and need immediate restocking
        </p>
      </div>

      {/* Stats Cards - Professional Design */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Out of Stock */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 shadow-lg shadow-red-500/30 flex-shrink-0">
              <XCircle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Total Out of Stock</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100 tabular-nums">
                {outOfStockItems.length}
              </p>
            </div>
          </div>
        </Card>

        {/* High Value Items */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-600 shadow-lg shadow-amber-500/30 flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">High Value Items</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 tabular-nums">
                {highValueItems}
              </p>
            </div>
          </div>
        </Card>

        {/* Potential Lost Revenue */}
        <Card className="p-5 border-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30 flex-shrink-0">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Potential Lost Revenue</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 tabular-nums">
                {formatCurrency(totalLostRevenue)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search Bar - Professional */}
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="pt-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search out of stock products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20"
            />
            {search && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing <span className="font-bold text-slate-900 dark:text-white">{filteredItems.length}</span> of <span className="font-semibold">{outOfStockItems.length}</span> items
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sorted alphabetically (A-Z)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Table Card - Professional */}
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900 dark:text-white">
              <div className="p-2 rounded-lg bg-red-600 shadow-sm">
                <XCircle className="h-5 w-5 text-white" />
              </div>
              <span>Out of Stock Items</span>
            </CardTitle>
            <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-0 text-sm px-3 py-1 font-bold">
              {filteredItems.length} items
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Out of Stock Items!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
                {search
                  ? "No items match your search"
                  : "Excellent! All your inventory items are in stock."}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Scroll Hint */}
              <div className="md:hidden px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                  <span>←</span>
                  <span>Swipe to see all columns • Tap row to highlight</span>
                  <span>→</span>
                </p>
              </div>

              {/* Desktop Resize Hint */}
              <div className="hidden md:block px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                  <span>💡</span>
                  <span>Drag column borders to resize • Expand Product column to see full names</span>
                </p>
              </div>

              <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: Object.values(columnWidths).reduce((a, b) => a + b, 0) }}>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-black dark:bg-black">
                    <th className="py-3 px-4 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 relative" style={{ width: columnWidths.product }}>
                      Product
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
                        onMouseDown={(e) => handleMouseDown(e, 'product')}
                      />
                    </th>
                    <th className="py-3 px-4 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 relative" style={{ width: columnWidths.category }}>
                      Category
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
                        onMouseDown={(e) => handleMouseDown(e, 'category')}
                      />
                    </th>
                    <th className="py-3 px-4 text-right text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 relative" style={{ width: columnWidths.reorder }}>
                      Reorder
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
                        onMouseDown={(e) => handleMouseDown(e, 'reorder')}
                      />
                    </th>
                    <th className="py-3 px-4 text-right text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 relative" style={{ width: columnWidths.cost }}>
                      Cost
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
                        onMouseDown={(e) => handleMouseDown(e, 'cost')}
                      />
                    </th>
                    <th className="py-3 px-4 text-right text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 relative" style={{ width: columnWidths.price }}>
                      Price
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
                        onMouseDown={(e) => handleMouseDown(e, 'price')}
                      />
                    </th>
                    {getCurrentUser()?.role === 'admin' && (
                      <th className="py-3 px-4 text-center text-[10px] font-bold text-white uppercase tracking-wider" style={{ width: columnWidths.actions }}>
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {paginatedItems.map((item) => {
                      const isSelected = selectedRowId === item.id
                      
                      return (
                        <tr 
                          key={item.id} 
                          onClick={() => setSelectedRowId(isSelected ? null : item.id)}
                          className={
                            isSelected
                              ? "transition-all duration-200 cursor-pointer bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500 dark:ring-blue-400 ring-inset"
                              : "transition-all duration-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30"
                          }
                        >
                        <td className="py-3 px-4" style={{ width: columnWidths.product }}>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30">
                              <Package className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={cn(
                                "text-xs font-semibold break-words",
                                isSelected ? "text-blue-900 dark:text-blue-100" : "text-slate-900 dark:text-white"
                              )} title={item.name}>
                                {item.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800 text-[10px] px-1 py-0">
                                  OUT
                                </Badge>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {item.salesChannel || 'N/A'} - {item.store || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4" style={{ width: columnWidths.category }}>
                          <span className={cn(
                            "text-xs block break-words",
                            isSelected ? "text-blue-900 dark:text-blue-100 font-medium" : "text-slate-600 dark:text-slate-400"
                          )} title={item.category}>
                            {item.category}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap" style={{ width: columnWidths.reorder }}>
                          <span className={cn(
                            "text-xs font-medium tabular-nums",
                            isSelected ? "text-blue-900 dark:text-blue-100" : "text-slate-800 dark:text-slate-200"
                          )}>
                            {formatNumber(item.reorderLevel)}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap" style={{ width: columnWidths.cost }}>
                          <span className={cn(
                            "text-xs font-medium tabular-nums",
                            isSelected ? "text-blue-900 dark:text-blue-100" : "text-slate-800 dark:text-slate-200"
                          )}>
                            {formatCurrency(item.costPrice)}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap" style={{ width: columnWidths.price }}>
                          <span className={cn(
                            "text-xs font-semibold tabular-nums",
                            isSelected ? "text-blue-900 dark:text-blue-100" : "text-slate-900 dark:text-white"
                          )}>
                            {formatCurrency(item.sellingPrice)}
                          </span>
                        </td>

                        {getCurrentUser()?.role === 'admin' && (
                          <td className="py-3 px-4 whitespace-nowrap" style={{ width: columnWidths.actions }}>
                            <TooltipProvider>
                              <div className="flex justify-center gap-0.5">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRestock(item)
                                      }}
                                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 h-9 w-9 p-0"
                                    >
                                      <PackagePlus className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Restock</p>
                                  </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleEdit(item)
                                      }}
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 h-9 w-9 p-0"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Edit</p>
                                  </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openDeleteDialog(item.id, item.name)
                                      }}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-9 w-9 p-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          </td>
                        )}
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {filteredItems.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredItems.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </CardContent>
      </Card>

      {selectedItem && (
        <EditItemDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          item={selectedItem}
          onSuccess={fetchItems}
        />
      )}

      {selectedRestockItem && (
        <Dialog open={restockDialogOpen} onOpenChange={setRestockDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
            {/* Professional Header with Dark Gradient */}
            <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-8 py-6 border-b border-slate-600 flex-shrink-0">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-white text-lg font-medium">Restock Product</span>
                    <span className="text-white text-xl font-bold capitalize">{selectedRestockItem.name.toLowerCase()}</span>
                  </div>
                </DialogTitle>
                <DialogDescription className="text-slate-200 text-sm mt-2 font-medium">
                  This item is currently out of stock. Reorder level: {selectedRestockItem.reorderLevel}
                </DialogDescription>
              </DialogHeader>
            </div>
            
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 min-h-0">
              <div>
                <Label htmlFor="restock-amount" className="text-slate-700 dark:text-slate-300 font-medium">Amount to Restock</Label>
                <Input
                  id="restock-amount"
                  type="number"
                  min="1"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Number.parseInt(e.target.value) || 0)}
                  placeholder="Enter amount"
                  className="mt-1.5 h-10 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Suggested: {Math.max(selectedRestockItem.reorderLevel * 2, 10)} units
                </p>
              </div>
              <div>
                <Label htmlFor="restock-reason" className="text-slate-700 dark:text-slate-300 font-medium">Reason for Restock</Label>
                <Select value={restockReason} onValueChange={setRestockReason}>
                  <SelectTrigger id="restock-reason" className="mt-1.5 h-10 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectItem value="new-stock">New Stock Arrival</SelectItem>
                    <SelectItem value="low-stock-alert">Low Stock Alert</SelectItem>
                    <SelectItem value="damaged-return">Damaged Item Return</SelectItem>
                    <SelectItem value="customer-return">Customer Return</SelectItem>
                    <SelectItem value="inventory-adjustment">Inventory Adjustment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Professional Footer */}
            <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 flex-shrink-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setRestockDialogOpen(false)}
                className="px-6 border-2 font-semibold"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                onClick={handleRestockSubmit} 
                disabled={restockAmount <= 0 || !restockReason}
                className="px-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg"
              >
                Restock Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Professional SaaS Delete Confirmation Modal */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden border-0">
          {/* Header with gradient background */}
          <div className="relative bg-gradient-to-br from-red-500 via-red-600 to-red-700 px-6 py-5 text-center">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
            <div className="relative">
              <div className="inline-flex items-center justify-center w-14 h-14 mx-auto mb-3 rounded-full bg-white/20 backdrop-blur-sm ring-4 ring-white/30">
                <AlertCircle className="h-7 w-7 text-white" strokeWidth={2.5} />
              </div>
              <DialogTitle className="text-xl font-bold !text-white tracking-tight">
                Delete Product
              </DialogTitle>
              <p className="text-white text-xs mt-1.5 font-medium">
                This action is permanent and cannot be undone
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-4">
            <div className="text-center space-y-3">
              <p className="text-slate-700 dark:text-slate-300 font-medium">
                Are you sure you want to delete this product?
              </p>
              {itemToDelete && (
                <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-semibold mb-1">
                    Product Name
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {itemToDelete.name}
                  </p>
                </div>
              )}
            </div>

            {/* Warning box */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                    Warning: Permanent Action
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    All product data, including inventory history and associated records, will be permanently removed from the system.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer with buttons */}
          <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false)
                  setItemToDelete(null)
                }}
                disabled={isDeleting}
                className="h-11 px-6 font-semibold border-2 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => itemToDelete && handleDelete(itemToDelete.id)}
                disabled={isDeleting}
                className="h-11 px-6 font-semibold bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Please wait...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Product
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
