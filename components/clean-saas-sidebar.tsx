"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  FileText,
  Users,
  Settings,
  TrendingUp,
  AlertCircle,
  PackageX,
  History,
  Lightbulb,
  Activity,
  ChevronLeft,
  X,
} from "lucide-react"

interface NavItem {
  name: string
  href: string
  icon: any
  badge?: number
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Inventory", href: "/dashboard/inventory", icon: Package },
  { name: "Point of Sale (POS)", href: "/dashboard/pos", icon: ShoppingCart },
  { name: "Sales Analytics", href: "/dashboard/sales", icon: TrendingUp },
  { name: "Business Insights", href: "/dashboard/insights", icon: Lightbulb },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Customers", href: "/dashboard/customers", icon: Users },
  { name: "Activity Log", href: "/dashboard/log", icon: History },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

interface CleanSaaSSidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
  onCollapsedChange?: (collapsed: boolean) => void
}

export function CleanSaaSSidebar({ 
  mobileOpen, 
  onMobileClose,
  onCollapsedChange 
}: CleanSaaSSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const handleCollapse = () => {
    const newCollapsed = !collapsed
    setCollapsed(newCollapsed)
    onCollapsedChange?.(newCollapsed)
  }

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-[#F8FAFC] border-r border-[#E5E7EB] z-50 transition-all duration-200",
          collapsed ? "w-[72px]" : "w-[240px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#E5E7EB]">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <img 
                src="/wihilogo.png" 
                alt="WIHI Logo" 
                className="h-11 w-auto object-contain"
              />
            </Link>
          )}
          {collapsed && (
            <Link href="/dashboard" className="flex items-center justify-center w-full">
              <img 
                src="/wihilogo.png" 
                alt="WIHI Logo" 
                className="h-11 w-auto object-contain"
              />
            </Link>
          )}
          
          {/* Mobile Close Button */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1 hover:bg-slate-200 rounded-md transition-colors"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className={cn("flex-shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
                  {!collapsed && (
                    <span className="truncate">{item.name}</span>
                  )}
                  {!collapsed && item.badge && (
                    <span className="ml-auto bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Collapse Button (Desktop Only) */}
        <div className="hidden lg:block p-2 border-t border-[#E5E7EB]">
          <button
            onClick={handleCollapse}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-all duration-150"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                collapsed && "rotate-180"
              )}
            />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
