'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export default function PageShell({
  title,
  subtitle,
  leftSlot,
  rightSlot,
  children,
  className,
}: {
  title: string
  subtitle?: string
  leftSlot?: React.ReactNode
  rightSlot?: React.ReactNode
  children: React.ReactNode
  className?: string
  
}) {
  return (
    <main className={cn('mx-auto max-w-6xl px-4 pb-10 pt-6', className)}>
      {/* Header row */}
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {leftSlot ? <div className="shrink-0">{leftSlot}</div> : null}
            <div>
              <div className="text-2xl font-semibold tracking-tight">{title}</div>
              {subtitle ? <div className="text-sm text-muted-foreground mt-1">{subtitle}</div> : null}
            </div>
          </div>

          {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </div>
      </div>

      {/* Body */}
      <div className="space-y-5">{children}</div>
    </main>
  )
}