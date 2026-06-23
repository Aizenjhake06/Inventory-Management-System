"use client"

import { redirect } from 'next/navigation'

export default function AdminInternalUsagePage() {
  // Redirect to the main dashboard internal usage page
  redirect('/dashboard/internal-usage')
}
