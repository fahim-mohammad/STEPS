'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export function BackToDashboardButton({ label = 'Back to Dashboard' }) {
  const router = useRouter()

  return (
    <div className="w-full flex justify-start">
      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className="inline-flex items-center gap-2 px-4 py-2 btn-glass"
      >
        <ArrowLeft className="w-4 h-4" />
        {label}
      </button>
    </div>
  )
}