'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BrandLoader } from '@/components/ui/brand-loader'

export default function LogisticsPOSPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to main dashboard POS page
    router.replace('/dashboard/pos')
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <BrandLoader size="lg" />
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Redirecting to POS...</p>
      </div>
    </div>
  )
}
