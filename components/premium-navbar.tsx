"use client"

import React, { useState } from "react"
import { Bell, Settings, User, Menu, RefreshCw, LogOut, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/hooks/use-accessibility"
import { CommandPaletteSearch } from "@/components/command-palette-search"
import { getCurrentUser } from "@/lib/auth"
import { ToggleTheme } from "@/components/ui/toggle-theme"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

interface PremiumNavbarProps {
  sidebarCollapsed?: boolean
  onMenuClick?: () => void
  onMobileMenuToggle?: () => void
}

export function PremiumNavbar({ sidebarCollapsed, onMenuClick, onMobileMenuToggle }: PremiumNavbarProps) {
  const [username, setUsername] = useState("Admin User")
  const [userRole, setUserRole] = useState("Administrator")
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getCurrentUser>>(null)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const reducedMotion = useReducedMotion()
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  // Get current user only on client side to avoid hydration errors
  React.useEffect(() => {
    setCurrentUser(getCurrentUser())
  }, [])

  // Get user info from localStorage
  React.useEffect(() => {
    const loadUserData = () => {
      setCurrentUser(getCurrentUser())
      
      if (typeof window !== 'undefined') {
        try {
          const storedUsername = localStorage.getItem("username")
          const storedRole = localStorage.getItem("userRole")
          const displayName = localStorage.getItem("displayName")
          const assignedChannel = localStorage.getItem("assignedChannel")
          const storedProfileImage = localStorage.getItem("profileImage")
          
          console.log('[Header] Loading user data from localStorage:', {
            storedUsername,
            displayName,
            storedProfileImage,
            hasImage: !!storedProfileImage
          })
          
          if (storedUsername) {
            setUsername(displayName || storedUsername)
          }
          if (storedRole) {
            // Set proper role display names
            if (storedRole === "admin") {
              setUserRole("Administrator")
            } else if (storedRole === "dept-manager") {
              setUserRole("Dept. Head")
            } else if (storedRole === "operations") {
              setUserRole("Agent")  // Changed from channel name to "Agent"
            } else if (storedRole === "tracker") {
              setUserRole("Tracker")
            } else if (storedRole === "packer") {
              setUserRole("Packer")
            } else if (storedRole === "logistics") {
              setUserRole("Logistics")
            } else {
              setUserRole("Staff")
            }
          }
          if (storedProfileImage && storedProfileImage !== 'null' && storedProfileImage !== 'undefined') {
            console.log('[Header] Setting profile image:', storedProfileImage)
            setProfileImage(storedProfileImage)
          } else {
            console.log('[Header] No valid profile image, using fallback')
            setProfileImage(null)
          }
        } catch (error) {
          console.error('Error reading from localStorage:', error)
        }
      }
    }

    // Load on mount
    loadUserData()

    // Listen for storage events (from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'displayName' || e.key === 'profileImage' || e.key === 'currentUser') {
        console.log('[Header] Storage event detected:', e.key, e.newValue)
        loadUserData()
      }
    }

    // Listen for custom event (from same tab)
    const handleProfileUpdate = () => {
      console.log('[Header] Profile update event detected')
      loadUserData()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('profileUpdated', handleProfileUpdate)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('profileUpdated', handleProfileUpdate)
    }
  }, [])

  // Update time and date every second
  React.useEffect(() => {
    const updateDateTime = () => {
      const now = new Date()
      const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
      const dateString = now.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
      setCurrentTime(timeString)
      setCurrentDate(dateString)
    }
    
    updateDateTime()
    const interval = setInterval(updateDateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header
      className={cn(
        "fixed z-40",
        reducedMotion ? "" : "transition-all duration-300",
        // Full width header - edge to edge
        "left-0 right-0 top-0 h-16",
        // White background with border
        "bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800"
      )}
      role="banner"
    >
      <div 
        className={cn(
          "h-full px-3 sm:px-6 flex items-center justify-between",
          // Content respects sidebar boundary
          reducedMotion ? "" : "transition-all duration-300",
          sidebarCollapsed ? "lg:ml-14 xl:lg:ml-16" : "lg:ml-48 xl:lg:ml-52"
        )}
      >
        {/* Left: User Info - Compact */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Menu Button */}
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 rounded-lg transition-colors flex-shrink-0 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Open navigation menu"
            aria-expanded="false"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* User Info with Welcome Back */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Department Logo - For Operations AND Dept. Head */}
            {((currentUser?.role === 'operations' || currentUser?.role === 'dept-manager') && currentUser?.assignedChannel) && (
              <div className="flex-shrink-0 hidden lg:block">
                {currentUser.assignedChannel === 'Shopee' && (
                  <img src="/Shopee.png" alt="Shopee" className="h-6 w-auto object-contain" />
                )}
                {currentUser.assignedChannel === 'Lazada' && (
                  <img src="/Lazada.png" alt="Lazada" className="h-6 w-auto object-contain" />
                )}
                {currentUser.assignedChannel === 'Facebook' && (
                  <img src="/facebook.png" alt="Facebook" className="h-6 w-auto object-contain" />
                )}
                {currentUser.assignedChannel === 'TikTok' && (
                  <img src="/tiktok.png" alt="TikTok" className="h-6 w-auto object-contain" />
                )}
                {currentUser.assignedChannel === 'Physical Store' && (
                  <img src="/Physical Store.png" alt="Physical Store" className="h-6 w-auto object-contain" />
                )}
              </div>
            )}
            
            {/* Welcome Back + User Name + Role Badge */}
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none">Welcome back</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{username}</span>
                <span className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full",
                  userRole === "Administrator" 
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" 
                    : userRole.includes("Dept") || userRole === "Dept. Head"
                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                    : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                )}>{userRole}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Date/Time + Actions - Better Spacing */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Date & Time Display - Compact Professional Format */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {currentDate}
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-sm text-slate-900 dark:text-white font-semibold font-mono tabular-nums">
              {currentTime}
            </span>
          </div>

          {/* Mobile Time Only */}
          <div className="md:hidden text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums font-semibold">
            {currentTime}
          </div>
          
          {/* Divider */}
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.location.reload()}
              className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              aria-label="Refresh page"
              title="Refresh"
            >
              <RefreshCw className="h-[18px] w-[18px]" />
            </button>
            
            <ToggleTheme 
              duration={600}
              animationType="flip-x-in"
              className="h-9 w-9 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            />
            
            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="h-9 w-9 rounded-full overflow-hidden border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 transition-all hover:shadow-md flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600"
                  aria-label="User menu"
                  title={`${username} - ${userRole}`}
                >
                  {profileImage ? (
                    <img 
                      src={`/api/image-proxy?url=${encodeURIComponent(profileImage)}`}
                      alt={username}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        console.error('[Header] Image load error:', profileImage)
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <User className="h-5 w-5 text-white" strokeWidth={2.5} />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-semibold">{username}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">{userRole}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => window.location.href = '/dashboard/settings'}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 dark:text-red-400"
                  onSelect={() => setShowLogoutDialog(true)}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Professional Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
          <AlertDialogHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                <LogOut className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <AlertDialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                  Sign Out
                </AlertDialogTitle>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {username} • {userRole}
                </p>
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
              onClick={() => {
                if (typeof window !== 'undefined') {
                  try {
                    localStorage.removeItem("isLoggedIn")
                    localStorage.removeItem("username")
                    localStorage.removeItem("userRole")
                    localStorage.removeItem("displayName")
                    localStorage.removeItem("assignedChannel")
                    localStorage.removeItem("currentUser")
                    localStorage.removeItem("profileImage")
                  } catch (error) {
                    console.error('Error clearing localStorage:', error)
                  }
                }
                window.location.href = "/"
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  )
}
