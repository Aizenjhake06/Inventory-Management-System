"use client"

import { redirect } from 'next/navigation'

export default function AdminBusinessContactsPage() {
  // Redirect to the main dashboard business contacts page
  redirect('/dashboard/business-contacts')
}
