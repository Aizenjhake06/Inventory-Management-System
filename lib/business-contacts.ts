import { supabaseAdmin } from "./supabase"
import type { BusinessContact } from "./types"

const formatTimestamp = (date: Date) => {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }
  const formatted = date.toLocaleString('sv-SE', options)
  return formatted.replace(' ', 'T')
}

export async function getBusinessContacts(): Promise<BusinessContact[]> {
  const { data, error } = await supabaseAdmin
    .from('business_contacts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Supabase] Error fetching business contacts:', error)
    throw new Error('Failed to fetch business contacts')
  }

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    companyName: row.company_name || "",
    contactPerson: row.contact_person || "",
    contactType: row.contact_type as 'supplier' | 'distributor' | 'reseller',
    position: row.position || "",
    email: row.email || "",
    phone: row.phone || "",
    address: row.address || "",
    notes: row.notes || "",
    createdAt: row.created_at || formatTimestamp(new Date()),
  }))
}

export async function addBusinessContact(contact: Omit<BusinessContact, "id" | "createdAt">): Promise<BusinessContact> {
  const id = `CONTACT-${Date.now()}`
  const createdAt = formatTimestamp(new Date())

  const { data, error } = await supabaseAdmin
    .from('business_contacts')
    .insert({
      id,
      name: contact.name,
      company_name: contact.companyName || null,
      contact_person: contact.contactPerson || null,
      contact_type: contact.contactType,
      position: contact.position || null,
      email: contact.email || null,
      phone: contact.phone || null,
      address: contact.address || null,
      notes: contact.notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[Supabase] Error adding business contact:', error)
    throw new Error('Failed to add business contact')
  }

  return { ...contact, id, createdAt }
}

export async function updateBusinessContact(id: string, updates: Partial<BusinessContact>): Promise<void> {
  const updateData: any = {}
  
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.companyName !== undefined) updateData.company_name = updates.companyName || null
  if (updates.contactPerson !== undefined) updateData.contact_person = updates.contactPerson || null
  if (updates.contactType !== undefined) updateData.contact_type = updates.contactType
  if (updates.position !== undefined) updateData.position = updates.position || null
  if (updates.email !== undefined) updateData.email = updates.email || null
  if (updates.phone !== undefined) updateData.phone = updates.phone || null
  if (updates.address !== undefined) updateData.address = updates.address || null
  if (updates.notes !== undefined) updateData.notes = updates.notes || null

  const { error } = await supabaseAdmin
    .from('business_contacts')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('[Supabase] Error updating business contact:', error)
    throw new Error('Failed to update business contact')
  }
}

export async function deleteBusinessContact(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('business_contacts')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[Supabase] Error deleting business contact:', error)
    throw new Error('Failed to delete business contact')
  }
}
