"use client"

import { useEffect, useRef, useCallback } from "react"

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000 // 30 minutes
const WARNING_BEFORE_MS  = 2  * 60 * 1000  // warn 2 min before logout

interface UseSessionTimeoutOptions {
  onWarning?: (secondsLeft: number) => void
  onLogout:  () => void
  enabled?:  boolean
}

/**
 * Auto-logout after 30 minutes of inactivity.
 * Shows a warning 2 minutes before logout.
 * Resets on any user activity (mouse, keyboard, touch, scroll).
 */
export function useSessionTimeout({
  onWarning,
  onLogout,
  enabled = true,
}: UseSessionTimeoutOptions) {
  const logoutTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnedRef    = useRef(false)

  const clearTimers = useCallback(() => {
    if (logoutTimer.current)  clearTimeout(logoutTimer.current)
    if (warningTimer.current) clearTimeout(warningTimer.current)
  }, [])

  const reset = useCallback(() => {
    if (!enabled) return
    clearTimers()
    warnedRef.current = false

    // Warning fires 2 min before logout
    warningTimer.current = setTimeout(() => {
      if (!warnedRef.current) {
        warnedRef.current = true
        onWarning?.(Math.round(WARNING_BEFORE_MS / 1000))
      }
    }, INACTIVITY_LIMIT_MS - WARNING_BEFORE_MS)

    // Logout fires after full inactivity period
    logoutTimer.current = setTimeout(() => {
      onLogout()
    }, INACTIVITY_LIMIT_MS)
  }, [enabled, clearTimers, onWarning, onLogout])

  useEffect(() => {
    if (!enabled) return

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"]
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))

    // Start the timer immediately
    reset()

    return () => {
      clearTimers()
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [enabled, reset, clearTimers])
}
