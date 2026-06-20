"use client"

import { useState } from "react"
import { PremiumSidebar } from "@/components/premium-sidebar"
import { PremiumNavbar } from "@/components/premium-navbar"
import { OfflineIndicator } from "@/components/offline-indicator"
import { ErrorBoundary } from "@/components/error-boundary"
import { CommandPalette } from "@/components/command-palette"
import { RouteGuard } from "@/components/route-guard"
import { KeyboardShortcutsModal } from "@/components/keyboard-shortcuts-modal"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { useSessionGuard } from "@/lib/use-session-guard"
import { cn } from "@/lib/utils"

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Initialize keyboard shortcuts
  useKeyboardShortcuts()
  
  // Initialize session guard (single-device security)
  useSessionGuard()

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-[#121212]">
      {/* Premium Sidebar */}
      <PremiumSidebar 
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Main content area */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300",
        "ml-0",
        // Responsive margins: smaller on standard screens, larger on XL+
        sidebarCollapsed ? "lg:ml-14 xl:lg:ml-16" : "lg:ml-48 xl:lg:ml-52"
      )}>
        {/* Premium Navbar */}
        <PremiumNavbar 
          sidebarCollapsed={sidebarCollapsed}
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        {/* Main content - Protected by RouteGuard */}
        <main 
          id="main-content" 
          className="flex-1 overflow-y-auto overflow-x-hidden mt-16 min-w-0 w-full"
          role="main"
        >
          <div className="w-full max-w-full min-w-0 px-3 sm:px-5 lg:px-6 py-5">
            <RouteGuard>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </RouteGuard>
          </div>
        </main>
      </div>
      
      <CommandPalette />
      <OfflineIndicator />
      <KeyboardShortcutsModal />
    </div>
  )
}
