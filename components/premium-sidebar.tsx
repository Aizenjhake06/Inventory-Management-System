"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  AlertTriangle,
  XCircle,
  TrendingUp,
  FileText,
  LogOut,
  Users,
  Brain,
  X,
  Settings,
  BarChart2,
  Briefcase,
  PackageSearch,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/hooks/use-accessibility"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { getCurrentUser, hasPermission } from "@/lib/auth"
import { apiGet } from "@/lib/api-client"

interface NavItem {
  name: string
  href: string
  icon: any
  badge?: number
  badgeVariant?: 'default' | 'destructive' | 'warning'
}

interface NavSection {
  section: string
  items: NavItem[]
}

const getNavigation = (lowStockCount: number = 0, outOfStockCount: number = 0): NavSection[] => [
  {
    section: "Main",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Point of Sale (POS)", href: "/dashboard/pos", icon: ShoppingCart },
    ],
  },
  {
    section: "Inventory",
    items: [
      { name: "Products", href: "/dashboard/inventory", icon: Package },
      { 
        name: "Low Stocks", 
        href: "/dashboard/inventory/low-stock", 
        icon: AlertTriangle,
        badge: lowStockCount > 0 ? lowStockCount : undefined,
        badgeVariant: 'warning'
      },
      { 
        name: "Out of Stocks", 
        href: "/dashboard/inventory/out-of-stock", 
        icon: XCircle,
        badge: outOfStockCount > 0 ? outOfStockCount : undefined,
        badgeVariant: 'destructive'
      },
    ],
  },
  {
    section: "Business",
    items: [
      { name: "Business Contacts", href: "/dashboard/business-contacts", icon: Briefcase },
    ],
  },
  {
    section: "Operations",
    items: [
      { name: "Internal Usage", href: "/dashboard/internal-usage", icon: PackageSearch },
    ],
  },
  {
    section: "Analytics",
    items: [
      { name: "Sales Analytics", href: "/dashboard/analytics", icon: TrendingUp }, // Admin only
    ],
  },
  {
    section: "System",
    items: [
      { name: "Activity Logs", href: "/dashboard/log", icon: FileText },
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
]

interface PremiumSidebarProps {
  onNavClick?: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
  onCollapsedChange?: (collapsed: boolean) => void
}

export function PremiumSidebar({ onNavClick, mobileOpen = false, onMobileClose, onCollapsedChange }: PremiumSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false) // Default: false = expanded/open
  const reducedMotion = useReducedMotion()
  const [isMobile, setIsMobile] = useState(false)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [outOfStockCount, setOutOfStockCount] = useState(0)
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getCurrentUser>>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  // Get current user
  useEffect(() => {
    setCurrentUser(getCurrentUser())
  }, [])

  // Notify parent when collapsed state changes
  useEffect(() => {
    onCollapsedChange?.(collapsed)
  }, [collapsed, onCollapsedChange])

  // Fetch inventory counts for badges (admin only)
  useEffect(() => {
    const fetchInventoryCounts = async () => {
      try {
        // Skip for non-admin users who don't have access to /api/items
        const user = getCurrentUser()
        if (user?.role !== 'admin') {
          return
        }

        const items = await apiGet<any[]>('/api/items')
        const lowStock = items.filter((item: any) => item.quantity > 0 && item.quantity <= item.reorderLevel).length
        const outOfStock = items.filter((item: any) => item.quantity === 0).length
        setLowStockCount(lowStock)
        setOutOfStockCount(outOfStock)
      } catch (error) {
        console.error('Error fetching inventory counts:', error)
      }
    }

    fetchInventoryCounts()
    // Refresh counts every 30 seconds
    const interval = setInterval(fetchInventoryCounts, 30000)
    return () => clearInterval(interval)
  }, [])

  const allNavigation = getNavigation(lowStockCount, outOfStockCount)
  
  // Filter navigation based on user role
  const navigation = currentUser ? allNavigation.map(section => ({
    ...section,
    items: section.items.filter(item => {
      const hasAccess = hasPermission(currentUser.role, item.href)
      console.log(`[Sidebar] ${currentUser.role} - ${item.name} (${item.href}): ${hasAccess}`)
      return hasAccess
    })
  })).filter(section => section.items.length > 0) : allNavigation

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    if (isMobile && mobileOpen) {
      onMobileClose?.()
    }
  }, [pathname])

  const handleNavClick = () => {
    onNavClick?.()
    if (isMobile) {
      onMobileClose?.()
    }
  }

  const handleLogout = async () => {
    try {
      console.log('[Sidebar] Starting logout...')
      
      // Check if team leader
      const user = getCurrentUser()
      
      console.log('[Sidebar] User role:', user?.role)
      
      // Set a marker BEFORE clearing to prevent race conditions
      if (typeof window !== 'undefined') {
        try {
          // Use a cookie as backup since localStorage might fail
          document.cookie = '__logout_marker__=true; path=/; max-age=10'
          console.log('[Sidebar] Logout marker set in cookie')
        } catch (e) {
          console.error('[Sidebar] Cookie error:', e)
        }
      }
      
      // CRITICAL: Unregister service worker to clear all caches
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations()
          console.log('[Sidebar] Found service workers:', registrations.length)
          
          for (const registration of registrations) {
            await registration.unregister()
            console.log('[Sidebar] Service worker unregistered')
          }
        } catch (e) {
          console.error('[Sidebar] Service worker unregister error:', e)
        }
      }
      
      // Clear all caches
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys()
          console.log('[Sidebar] Found caches:', cacheNames)
          
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName)
            console.log('[Sidebar] Cache deleted:', cacheName)
          }
        } catch (e) {
          console.error('[Sidebar] Cache delete error:', e)
        }
      }
      
      // Use the proper clearCurrentUser function from lib/auth.ts
      // This ensures all session keys are properly removed
      const { clearCurrentUser } = await import('@/lib/auth')
      clearCurrentUser()
      console.log('[Sidebar] clearCurrentUser() called')
      
      // Additional aggressive clearing for any remaining keys
      if (typeof window !== 'undefined' && localStorage) {
        console.log('[Sidebar] Double-checking localStorage...')
        
        // Get all remaining keys
        const keys = Object.keys(localStorage)
        console.log('[Sidebar] Remaining keys after clearCurrentUser:', keys)
        
        // Remove any remaining keys
        if (keys.length > 0) {
          console.log('[Sidebar] Removing remaining keys:', keys)
          keys.forEach(key => {
            try {
              localStorage.removeItem(key)
            } catch (e) {
              console.error('[Sidebar] Error removing key:', key, e)
            }
          })
        }
        
        // Final clear
        try {
          localStorage.clear()
          console.log('[Sidebar] localStorage.clear() called')
        } catch (e) {
          console.error('[Sidebar] localStorage.clear() error:', e)
        }
      }
      
      // Clear sessionStorage
      if (typeof window !== 'undefined' && sessionStorage) {
        console.log('[Sidebar] Clearing sessionStorage...')
        try {
          sessionStorage.clear()
          console.log('[Sidebar] sessionStorage cleared')
        } catch (e) {
          console.error('[Sidebar] sessionStorage.clear() error:', e)
        }
      }
      
      // Force redirect with timestamp to prevent caching
      const timestamp = Date.now()
      console.log('[Sidebar] Redirecting to login with timestamp:', timestamp)
      
      // Use location.replace to prevent back button
      window.location.replace(`/?logout=${timestamp}`)
      
    } catch (error) {
      console.error('[Sidebar] Logout error:', error)
      // Force redirect even on error
      window.location.replace('/?logout=error')
    }
  }

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobile && mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobile, mobileOpen])

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed z-50 flex flex-col",
          reducedMotion ? "" : "transition-all duration-300",
          // Fixed width - no more collapsing
          "w-48 xl:w-52",
          isMobile && !mobileOpen && "-translate-x-full",
          isMobile && mobileOpen && "translate-x-0",
          // Desktop: clean edge with subtle border
          "lg:left-0 lg:top-0 lg:h-screen",
          // Mobile: full screen
          "left-0 top-0 h-screen",
          // Light mode - gradient matching track-orders table header
          "bg-gradient-to-b from-slate-800 to-slate-900 border-r border-slate-700/50",
          // Dark mode - pure black with subtle border
          "dark:bg-none dark:bg-black dark:border-slate-800/60"
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo & Brand - Professional Layout with Dark Mode Support */}
        <div 
          className="h-16 flex items-center px-1.5 xl:px-2 flex-shrink-0 relative"
        >
          {/* Bottom border line - matching separator style */}
          <div className="absolute bottom-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white to-transparent dark:from-transparent dark:via-white dark:to-transparent" />
          
          {/* Logo - Centered */}
          <div className="flex items-center justify-center flex-1">
            <div className="flex items-center justify-center py-1.5">
              <img 
                src="/wihilogo.png" 
                alt="WIHI Logo" 
                className="h-12 w-auto object-contain"
              />
            </div>
          </div>
          
          {/* Mobile Close Button */}
          {isMobile && (
            <button
              onClick={onMobileClose}
              className="ml-auto p-2 rounded-lg transition-colors text-white hover:bg-white/10 dark:text-slate-400 dark:hover:bg-slate-800 flex-shrink-0"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2.5 xl:py-3 px-1.5 xl:px-2 min-h-0 max-h-full scrollbar-hide" aria-label="Primary">
          {navigation.map((section, sectionIdx) => (
            <div key={section.section} className={cn("mb-4 xl:mb-5", sectionIdx === 0 && "mt-0")}>
              {/* Separator line above section (except first section) */}
              {!collapsed && sectionIdx > 0 && (
                <div className="h-px mb-3 mx-2 bg-gradient-to-r from-transparent via-white to-transparent dark:from-transparent dark:via-white dark:to-transparent" />
              )}
              {!collapsed && (
                <div className="px-1.5 xl:px-2 mb-1">
                  <p className="text-xs xl:text-sm font-semibold uppercase tracking-wider text-white dark:text-white">
                    {section.section}
                  </p>
                </div>
              )}
              {collapsed && sectionIdx > 0 && (
                <div className="h-px my-2.5 xl:my-3 mx-2 bg-gradient-to-r from-transparent via-white to-transparent dark:from-transparent dark:via-white dark:to-transparent" />
              )}
              <div className="space-y-0.5 xl:space-y-1" role="list">
                {section.items.map((item) => {
                  const isActive = pathname === item.href
                  const NavLink = (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleNavClick}
                      className={cn(
                        "flex items-center group relative overflow-hidden",
                        reducedMotion ? "" : "transition-all duration-200",
                        // Collapsed state: centered icon with better spacing
                        collapsed ? "justify-center py-2.5 xl:py-3 mx-auto" : "gap-1.5 xl:gap-2 px-1.5 xl:px-2 py-1.5 xl:py-2",
                        // Active state - GOLD GRADIENT with LEFT BORDER
                        isActive 
                          ? "border-l-3 border-amber-500" 
                          : "text-white/70 hover:text-white hover:bg-amber-500/5 dark:text-white/70 dark:hover:text-white dark:hover:bg-amber-500/5 border-l-3 border-transparent",
                        // Smooth transitions
                        "transition-all duration-200"
                      )}
                      style={isActive ? {
                        borderLeftWidth: '3px',
                        borderLeftColor: '#f59e0b',
                        background: 'rgba(245, 158, 11, 0.10)',
                      } : {
                        borderLeftWidth: '3px',
                        borderLeftColor: 'transparent'
                      }}
                      aria-current={isActive ? "page" : undefined}
                      role="listitem"
                    >
                      {/* Icon with neon glow effect when active */}
                      <div className={cn(
                        "flex items-center justify-center flex-shrink-0 relative",
                        collapsed ? "w-5 h-5 xl:w-6 xl:h-6" : ""
                      )}>
                        <item.icon
                          className={cn(
                            "flex-shrink-0 relative z-10",
                            collapsed 
                              ? "h-[16px] w-[16px] xl:h-[18px] xl:w-[18px]" 
                              : "h-[13px] w-[13px] xl:h-[14px] xl:w-[14px]",
                            // Icon animation on hover
                            !reducedMotion && "group-hover:scale-110 transition-transform duration-200"
                          )}
                          strokeWidth={isActive ? 2.5 : 2}
                          style={isActive ? {
                            filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.8)) drop-shadow(0 0 12px rgba(245, 158, 11, 0.4))',
                            color: '#fbbf24'
                          } : undefined}
                          aria-hidden="true"
                        />
                        {/* Gold glow backdrop for active icon */}
                        {isActive && (
                          <div 
                            className="absolute inset-0 blur-md opacity-50"
                            style={{
                              background: 'radial-gradient(circle, rgba(245, 158, 11, 0.6) 0%, transparent 70%)'
                            }}
                          />
                        )}
                      </div>
                      
                      {!collapsed && (
                        <>
                          <span 
                            className={cn(
                              "text-xs xl:text-sm flex-1 relative z-10",
                              isActive ? "font-semibold" : "font-normal"
                            )}
                            style={isActive ? {
                              background: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                              filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.5))'
                            } : undefined}
                          >
                            {item.name}
                          </span>
                          {item.badge !== undefined && (
                            <Badge 
                              variant={item.badgeVariant === 'destructive' ? 'destructive' : item.badgeVariant === 'warning' ? 'default' : 'default'}
                              className={cn(
                                "ml-auto text-xs xl:text-sm px-1 xl:px-1.5 py-0",
                                item.badgeVariant === 'warning' && "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
                                isActive && "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                              )}
                              style={isActive ? {
                                boxShadow: '0 0 8px rgba(245, 158, 11, 0.3)'
                              } : undefined}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                      
                      {/* Enhanced badge for collapsed state */}
                      {collapsed && item.badge !== undefined && (
                        <div className={cn(
                          "absolute -top-0.5 -right-0.5 xl:-top-1 xl:-right-1",
                          "min-w-[16px] h-[16px] xl:min-w-[18px] xl:h-[18px]",
                          "rounded-full flex items-center justify-center",
                          "text-white text-xs xl:text-sm font-bold",
                          "shadow-lg",
                          "border-2 border-white dark:border-slate-900",
                          item.badgeVariant === 'destructive' 
                            ? "bg-gradient-to-br from-red-500 to-red-600" 
                            : item.badgeVariant === 'warning'
                            ? "bg-gradient-to-br from-amber-500 to-amber-600"
                            : "bg-gradient-to-br from-blue-500 to-blue-600",
                          !reducedMotion && "animate-pulse"
                        )}>
                          {item.badge > 9 ? '9+' : item.badge}
                        </div>
                      )}
                    </Link>
                  )

                  return collapsed ? (
                    <TooltipProvider key={item.name}>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          {NavLink}
                        </TooltipTrigger>
                        <TooltipContent 
                          side="right" 
                          className={cn(
                            "font-medium shadow-xl border-slate-200 dark:border-slate-700",
                            "bg-white/95 dark:bg-black/95 backdrop-blur-sm"
                          )}
                          sideOffset={12}
                        >
                          <p className="font-semibold">{item.name}</p>
                          {item.badge !== undefined && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {item.badge} {item.badgeVariant === 'warning' ? 'low stock' : item.badgeVariant === 'destructive' ? 'out of stock' : 'items'}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : NavLink
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout Button Container */}
        <div className="p-2.5 xl:p-3 border-t flex-shrink-0 border-white/10 dark:border-slate-800/60">
          {collapsed ? (
            <TooltipProvider>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className={cn(
                      "flex items-center justify-center rounded-lg w-full group relative overflow-hidden",
                      "py-2.5 xl:py-3",
                      reducedMotion ? "" : "transition-all duration-200",
                      "text-white hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-600",
                      "dark:text-white dark:hover:bg-gradient-to-r dark:hover:from-red-900/20 dark:hover:to-red-900/30 dark:hover:text-white",
                      !reducedMotion && "hover:scale-105"
                    )}
                    aria-label="Logout from application"
                  >
                    <div className="flex items-center justify-center w-5 h-5 xl:w-6 xl:h-6">
                      <LogOut
                        className={cn(
                          "h-[12px] w-[12px] xl:h-[18px] xl:w-[18px] flex-shrink-0",
                          !reducedMotion && "group-hover:scale-110 transition-transform duration-200"
                        )}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent 
                  side="right" 
                  className={cn(
                    "font-medium shadow-xl border-slate-200 dark:border-slate-700",
                    "bg-white/95 dark:bg-black/95 backdrop-blur-sm"
                  )}
                  sideOffset={12}
                >
                  <p className="font-semibold text-red-600 dark:text-red-400">Logout</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Sign out of your account</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className={cn(
                "flex items-center gap-1.5 xl:gap-2 px-1.5 xl:px-2 py-1.5 xl:py-2 rounded-lg w-full",
                reducedMotion ? "" : "transition-colors duration-200",
                "text-white hover:bg-red-500/20 hover:text-white dark:text-white dark:hover:bg-red-900/20 dark:hover:text-white"
              )}
              aria-label="Logout from application"
            >
              <LogOut
                className="h-[13px] w-[13px] xl:h-[14px] xl:w-[14px] flex-shrink-0"
                strokeWidth={2}
                aria-hidden="true"
              />
              <span className="text-xs xl:text-sm font-medium">
                Logout
              </span>
            </button>
          )}
        </div>
      </aside>

      {/* Professional Logout Confirmation Modal */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
          <AlertDialogHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                <LogOut className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <AlertDialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                  Sign Out
                </AlertDialogTitle>
                {currentUser && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {currentUser.displayName || currentUser.username} • {currentUser.role === 'admin' ? 'Main Admin' : currentUser.role === 'logistics' ? 'Logistics Admin' : currentUser.role === 'operations' ? 'Department User' : currentUser.role?.charAt(0).toUpperCase() + currentUser.role?.slice(1)}
                  </p>
                )}
              </div>
            </div>
          </AlertDialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              You are about to sign out of your account. Any unsaved work will be lost.
            </p>
          </div>

          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="mt-0 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
              Stay Signed In
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLogout}
              className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
