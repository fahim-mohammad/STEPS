"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function BackToDashboard() {
  const router = useRouter()

  return (
    <div className="mt-4">
      <button
        onClick={() => router.push('/dashboard')}
        className="inline-flex items-center gap-2 px-4 py-2 btn-glass"
        aria-label="Back to dashboard"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Dashboard</span>
      </button>
    </div>
  )
}
