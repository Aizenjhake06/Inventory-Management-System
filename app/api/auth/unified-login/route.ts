import { NextRequest, NextResponse } from "next/server"
import { validateCredentials } from "@/lib/supabase-db"
import { createSession } from "@/lib/session-manager"

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Max 5 failed attempts per IP per 60-second window
const RATE_LIMIT_WINDOW_MS = 60_000  // 1 minute
const MAX_ATTEMPTS = 5

interface RateEntry { count: number; firstAttemptAt: number; lockedUntil?: number }
const rateLimitMap = new Map<string, RateEntry>()

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  // Locked out
  if (entry?.lockedUntil && now < entry.lockedUntil) {
    const retryAfterSec = Math.ceil((entry.lockedUntil - now) / 1000)
    return { allowed: false, retryAfterSec }
  }

  // Window expired — reset
  if (!entry || now - entry.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 0, firstAttemptAt: now })
    return { allowed: true }
  }

  return { allowed: true }
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now - entry.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, firstAttemptAt: now })
    return
  }

  const newCount = entry.count + 1
  if (newCount >= MAX_ATTEMPTS) {
    // Lock out for the rest of the window
    const lockedUntil = entry.firstAttemptAt + RATE_LIMIT_WINDOW_MS
    rateLimitMap.set(ip, { ...entry, count: newCount, lockedUntil })
  } else {
    rateLimitMap.set(ip, { ...entry, count: newCount })
  }
}

function clearAttempts(ip: string): void {
  rateLimitMap.delete(ip)
}

// Cleanup stale entries every 5 minutes to prevent memory growth
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now - entry.firstAttemptAt > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitMap.delete(ip)
    }
  }
}, 5 * 60_000)

/**
 * Unified Login API - Auto-detects user role and authenticates
 * Supports: Admin, Operations, Logistics (Admin/Packer/Tracker), Dept-Manager
 *
 * Security:
 * - Rate limiting: 5 failed attempts per IP per 60s → lockout for remainder of window
 * - Single-device login: only one active session per account
 */
export async function POST(request: NextRequest) {
  const ip = getClientIP(request)

  // ── Rate limit check ────────────────────────────────────────────────────────
  const { allowed, retryAfterSec } = checkRateLimit(ip)
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: `Too many login attempts. Please wait ${retryAfterSec} seconds.` },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
    )
  }

  try {
    const { username, password, rememberDevice } = await request.json()

    console.log('[Unified Login] Login attempt:', { username, ip })

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400 }
      )
    }

    // Validate credentials
    console.log('[Unified Login] Validating credentials...')
    const account = await validateCredentials(username, password)
    
    if (!account) {
      // Record failed attempt for rate limiting
      recordFailedAttempt(ip)
      console.log('[Unified Login] Login failed: Invalid credentials')
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      )
    }

    // Success — clear failed attempt counter
    clearAttempts(ip)
    console.log('[Unified Login] Account found:', { username: account.username, role: account.role })
    
    // Create new session (invalidates any existing sessions on other devices)
    console.log('[Unified Login] Creating new session...')
    const sessionId = await createSession(username)
    console.log('[Unified Login] Session created:', sessionId.substring(0, 8) + '...')
    
    const userRole = account.role
    
    // Determine redirect path based on role
    let redirectPath = '/dashboard'
    if (userRole === 'logistics-admin') {
      redirectPath = '/logistics/dashboard'
    } else if (userRole === 'packer') {
      redirectPath = '/packer/dashboard'
    } else if (userRole === 'tracker') {
      redirectPath = '/tracker/dashboard'
    } else if (userRole === 'dept-manager') {
      redirectPath = '/dashboard/operations'
    } else if (userRole === 'operations') {
      redirectPath = '/dashboard/operations'
    }

    console.log('[Unified Login] Login successful, redirecting to:', redirectPath)
    return NextResponse.json({
      success: true,
      sessionId,
      user: {
        username: account.username,
        role: userRole,
        displayName: account.displayName || account.username,
        profileImage: account.profileImage || null,
        email: account.email || '',
        phone: account.phone || '',
        assignedChannel: account.assignedChannel || null
      },
      redirectPath,
      rememberDevice
    })

  } catch (error) {
    console.error('[Unified Login] Error:', error)
    return NextResponse.json(
      { success: false, error: "Authentication failed. Please try again." },
      { status: 500 }
    )
  }
}
