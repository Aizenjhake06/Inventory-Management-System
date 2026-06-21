import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session-manager'

/**
 * POST /api/auth/validate-session
 * Validates if a user's session is still active
 */
export async function POST(request: NextRequest) {
  try {
    const { username, sessionId } = await request.json()

    if (!username || !sessionId) {
      return NextResponse.json(
        { valid: false, error: "Missing credentials" },
        { status: 400 }
      )
    }

    // Validate session
    const isValid = await validateSession(username, sessionId)

    if (!isValid) {
      return NextResponse.json(
        { 
          valid: false, 
          error: "Session invalid or expired",
          message: "Your session has expired or you have logged in from another device. Please log in again."
        },
        { status: 401 }
      )
    }

    return NextResponse.json({ 
      valid: true,
      message: "Session is valid"
    })

  } catch (error) {
    console.error('[Validate Session] Error:', error)
    return NextResponse.json(
      { 
        valid: false, 
        error: "Server error during validation",
        message: "An error occurred while validating your session. Please try again."
      },
      { status: 500 }
    )
  }
}
