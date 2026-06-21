import { NextRequest, NextResponse } from 'next/server'
import { destroySession } from '@/lib/session-manager'

/**
 * Logout API Endpoint
 * Destroys the session and clears all session data
 */
export async function POST(request: NextRequest) {
  try {
    // Get username from request body
    const body = await request.json().catch(() => ({}))
    const { username } = body

    // Destroy session if username provided
    if (username) {
      console.log('[Logout API] Destroying session for:', username)
      await destroySession(username)
    }

    // Create response with success message
    const response = NextResponse.json({ 
      success: true,
      message: 'Logged out successfully' 
    })

    // Clear all possible cookies (if any are set)
    response.cookies.delete('session')
    response.cookies.delete('token')
    response.cookies.delete('auth')

    return response
  } catch (error) {
    console.error('[Logout API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    )
  }
}
