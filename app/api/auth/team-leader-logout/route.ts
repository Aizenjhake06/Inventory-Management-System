import { NextRequest, NextResponse } from 'next/server'
import { destroySession } from '@/lib/session-manager'

/**
 * POST /api/auth/team-leader-logout
 * Team leader logout - destroy session and clear data
 * 
 * Requirements: 9.5
 */
export const POST = async (request: NextRequest) => {
  try {
    // Get username from request body
    const body = await request.json().catch(() => ({}))
    const { username } = body

    // Destroy session if username provided
    if (username) {
      console.log('[Team Leader Logout] Destroying session for:', username)
      await destroySession(username)
    }

    // Clear session by returning success response
    // Client will handle clearing localStorage/cookies
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    }, { status: 200 })

  } catch (error) {
    console.error('[Team Leader Logout] Error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}
