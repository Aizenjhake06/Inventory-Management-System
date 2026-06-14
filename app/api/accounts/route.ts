import { NextRequest, NextResponse } from "next/server"
import { getAccounts, validateCredentials, updateAccount, updateUsername, addAccount } from "@/lib/supabase-db"
import { withAdmin } from "@/lib/api-helpers"

// GET - Get all accounts (admin only)
export const GET = withAdmin(async (request, { user }) => {
  try {
    const accounts = await getAccounts()
    
    // Remove passwords from response for security
    const safeAccounts = accounts.map(acc => ({
      id: acc.id,
      username: acc.username,
      role: acc.role,
      displayName: acc.displayName,
      assignedChannel: acc.assignedChannel,
      profileImage: acc.profileImage,
      createdAt: acc.createdAt
    }))
    
    return NextResponse.json(safeAccounts)
  } catch (error) {
    console.error("[Accounts API] Error fetching accounts:", error)
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 })
  }
})

// POST - Create new account or validate credentials (no auth required for login)
export async function POST(request: NextRequest) {
  try {
    console.log("[Accounts API] POST called")
    
    console.log("[Accounts API] Parsing request body")
    const body = await request.json()
    const { action, username, password, role, displayName, email, phone, targetUsername, newUsername } = body
    console.log("[Accounts API] Action:", action, "Username:", username)

    if (action === "validate") {
      // Login - no auth required
      console.log("[Accounts API] Attempting to validate credentials")
      
      try {
        const account = await validateCredentials(username, password)
        console.log("[Accounts API] Validation result:", account ? "success" : "failed")
        
        if (account) {
          return NextResponse.json({
            success: true,
            account: {
              username: account.username,
              role: account.role,
              displayName: account.displayName,
              assignedChannel: account.assignedChannel || null,
              profileImage: account.profileImage || null,
              email: account.email || '',
              phone: account.phone || ''
            }
          })
        } else {
          return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
        }
      } catch (dbError: any) {
        console.error("[Accounts API] Database error during validation:", dbError)
        return NextResponse.json({ 
          success: false, 
          error: "Database connection error: " + (dbError.message || "Unknown error")
        }, { status: 500 })
      }
    } else if (action === "create") {
      // Create new account - requires admin (checked via middleware in frontend)
      const newAccount = await addAccount({
        username,
        password,
        role: role || "operations",
        displayName: displayName || username,
        assignedChannel: body.assignedChannel || null,
        profileImage: body.profileImage || null
      })
      
      return NextResponse.json({
        success: true,
        account: {
          id: newAccount.id,
          username: newAccount.username,
          role: newAccount.role,
          displayName: newAccount.displayName,
          assignedChannel: newAccount.assignedChannel,
          profileImage: newAccount.profileImage,
          createdAt: newAccount.createdAt
        }
      })
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("[Accounts API] Error:", error)
    console.error("[Accounts API] Error stack:", error.stack)
    return NextResponse.json({ 
      success: false,
      error: error.message || "Operation failed" 
    }, { status: 500 })
  }
}

// PUT - Update account (authenticated users can update their own, admins can update any)
export async function PUT(request: NextRequest) {
  try {
    // Get current user from headers
    const username = request.headers.get('x-user-username')
    const role = request.headers.get('x-user-role')

    if (!username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { action, username: targetUsername, newUsername, password, displayName, email, phone } = body

    // Users can only update their own account unless they're admin
    if (role !== 'admin' && username !== targetUsername) {
      return NextResponse.json({ error: "Forbidden: You can only update your own account" }, { status: 403 })
    }

    if (action === 'updatePassword') {
      await updateAccount(targetUsername, { password })
      return NextResponse.json({ success: true, message: "Password updated successfully" })
    } else if (action === 'updateDisplayName') {
      const updates: any = { displayName }
      if (body.assignedChannel !== undefined) {
        updates.assignedChannel = body.assignedChannel
      }
      if (body.profileImage !== undefined) {
        updates.profileImage = body.profileImage
      }
      await updateAccount(targetUsername, updates)
      return NextResponse.json({ success: true, message: "Display name updated successfully" })
    } else if (action === 'updateProfile') {
      // Update display name, email, phone, profileImage, and optionally username
      const updates: any = {}
      if (displayName !== undefined) updates.displayName = displayName
      if (email !== undefined) updates.email = email
      if (phone !== undefined) updates.phone = phone
      if (body.profileImage !== undefined) updates.profileImage = body.profileImage
      
      console.log('[Accounts API] updateProfile called:', {
        targetUsername,
        updates,
        hasProfileImage: !!body.profileImage
      })
      
      await updateAccount(targetUsername, updates)
      return NextResponse.json({ success: true, message: "Profile updated successfully" })
    } else if (action === 'updateUsername') {
      // Users can update their own username, admins can update any username
      if (role !== 'admin' && username !== targetUsername) {
        return NextResponse.json({ error: "Forbidden: You can only change your own username" }, { status: 403 })
      }
      
      if (!newUsername || newUsername.trim() === '') {
        return NextResponse.json({ error: "New username is required" }, { status: 400 })
      }
      
      await updateUsername(targetUsername, newUsername)
      return NextResponse.json({ success: true, message: "Username updated successfully" })
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("[Accounts API] Error:", error)
    return NextResponse.json({ error: error.message || "Update failed" }, { status: 500 })
  }
}

// DELETE - Delete account (admin only)
export const DELETE = withAdmin(async (request, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    // Prevent deleting own account
    if (username === user.username) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    // Delete from database
    const { deleteAccount } = await import("@/lib/supabase-db")
    await deleteAccount(username)

    return NextResponse.json({ 
      success: true, 
      message: `User "${username}" deleted successfully` 
    })
  } catch (error: any) {
    console.error("[Accounts API] Delete error:", error)
    return NextResponse.json({ 
      error: error.message || "Failed to delete account" 
    }, { status: 500 })
  }
})
