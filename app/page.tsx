"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Loader2, Mail, CheckCircle2, AlertCircle, Package, TrendingUp, Users, 
  ShoppingCart, BarChart3, Shield, Zap, Clock, ChevronRight, Sparkles,
  Database, Truck, FileText, Settings, Eye, Lock, AlertTriangle, User
} from "lucide-react"
import { apiPost } from "@/lib/api-client"
import { SecurityIndicator } from "@/components/auth/security-indicator"

// Animated counter hook
function useCountUp(target: number | string, duration = 2000, isActive = false) {
  const [count, setCount] = useState(0)
  const isString = typeof target === 'string'
  
  useEffect(() => {
    if (!isActive || isString) return
    const numTarget = target as number
    const startTime = performance.now()
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // cubic ease-out
      setCount(Math.floor(eased * numTarget))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [target, duration, isActive, isString])
  
  return isString ? target : count
}

export default function LandingLoginPage() {
  const [mounted, setMounted] = useState(false)
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("")
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [statsVisible, setStatsVisible] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)
  
  // Form state
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [rememberDevice, setRememberDevice] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const router = useRouter()

  // Counter values
  const ordersCount = useCountUp(45230, 2000, statsVisible)
  const packedCount = useCountUp(127, 1500, statsVisible)
  const channelsCount = useCountUp(5, 1000, statsVisible)

  const isDevelopment = process.env.NODE_ENV === 'development'

  // Check for reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Intersection Observer for scroll animations + stats counter trigger
  useEffect(() => {
    if (typeof window === 'undefined') return

    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -80px 0px'
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!prefersReducedMotion) {
            entry.target.classList.add('animate-in')
          } else {
            // Instantly visible for reduced motion users
            ;(entry.target as HTMLElement).style.opacity = '1'
          }
          observer.unobserve(entry.target)
        }
      })
    }, observerOptions)

    const animatedElements = document.querySelectorAll('[data-animate]')
    animatedElements.forEach((el) => observer.observe(el))

    // Stats counter observer
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setStatsVisible(true)
          statsObserver.unobserve(entry.target)
        }
      })
    }, { threshold: 0.5 })

    if (statsRef.current) statsObserver.observe(statsRef.current)

    return () => {
      observer.disconnect()
      statsObserver.disconnect()
    }
  }, [mounted, prefersReducedMotion])

  useEffect(() => {
    setMounted(true)
    
    console.log('[Login Page] ========== MOUNT DEBUG ==========')
    console.log('[Login Page] Mounted')
    
    // CRITICAL: One-time cleanup of ALL team leader data
    if (typeof window !== 'undefined') {
      console.log('[Login Page] Performing one-time team leader cleanup...')
      
      // Remove ALL team leader keys
      const teamLeaderKeys = [
        'teamLeaderSession',
        'x-team-leader-role',
        'x-team-leader-user-id',
        'x-team-leader-channel'
      ]
      
      teamLeaderKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          console.log('[Login Page] Removing old team leader key:', key)
          localStorage.removeItem(key)
        }
      })
      
      // DEBUG: Check ALL localStorage keys
      const allKeys = Object.keys(localStorage)
      console.log('[Login Page] ALL localStorage keys on mount:', allKeys)
      
      // Check specific keys
      const remainingKeys = {
        teamLeaderSession: localStorage.getItem('teamLeaderSession'),
        'x-team-leader-role': localStorage.getItem('x-team-leader-role'),
        'x-team-leader-user-id': localStorage.getItem('x-team-leader-user-id'),
        'x-team-leader-channel': localStorage.getItem('x-team-leader-channel'),
        isLoggedIn: localStorage.getItem('isLoggedIn'),
        username: localStorage.getItem('username'),
        userRole: localStorage.getItem('userRole')
      }
      console.log('[Login Page] Remaining keys after cleanup:', remainingKeys)
      
      // Load remembered username if exists
      const remembered = localStorage.getItem("rememberedUsername")
      if (remembered) {
        setUsername(remembered)
        setRememberDevice(true)
      }
    }
    
    // Check for logout marker in cookie
    const hasLogoutMarker = document.cookie.includes('__logout_marker__=true')
    console.log('[Login Page] Logout marker in cookie:', hasLogoutMarker)
    
    // Check if user just logged out
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const logoutParam = urlParams.get('logout')
      
      if (logoutParam || hasLogoutMarker) {
        console.log('[Login Page] Logout detected (param or marker), clearing everything...')
        
        // Clear the logout marker cookie
        document.cookie = '__logout_marker__=; path=/; max-age=0'
        
        // AGGRESSIVE CLEARING
        try {
          // Clear localStorage
          const localKeys = Object.keys(localStorage)
          console.log('[Login Page] LocalStorage keys before clear:', localKeys)
          
          localKeys.forEach(key => {
            try {
              localStorage.removeItem(key)
              delete localStorage[key]
            } catch (e) {
              console.error('[Login Page] Error removing key:', key, e)
            }
          })
          
          try {
            localStorage.clear()
          } catch (e) {
            console.error('[Login Page] localStorage.clear() error:', e)
          }
          
          const remaining = Object.keys(localStorage)
          console.log('[Login Page] LocalStorage keys after clear:', remaining)
          
          if (remaining.length > 0) {
            console.error('[Login Page] WARNING: localStorage not fully cleared!', remaining)
          }
          
          // Clear sessionStorage
          sessionStorage.clear()
          console.log('[Login Page] SessionStorage cleared')
          
        } catch (error) {
          console.error('[Login Page] Error clearing storage:', error)
        }
        
        // Clean up URL
        if (logoutParam) {
          window.history.replaceState({}, '', '/')
          console.log('[Login Page] URL cleaned')
        }
      }
    }
  }, [])

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      setError("Please enter your email address")
      return
    }

    setForgotPasswordLoading(true)
    setError("")

    try {
      const response = await apiPost("/api/auth/forgot-password", {
        email: forgotPasswordEmail
      })

      if (response.success) {
        setForgotPasswordSuccess(true)
      } else {
        setError(response.error || "Failed to send reset email. Please try again.")
      }
    } catch (error) {
      console.error("Forgot password error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to send reset email. Please try again."
      setError(errorMessage)
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  const resetForgotPasswordDialog = () => {
    setShowForgotPasswordDialog(false)
    setForgotPasswordEmail("")
    setForgotPasswordSuccess(false)
    setForgotPasswordLoading(false)
    setError("")
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Call unified login API
      const response = await fetch('/api/auth/unified-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          rememberDevice
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Invalid credentials")
      }

      // Store user data in localStorage
      if (typeof window !== 'undefined') {
        const { user, redirectPath, sessionId } = data

        // Handle remember device
        if (rememberDevice) {
          localStorage.setItem("rememberedUsername", username)
        } else {
          localStorage.removeItem("rememberedUsername")
        }

        // Store authentication data
        localStorage.setItem("isLoggedIn", "true")
        localStorage.setItem("username", user.username)
        localStorage.setItem("userRole", user.role)
        localStorage.setItem("displayName", user.displayName)
        localStorage.setItem("sessionId", sessionId)

        // Store optional fields
        if (user.profileImage) {
          localStorage.setItem("profileImage", user.profileImage)
        }
        if (user.assignedChannel) {
          localStorage.setItem("assignedChannel", user.assignedChannel)
        }

        // Store complete user object
        localStorage.setItem("currentUser", JSON.stringify(user))

        // Redirect to appropriate dashboard
        router.push(redirectPath)
      }
    } catch (error) {
      console.error("Login error:", error)
      setError(error instanceof Error ? error.message : "Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-slate-900 relative overflow-hidden">

      {/* Subtle Noise Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '200px 200px'
      }}></div>

      {/* Animated Grid Background */}
      <div className="fixed inset-0 pointer-events-none" style={{ opacity: 0.06 }}>
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(218, 165, 32, 0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(218, 165, 32, 0.8) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}></div>
      </div>

      {/* Floating Gold Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-float-slow" style={{ willChange: 'transform' }}></div>
        <div className="absolute bottom-40 -right-20 w-[500px] h-[500px] bg-yellow-600/15 rounded-full blur-3xl animate-float-slower" style={{ willChange: 'transform' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl animate-pulse-slow"></div>
        {/* Extra accent orbs */}
        <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-yellow-500/10 rounded-full blur-2xl animate-float-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-56 h-56 bg-amber-600/10 rounded-full blur-2xl animate-float-slower" style={{ animationDelay: '3s' }}></div>
      </div>

      {/* Premium Gold Top Border */}
      <div className="fixed top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent z-50"></div>
      {/* Premium Gold Bottom Border on Nav */}

      {/* Navigation Bar - Premium Black & Gold */}
      <nav className="relative z-50 border-b border-amber-900/20 bg-black/60 backdrop-blur-xl shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo - Icon Only */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full"></div>
                <img 
                  src="/Vertex-icon.png" 
                  alt="Vertex" 
                  className="h-12 w-auto object-contain relative z-10 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                  loading="eager"
                />
              </div>
            </div>

            {/* Action Buttons - Gold Theme */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowLoginModal(true)}
                className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:via-yellow-400 hover:to-amber-500 text-black font-bold shadow-lg shadow-amber-600/50 hover:shadow-amber-500/70 transition-all duration-300 border border-amber-400/30"
              >
                <Lock className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Premium Black & Gold */}
      <section className="relative z-10 pt-24 pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Hero Content */}
            <div className="space-y-8 animate-in fade-in-0 slide-in-from-left-10 duration-1000">
              {/* Premium Badge */}
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border border-amber-500/30 text-amber-300 rounded-full text-sm font-semibold backdrop-blur-sm shadow-lg shadow-amber-900/20">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">Enterprise-Grade Multi-Channel Solution</span>
              </div>

              {/* Hero Heading - Luxurious Typography */}
              <div className="space-y-6">
                <h1 className="text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight">
                  <span className="text-white">Transform Your</span>
                  <br />
                  <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                    Inventory Empire
                  </span>
                </h1>
                <p className="text-xl text-slate-300 leading-relaxed max-w-xl">
                  Elite order fulfillment platform for multi-channel e-commerce operations with military-grade precision.
                </p>
              </div>

              {/* Premium Stats - Gold Accented with Counter Animation */}
              <div className="grid grid-cols-3 gap-6 pt-4" ref={statsRef}>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-yellow-600/10 rounded-xl blur-xl group-hover:blur-2xl transition-all"></div>
                  <div className="relative bg-black/40 border border-amber-500/20 rounded-xl p-4 backdrop-blur-sm hover:border-amber-500/40 transition-all">
                    <div className="text-4xl font-black bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent tabular-nums">
                      {statsVisible ? `${ordersCount > 999 ? `₱${Math.floor(ordersCount/1000)}K` : ordersCount}` : '₱0'}
                    </div>
                    <div className="text-sm text-amber-200/70 font-medium mt-1">Sales Today</div>
                  </div>
                </div>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-yellow-600/10 rounded-xl blur-xl group-hover:blur-2xl transition-all"></div>
                  <div className="relative bg-black/40 border border-amber-500/20 rounded-xl p-4 backdrop-blur-sm hover:border-amber-500/40 transition-all">
                    <div className="text-4xl font-black bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent tabular-nums">
                      {statsVisible ? packedCount : 0}
                    </div>
                    <div className="text-sm text-amber-200/70 font-medium mt-1">Orders Packed</div>
                  </div>
                </div>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-yellow-600/10 rounded-xl blur-xl group-hover:blur-2xl transition-all"></div>
                  <div className="relative bg-black/40 border border-amber-500/20 rounded-xl p-4 backdrop-blur-sm hover:border-amber-500/40 transition-all">
                    <div className="text-4xl font-black bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent tabular-nums">
                      {statsVisible ? channelsCount : 0}+
                    </div>
                    <div className="text-sm text-amber-200/70 font-medium mt-1">Sales Channels</div>
                  </div>
                </div>
              </div>

              {/* CTA Buttons - Premium Gold */}
              <div className="flex flex-wrap gap-4 pt-4">
                <Button
                  onClick={() => setShowLoginModal(true)}
                  size="lg"
                  className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:via-yellow-400 hover:to-amber-500 text-black font-bold text-lg px-10 py-7 shadow-2xl shadow-amber-600/50 hover:shadow-amber-500/70 transition-all duration-300 border border-amber-400/30 hover:scale-105 btn-ripple"
                >
                  Access Dashboard
                  <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-10 py-7 border-2 border-amber-500/30 text-amber-300 hover:bg-amber-500/10 hover:border-amber-400/50 backdrop-blur-sm transition-all duration-300 animate-border-glow"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Eye className="h-5 w-5 mr-2" />
                  Explore Features
                </Button>
              </div>
            </div>

            {/* Right: Hero Image - Premium Frame */}
            <div className="relative animate-in fade-in-0 slide-in-from-right-10 duration-1000 delay-300">
              <div className="relative group">
                {/* Gold Glow Effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-amber-600/30 via-yellow-500/30 to-amber-600/30 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
                
                {/* Image Container */}
                <div className="relative border-2 border-amber-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
                  <img 
                    src="/Log-in-Image.png" 
                    alt="Inventory Dashboard" 
                    className="w-full h-auto"
                    loading="eager"
                  />
                </div>
                
                {/* Floating Stats Card 1 - Premium Gold */}
                <div className="absolute -top-6 -left-6 bg-gradient-to-br from-black via-slate-900 to-black border border-amber-500/30 p-5 rounded-2xl shadow-2xl shadow-amber-900/30 animate-float backdrop-blur-xl">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl shadow-lg shadow-amber-600/50">
                      <TrendingUp className="h-6 w-6 text-black" strokeWidth={2.5} />
                    </div>
                    <div>
                      <div className="text-xs text-amber-300/70 font-medium tracking-wide">SALES TODAY</div>
                      <div className="text-2xl font-black bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent tabular-nums">
                        ₱{statsVisible ? `${Math.floor(ordersCount/1000)}K` : '0K'}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating Stats Card 2 - Premium Gold */}
                <div className="absolute -bottom-6 -right-6 bg-gradient-to-br from-black via-slate-900 to-black border border-amber-500/30 p-5 rounded-2xl shadow-2xl shadow-amber-900/30 animate-float-delay backdrop-blur-xl">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl shadow-lg shadow-amber-600/50">
                      <Package className="h-6 w-6 text-black" strokeWidth={2.5} />
                    </div>
                    <div>
                      <div className="text-xs text-amber-300/70 font-medium tracking-wide">ORDERS PACKED</div>
                      <div className="text-2xl font-black bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent tabular-nums">
                        {statsVisible ? packedCount : 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Premium Black & Gold */}
      <section id="features" className="relative z-10 py-24 px-6 bg-gradient-to-b from-slate-950 to-black border-y border-amber-900/20">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-20 space-y-6" data-animate="fade-up">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border border-amber-500/30 text-amber-300 rounded-full text-sm font-semibold backdrop-blur-sm shadow-lg shadow-amber-900/20">
              <Zap className="h-4 w-4 text-amber-400" />
              <span className="bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">Core System Features</span>
            </div>
            <h2 className="text-5xl lg:text-6xl font-black text-white">
              Complete E-Commerce
              <br />
              <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent">
                Management Platform
              </span>
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Enterprise-grade tools built for Shopee, Lazada, Facebook, TikTok, and Physical Store operations
            </p>
          </div>

          {/* Feature Grid - Premium Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="group relative" data-animate="scale" data-animate-delay="100">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-all duration-500"></div>
              <div className="relative p-8 bg-gradient-to-br from-slate-900 via-black to-slate-900 border border-amber-500/20 rounded-2xl hover:border-amber-500/40 transition-all duration-300 h-full">
                <div className="p-4 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl w-fit mb-6 shadow-lg shadow-amber-600/50 group-hover:scale-110 transition-transform">
                  <ShoppingCart className="h-7 w-7 text-black" strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Multi-Channel Operations</h3>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  Unified dashboard for 5 sales channels with dedicated department management and agent assignments.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-full font-medium">Shopee</span>
                  <span className="text-xs px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-full font-medium">Lazada</span>
                  <span className="text-xs px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-full font-medium">Facebook</span>
                  <span className="text-xs px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-full font-medium">TikTok</span>
                  <span className="text-xs px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-full font-medium">Physical Store</span>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative" data-animate="scale" data-animate-delay="200">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-all duration-500"></div>
              <div className="relative p-8 bg-gradient-to-br from-slate-900 via-black to-slate-900 border border-amber-500/20 rounded-2xl hover:border-amber-500/40 transition-all duration-300 h-full">
                <div className="p-4 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl w-fit mb-6 shadow-lg shadow-amber-600/50 group-hover:scale-110 transition-transform">
                  <Users className="h-7 w-7 text-black" strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">6-Tier Role System</h3>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  Hierarchical access control with granular permissions for Administrator, Department Head, Agent, Packer, Tracker, and Logistics roles.
                </p>
                <ul className="text-sm text-slate-400 space-y-2">
                  <li className="flex items-center gap-2"><span className="text-amber-500">▸</span> Admin: Full system control + analytics</li>
                  <li className="flex items-center gap-2"><span className="text-amber-500">▸</span> Dept. Head: Team oversight + reporting</li>
                  <li className="flex items-center gap-2"><span className="text-amber-500">▸</span> Agent: Order creation + customer mgmt</li>
                  <li className="flex items-center gap-2"><span className="text-amber-500">▸</span> Packer/Tracker/Logistics: Specialized ops</li>
                </ul>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative" data-animate="scale" data-animate-delay="300">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-all duration-500"></div>
              <div className="relative p-8 bg-gradient-to-br from-slate-900 via-black to-slate-900 border border-amber-500/20 rounded-2xl hover:border-amber-500/40 transition-all duration-300 h-full">
                <div className="p-4 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl w-fit mb-6 shadow-lg shadow-amber-600/50 group-hover:scale-110 transition-transform">
                  <Truck className="h-7 w-7 text-black" strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Manual Order Tracking</h3>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  Internal tracking system with waybill management, status updates controlled by Tracker account, and comprehensive order history.
                </p>
                <div className="text-sm text-slate-400">
                  <div className="flex items-center gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    </div>
                    <span className="text-amber-300">Tracker-Managed Updates</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="group relative" data-animate="scale" data-animate-delay="400">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-all duration-500"></div>
              <div className="relative p-8 bg-gradient-to-br from-slate-900 via-black to-slate-900 border border-amber-500/20 rounded-2xl hover:border-amber-500/40 transition-all duration-300 h-full">
                <div className="p-4 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl w-fit mb-6 shadow-lg shadow-amber-600/50 group-hover:scale-110 transition-transform">
                  <Package className="h-7 w-7 text-black" strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Smart Inventory Control</h3>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  Real-time stock management with product bundles, low-stock alerts, cost/profit tracking, and automated inventory deduction on packing.
                </p>
                <ul className="text-sm text-slate-400 space-y-2">
                  <li className="flex items-center gap-2"><span className="text-amber-500">▸</span> Products + Bundle management</li>
                  <li className="flex items-center gap-2"><span className="text-amber-500">▸</span> Cost price + selling price tracking</li>
                  <li className="flex items-center gap-2"><span className="text-amber-500">▸</span> Auto stock deduction on pack</li>
                </ul>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="group relative" data-animate="scale" data-animate-delay="500">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-all duration-500"></div>
              <div className="relative p-8 bg-gradient-to-br from-slate-900 via-black to-slate-900 border border-amber-500/20 rounded-2xl hover:border-amber-500/40 transition-all duration-300 h-full">
                <div className="p-4 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl w-fit mb-6 shadow-lg shadow-amber-600/50 group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-7 w-7 text-black" strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Business Intelligence</h3>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  Comprehensive analytics dashboard with sales by channel, agent performance, profit margins, order fulfillment rates, and return tracking.
                </p>
                <ul className="text-sm text-slate-400 space-y-2">
                  <li className="flex items-center gap-2"><span className="text-amber-500">▸</span> Channel-wise revenue breakdown</li>
                  <li className="flex items-center gap-2"><span className="text-amber-500">▸</span> Department performance metrics</li>
                  <li className="flex items-center gap-2"><span className="text-amber-500">▸</span> Fulfillment & delivery rates</li>
                </ul>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="group relative" data-animate="scale" data-animate-delay="600">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-all duration-500"></div>
              <div className="relative p-8 bg-gradient-to-br from-slate-900 via-black to-slate-900 border border-amber-500/20 rounded-2xl hover:border-amber-500/40 transition-all duration-300 h-full">
                <div className="p-4 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl w-fit mb-6 shadow-lg shadow-amber-600/50 group-hover:scale-110 transition-transform">
                  <Shield className="h-7 w-7 text-black" strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Enterprise Security</h3>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  Session-based authentication, activity audit logs, role-based access control, and complete transaction history for compliance.
                </p>
                <ul className="text-sm text-slate-400 space-y-2">
                  <li className="flex items-center gap-2"><span className="text-amber-500">▸</span> Secure login system</li>
                  <li className="flex items-center gap-2"><span className="text-amber-500">▸</span> Activity logging per user</li>
                  <li className="flex items-center gap-2"><span className="text-amber-500">▸</span> Permission-based features</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Features Section - Premium Black & Gold */}
      <section className="relative z-10 py-24 px-6 bg-black border-y border-amber-900/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16" data-animate="fade-up">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border border-amber-500/30 text-amber-300 rounded-full text-sm font-semibold backdrop-blur-sm shadow-lg shadow-amber-900/20 mb-6">
              <Settings className="h-4 w-4 text-amber-400" />
              <span className="bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">Advanced Capabilities</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
              More Powerful Features
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Additional tools and functionalities to maximize your operational efficiency
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Order Cancellation */}
            <div className="group relative" data-animate="fade-up" data-animate-delay="100">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-xl blur opacity-0 group-hover:opacity-30 transition-all duration-500"></div>
              <div className="relative p-6 bg-gradient-to-br from-slate-900 to-black border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-all h-full">
                <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-lg w-fit mb-4 shadow-lg">
                  <AlertTriangle className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Order Cancellation</h3>
                <p className="text-sm text-slate-400">Cancel orders with reason tracking, automatic inventory restoration, and complete audit trail.</p>
              </div>
            </div>

            {/* Customer Management */}
            <div className="group relative" data-animate="fade-up" data-animate-delay="200">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-xl blur opacity-0 group-hover:opacity-30 transition-all duration-500"></div>
              <div className="relative p-6 bg-gradient-to-br from-slate-900 to-black border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-all h-full">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg w-fit mb-4 shadow-lg">
                  <User className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Customer Database</h3>
                <p className="text-sm text-slate-400">Comprehensive customer records with contact info, purchase history, and order frequency tracking.</p>
              </div>
            </div>

            {/* Internal Usage Tracking */}
            <div className="group relative" data-animate="fade-up" data-animate-delay="300">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-xl blur opacity-0 group-hover:opacity-30 transition-all duration-500"></div>
              <div className="relative p-6 bg-gradient-to-br from-slate-900 to-black border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-all h-full">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg w-fit mb-4 shadow-lg">
                  <Database className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Internal Usage</h3>
                <p className="text-sm text-slate-400">Track internal product consumption for company use, separate from customer sales inventory.</p>
              </div>
            </div>

            {/* Activity Logs */}
            <div className="group relative" data-animate="fade-up" data-animate-delay="400">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-xl blur opacity-0 group-hover:opacity-30 transition-all duration-500"></div>
              <div className="relative p-6 bg-gradient-to-br from-slate-900 to-black border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-all h-full">
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg w-fit mb-4 shadow-lg">
                  <FileText className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Activity Logs</h3>
                <p className="text-sm text-slate-400">Complete audit trail of all user actions with timestamps, user info, and action details.</p>
              </div>
            </div>

            {/* Product Bundles */}
            <div className="group relative" data-animate="fade-up" data-animate-delay="100">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-xl blur opacity-0 group-hover:opacity-30 transition-all duration-500"></div>
              <div className="relative p-6 bg-gradient-to-br from-slate-900 to-black border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-all h-full">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg w-fit mb-4 shadow-lg">
                  <Package className="h-6 w-6 text-black" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Product Bundles</h3>
                <p className="text-sm text-slate-400">Create combo packages with multiple products, manage bundle inventory separately with auto-deduction.</p>
              </div>
            </div>

            {/* Department Performance */}
            <div className="group relative" data-animate="fade-up" data-animate-delay="200">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-xl blur opacity-0 group-hover:opacity-30 transition-all duration-500"></div>
              <div className="relative p-6 bg-gradient-to-br from-slate-900 to-black border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-all h-full">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg w-fit mb-4 shadow-lg">
                  <Users className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Agent Performance</h3>
                <p className="text-sm text-slate-400">Track individual agent sales, order counts, and performance metrics per department/channel.</p>
              </div>
            </div>

            {/* Waybill Management */}
            <div className="group relative" data-animate="fade-up" data-animate-delay="300">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-xl blur opacity-0 group-hover:opacity-30 transition-all duration-500"></div>
              <div className="relative p-6 bg-gradient-to-br from-slate-900 to-black border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-all h-full">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg w-fit mb-4 shadow-lg">
                  <Truck className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Waybill Validation</h3>
                <p className="text-sm text-slate-400">Duplicate waybill detection with instant alerts to prevent order processing errors.</p>
              </div>
            </div>

            {/* Low Stock Alerts */}
            <div className="group relative" data-animate="fade-up" data-animate-delay="400">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-xl blur opacity-0 group-hover:opacity-30 transition-all duration-500"></div>
              <div className="relative p-6 bg-gradient-to-br from-slate-900 to-black border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-all h-full">
                <div className="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg w-fit mb-4 shadow-lg">
                  <AlertTriangle className="h-6 w-6 text-black" strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Smart Alerts</h3>
                <p className="text-sm text-slate-400">Automated low-stock notifications with reorder level settings and inventory forecasting.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Section - Premium Black & Gold */}
      <section className="relative z-10 py-24 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Left: Content */}
            <div className="space-y-8" data-animate="fade-right">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border border-amber-500/30 text-amber-300 rounded-full text-sm font-semibold backdrop-blur-sm shadow-lg shadow-amber-900/20">
                <Database className="h-4 w-4 text-amber-400" />
                <span className="bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">Complete Workflow System</span>
              </div>
              <h2 className="text-5xl font-black text-white leading-tight">
                Order to Delivery
                <br />
                <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent">
                  Complete Pipeline
                </span>
              </h2>
              <p className="text-lg text-slate-400 leading-relaxed">
                Seamless order fulfillment workflow from creation to customer delivery with full visibility and control.
              </p>
              
              <div className="space-y-4">
                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-xl blur opacity-0 group-hover:opacity-30 transition-all duration-500"></div>
                  <div className="relative flex items-start gap-5 p-6 bg-gradient-to-br from-slate-900 to-black border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-all">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-600/50 flex-shrink-0 text-black font-black">
                      1
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-white mb-2">Order Creation (POS)</h4>
                      <p className="text-sm text-slate-400">Agent creates order in POS system, assigns sales channel, selects products/bundles, enters customer details, and dispatches with waybill. Order enters Packing Queue automatically.</p>
                    </div>
                  </div>
                </div>

                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-xl blur opacity-0 group-hover:opacity-30 transition-all duration-500"></div>
                  <div className="relative flex items-start gap-5 p-6 bg-gradient-to-br from-slate-900 to-black border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-all">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-600/50 flex-shrink-0 text-black font-black">
                      2
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-white mb-2">Packing Queue</h4>
                      <p className="text-sm text-slate-400">Packer views pending orders, verifies items and customer details, marks as "Packed". System automatically deducts inventory stock upon packing confirmation.</p>
                    </div>
                  </div>
                </div>

                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-xl blur opacity-0 group-hover:opacity-30 transition-all duration-500"></div>
                  <div className="relative flex items-start gap-5 p-6 bg-gradient-to-br from-slate-900 to-black border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-all">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-600/50 flex-shrink-0 text-black font-black">
                      3
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-white mb-2">Manual Tracking Updates</h4>
                      <p className="text-sm text-slate-400">Tracker manually updates parcel status (In Transit, Out for Delivery, Delivered, etc.) based on courier information. All updates are internal - not synced with courier APIs.</p>
                    </div>
                  </div>
                </div>

                <div className="group relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-xl blur opacity-0 group-hover:opacity-30 transition-all duration-500"></div>
                  <div className="relative flex items-start gap-5 p-6 bg-gradient-to-br from-slate-900 to-black border border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-all">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-600/50 flex-shrink-0 text-black font-black">
                      4
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-white mb-2">Analytics & Reporting</h4>
                      <p className="text-sm text-slate-400">Admin views comprehensive reports: sales by channel, agent performance, fulfillment rates, return rates, and profit margins across all departments.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Premium Stats Grid */}
            <div className="grid grid-cols-2 gap-6" data-animate="fade-left">
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-all"></div>
                <div className="relative p-8 bg-gradient-to-br from-amber-600 to-yellow-600 rounded-2xl shadow-2xl shadow-amber-900/50 h-full">
                  <Clock className="h-10 w-10 mb-4 text-black/70" strokeWidth={2.5} />
                  <div className="text-4xl font-black mb-2 text-black">Real-Time</div>
                  <div className="text-black/70 font-semibold">Stock Updates</div>
                </div>
              </div>
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-all"></div>
                <div className="relative p-8 bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl h-full">
                  <Users className="h-10 w-10 mb-4 text-amber-400" strokeWidth={2.5} />
                  <div className="text-4xl font-black mb-2 text-white">Multi-User</div>
                  <div className="text-amber-300/70 font-semibold">Collaboration</div>
                </div>
              </div>
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-all"></div>
                <div className="relative p-8 bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl h-full">
                  <TrendingUp className="h-10 w-10 mb-4 text-amber-400" strokeWidth={2.5} />
                  <div className="text-4xl font-black mb-2 text-white">Analytics</div>
                  <div className="text-amber-300/70 font-semibold">Dashboard</div>
                </div>
              </div>
              <div className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-all"></div>
                <div className="relative p-8 bg-gradient-to-br from-amber-600 to-yellow-600 rounded-2xl shadow-2xl shadow-amber-900/50 h-full">
                  <Shield className="h-10 w-10 mb-4 text-black/70" strokeWidth={2.5} />
                  <div className="text-4xl font-black mb-2 text-black">Secure</div>
                  <div className="text-black/70 font-semibold">& Auditable</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Premium Black & Gold */}
      <section className="relative z-10 py-32 px-6 bg-gradient-to-b from-black to-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="relative group" data-animate="scale">
            {/* Premium Glow */}
            <div className="absolute -inset-2 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 rounded-3xl blur-2xl opacity-30 group-hover:opacity-50 transition-all duration-500"></div>
            
            {/* Premium Card */}
            <div className="relative p-16 bg-gradient-to-br from-slate-900 via-black to-slate-900 border-2 border-amber-500/30 rounded-3xl shadow-2xl">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="px-6 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-full shadow-lg shadow-amber-600/50">
                  <span className="text-sm font-bold text-black tracking-wide">EXCLUSIVE ACCESS</span>
                </div>
              </div>
              
              <div className="text-center space-y-8">
                <h2 className="text-5xl lg:text-6xl font-black text-white leading-tight">
                  Ready to Elevate Your
                  <br />
                  <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent">
                    Business Operations?
                  </span>
                </h2>
                
                <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
                  Transform your e-commerce operations with our enterprise-grade inventory management system. Streamline order fulfillment, maximize efficiency, and scale your business across multiple channels.
                </p>

                {/* Key Benefits Grid */}
                <div className="grid md:grid-cols-3 gap-6 pt-6 pb-4">
                  <div className="p-6 bg-slate-800/50 border border-amber-500/20 rounded-xl">
                    <div className="text-3xl font-black bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent mb-2">
                      100%
                    </div>
                    <div className="text-sm text-slate-400">
                      Order Visibility
                      <br />
                      From Creation to Delivery
                    </div>
                  </div>
                  <div className="p-6 bg-slate-800/50 border border-amber-500/20 rounded-xl">
                    <div className="text-3xl font-black bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent mb-2">
                      5
                    </div>
                    <div className="text-sm text-slate-400">
                      Sales Channels
                      <br />
                      Unified in One Platform
                    </div>
                  </div>
                  <div className="p-6 bg-slate-800/50 border border-amber-500/20 rounded-xl">
                    <div className="text-3xl font-black bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent mb-2">
                      Real-Time
                    </div>
                    <div className="text-sm text-slate-400">
                      Inventory Updates
                      <br />
                      Across All Departments
                    </div>
                  </div>
                </div>

                {/* What You Get */}
                <div className="pt-4 pb-6 space-y-4">
                  <h3 className="text-xl font-bold text-white">What You Get:</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-left max-w-3xl mx-auto">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-white font-semibold">Multi-Channel Integration</div>
                        <div className="text-sm text-slate-400">Manage Shopee, Lazada, Facebook, TikTok & Physical Store</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-white font-semibold">Complete Order Workflow</div>
                        <div className="text-sm text-slate-400">POS → Packing → Tracking → Analytics</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-white font-semibold">Role-Based Access Control</div>
                        <div className="text-sm text-slate-400">6 user roles with granular permissions</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-white font-semibold">Advanced Analytics Dashboard</div>
                        <div className="text-sm text-slate-400">Sales reports, profit tracking & performance metrics</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-white font-semibold">Smart Inventory Management</div>
                        <div className="text-sm text-slate-400">Auto-deduction, bundles & low-stock alerts</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-white font-semibold">Complete Audit Trail</div>
                        <div className="text-sm text-slate-400">Activity logs & security compliance</div>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setShowLoginModal(true)}
                  size="lg"
                  className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:via-yellow-400 hover:to-amber-500 text-black font-bold text-xl px-12 py-8 h-auto shadow-2xl shadow-amber-600/50 hover:shadow-amber-500/70 transition-all duration-300 border-2 border-amber-400/30 hover:scale-105 btn-ripple"
                >
                  <Lock className="h-6 w-6 mr-3" strokeWidth={2.5} />
                  Access Elite Dashboard
                  <ChevronRight className="h-6 w-6 ml-3" strokeWidth={2.5} />
                </Button>

                <p className="text-sm text-slate-500 pt-4">
                  Secure login • Enterprise-grade security • Role-based access control
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Premium Black & Gold */}
      <footer className="relative z-10 py-10 px-6 border-t border-amber-900/20 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img 
                src="/Vertex-icon.png" 
                alt="Vertex" 
                className="h-8 w-auto object-contain opacity-80"
                loading="eager"
              />
              <div className="text-slate-500 text-sm">
                <div className="font-semibold text-slate-400">Vertex IMS</div>
                <div>© 2026 All Rights Reserved</div>
              </div>
            </div>
            <p className="text-slate-500 text-sm">
              Powered by <span className="text-amber-500 font-semibold">Enterprise Technology</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Login Modal - Premium Black & Gold */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-slate-900 via-black to-slate-900 border-2 border-amber-500/30 shadow-2xl shadow-amber-900/50">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/30 blur-2xl rounded-full"></div>
                <img 
                  src="/Vertex-icon.png" 
                  alt="Vertex" 
                  className="h-16 w-auto object-contain relative z-10"
                  loading="eager"
                />
              </div>
            </div>
            <DialogTitle className="text-3xl font-black text-center bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent">
              Welcome Back
            </DialogTitle>
            <DialogDescription className="text-center text-slate-400 text-base">
              Sign in to access your elite dashboard
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLogin} className="space-y-5 mt-4">
            {error && (
              <Alert variant="destructive" className="bg-red-950/50 border-red-500/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-amber-300 font-semibold">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                autoComplete="username"
                className="bg-black/40 border-amber-500/30 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-amber-300 font-semibold">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  className="bg-black/40 border-amber-500/30 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500/20 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-400 transition-colors"
                  tabIndex={-1}
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="rounded border-amber-500/30 bg-black/40 text-amber-500 focus:ring-amber-500/20"
                />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer text-slate-400">
                  Remember me
                </Label>
              </div>
              <Button
                type="button"
                variant="link"
                className="px-0 text-sm text-amber-400 hover:text-amber-300"
                onClick={() => {
                  setShowLoginModal(false)
                  setShowForgotPasswordDialog(true)
                }}
              >
                Forgot password?
              </Button>
            </div>

            <SecurityIndicator />

            <DialogFooter>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:via-yellow-400 hover:to-amber-500 text-black font-bold py-6 shadow-lg shadow-amber-600/50 border border-amber-400/30" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-5 w-5" />
                    Sign In to Dashboard
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Dialog - Premium Black & Gold */}
      <Dialog open={showForgotPasswordDialog} onOpenChange={resetForgotPasswordDialog}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-slate-900 via-black to-slate-900 border-2 border-amber-500/30 shadow-2xl shadow-amber-900/50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">Reset Password</DialogTitle>
            <DialogDescription className="text-slate-400">
              Enter your email address and we'll send you a password reset link.
            </DialogDescription>
          </DialogHeader>

          {!forgotPasswordSuccess ? (
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-red-950/50 border-red-500/50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-amber-300 font-semibold">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    disabled={forgotPasswordLoading}
                    className="pl-10 bg-black/40 border-amber-500/30 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500/20"
                    autoComplete="email"
                  />
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForgotPasswordDialog}
                  disabled={forgotPasswordLoading}
                  className="w-full sm:w-auto bg-black/40 border-amber-500/30 text-slate-300 hover:bg-amber-500/10 hover:border-amber-500/50"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={forgotPasswordLoading || !forgotPasswordEmail}
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-black font-bold shadow-lg shadow-amber-600/50"
                >
                  {forgotPasswordLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Reset Link
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="mb-4 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 p-4 shadow-lg shadow-amber-600/50">
                  <CheckCircle2 className="h-10 w-10 text-black" strokeWidth={2.5} />
                </div>
                <h3 className="mb-2 text-2xl font-bold text-white">
                  Check Your Email
                </h3>
                <p className="text-sm text-slate-400 mb-2">
                  We've sent a password reset link to
                </p>
                <p className="text-amber-400 font-semibold">{forgotPasswordEmail}</p>
                <p className="mt-4 text-xs text-slate-500">
                  The link will expire in 1 hour.
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  onClick={resetForgotPasswordDialog}
                  className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-black font-bold shadow-lg shadow-amber-600/50"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Premium CSS Animations - Black & Gold Theme */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -30px) scale(1.1); }
        }
        @keyframes float-slower {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 40px) scale(1.15); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes ripple {
          0% { transform: scale(0); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes borderGlow {
          0%, 100% { border-color: rgba(245, 158, 11, 0.2); box-shadow: 0 0 0px rgba(245, 158, 11, 0); }
          50% { border-color: rgba(245, 158, 11, 0.5); box-shadow: 0 0 20px rgba(245, 158, 11, 0.15); }
        }
        @keyframes particleDrift {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0.6; }
          50% { opacity: 0.9; }
          100% { transform: translateY(-120px) translateX(30px) rotate(180deg); opacity: 0; }
        }

        .animate-float { animation: float 3s ease-in-out infinite; will-change: transform; }
        .animate-float-delay { animation: float 3s ease-in-out 0.5s infinite; will-change: transform; }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; will-change: transform; }
        .animate-float-slower { animation: float-slower 10s ease-in-out infinite; will-change: transform; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }

        /* Shimmer border effect on cards */
        .shimmer-border {
          background: linear-gradient(
            90deg,
            rgba(245, 158, 11, 0.2),
            rgba(234, 179, 8, 0.6),
            rgba(245, 158, 11, 0.2)
          );
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }

        /* Gold border glow pulse */
        .animate-border-glow {
          animation: borderGlow 3s ease-in-out infinite;
        }

        /* Button ripple effect */
        .btn-ripple {
          position: relative;
          overflow: hidden;
        }
        .btn-ripple::after {
          content: '';
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          width: 100px;
          height: 100px;
          margin-top: -50px;
          margin-left: -50px;
          top: 50%;
          left: 50%;
          animation: ripple 0.6s linear;
          transform: scale(0);
        }
        .btn-ripple:active::after {
          animation: ripple 0.6s linear;
        }

        /* Floating gold particles */
        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: radial-gradient(circle, rgba(245,158,11,0.8), transparent);
          border-radius: 50%;
          animation: particleDrift linear infinite;
        }

        /* Scroll Animation Classes */
        [data-animate] { opacity: 0; }
        [data-animate="fade-up"].animate-in { animation: fadeInUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        [data-animate="fade-down"].animate-in { animation: fadeInDown 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        [data-animate="fade-left"].animate-in { animation: fadeInLeft 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        [data-animate="fade-right"].animate-in { animation: fadeInRight 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        [data-animate="scale"].animate-in { animation: scaleIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

        [data-animate-delay="100"].animate-in { animation-delay: 0.1s; }
        [data-animate-delay="200"].animate-in { animation-delay: 0.2s; }
        [data-animate-delay="300"].animate-in { animation-delay: 0.3s; }
        [data-animate-delay="400"].animate-in { animation-delay: 0.4s; }
        [data-animate-delay="500"].animate-in { animation-delay: 0.5s; }
        [data-animate-delay="600"].animate-in { animation-delay: 0.6s; }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          [data-animate] { opacity: 1 !important; animation: none !important; }
          .animate-float, .animate-float-delay, .animate-float-slow,
          .animate-float-slower, .animate-pulse-slow { animation: none !important; }
          .shimmer-border { animation: none !important; }
        }

        html { scroll-behavior: smooth; }

        /* Custom gold scrollbar */
        ::-webkit-scrollbar { width: 10px; }
        ::-webkit-scrollbar-track { background: #050505; }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #d97706, #eab308);
          border-radius: 5px;
          border: 2px solid #050505;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #f59e0b, #fbbf24);
        }

        /* Focus indicators for accessibility */
        button:focus-visible, a:focus-visible, input:focus-visible {
          outline: 2px solid rgba(245, 158, 11, 0.8);
          outline-offset: 2px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}
