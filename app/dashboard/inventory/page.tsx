"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Pencil, Trash2, PackagePlus, Package, Filter, X, ArrowUpDown, AlertCircle, TrendingUp, Warehouse, Tag, Loader2, LayoutGrid, LayoutList, Eye, ShoppingCart, Check, Building2, FileDown, FileSpreadsheet, ChevronDown } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import * as XLSX from 'xlsx'
import type { InventoryItem } from "@/lib/types"
import { AddItemDialog } from "@/components/add-item-dialog"
import { EditItemDialog } from "@/components/edit-item-dialog"
import { CreateBundleDialog } from "@/components/create-bundle-dialog"
import { formatNumber, formatCurrency, cn } from "@/lib/utils"
import { showSuccess, showError } from "@/lib/toast-utils"
import type { Store } from "@/lib/types"
import { getCurrentUser } from "@/lib/auth"
import { apiGet, apiDelete, apiPost, apiPut } from "@/lib/api-client"
import { getCurrentUserRole } from '@/lib/role-utils'
import { toast } from 'sonner'

const SALES_CHANNELS = ['Shopee', 'Lazada', 'Facebook', 'TikTok', 'Physical Store'] as const

import { PremiumTableLoading } from "@/components/premium-loading"
import { BrandLoader } from '@/components/ui/brand-loader'
import { TablePagination } from "@/components/ui/table-pagination"

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])
  const [search, setSearch] = useState("")
  const [salesChannelFilter, setSalesChannelFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [productTypeFilter, setProductTypeFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name-asc")
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [restockDialogOpen, setRestockDialogOpen] = useState(false)
  const [selectedRestockItem, setSelectedRestockItem] = useState<InventoryItem | null>(null)
  const [restockAmount, setRestockAmount] = useState(0)
  const [restockReason, setRestockReason] = useState("")
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  
  // Get current user for role-based features
  const currentUser = getCurrentUser()
  
  // Role detection for export button
  const userRole = getCurrentUserRole()
  const isTeamLeader = false // Team leader role removed
  
  // Department detection - check if user is an operations user with assigned channel
  const [isDepartment, setIsDepartment] = useState(false)
  const [userDepartment, setUserDepartment] = useState<string>("")
  
  useEffect(() => {
    const checkDepartment = () => {
      const user = getCurrentUser()
      const role = getCurrentUserRole()
      
      if (role === 'operations' && user?.assignedChannel) {
        setIsDepartment(true)
        setUserDepartment(user.assignedChannel)
        // Pre-fill sales channel for departments
        setNewStore({ name: "", salesChannel: user.assignedChannel })
      }
    }
    
    checkDepartment()
  }, [])
  
  // Category Management
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [categories, setCategories] = useState<Array<{id: string, name: string, createdAt: string}>>([])
  const [newCategory, setNewCategory] = useState("")
  const [editingCategory, setEditingCategory] = useState<{id: string, name: string} | null>(null)
  const [editCategoryValue, setEditCategoryValue] = useState("")
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)
  
  // Store Management (renamed from Warehouse Management)
  const [storeDialogOpen, setStoreDialogOpen] = useState(false)
  const [stores, setStores] = useState<Store[]>([])
  const [newStore, setNewStore] = useState({ name: "", salesChannel: "" })
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [editStoreValue, setEditStoreValue] = useState({ name: "", salesChannel: "" })
  const [submitting, setSubmitting] = useState(false)
  const [deleteWarehouseId, setDeleteWarehouseId] = useState<string | null>(null)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set()) // Bulk selection
  
  // Calculate initial column widths based on viewport
  const getInitialColumnWidths = () => {
    if (typeof window === 'undefined') {
      return {
        product: 350,
        category: 220,
        status: 120,
        stock: 130,
        cost: 130,
        price: 130,
        margin: 120,
        actions: 150
      }
    }
    
    // Get available width (viewport - sidebar - scrollbar)
    const viewportWidth = window.innerWidth
    const sidebarWidth = 192 // Sidebar width (w-48 = 192px)
    const scrollbarWidth = 17 // Typical scrollbar width
    const availableWidth = viewportWidth - sidebarWidth - scrollbarWidth
    
    // Base ratios for proportional distribution (removed salesChannel and store)
    const ratios = {
      product: 350,
      category: 220,
      status: 120,
      stock: 130,
      cost: 130,
      price: 130,
      margin: 120,
      actions: 150
    }
    
    const totalRatio = Object.values(ratios).reduce((a, b) => a + b, 0)
    const scale = availableWidth / totalRatio
    
    // Calculate widths and distribute any remainder to avoid dead space
    const widths = Object.entries(ratios).reduce((acc, [key, ratio], index, arr) => {
      if (index === arr.length - 1) {
        // Last column gets the remainder to fill exactly
        const usedWidth = Object.values(acc).reduce((a, b) => a + b, 0)
        acc[key] = availableWidth - usedWidth
      } else {
        acc[key] = Math.floor(ratio * scale)
      }
      return acc
    }, {} as Record<string, number>)
    
    return widths as typeof ratios
  }
  
  // Resizable columns state - Persistent via localStorage
  const [columnWidths, setColumnWidths] = useState(() => {
    // Try to load saved column widths from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('inventory-column-widths')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Failed to parse saved column widths:', e)
        }
      }
    }
    
    // Default widths if no saved data (removed salesChannel and store)
    return {
      product: 350,
      category: 220,
      status: 120,
      stock: 130,
      cost: 130,
      price: 130,
      margin: 120,
      actions: 150
    }
  })
  const [resizing, setResizing] = useState<string | null>(null)
  const [startX, setStartX] = useState(0)
  const [startWidth, setStartWidth] = useState(0)
  
  // Delete confirmation modal state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [createBundleOpen, setCreateBundleOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
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
      if (resizing) {
        // Save to localStorage when resize is complete
        localStorage.setItem('inventory-column-widths', JSON.stringify(columnWidths))
      }
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
  }, [resizing, startX, startWidth, columnWidths])

  useEffect(() => {
    fetchItems()
    fetchStores()
    fetchCategories()

    // Refresh data when window regains focus (e.g., after switching tabs)
    const handleFocus = () => {
      fetchItems()
      fetchStores()
      fetchCategories()
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  useEffect(() => {
    let filtered = items

    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.category.toLowerCase().includes(searchLower) ||
          item.sku?.toLowerCase().includes(searchLower)
      )
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.category === categoryFilter)
    }

    // Product type filter (single vs bundle)
    if (productTypeFilter === "single") {
      filtered = filtered.filter((item) => (item as any).productType !== 'bundle' && (item as any).product_type !== 'bundle')
    } else if (productTypeFilter === "bundle") {
      filtered = filtered.filter((item) => (item as any).productType === 'bundle' || (item as any).product_type === 'bundle')
    }

    // Stock status filter
    if (salesChannelFilter === "low-stock") {
      filtered = filtered.filter((item) => item.quantity > 0 && item.quantity <= item.reorderLevel)
    } else if (salesChannelFilter === "out-of-stock") {
      filtered = filtered.filter((item) => item.quantity === 0)
    }

    // Apply sorting
    if (sortBy === "name-asc") {
      filtered.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === "name-desc") {
      filtered.sort((a, b) => b.name.localeCompare(a.name))
    } else if (sortBy === "price-asc") {
      filtered.sort((a, b) => a.sellingPrice - b.sellingPrice)
    } else if (sortBy === "price-desc") {
      filtered.sort((a, b) => b.sellingPrice - a.sellingPrice)
    } else if (sortBy === "stock-asc") {
      filtered.sort((a, b) => a.quantity - b.quantity)
    } else if (sortBy === "stock-desc") {
      filtered.sort((a, b) => b.quantity - a.quantity)
    }

    setFilteredItems(filtered)
  }, [search, salesChannelFilter, categoryFilter, productTypeFilter, sortBy, items])

  // Calculate pagination
  const totalPages = Math.ceil(filteredItems.length / pageSize)
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  async function fetchItems() {
    try {
      // Fetch from inventory table only (NOT bundles)
      // Bundles are virtual products - their items are already in inventory
      const data = await apiGet<InventoryItem[]>(`/api/items?t=${Date.now()}`)
      console.log('[Inventory] RAW API Response:', data)
      
      let itemsArray = Array.isArray(data) ? data : []
      
      // Department users can now see ALL products (no sales channel filtering)
      // This matches the behavior of the Warehouse Dispatch page
      
      // Debug: Log items with images BEFORE setting state
      const itemsWithImages = itemsArray.filter(item => item.imageUrl)
      if (itemsWithImages.length > 0) {
        console.log('[Inventory] Items with images BEFORE setState:', itemsWithImages.map(item => ({
          name: item.name,
          imageUrl: item.imageUrl,
          imageUrlType: typeof item.imageUrl,
          imageUrlLength: item.imageUrl?.length
        })))
      }
      
      setItems(itemsArray)
      setFilteredItems(itemsArray)
      
      // Debug: Log items AFTER setting state
      console.log('[Inventory] Items AFTER setState:', itemsArray.slice(0, 3))
    } catch (error) {
      console.error("[Inventory] Error fetching items:", error)
      setItems([])
      setFilteredItems([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchStores() {
    try {
      const data = await apiGet<Store[]>("/api/stores")
      setStores(data)
    } catch (error) {
      console.error("Error fetching stores:", error)
    }
  }

  async function fetchCategories() {
    try {
      const data = await apiGet<any[]>("/api/categories")
      setCategories(data)
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  async function handleDelete(id: string) {
    try {
      setIsDeleting(true)
      
      // Check if it's a bundle (bundles have ID starting with "BUNDLE-")
      const isBundle = id.startsWith('BUNDLE-')
      const endpoint = isBundle ? `/api/bundles/${id}` : `/api/items/${id}`
      
      // Add authentication headers
      const headers = new Headers({
        'Content-Type': 'application/json'
      })
      
      const username = localStorage.getItem('username')
      const role = localStorage.getItem('userRole')
      const displayName = localStorage.getItem('displayName')
      
      if (username) headers.set('x-user-username', username)
      if (role) headers.set('x-user-role', role)
      if (displayName) headers.set('x-user-display-name', displayName)
      
      const response = await fetch(endpoint, { 
        method: "DELETE",
        headers 
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete product' }))
        throw new Error(errorData.error || 'Failed to delete product')
      }
      
      await fetchItems()
      setDeleteDialogOpen(false)
      setItemToDelete(null)
      showSuccess("Product deleted successfully")
    } catch (error) {
      console.error("[Inventory] Error deleting item:", error)
      showError(error instanceof Error ? error.message : "Failed to delete product")
    } finally {
      setIsDeleting(false)
    }
  }
  
  function openDeleteDialog(id: string, name: string) {
    setItemToDelete({ id, name })
    setDeleteDialogOpen(true)
  }

  async function handleEdit(item: InventoryItem) {
    const isBundle = (item as any).productType === 'bundle' || (item as any).product_type === 'bundle'
    
    if (isBundle) {
      // Bundle - Open CreateBundleDialog in edit mode
      console.log('[Inventory] Opening bundle edit modal for:', item.id)
      
      try {
        // Fetch full bundle details AND fresh items in parallel to ensure item data is available
        const [bundleData, freshItems] = await Promise.all([
          apiGet<any>(`/api/bundles/${item.id}`),
          items.length === 0 ? apiGet<InventoryItem[]>(`/api/items?t=${Date.now()}`) : Promise.resolve(items)
        ])
        
        // Use freshItems if current items state is empty
        const itemsSource = items.length > 0 ? items : (freshItems as InventoryItem[])
        
        console.log('[Inventory] Bundle data loaded:', bundleData)
        console.log('[Inventory] Items available for mapping:', itemsSource.length)
        
        // Transform bundle_components to bundleItems format
        const bundleItems = bundleData.bundle_components?.map((comp: any) => {
          // Find the item details from items list
          const itemDetails = itemsSource.find((i: InventoryItem) => i.id === comp.item_id)
          console.log('[Inventory] Mapping bundle component:', {
            comp,
            itemDetails: itemDetails ? { id: itemDetails.id, name: itemDetails.name } : null
          })
          
          if (!itemDetails) {
            console.warn('[Inventory] ⚠️ Item not found in inventory list:', comp.item_id)
          }
          
          return {
            itemId: comp.item_id,
            itemName: itemDetails?.name || `Item ${comp.item_id.slice(-6)}`,
            quantity: comp.quantity,
            unitPrice: itemDetails?.sellingPrice || 0,
            unitCost: itemDetails?.costPrice || 0
          }
        }) || []
        
        console.log('[Inventory] Transformed bundleItems:', bundleItems)
        console.log('[Inventory] Setting selectedItem with bundle data')
        
        // Set selected item with ALL bundle data
        const itemWithBundleData = {
          ...item,
          bundleId: item.id,
          bundleItems,
          bundleData
        }
        
        console.log('[Inventory] Complete item data:', itemWithBundleData)
        setSelectedItem(itemWithBundleData as any)
        
        // Small delay to ensure state is updated before opening modal
        await new Promise(resolve => setTimeout(resolve, 100))
        
        console.log('[Inventory] Opening CreateBundleDialog')
        setCreateBundleOpen(true)
      } catch (error) {
        console.error('[Inventory] Failed to load bundle data:', error)
        toast.error('Failed to load bundle details')
      }
    } else {
      // Regular item - Open EditItemDialog
      setSelectedItem(item)
      setEditDialogOpen(true)
    }
  }

  function handleRestock(item: InventoryItem) {
    setSelectedRestockItem(item)
    setRestockAmount(0)
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
      showSuccess("Item restocked successfully!")
    } catch (error) {
      console.error("[Inventory] Error restocking item:", error)
      showError("Failed to restock item")
    }
  }

  // Store Management Functions
  async function handleAddStore() {
    if (!newStore.name.trim() || !newStore.salesChannel) {
      showError("Please enter store name and select sales channel")
      return
    }

    try {
      setSubmitting(true)
      await apiPost("/api/stores", { 
        store_name: newStore.name.trim(),
        sales_channel: newStore.salesChannel 
      })
      showSuccess("Store added successfully")
      setNewStore({ name: "", salesChannel: "" })
      fetchStores()
    } catch (error) {
      console.error("Error adding store:", error)
      showError("Failed to add store")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEditStore() {
    if (!editingStore || !editStoreValue.name.trim() || !editStoreValue.salesChannel) {
      showError("Please enter store name and select sales channel")
      return
    }

    try {
      setSubmitting(true)
      await apiPut(`/api/stores/${editingStore.id}`, { 
        store_name: editStoreValue.name.trim(),
        sales_channel: editStoreValue.salesChannel 
      })
      showSuccess("Store updated successfully")
      setEditingStore(null)
      setEditStoreValue({ name: "", salesChannel: "" })
      fetchStores()
    } catch (error) {
      console.error("Error updating store:", error)
      showError("Failed to update store")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteStore(id: string) {
    try {
      setSubmitting(true)
      await apiDelete(`/api/stores/${id}`)
      showSuccess("Store deleted successfully")
      setDeleteWarehouseId(null)
      fetchStores()
    } catch (error) {
      console.error("Error deleting warehouse:", error)
      showError("Failed to delete warehouse")
    } finally {
      setSubmitting(false)
    }
  }

  // Category Management Functions
  async function handleAddCategory() {
    if (!newCategory.trim()) {
      showError("Please enter a category name")
      return
    }

    try {
      setSubmitting(true)
      const category = await apiPost("/api/categories", { name: newCategory.trim() })
      showSuccess("Category added successfully")
      setNewCategory("")
      fetchCategories()
    } catch (error) {
      console.error("Error adding category:", error)
      showError("Failed to add category")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEditCategory() {
    if (!editingCategory || !editCategoryValue.trim()) {
      showError("Please enter a category name")
      return
    }

    try {
      setSubmitting(true)
      await apiPut(`/api/categories/${editingCategory.id}`, { name: editCategoryValue.trim() })
      showSuccess("Category updated successfully")
      setEditingCategory(null)
      setEditCategoryValue("")
      fetchCategories()
    } catch (error) {
      console.error("Error updating category:", error)
      showError("Failed to update category")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteCategory(id: string) {
    try {
      setSubmitting(true)
      await apiDelete(`/api/categories/${id}`)
      showSuccess("Category deleted successfully")
      setDeleteCategoryId(null)
      fetchCategories()
    } catch (error) {
      console.error("Error deleting category:", error)
      showError("Failed to delete category")
    } finally {
      setSubmitting(false)
    }
  }

  // Export Functions
  const exportToExcel = async () => {
    try {
      // Filter out bundles - only export regular items
      const regularItems = filteredItems.filter(item => (item as any).product_type !== 'bundle')
      
      // Fetch restock data for all items
      const restockResponse = await fetch('/api/restocks')
      const allRestocks = restockResponse.ok ? await restockResponse.json() : []
      
      // Group items by product name + cost price + selling price
      const groupedItems = regularItems.reduce((acc, item) => {
        // Create unique key based on name, cost, and selling price
        const key = `${item.name}-${item.costPrice}-${item.sellingPrice}`
        
        if (!acc[key]) {
          acc[key] = {
            name: item.name,
            quantity: 0,
            costPrice: item.costPrice,
            sellingPrice: item.sellingPrice,
            items: []
          }
        }
        
        acc[key].quantity += item.quantity
        acc[key].items.push(item)
        
        return acc
      }, {} as Record<string, any>)
      
      // Add restock information to each group
      Object.values(groupedItems).forEach((group: any) => {
        // Find the most recent restock for any item in this group
        const itemIds = group.items.map((i: any) => i.id)
        const groupRestocks = allRestocks.filter((r: any) => itemIds.includes(r.itemId))
        
        if (groupRestocks.length > 0) {
          // Sort by timestamp descending to get the most recent
          const latestRestock = groupRestocks.sort((a: any, b: any) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )[0]
          
          group.lastRestockDate = latestRestock.timestamp
          group.lastRestockAmount = latestRestock.quantity
          group.lastRestockReason = latestRestock.reason
        } else {
          group.lastRestockDate = 'N/A'
          group.lastRestockAmount = 'N/A'
          group.lastRestockReason = 'N/A'
        }
      })

      const groupedArray = Object.values(groupedItems)

      // Calculate totals for header
      const totalProducts = groupedArray.length
      const totalQuantity = groupedArray.reduce((sum: number, group: any) => sum + group.quantity, 0)
      const totalValue = groupedArray.reduce((sum: number, group: any) => sum + (group.quantity * group.sellingPrice), 0)
      const totalCOGS = groupedArray.reduce((sum: number, group: any) => sum + (group.quantity * group.costPrice), 0)
      
      let lowStockCount = 0
      let outOfStockCount = 0
      groupedArray.forEach((group: any) => {
        const lowestReorderLevel = Math.min(...group.items.map((i: any) => i.reorderLevel || 0))
        if (group.quantity === 0) {
          outOfStockCount++
        } else if (group.quantity <= lowestReorderLevel) {
          lowStockCount++
        }
      })
      const inStockCount = totalProducts - lowStockCount - outOfStockCount

      // Create header information
      const headerInfo = [
        ['INVENTORY REPORT'],
        [''],
        ['Report Date:', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
        ['Report Time:', new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })],
        [''],
        ['SUMMARY INFORMATION'],
        ['Total Products:', `${totalProducts} items`],
        ['Total Quantity:', `${formatNumber(totalQuantity)} units`],
        ['Total Inventory Value:', formatCurrency(totalValue)],
        ['Total COGS:', formatCurrency(totalCOGS)],
        ['In Stock Items:', `${inStockCount} items`],
        ['Low Stock Items:', `${lowStockCount} items`],
        ['Out of Stock Items:', `${outOfStockCount} items`],
        ['Filter Applied:', salesChannelFilter !== 'all' ? salesChannelFilter : 'All Channels'],
        [''],
        ['Note: Bundle items are excluded from this report'],
        [''],
        ['']
      ]

      // Convert grouped data to export format
      const exportData = groupedArray.map((group: any) => {
        const totalValue = group.quantity * group.sellingPrice
        const totalCOGS = group.quantity * group.costPrice
        const profitMargin = group.sellingPrice > 0 
          ? ((group.sellingPrice - group.costPrice) / group.sellingPrice * 100).toFixed(2)
          : '0.00'
        
        // Determine status based on total quantity
        const lowestReorderLevel = Math.min(...group.items.map((i: any) => i.reorderLevel || 0))
        const status = group.quantity === 0 
          ? 'Out of Stock' 
          : group.quantity <= lowestReorderLevel 
            ? 'Low Stock' 
            : 'In Stock'
        
        // Format restock date if available
        const restockDate = group.lastRestockDate !== 'N/A' 
          ? new Date(group.lastRestockDate).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })
          : 'N/A'
        
        // Format restock reason
        const restockReason = group.lastRestockReason !== 'N/A'
          ? group.lastRestockReason.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
          : 'N/A'

        return {
          'Product Name': group.name,
          'Quantity': group.quantity,
          'Cost Price': formatCurrency(group.costPrice),
          'Selling Price': formatCurrency(group.sellingPrice),
          'Profit Margin': `${profitMargin}%`,
          'Total Value': formatCurrency(totalValue),
          'Total COGS': formatCurrency(totalCOGS),
          'Status': status,
          'Last Restock Date': restockDate,
          'Last Restock Amount': group.lastRestockAmount,
          'Restock Reason': restockReason
        }
      })

      // Create workbook and add header
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(headerInfo)
      
      // Add data table below header
      XLSX.utils.sheet_add_json(ws, exportData, { origin: -1, skipHeader: false })
      
      // Style the header section (make first row bold)
      if (!ws['!rows']) ws['!rows'] = []
      ws['!rows'][0] = { hpt: 20, hpx: 20 }
      
      // Auto-size columns
      const maxWidth = 50
      const allData = [...headerInfo.map(row => row.join(' ')), ...exportData.map(row => Object.values(row).join(' '))]
      const colCount = Math.max(...headerInfo.map(row => row.length), Object.keys(exportData[0] || {}).length)
      const colWidths = Array(colCount).fill(0).map((_, i) => {
        const maxLen = Math.max(
          ...headerInfo.map(row => String(row[i] || '').length),
          ...exportData.map(row => String(Object.values(row)[i] || '').length)
        )
        return { wch: Math.min(maxLen + 2, maxWidth) }
      })
      ws['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, ws, 'Inventory')

      const fileName = `Inventory-Report-${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)
      toast.success('Excel report downloaded successfully')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      toast.error('Failed to export Excel report')
    }
  }

  const exportToPDF = async () => {
    try {
      // Filter out bundles - only export regular items
      const regularItems = filteredItems.filter(item => (item as any).product_type !== 'bundle')
      
      // Fetch restock data for all items
      const restockResponse = await fetch('/api/restocks')
      const allRestocks = restockResponse.ok ? await restockResponse.json() : []
      
      // Group items by product name + cost price + selling price
      const groupedItems = regularItems.reduce((acc, item) => {
        // Create unique key based on name, cost, and selling price
        const key = `${item.name}-${item.costPrice}-${item.sellingPrice}`
        
        if (!acc[key]) {
          acc[key] = {
            name: item.name,
            quantity: 0,
            costPrice: item.costPrice,
            sellingPrice: item.sellingPrice,
            items: []
          }
        }
        
        acc[key].quantity += item.quantity
        acc[key].items.push(item)
        
        return acc
      }, {} as Record<string, any>)
      
      // Add restock information to each group
      Object.values(groupedItems).forEach((group: any) => {
        // Find the most recent restock for any item in this group
        const itemIds = group.items.map((i: any) => i.id)
        const groupRestocks = allRestocks.filter((r: any) => itemIds.includes(r.itemId))
        
        if (groupRestocks.length > 0) {
          // Sort by timestamp descending to get the most recent
          const latestRestock = groupRestocks.sort((a: any, b: any) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )[0]
          
          group.lastRestockDate = latestRestock.timestamp
          group.lastRestockAmount = latestRestock.quantity
          group.lastRestockReason = latestRestock.reason
        } else {
          group.lastRestockDate = 'N/A'
          group.lastRestockAmount = 'N/A'
          group.lastRestockReason = 'N/A'
        }
      })

      const groupedArray = Object.values(groupedItems)

      // Calculate totals
      const totalProducts = groupedArray.length
      const totalQuantity = groupedArray.reduce((sum: number, group: any) => sum + group.quantity, 0)
      const totalValue = groupedArray.reduce((sum: number, group: any) => sum + (group.quantity * group.sellingPrice), 0)
      const totalCOGS = groupedArray.reduce((sum: number, group: any) => sum + (group.quantity * group.costPrice), 0)
      
      // Count low stock and out of stock
      let lowStockCount = 0
      let outOfStockCount = 0
      groupedArray.forEach((group: any) => {
        const lowestReorderLevel = Math.min(...group.items.map((i: any) => i.reorderLevel || 0))
        if (group.quantity === 0) {
          outOfStockCount++
        } else if (group.quantity <= lowestReorderLevel) {
          lowStockCount++
        }
      })

      // Create printable HTML
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        toast.error('Please allow popups to export PDF')
        return
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Inventory Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { border-bottom: 3px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { color: #1e293b; margin: 0 0 10px 0; font-size: 32px; }
            .report-info { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 15px; }
            .info-item { display: flex; justify-content: space-between; padding: 8px 12px; background: #f8fafc; border-radius: 6px; }
            .info-label { color: #64748b; font-size: 13px; font-weight: 600; }
            .info-value { color: #1e293b; font-size: 13px; font-weight: 700; }
            .meta { color: #64748b; margin-bottom: 20px; font-size: 14px; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
            .summary-card { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; }
            .summary-card h3 { margin: 0 0 5px 0; font-size: 12px; color: #64748b; text-transform: uppercase; }
            .summary-card p { margin: 0; font-size: 24px; font-weight: bold; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background-color: #f8fafc; font-weight: 600; color: #475569; font-size: 12px; text-transform: uppercase; }
            td { font-size: 14px; color: #1e293b; }
            .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
            .status-in-stock { background-color: #dcfce7; color: #166534; }
            .status-low-stock { background-color: #fef3c7; color: #92400e; }
            .status-out-of-stock { background-color: #fee2e2; color: #991b1b; }
            @media print {
              body { padding: 0; }
              .header { page-break-inside: avoid; }
              .summary { page-break-inside: avoid; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Inventory Report</h1>
            <div class="report-info">
              <div class="info-item">
                <span class="info-label">Report Date:</span>
                <span class="info-value">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Report Time:</span>
                <span class="info-value">${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Total Products:</span>
                <span class="info-value">${totalProducts} items</span>
              </div>
              <div class="info-item">
                <span class="info-label">Total Quantity:</span>
                <span class="info-value">${formatNumber(totalQuantity)} units</span>
              </div>
              <div class="info-item">
                <span class="info-label">Total Inventory Value:</span>
                <span class="info-value">${formatCurrency(totalValue)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Total COGS:</span>
                <span class="info-value">${formatCurrency(totalCOGS)}</span>
              </div>
              <div class="info-item">
                <span class="info-label">In Stock Items:</span>
                <span class="info-value">${totalProducts - lowStockCount - outOfStockCount} items</span>
              </div>
              <div class="info-item">
                <span class="info-label">Low Stock Items:</span>
                <span class="info-value">${lowStockCount} items</span>
              </div>
              <div class="info-item">
                <span class="info-label">Out of Stock Items:</span>
                <span class="info-value">${outOfStockCount} items</span>
              </div>
              <div class="info-item">
                <span class="info-label">Filter Applied:</span>
                <span class="info-value">${salesChannelFilter !== 'all' ? salesChannelFilter : 'All Channels'}</span>
              </div>
            </div>
            <p style="margin-top: 15px; color: #64748b; font-size: 12px; font-style: italic;">
              Note: Bundle items are excluded from this report
            </p>
          </div>
          
          <div class="summary">
            <div class="summary-card">
              <h3>Total Products</h3>
              <p>${totalProducts}</p>
            </div>
            <div class="summary-card">
              <h3>Total Quantity</h3>
              <p>${formatNumber(totalQuantity)}</p>
            </div>
            <div class="summary-card">
              <h3>Total Value</h3>
              <p>${formatCurrency(totalValue)}</p>
            </div>
            <div class="summary-card">
              <h3>Total COGS</h3>
              <p>${formatCurrency(totalCOGS)}</p>
            </div>
            <div class="summary-card">
              <h3>Low Stock Items</h3>
              <p>${lowStockCount}</p>
            </div>
            <div class="summary-card">
              <h3>Out of Stock</h3>
              <p>${outOfStockCount}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Cost Price</th>
                <th>Selling Price</th>
                <th>Profit Margin</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Last Restock</th>
                <th>Restock Qty</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              ${groupedArray.map((group: any) => {
                const totalValue = group.quantity * group.sellingPrice
                const profitMargin = group.sellingPrice > 0 
                  ? ((group.sellingPrice - group.costPrice) / group.sellingPrice * 100).toFixed(2)
                  : '0.00'
                
                const lowestReorderLevel = Math.min(...group.items.map((i: any) => i.reorderLevel || 0))
                const status = group.quantity === 0 
                  ? 'Out of Stock' 
                  : group.quantity <= lowestReorderLevel 
                    ? 'Low Stock' 
                    : 'In Stock'
                const statusClass = group.quantity === 0 
                  ? 'status-out-of-stock' 
                  : group.quantity <= lowestReorderLevel 
                    ? 'status-low-stock' 
                    : 'status-in-stock'
                
                // Format restock date
                const restockDate = group.lastRestockDate !== 'N/A' 
                  ? new Date(group.lastRestockDate).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })
                  : 'N/A'
                
                // Format restock reason
                const restockReason = group.lastRestockReason !== 'N/A'
                  ? group.lastRestockReason.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                  : 'N/A'
                
                return `
                  <tr>
                    <td>${group.name}</td>
                    <td>${group.quantity}</td>
                    <td>${formatCurrency(group.costPrice)}</td>
                    <td>${formatCurrency(group.sellingPrice)}</td>
                    <td>${profitMargin}%</td>
                    <td>${formatCurrency(totalValue)}</td>
                    <td><span class="status-badge ${statusClass}">${status}</span></td>
                    <td>${restockDate}</td>
                    <td>${group.lastRestockAmount}</td>
                    <td>${restockReason}</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `)

      printWindow.document.close()
      printWindow.focus()
      
      setTimeout(() => {
        printWindow.print()
        toast.success('PDF export ready')
      }, 250)
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      toast.error('Failed to export PDF report')
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[600px]">
        <div className="text-center">
          <BrandLoader size="lg" />
          <p className="text-slate-600 dark:text-slate-400 mt-6 text-sm font-medium">
            Loading inventory...
          </p>
        </div>
      </div>
    )
  }

  // Extract unique category names for filter
  const categoryNames = categories.map(cat => cat.name)

  const activeFiltersCount = [
    salesChannelFilter !== "all",
    search !== ""
  ].filter(Boolean).length

  const clearAllFilters = () => {
    setSearch("")
    setSalesChannelFilter("all")
    setSortBy("name-asc")
  }

  return (
    <div className="max-w-[1600px] mx-auto py-5 space-y-6">
      {/* Page Header - Professional */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold gradient-text mb-1">
            Inventory Overview
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Comprehensive product inventory control and management
          </p>
        </div>
        
        {/* Action Buttons - Top Right */}
        <div className="flex items-center gap-2">
          {/* Categories, Stores & Bundle - hidden for operations (agents) */}
          {!isDepartment && (
            <>
              <Button
                onClick={() => setCategoryDialogOpen(true)}
                variant="outline"
                className="h-7 w-[100px] px-2.5 text-xs border-slate-200 dark:border-slate-700 rounded-md"
              >
                <Plus className="h-3 w-3 mr-1" />
                Categories
              </Button>

              <Button
                onClick={() => setStoreDialogOpen(true)}
                variant="outline"
                className="h-7 w-[100px] px-2.5 text-xs border-slate-200 dark:border-slate-700 rounded-md"
              >
                <Plus className="h-3 w-3 mr-1" />
                Stores
              </Button>

              <Button
                onClick={() => setCreateBundleOpen(true)}
                className="h-7 w-[100px] px-2.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-md"
              >
                <Plus className="h-3 w-3 mr-1" />
                Bundle
              </Button>
            </>
          )}

          {/* Add Product - Main Admin & Logistics Admin only */}
          {!isDepartment && (
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="h-7 w-[100px] px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              <Plus className="h-3 w-3 mr-1" />
              Product
            </Button>
          )}
        </div>
      </div>

      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="pb-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col gap-4">
            {/* Title Row */}
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900 dark:text-white">
                <div className="p-2 rounded-lg bg-blue-600 shadow-sm">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <span>Product Inventory</span>
              </CardTitle>
              <div className="flex items-center gap-3">
                <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-0 text-sm px-3 py-1 font-bold">
                  {filteredItems.length} items
                </Badge>
              </div>
            </div>
            
            {/* Stats Row - Responsive Grid (4 cards for admin, 3 cards for department agents) */}
            <div className={cn(
              "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4",
              isDepartment ? "lg:grid-cols-3" : "lg:grid-cols-4"
            )}>
              {/* Total Items - Indigo Gradient */}
              <div className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 p-4 rounded-xl bg-white dark:bg-slate-900">
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                      <Package className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Total Items</p>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-indigo-600 to-indigo-700 bg-clip-text text-transparent tabular-nums mb-2">
                    {formatNumber(Array.isArray(items) ? items.filter(item => item.productType !== 'bundle').length : 0)}
                  </p>
                  {(search || salesChannelFilter !== "all") && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Filtered: {formatNumber(Array.isArray(filteredItems) ? filteredItems.filter(item => item.productType !== 'bundle').length : 0)}
                    </p>
                  )}
                </div>
              </div>

              {/* Total Quantity - Blue Gradient (Excludes Bundles) */}
              <div className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 p-4 rounded-xl bg-white dark:bg-slate-900">
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Total Quantity</p>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-blue-600 to-blue-700 bg-clip-text text-transparent tabular-nums mb-2">
                    {formatNumber(Array.isArray(items) ? items.filter(item => item.productType !== 'bundle').reduce((sum, item) => sum + item.quantity, 0) : 0)}
                  </p>
                  {(search || salesChannelFilter !== "all") && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Filtered: {formatNumber(Array.isArray(filteredItems) ? filteredItems.filter(item => item.productType !== 'bundle').reduce((sum, item) => sum + item.quantity, 0) : 0)}
                    </p>
                  )}
                </div>
              </div>

              {/* Total Value - Green Gradient */}
              <div className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 p-4 rounded-xl bg-white dark:bg-slate-900">
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Total Value</p>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-green-600 to-green-700 bg-clip-text text-transparent tabular-nums mb-2">
                    {formatCurrency(Array.isArray(items) ? items.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0) : 0)}
                  </p>
                  {(search || salesChannelFilter !== "all") && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Filtered: {formatCurrency(Array.isArray(filteredItems) ? filteredItems.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0) : 0)}
                    </p>
                  )}
                </div>
              </div>

              {/* Total COGS - Orange Gradient - Hidden for Department Agents */}
              {!isDepartment && (
                <div className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 p-4 rounded-xl bg-white dark:bg-slate-900">
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                        <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Total COGS</p>
                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-orange-600 to-orange-700 bg-clip-text text-transparent tabular-nums mb-2">
                      {formatCurrency(Array.isArray(items) ? items.reduce((sum, item) => sum + (item.totalCOGS || (item.costPrice * item.quantity)), 0) : 0)}
                    </p>
                    {(search || salesChannelFilter !== "all") && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Filtered: {formatCurrency(Array.isArray(filteredItems) ? filteredItems.reduce((sum, item) => sum + (item.totalCOGS || (item.costPrice * item.quantity)), 0) : 0)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Search & Actions Bar - No Card Container */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            {/* Search Bar - Half Width with Clear Button */}
            <div className="flex items-center gap-3 lg:w-1/2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search products by name, category, or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 h-7 text-xs border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => setSearch("")}
                disabled={!search}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Clear
              </button>
            </div>

            {/* Action Buttons - Right Side - Replaced with Category Filter */}
            <div className="flex gap-2 flex-wrap lg:flex-nowrap lg:ml-auto">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full lg:w-[200px] h-7 text-xs border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Filter by Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
                <SelectTrigger className="w-full lg:w-[180px] h-7 text-xs border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="single">Single Product</SelectItem>
                  <SelectItem value="bundle">Bundle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {!Array.isArray(filteredItems) || filteredItems.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                <Package className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No products found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
                {search || salesChannelFilter !== "all"
                  ? "Try adjusting your filters or search terms"
                  : "Get started by adding your first product"}
              </p>
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
              >
                <Plus className="h-4 w-4" />
                Add Your First Product
              </Button>
            </div>
          ) : (
            /* Table View */
            <>
              {/* Mobile Scroll Hint - Enhanced */}
              <div className="md:hidden px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-100 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center justify-center gap-2 font-medium">
                  <span className="text-blue-500">←</span>
                  <span>Swipe to see all columns • Tap row to highlight</span>
                  <span className="text-blue-500">→</span>
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black">
                      {/* Image Column */}
                      <th className="py-2.5 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[90px]">
                        Image
                      </th>
                      <th className={cn(
                        "py-2.5 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50",
                        !isDepartment ? "w-[20%]" : "w-[25%]"
                      )}>
                        Product
                      </th>
                      <th className={cn(
                        "py-2.5 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50",
                        !isDepartment ? "w-[16%]" : "w-[15%]"
                      )}>
                        Category
                      </th>
                      <th className={cn(
                        "py-2.5 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50",
                        !isDepartment ? "w-[9%]" : "w-[10%]"
                      )}>
                        Status
                      </th>
                      <th className={cn(
                        "py-2.5 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50",
                        !isDepartment ? "w-[11%]" : "w-[15%]"
                      )}>
                        Stock
                      </th>
                      {/* Hide Cost column for department agents (operations role) */}
                      {!isDepartment && (
                        <th className="py-2.5 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50 w-[10%]">
                          Cost
                        </th>
                      )}
                      <th className={cn(
                        "py-2.5 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50",
                        !isDepartment ? "w-[10%]" : "w-[12%]"
                      )}>
                        Price
                      </th>
                      <th className={cn(
                        "py-2.5 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider border-r border-slate-700/50",
                        isDepartment ? "w-[12%]" : "w-[8%]"
                      )}>
                        Margin
                      </th>
                      {!isDepartment && (
                        <th className="py-2.5 px-3 text-left text-[10px] font-bold text-white uppercase tracking-wider w-[16%]">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {paginatedItems.map((item) => {
                      const profitMargin = item.sellingPrice > 0 ? ((item.sellingPrice - item.costPrice) / item.sellingPrice * 100) : 0
                      const isLowStock = item.quantity <= item.reorderLevel && item.quantity > 0
                      const isOutOfStock = item.quantity === 0
                      const stockPercentage = Math.min((item.quantity / (item.reorderLevel * 2)) * 100, 100)
                      const isSelected = selectedRowId === item.id
                      const isBundle = (item as any).productType === 'bundle' || (item as any).product_type === 'bundle'
                      
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
                          {/* Image Column */}
                          <td className="py-2 px-3">
                            <div className="flex items-center justify-center">
                              {item.imageUrl ? (
                                <div className="w-10 h-10 rounded overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    onLoad={() => console.log('[Inventory] Image loaded:', item.name, item.imageUrl)}
                                    onError={(e) => {
                                      console.error('[Inventory] Image failed to load:', {
                                        name: item.name,
                                        imageUrl: item.imageUrl,
                                        actualSrc: (e.target as HTMLImageElement).src,
                                        error: e
                                      })
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                  <Package className="h-5 w-5 text-slate-400" />
                                </div>
                              )}
                            </div>
                          </td>
                          
                          {/* Product Name */}
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <p 
                                  className={cn(
                                    "text-xs font-semibold break-words line-clamp-2",
                                    isSelected 
                                      ? "text-blue-900 dark:text-blue-100" 
                                      : "text-slate-900 dark:text-white"
                                  )}
                                  title={item.name}
                                >
                                  {item.name}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-2 px-3">
                            <span 
                              className={cn(
                                "text-xs block break-words",
                                isSelected 
                                  ? "text-blue-900 dark:text-blue-100 font-medium" 
                                  : "text-slate-600 dark:text-slate-400"
                              )}
                              title={item.category}
                            >
                              {item.category}
                            </span>
                          </td>

                          {/* Stock Status */}
                          <td className="py-2 px-3">
                            <div className="flex justify-start">
                              {isOutOfStock ? (
                                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800 text-xs px-1.5 py-0.5">
                                  Out
                                </Badge>
                              ) : isLowStock ? (
                                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-xs px-1.5 py-0.5">
                                  Low
                                </Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800 text-xs px-1.5 py-0.5">
                                  OK
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* Stock with Progress */}
                          <td className="py-2 px-3">
                            <div className="flex flex-col items-start gap-1">
                              <span className={
                                isSelected 
                                  ? "text-xs font-bold tabular-nums text-blue-900 dark:text-blue-100" 
                                  : "text-xs font-bold tabular-nums text-slate-900 dark:text-white"
                              }>
                                {formatNumber(item.quantity)}
                              </span>
                              <div className="w-full max-w-[80px] h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all ${
                                    isOutOfStock ? 'bg-red-500' :
                                    isLowStock ? 'bg-amber-500' : 
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${stockPercentage}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Cost - Hidden for department agents (operations role) */}
                          {!isDepartment && (
                            <td className="py-2 px-3">
                              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                                {formatCurrency(item.costPrice)}
                              </span>
                            </td>
                          )}

                          {/* Price */}
                          <td className="py-2 px-3">
                            <span className={
                              isSelected 
                                ? "text-xs font-semibold tabular-nums text-blue-900 dark:text-blue-100" 
                                : "text-xs font-semibold tabular-nums text-slate-900 dark:text-white"
                            }>
                              {formatCurrency(item.sellingPrice)}
                            </span>
                          </td>

                          {/* Profit Margin */}
                          <td className="py-2 px-3">
                            <div className="flex items-center justify-start gap-1">
                              <span className={`text-xs font-bold tabular-nums ${profitMargin >= 30 ? 'text-green-600' : profitMargin >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                                {profitMargin.toFixed(1)}%
                              </span>
                            </div>
                          </td>

                          {/* Actions Column - Hidden for agents (operations) */}
                          {!isDepartment && (
                            <td className="py-2 px-3">
                              <TooltipProvider>
                                <div className="flex justify-start gap-0.5">

                                  {/* Restock - only for non-bundles, non-department users */}
                                  {!isDepartment && !isBundle && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => { e.stopPropagation(); handleRestock(item) }}
                                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 h-9 w-9 p-0"
                                        >
                                          <PackagePlus className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Restock</p></TooltipContent>
                                    </Tooltip>
                                  )}

                                  {/* Edit - for non-bundles: admins only; for bundles: everyone */}
                                  {(!isBundle && !isDepartment) || isBundle ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => { e.stopPropagation(); handleEdit(item) }}
                                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 h-9 w-9 p-0"
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Edit</p></TooltipContent>
                                    </Tooltip>
                                  ) : null}

                                  {/* Delete - for non-bundles: admins only; for bundles: everyone */}
                                  {(!isBundle && !isDepartment) || isBundle ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => { e.stopPropagation(); openDeleteDialog(item.id, item.name) }}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-9 w-9 p-0"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Delete</p></TooltipContent>
                                    </Tooltip>
                                  ) : null}

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

              {/* Pagination */}
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredItems.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size)
                  setCurrentPage(1)
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}

      <AddItemDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onSuccess={fetchItems} />

      <CreateBundleDialog 
        open={createBundleOpen} 
        onOpenChange={(open) => {
          setCreateBundleOpen(open)
          // Clear selectedItem when closing modal to ensure fresh state for next open
          if (!open) {
            setSelectedItem(null)
          }
        }}
        onSuccess={fetchItems}
        editMode={!!(selectedItem as any)?.bundleId}
        bundleId={(selectedItem as any)?.bundleId}
        initialData={(selectedItem as any)?.bundleId ? {
          name: selectedItem?.name || '',
          description: (selectedItem as any)?.bundleData?.description || '',
          bundlePrice: selectedItem?.sellingPrice || 0,
          badge: (selectedItem as any)?.bundleData?.badge || '',
          salesChannel: selectedItem?.salesChannel || 'Physical Store',
          store: selectedItem?.store || 'Main Store',
          imageUrl: selectedItem?.imageUrl || null,
          bundleItems: (selectedItem as any)?.bundleItems || []
        } : undefined}
      />

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
                  Suggested: {selectedRestockItem.reorderLevel} units
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

      {/* Category Management Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
          {/* Professional Header with Dark Gradient */}
          <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-8 py-6 border-b border-slate-600 flex-shrink-0">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Tag className="h-6 w-6 text-white" />
                </div>
                <span className="text-white">Category Management</span>
              </DialogTitle>
              <DialogDescription className="text-slate-200 text-sm mt-2 font-medium">
                Add and manage product categories
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 px-8 py-6 min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-500 [&::-webkit-scrollbar]:opacity-0 hover:[&::-webkit-scrollbar]:opacity-100 transition-opacity">
            {/* Add New Category Section - More Prominent */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Plus className="h-4 w-4 text-orange-600" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Add New Category</h3>
              </div>
              
              <div>
                <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Category Name *
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Enter category name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newCategory.trim()) {
                        handleAddCategory()
                      }
                    }}
                    className="h-10 text-sm rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    disabled={submitting}
                  />
                  <Button
                    onClick={handleAddCategory}
                    disabled={!newCategory.trim() || submitting}
                    className="h-10 px-6 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold flex-shrink-0 shadow-sm"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1.5" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Existing Categories List */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 px-1">
                Existing Categories ({categories.length})
              </h3>

            {/* Category List */}
            {categories.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                <Tag className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No categories yet</p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Add your first category using the form above</p>
              </div>
            ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
                >
                  {editingCategory?.id === category.id ? (
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={editCategoryValue}
                        onChange={(e) => setEditCategoryValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleEditCategory()
                          }
                          if (e.key === "Escape") {
                            setEditingCategory(null)
                            setEditCategoryValue("")
                          }
                        }}
                        className="h-9 text-sm flex-1"
                        disabled={submitting}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleEditCategory}
                        disabled={submitting || !editCategoryValue.trim()}
                        className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white text-sm whitespace-nowrap"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingCategory(null)
                          setEditCategoryValue("")
                        }}
                        disabled={submitting}
                        className="h-9 px-4 text-sm whitespace-nowrap"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Tag className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{category.name}</span>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingCategory(category)
                            setEditCategoryValue(category.name)
                          }}
                          disabled={submitting}
                          className="h-7 w-7 p-0 text-slate-600 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteCategoryId(category.id)}
                          disabled={submitting}
                          className="h-7 w-7 p-0 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Store Management Dialog */}
      <Dialog open={storeDialogOpen} onOpenChange={setStoreDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
          {/* Professional Header with Dark Gradient */}
          <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-8 py-6 border-b border-slate-600 flex-shrink-0">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Warehouse className="h-6 w-6 text-white" />
                </div>
                <span className="text-white">Store Management</span>
              </DialogTitle>
              <DialogDescription className="text-slate-200 text-sm mt-2 font-medium">
                Add and manage stores organized by sales channel
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 px-8 py-6 min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-500 [&::-webkit-scrollbar]:opacity-0 hover:[&::-webkit-scrollbar]:opacity-100 transition-opacity">
            {/* Add New Store Section - More Prominent */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Plus className="h-4 w-4 text-orange-600" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Add New Store</h3>
              </div>
              
              <div className="space-y-2">
                <div>
                  <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                    Sales Channel *
                  </Label>
                  <Select 
                    value={newStore.salesChannel} 
                    onValueChange={(value) => setNewStore({ ...newStore, salesChannel: value })}
                    disabled={submitting || isDepartment}
                  >
                    <SelectTrigger className="h-10 text-sm rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                      <SelectValue placeholder={isDepartment ? userDepartment : "Choose a sales channel"} />
                    </SelectTrigger>
                    <SelectContent>
                      {isDepartment ? (
                        <SelectItem value={userDepartment}>{userDepartment}</SelectItem>
                      ) : (
                        SALES_CHANNELS.map((channel) => (
                          <SelectItem key={channel} value={channel}>
                            {channel}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {isDepartment && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      You can only add stores for your department ({userDepartment})
                    </p>
                  )}
                </div>
                
                <div>
                  <Label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                    Store Name *
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Enter store name"
                      value={newStore.name}
                      onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && handleAddStore()}
                      disabled={submitting}
                      className="h-10 text-sm rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    />
                    <Button
                      onClick={handleAddStore}
                      disabled={!newStore.name.trim() || !newStore.salesChannel || submitting}
                      className="h-10 px-6 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold flex-shrink-0 shadow-sm"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1.5" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Existing Stores List */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 px-1">
                Existing Stores ({isDepartment ? stores.filter(s => s.sales_channel === userDepartment).length : stores.length})
              </h3>

            {/* Store List */}
            {(isDepartment ? stores.filter(s => s.sales_channel === userDepartment) : stores).length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                <Warehouse className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No stores yet</p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Add your first store using the form above</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(isDepartment ? [userDepartment] : SALES_CHANNELS).map((channel) => {
                  const channelStores = stores.filter(s => s.sales_channel === channel)
                  if (channelStores.length === 0) return null
                  
                  return (
                    <div key={channel} className="space-y-2">
                      <div className="flex items-center gap-2 px-2">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                          {channel} ({channelStores.length})
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
                      </div>
                      {channelStores.map((store) => (
                        <div
                          key={store.id}
                          className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
                        >
                          {editingStore?.id === store.id ? (
                            <div className="flex-1 space-y-2">
                              <Select 
                                value={editStoreValue.salesChannel} 
                                onValueChange={(value) => setEditStoreValue({ ...editStoreValue, salesChannel: value })}
                                disabled={submitting}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {SALES_CHANNELS.map((ch) => (
                                    <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex gap-2">
                                <Input
                                  value={editStoreValue.name}
                                  onChange={(e) => setEditStoreValue({ ...editStoreValue, name: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleEditStore()
                                    if (e.key === "Escape") {
                                      setEditingStore(null)
                                      setEditStoreValue({ name: "", salesChannel: "" })
                                    }
                                  }}
                                  disabled={submitting}
                                  className="h-8 text-xs flex-1"
                                  autoFocus
                                />
                                <Button
                                  onClick={handleEditStore}
                                  disabled={!editStoreValue.name.trim() || !editStoreValue.salesChannel || submitting}
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                </Button>
                                <Button
                                  onClick={() => {
                                    setEditingStore(null)
                                    setEditStoreValue({ name: "", salesChannel: "" })
                                  }}
                                  disabled={submitting}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm font-medium text-slate-900 dark:text-white flex-1">
                                {store.store_name}
                              </span>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingStore(store)
                                    setEditStoreValue({ name: store.store_name, salesChannel: store.sales_channel })
                                  }}
                                  disabled={submitting}
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteWarehouseId(store.id)}
                                  disabled={submitting}
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Store Confirmation */}
      <Dialog open={!!deleteWarehouseId} onOpenChange={() => setDeleteWarehouseId(null)}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Delete Store</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Are you sure you want to delete this store? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteWarehouseId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => deleteWarehouseId && handleDeleteStore(deleteWarehouseId)}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <Dialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white text-xl font-semibold">Delete Category</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Are you sure you want to delete this category? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteCategoryId(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteCategoryId && handleDeleteCategory(deleteCategoryId)}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Professional SaaS Delete Confirmation Modal */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden border-0">
          {/* Header with gradient background - Reduced height */}
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
