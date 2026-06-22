"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Package, AlertCircle } from "lucide-react"
import type { InventoryItem } from "@/lib/types"
import { apiGet, apiPut } from "@/lib/api-client"
import { getCurrentUser } from "@/lib/auth"
import { formatCurrency, cn } from "@/lib/utils"
import { ImageUpload } from "@/components/ui/image-upload"
import { toast } from "sonner"

// Helper functions for bundle calculations
function calculateBundleCost(components: Array<{ quantity: number; costPrice: number }>): number {
  return components.reduce((total, comp) => total + (comp.quantity * comp.costPrice), 0)
}

function calculateVirtualStock(components: Array<{ quantity: number; currentStock: number }>): number {
  if (components.length === 0) return 0
  return Math.min(...components.map(comp => Math.floor(comp.currentStock / comp.quantity)))
}

interface EditItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem
  onSuccess: () => void
}

export function EditItemDialog({ open, onOpenChange, item, onSuccess }: EditItemDialogProps) {
  const [loading, setLoading] = useState(false)
  const [componentItems, setComponentItems] = useState<InventoryItem[]>([])
  const [loadingComponents, setLoadingComponents] = useState(false)
  const currentUser = getCurrentUser()
  const isAdmin = currentUser?.role === 'admin'
  
  // Check if this is a bundle product
  const isBundle = item.productType === 'bundle' || (item as any).product_type === 'bundle'
  const bundleComponents = (item as any).bundle_components || (item as any).bundleComponents || []
  
  const [formData, setFormData] = useState({
    name: item.name,
    quantity: item.quantity,
    costPrice: item.costPrice,
    sellingPrice: item.sellingPrice,
    reorderLevel: item.reorderLevel,
  })
  const [imageUrl, setImageUrl] = useState<string | null>(item.imageUrl || null)

  useEffect(() => {
    setFormData({
      name: item.name,
      quantity: item.quantity,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      reorderLevel: item.reorderLevel,
    })
    setImageUrl(item.imageUrl || null)
  }, [item])

  useEffect(() => {
    if (open && isBundle && bundleComponents.length > 0) {
      fetchComponentDetails()
    }
  }, [open, isBundle])

  async function fetchComponentDetails() {
    try {
      setLoadingComponents(true)
      const componentIds = bundleComponents.map((c: any) => c.item_id)
      const items = await apiGet<InventoryItem[]>("/api/items")
      const components = items.filter(item => componentIds.includes(item.id))
      setComponentItems(components)
    } catch (error) {
      console.error("Error fetching component details:", error)
    } finally {
      setLoadingComponents(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      // Use different API endpoint based on product type
      if (isBundle) {
        await apiPut(`/api/bundles/${item.id}`, { ...formData, imageUrl })
      } else {
        await apiPut(`/api/items/${item.id}`, { ...formData, imageUrl })
      }
      
      // Success - close and refresh
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("[EditItemDialog] Error updating item:", error)
      
      // Even if there's an error response, the update might have succeeded
      // Close dialog and trigger refresh to verify
      console.log("[EditItemDialog] Refreshing to verify if update succeeded despite error")
      
      onOpenChange(false)
      
      // Wait a bit then refresh to see if it actually worked
      setTimeout(() => {
        onSuccess()
      }, 500)
      
      // Show warning instead of hard error
      if (error.message && error.message !== 'Request failed') {
        console.warn("[EditItemDialog] Update error:", error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Professional Header with Dark Gradient */}
        <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-8 py-6 border-b border-slate-600 flex-shrink-0">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <span className="text-white">Edit {isBundle ? 'Bundle' : 'Product'}</span>
              </DialogTitle>
              {isBundle && (
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                  Bundle
                </Badge>
              )}
            </div>
            <DialogDescription className="text-slate-200 text-sm mt-2 font-medium">
              Update {isBundle ? 'bundle' : 'product'} information and pricing
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6 space-y-5 min-h-0">
          {/* Product Image Upload - Now available for both products and bundles */}
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300 font-medium text-sm">
              {isBundle ? 'Bundle' : 'Product'} Image <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <ImageUpload
              currentImageUrl={imageUrl}
              itemId={item.id}
              onUploadComplete={(url) => setImageUrl(url)}
              onRemove={() => setImageUrl(null)}
              uploadType="product"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-name" className="text-slate-700 dark:text-slate-300 font-medium">
                Product Name
              </Label>
              <Input
                id="edit-name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-[5px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-quantity" className="text-slate-700 dark:text-slate-300 font-medium">
                Current Stock <span className="text-slate-400 font-normal text-xs">(Read-only)</span>
              </Label>
              <Input
                id="edit-quantity"
                type="number"
                required
                value={formData.quantity}
                readOnly
                disabled
                className="rounded-[5px] border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-not-allowed"
              />
              <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Use Restock button to change stock quantity
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-costPrice" className="text-slate-700 dark:text-slate-300 font-medium">
                Cost Price (₱)
              </Label>
              <Input
                id="edit-costPrice"
                type="number"
                step="0.01"
                required
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: Number.parseFloat(e.target.value) })}
                className="rounded-[5px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-sellingPrice" className="text-slate-700 dark:text-slate-300 font-medium">
                Selling Price (₱)
              </Label>
              <Input
                id="edit-sellingPrice"
                type="number"
                step="0.01"
                required
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: Number.parseFloat(e.target.value) })}
                className="rounded-[5px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-reorderLevel" className="text-slate-700 dark:text-slate-300 font-medium">
                Reorder Level
              </Label>
              <Input
                id="edit-reorderLevel"
                type="number"
                required
                value={formData.reorderLevel}
                onChange={(e) => setFormData({ ...formData, reorderLevel: Number.parseInt(e.target.value) })}
                className="rounded-[5px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
          </div>
          
          {/* Bundle Components Section */}
          {isBundle && bundleComponents.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Bundle Components
                </h3>
              </div>
              
              {loadingComponents ? (
                <div className="text-center py-8 text-slate-500">Loading components...</div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {bundleComponents.map((component: any, index: number) => {
                    const componentItem = componentItems.find(item => item.id === component.item_id)
                    const subtotal = componentItem ? componentItem.costPrice * component.quantity : 0
                    const canMake = componentItem ? Math.floor(componentItem.quantity / component.quantity) : 0
                    
                    return (
                      <div
                        key={component.item_id || index}
                        className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="h-4 w-4 text-slate-500 flex-shrink-0" />
                              <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                                {componentItem?.name || 'Unknown Product'}
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">Quantity:</span>
                                <span className="ml-1 font-medium text-slate-900 dark:text-white">
                                  {component.quantity} {component.quantity === 1 ? 'unit' : 'units'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">Current Stock:</span>
                                <span className={cn(
                                  "ml-1 font-medium",
                                  componentItem && componentItem.quantity < component.quantity
                                    ? "text-red-600 dark:text-red-400"
                                    : componentItem && componentItem.quantity < component.quantity * 5
                                    ? "text-yellow-600 dark:text-yellow-400"
                                    : "text-green-600 dark:text-green-400"
                                )}>
                                  {componentItem?.quantity || 0} units
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">Unit Cost:</span>
                                <span className="ml-1 font-medium text-slate-900 dark:text-white">
                                  {componentItem ? formatCurrency(componentItem.costPrice) : '₱0.00'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 dark:text-slate-400">Subtotal:</span>
                                <span className="ml-1 font-medium text-slate-900 dark:text-white">
                                  {formatCurrency(subtotal)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                Can make: <span className="font-medium text-slate-900 dark:text-white">{canMake}</span> bundles
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {componentItem && componentItem.quantity === 0 && (
                          <div className="mt-3 flex items-start gap-2 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-red-700 dark:text-red-300">
                              Out of stock - Cannot make any bundles
                            </p>
                          </div>
                        )}
                        
                        {componentItem && componentItem.quantity > 0 && componentItem.quantity < component.quantity && (
                          <div className="mt-3 flex items-start gap-2 p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-yellow-700 dark:text-yellow-300">
                              Insufficient stock - Need {component.quantity} units per bundle
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              
              {/* Bundle Summary */}
              {!loadingComponents && componentItems.length > 0 && (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                      Total Bundle Cost
                    </p>
                    <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                      {formatCurrency(calculateBundleCost(bundleComponents.map((c: any) => {
                        const item = componentItems.find(i => i.id === c.item_id)
                        return {
                          ...c,
                          itemId: c.item_id,
                          costPrice: item?.costPrice || 0,
                          currentStock: item?.quantity || 0
                        }
                      })))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                      Virtual Stock
                    </p>
                    <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                      {calculateVirtualStock(bundleComponents.map((c: any) => {
                        const item = componentItems.find(i => i.id === c.item_id)
                        return {
                          ...c,
                          itemId: c.item_id,
                          quantity: c.quantity,
                          currentStock: item?.quantity || 0
                        }
                      }))} bundles
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
        
        {/* Professional Footer */}
        <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 flex-shrink-0">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="px-6 border-2 font-semibold"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            onClick={handleSubmit}
            className="px-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg"
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
