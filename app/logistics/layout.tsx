'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, RefreshCw, AlertTriangle } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useSessionGuard } from '@/lib/use-session-guard'

const NAV_ITEMS = [
  { href: '/logistics/dashboard', label: 'Dashboard' },
  { href: '/logistics/products', label: 'Products' },
  { href: '/logistics/packing-queue', label: 'Packing Queue' },
  { href: '/logistics/track-orders', label: 'Track Orders' },
  { href: '/logistics/business-contacts', label: 'Business Contacts' },
  { href: '/logistics/log', label: 'Activity Logs' },
]

export default function LogisticsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')
  const [displayName, setDisplayName] = useState('Logistics Admin')
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [initials, setInitials] = useState('LA')

  // Initialize session guard (single-device security)
  useSessionGuard()

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }))
      const dateString = now.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
      setCurrentDate(dateString)
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)

    const storedDisplayName = localStorage.getItem('displayName')
    if (storedDisplayName) {
      setDisplayName(storedDisplayName)
      setInitials(storedDisplayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2))
    }
    const storedProfileImage = localStorage.getItem('profileImage')
    if (storedProfileImage) setProfileImage(storedProfileImage)

    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    try {
      // Get username before clearing localStorage
      const username = typeof window !== "undefined" ? localStorage.getItem("username") : null
      
      // Call API to destroy session on server
      if (username) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        })
      }
      
      // Clear localStorage
      ['authToken','currentUser','isLoggedIn','username','userRole','displayName','sessionId'].forEach(k => localStorage.removeItem(k))
      toast.success('Logged out successfully')
      router.push('/')
    } catch (error) {
      console.error('[Logout] Error:', error)
      // Still logout locally even if API call fails
      localStorage.clear()
      toast.success('Logged out successfully')
      router.push('/')
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Enterprise Header - Fixed, always visible */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between h-14 px-6">
            {/* Left: Brand + Navigation */}
            <div className="flex items-center gap-8">
              {/* Brand */}
              <div className="flex items-center gap-3 pr-8 border-r border-slate-200 dark:border-slate-800">
                {/* Logo */}
                <img src="/Vertex-icon.png" alt="Vertex" className="h-6 w-auto object-contain dark:hidden" />
                <img src="/Vertex-icon-2.png" alt="Vertex" className="h-6 w-auto object-contain hidden dark:block" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-none">Welcome back</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{displayName}</span>
                </div>
              </div>
              
              {/* Navigation Tabs */}
              <nav className="flex items-center h-14">
                {NAV_ITEMS.map(item => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link 
                      key={item.href} 
                      href={item.href}
                      className={cn(
                        'h-full flex items-center px-4 text-sm font-medium transition-colors relative border-b-2',
                        isActive
                          ? 'text-slate-900 dark:text-white border-slate-900 dark:border-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-transparent'
                      )}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Right: Date/Time + Actions - Better Spacing */}
            <div className="flex items-center gap-6">
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
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRefresh}
                  className="h-9 w-9 p-0 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <RefreshCw className="h-[18px] w-[18px]" />
                </Button>
                <ThemeToggle />
                {/* User Avatar */}
                <div className="flex items-center gap-1.5 ml-1 pl-1 border-l border-slate-200 dark:border-slate-800">
                  <div className="h-9 w-9 rounded-full overflow-hidden bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 ring-2 ring-slate-200 dark:ring-slate-700">
                    {profileImage ? (
                      <img src={profileImage} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-300">{initials}</span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowLogoutDialog(true)}
                  className="h-9 w-9 p-0 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <LogOut className="h-[18px] w-[18px]" />
                </Button>
              </div>
            </div>
          </div>
      </header>

      {/* Main Content */}
      <main className="w-full pt-14">
        {children}
      </main>

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
                  Logistics Admin
                </p>
              </div>
            </div>
          </AlertDialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              You are about to sign out of your Logistics Admin account. Any unsaved work will be lost.
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
    </div>
  )
}
