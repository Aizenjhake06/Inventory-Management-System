import { type NextRequest, NextResponse } from "next/server"
import { updateBusinessContact, deleteBusinessContact } from "@/lib/business-contacts"
import { invalidateCachePattern } from "@/lib/cache"
import { withAdmin, withRoles } from "@/lib/api-helpers"

export const PUT = withRoles(['admin', 'logistics-admin'], async (request, { params, user }) => {
  try {
    const id = params.id
    const body = await request.json()
    
    await updateBusinessContact(id, body)
    
    invalidateCachePattern('business-contacts')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[API] Error updating business contact:", error)
    return NextResponse.json({ error: "Failed to update business contact" }, { status: 500 })
  }
})

export const DELETE = withRoles(['admin', 'logistics-admin'], async (request, { params, user }) => {
  try {
    const id = params.id
    
    await deleteBusinessContact(id)
    
    invalidateCachePattern('business-contacts')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[API] Error deleting business contact:", error)
    return NextResponse.json({ error: "Failed to delete business contact" }, { status: 500 })
  }
})
