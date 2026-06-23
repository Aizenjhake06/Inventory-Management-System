"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { 
  Settings, 
  Users, 
  Key, 
  Shield, 
  Database, 
  FileText, 
  ArrowLeft,
  UserCog,
  Lock,
  Package,
  Briefcase,
  PackageSearch
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const adminNavigation = [
  { name: "Instructions", href: "/admin/instructions", icon: FileText },
  { name: "Login Credentials", href: "/admin/credentials", icon: UserCog },
  { name: "Business Contacts", href: "/admin/business-contacts", icon: Briefcase },
  { name: "Internal Usage", href: "/admin/internal-usage", icon: PackageSearch },
  { name: "Track Orders", href: "/admin/track-orders", icon: Package },
  { name: "Product Edit", href: "/admin/product-edit", icon: Settings },
  { name: "Database", href: "/admin/database", icon: Database },
]

interface AdminSidebarProps {
  onBackClick?: () => void
}

export function AdminSidebar({ onBackClick }: AdminSidebarProps) {
  const pathname = usePathname()
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by not rendering theme-dependent styles until mounted
  if (!mounted) {
    return (
      <div className="flex h-full flex-col border-r border-gray-800 bg-black/90 text-white backdrop-blur-sm">
        <div className="flex h-16 items-center justify-center border-b border-gray-800 px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            <h1 className="text-xl font-semibold">Admin Panel</h1>
          </div>
        </div>
        
        <nav className="flex-1 space-y-4 p-2">
          <div>
            <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Administration
            </div>
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-[5px] py-2 px-3 text-sm font-medium transition-colors w-full",
                    isActive
                      ? "bg-orange-500 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <item.icon className={cn(
                    "h-4 w-4 flex-shrink-0",
                    isActive ? "text-white" : "text-cyan-400"
                  )} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </nav>
        
        <div className="border-t border-gray-800 p-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 w-full transition-all py-2 px-2 justify-start text-white hover:bg-gray-800"
            onClick={onBackClick}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Main</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex h-full flex-col border-r",
      theme === 'light'
        ? "border-border bg-sidebar text-sidebar-foreground"
        : "border-gray-800 bg-black/90 text-white backdrop-blur-sm"
    )}>
      <div className={cn("flex h-16 items-center justify-center border-b px-4",
        theme === 'light' ? "border-sidebar-border" : "border-gray-800"
      )}>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-orange-500" />
          <h1 className="text-xl font-semibold">Admin Panel</h1>
        </div>
      </div>
      
      <nav className="flex-1 space-y-4 p-2">
        {/* Admin Section */}
        <div>
          <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Administration
          </div>
          {adminNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-[5px] py-2 px-3 text-sm font-medium transition-colors w-full",
                  isActive
                    ? (theme === 'light' ? "bg-primary text-primary-foreground" : "bg-orange-500 text-white")
                    : (theme === 'light' ? "text-foreground hover:bg-accent hover:text-accent-foreground" : "text-gray-300 hover:bg-gray-800 hover:text-white")
                )}
              >
                <item.icon className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isActive ? "text-white" : "text-primary dark:text-cyan-400"
                )} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>
      
      <div className={cn("border-t p-2", theme === 'light' ? "border-border" : "border-gray-800")}>
        <Button
          variant="ghost"
          size="sm"
          className={cn("flex items-center gap-2 w-full transition-all py-2 px-2 justify-start",
            theme === 'light'
              ? "text-foreground hover:bg-accent hover:text-accent-foreground"
              : "text-white hover:bg-gray-800"
          )}
          onClick={onBackClick}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Main</span>
        </Button>
      </div>
    </div>
  )
}
