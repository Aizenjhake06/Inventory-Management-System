'use client'

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Package, TrendingUp, Eye, Pencil, Trash2, PackagePlus, Plus, Tag, Warehouse, Loader2, AlertCircle } from "lucide-react"
import type { InventoryItem } from "@/lib/types"
import { formatNumber, formatCurrency, cn } from "@/lib/utils"
import { apiGet, apiDelete, apiPost } from "@/lib/api-client"
import { BrandLoader } from '@/components/ui/brand-loader'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EditItemDialog } from "@/components/edit-item-dialog"
import { AddItemDialog } from "@/components/add-item-dialog"
import { CreateBundleDialog } from "@/components/create-bundle-dialog"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { TablePagination } from "@/components/ui/table-pagination"

export default function LogisticsProductsPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [productTypeFilter, setProductTypeFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [viewItem, setViewItem] = useState<InventoryItem | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [restockDialogOpen, setRestockDialogOpen] = useState(false)
  const [selectedRestockItem, setSelectedRestockItem] = useState<InventoryItem | null>(null)
  const [restockAmount, setRestockAmount] = useState(0)
  const [restockReason, setRestockReason] = useState("")

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Add/Bundle/Category/Store dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [createBundleOpen, setCreateBundleOpen] = useState(false)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [storeDialogOpen, setStoreDialogOpen] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    fetchItems()
  }, [])

  useEffect(() => {
    // Start with all items (include bundles when type filter is bundle/all)
    let filtered = productTypeFilter === "bundle"
      ? items.filter(i => (i as any).productType === 'bundle' || (i as any).product_type === 'bundle')
      : productTypeFilter === "single"
      ? items.filter(i => (i as any).productType !== 'bundle' && (i as any).product_type !== 'bundle')
      : items // "all" shows everything

    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.sku?.toLowerCase().includes(q)
      )
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(i => i.category === categoryFilter)
    }

    if (statusFilter === "in-stock") {
      filtered = filtered.filter(i => i.quantity > i.reorderLevel)
    } else if (statusFilter === "low-stock") {
      filtered = filtered.filter(i => i.quantity > 0 && i.quantity <= i.reorderLevel)
    } else if (statusFilter === "out-of-stock") {
      filtered = filtered.filter(i => i.quantity === 0)
    }

    setFilteredItems(filtered)
  }, [search, categoryFilter, statusFilter, productTypeFilter, items])

  // Pagination calculations
  const totalPages = Math.ceil(filteredItems.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedItems = filteredItems.slice(startIndex, endIndex)

  async function fetchItems() {
    try {
      const data = await apiGet<InventoryItem[]>("/api/items?t=" + Date.now())
      const arr = Array.isArray(data) ? data : []
      setItems(arr)
      setFilteredItems(arr.filter(i => (i as any).productType !== 'bundle'))
    } catch {
      setItems([])
      setFilteredItems([])
    } finally {
      setLoading(false)
    }
  }

  const regularItems = items.filter(i => (i as any).productType !== 'bundle')
  const inStockCount = regularItems.filter(i => i.quantity > i.reorderLevel).length
  const lowStockCount = regularItems.filter(i => i.quantity > 0 && i.quantity <= i.reorderLevel).length
  const outOfStockCount = regularItems.filter(i => i.quantity === 0).length
  const categories = Array.from(new Set(regularItems.map(i => i.category).filter(cat => cat && cat.trim()))).sort()

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item)
    setEditDialogOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    setItemToDelete({ id, name })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return
    setIsDeleting(true)
    try {
      await apiDelete(`/api/items/${itemToDelete.id}`)
      toast.success("Product deleted successfully")
      setDeleteDialogOpen(false)
      setItemToDelete(null)
      fetchItems()
    } catch (error) {
      console.error("[Logistics Products] Error deleting item:", error)
      toast.error("Failed to delete product")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRestock = (item: InventoryItem) => {
    setSelectedRestockItem(item)
    setRestockAmount(0)
    setRestockReason("")
    setRestockDialogOpen(true)
  }

  const handleRestockSubmit = async () => {
    if (!selectedRestockItem || restockAmount <= 0 || !restockReason) return

    try {
      await apiPost(`/api/items/${selectedRestockItem.id}/restock`, { amount: restockAmount, reason: restockReason })
      setRestockDialogOpen(false)
      setSelectedRestockItem(null)
      setRestockReason("")
      fetchItems()
      toast.success("Item restocked successfully!")
    } catch (error) {
      console.error("[Logistics Products] Error restocking item:", error)
      toast.error("Failed to restock item")
    }
  }

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-2 sm:px-4 lg:px-6 py-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <BrandLoader size="lg" />
            <p className="text-slate-600 dark:text-slate-400 mt-6 text-sm font-medium">Loading products...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-2 sm:px-4 lg:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold gradient-text mb-1">Product Inventory</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage all products and stock levels</p>
        </div>
        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-600 shadow-sm">
                <Package className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">Product Inventory</span>
            </div>
            <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-0 text-sm px-3 py-1 font-bold">
              {filteredItems.length} items
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Total Items */}
            <div className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 p-4 rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-700">
              <div className="relative">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 inline-block mb-2">
                  <Package className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Total Items</p>
                <p className="text-2xl font-bold bg-gradient-to-br from-indigo-600 to-indigo-700 bg-clip-text text-transparent tabular-nums">
                  {formatNumber(regularItems.length)}
                </p>
              </div>
            </div>
            {/* In Stock */}
            <div className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 p-4 rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-700">
              <div className="relative">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 inline-block mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">In Stock</p>
                <p className="text-2xl font-bold bg-gradient-to-br from-green-600 to-green-700 bg-clip-text text-transparent tabular-nums">{formatNumber(inStockCount)}</p>
              </div>
            </div>
            {/* Low Stock */}
            <div className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 p-4 rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-700">
              <div className="relative">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 inline-block mb-2">
                  <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Low Stock</p>
                <p className="text-2xl font-bold bg-gradient-to-br from-amber-600 to-amber-700 bg-clip-text text-transparent tabular-nums">{formatNumber(lowStockCount)}</p>
              </div>
            </div>
            {/* Out of Stock */}
            <div className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 p-4 rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-700">
              <div className="relative">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 inline-block mb-2">
                  <Package className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Out of Stock</p>
                <p className="text-2xl font-bold bg-gradient-to-br from-red-600 to-red-700 bg-clip-text text-transparent tabular-nums">{formatNumber(outOfStockCount)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, category, or SKU..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-10 border-slate-200 dark:border-slate-700"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 w-[180px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
              <SelectTrigger className="h-10 w-[170px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="single">Single Product</SelectItem>
                <SelectItem value="bundle">Bundle</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-[160px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-slate-500 dark:text-slate-400 ml-auto">
              Showing <strong className="text-slate-900 dark:text-white">{filteredItems.length}</strong> of <strong className="text-slate-900 dark:text-white">{regularItems.length}</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-lg bg-white dark:bg-slate-900">
        <CardContent className="p-0">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                <Package className="h-12 w-12 text-slate-400 dark:text-slate-600" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">No products found</p>
              <p className="text-sm text-slate-400 dark:text-slate-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black">
                    <th className="py-2.5 px-2 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[40px]">Image</th>
                    <th className="py-2.5 px-2 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[22%]">Product</th>
                    <th className="py-2.5 px-2 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[13%]">Category</th>
                    <th className="py-2.5 px-2 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[7%]">Status</th>
                    <th className="py-2.5 px-2 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[11%]">Stock</th>
                    <th className="py-2.5 px-2 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[9%]">Cost</th>
                    <th className="py-2.5 px-2 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[9%]">Price</th>
                    <th className="py-2.5 px-2 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[7%]">Margin</th>
                    <th className="py-2.5 px-2 text-left text-[10px] font-bold text-white uppercase tracking-wider w-[11%]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {paginatedItems.map(item => {
                    const isLowStock = item.quantity <= item.reorderLevel && item.quantity > 0
                    const isOutOfStock = item.quantity === 0
                    const stockPercentage = Math.min((item.quantity / Math.max(item.reorderLevel * 2, 1)) * 100, 100)
                    const profitMargin = item.sellingPrice > 0
                      ? ((item.sellingPrice - item.costPrice) / item.sellingPrice * 100)
                      : 0

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all duration-200">
                        {/* Image */}
                        <td className="py-2 px-2">
                          <div className="flex items-center justify-center">
                            {item.imageUrl ? (
                              <div className="w-8 h-8 rounded overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                <Package className="h-4 w-4 text-slate-400" />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Product Name */}
                        <td className="py-2 px-2">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white break-words line-clamp-2" title={item.name}>
                            {item.name}
                          </p>
                          {item.sku && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{item.sku}</p>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-2 px-2">
                          <span className="text-xs text-slate-600 dark:text-slate-400 break-words" title={item.category}>
                            {item.category}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-2 px-2">
                          {isOutOfStock ? (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800 text-xs px-1.5 py-0.5">Out</Badge>
                          ) : isLowStock ? (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-xs px-1.5 py-0.5">Low</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800 text-xs px-1.5 py-0.5">OK</Badge>
                          )}
                        </td>

                        {/* Stock with progress */}
                        <td className="py-2 px-2">
                          <div className="space-y-1">
                            <span className={cn(
                              "text-xs font-semibold tabular-nums",
                              isOutOfStock ? "text-red-600 dark:text-red-400"
                                : isLowStock ? "text-amber-600 dark:text-amber-400"
                                : "text-slate-900 dark:text-white"
                            )}>
                              {formatNumber(item.quantity)}
                            </span>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1">
                              <div
                                className={cn(
                                  "h-1 rounded-full transition-all",
                                  isOutOfStock ? "bg-red-500" : isLowStock ? "bg-amber-500" : "bg-green-500"
                                )}
                                style={{ width: `${stockPercentage}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">Min: {item.reorderLevel}</p>
                          </div>
                        </td>

                        {/* Cost */}
                        <td className="py-2 px-2">
                          <span className="text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
                            {formatCurrency(item.costPrice)}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-2 px-2">
                          <span className="text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
                            {formatCurrency(item.sellingPrice)}
                          </span>
                        </td>

                        {/* Margin */}
                        <td className="py-2 px-2">
                          <span className={cn(
                            "text-xs font-bold tabular-nums",
                            profitMargin >= 30 ? "text-green-600" : profitMargin >= 15 ? "text-amber-600" : "text-red-600"
                          )}>
                            {profitMargin.toFixed(1)}%
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-2">
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestock(item)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 h-8 w-8 p-0"
                              title="Restock"
                            >
                              <PackagePlus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 h-8 w-8 p-0"
                              title="Edit Product"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id, item.name)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8 p-0"
                              title="Delete Product"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
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

      {/* Edit Item Dialog */}
      {selectedItem && (
        <EditItemDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          item={selectedItem}
          onSuccess={fetchItems}
        />
      )}

      {/* Add Item Dialog */}
      <AddItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchItems}
      />

      {/* Create Bundle Dialog */}
      <CreateBundleDialog
        open={createBundleOpen}
        onOpenChange={setCreateBundleOpen}
        items={items}
        onSuccess={fetchItems}
      />

      {/* Delete Confirmation Dialog */}
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

          {/* Footer */}
          <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setDeleteDialogOpen(false); setItemToDelete(null) }}
                disabled={isDeleting}
                className="h-11 px-6 font-semibold border-2 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteConfirm}
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

      {/* Restock Dialog */}
      {selectedRestockItem && (
        <Dialog open={restockDialogOpen} onOpenChange={setRestockDialogOpen}>
          <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
            {/* Dark Header */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-5">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-base leading-tight">Restock Product</p>
                    <p className="text-white font-bold text-xl leading-tight mt-0.5">{selectedRestockItem.name}</p>
                  </div>
                </DialogTitle>
                <p className="text-slate-300 text-sm font-medium mt-2 ml-0">
                  {selectedRestockItem.quantity === 0
                    ? `This item is currently out of stock. Reorder level: ${selectedRestockItem.reorderLevel}`
                    : `Current stock: ${formatNumber(selectedRestockItem.quantity)} units. Reorder level: ${selectedRestockItem.reorderLevel}`
                  }
                </p>
              </DialogHeader>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5 bg-white dark:bg-slate-900">
              <div>
                <Label htmlFor="restock-amount" className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5 block">
                  Amount to Restock
                </Label>
                <Input
                  id="restock-amount"
                  type="number"
                  min="1"
                  value={restockAmount || ""}
                  onChange={(e) => setRestockAmount(Number.parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="h-11 text-base border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Suggested: {Math.max(selectedRestockItem.reorderLevel * 2 - selectedRestockItem.quantity, selectedRestockItem.reorderLevel)} units
                </p>
              </div>

              <div>
                <Label htmlFor="restock-reason" className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5 block">
                  Reason for Restock
                </Label>
                <Select value={restockReason} onValueChange={setRestockReason}>
                  <SelectTrigger id="restock-reason" className="h-11 text-base border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New Stock Arrival">New Stock Arrival</SelectItem>
                    <SelectItem value="Low Stock Alert">Low Stock Alert</SelectItem>
                    <SelectItem value="Damaged Item Return">Damaged Item Return</SelectItem>
                    <SelectItem value="Customer Return">Customer Return</SelectItem>
                    <SelectItem value="Inventory Adjustment">Inventory Adjustment</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
              <Button
                variant="outline"
                onClick={() => { setRestockDialogOpen(false); setRestockReason("") }}
                className="px-6 h-11 rounded-xl font-semibold border-2"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRestockSubmit}
                disabled={restockAmount <= 0 || !restockReason}
                className="px-6 h-11 rounded-xl font-semibold bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-md shadow-orange-500/30 disabled:opacity-50"
              >
                Restock Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
