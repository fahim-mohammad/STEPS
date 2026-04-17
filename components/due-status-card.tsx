'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { computeDueStatus } from '@/lib/data-store'
import { useTranslations } from '@/lib/translations'
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'

interface DueStatusCardProps {
  userId: string
  language: 'en' | 'bn'
}

export function DueStatusCard({ userId, language }: DueStatusCardProps) {
  const [loading, setLoading] = useState(true)
  const [dueStatus, setDueStatus] = useState<{
    status: 'paid' | 'due' | 'partial' | 'unknown'
    totalDue: number
    remaining: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { t } = useTranslations(language)

  useEffect(() => {
    const loadDueStatus = async () => {
      try {
        setLoading(true)
        // Compute due status with sample values
        // In a real scenario, these would come from API
        const status = computeDueStatus({
          baseDue: 1000,
          finesDue: 0,
          paidThisMonth: 0,
        })
        setDueStatus(status)
        setError(null)
      } catch (err) {
        console.error('Error computing due status:', err)
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }

    loadDueStatus()
  }, [userId, language])

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  if (loading) {
    return (
      <Card className="card-glass">
        <CardHeader>
          <CardTitle className="text-sm">Current Month Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-12 bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="card-glass border-red-300">
        <CardContent className="py-4">
          <p className="text-sm text-red-700">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!dueStatus) return null

  const isPaid = dueStatus.status === 'paid'
  const statusLabel = {
    paid: 'Paid',
    due: 'Due',
    partial: 'Partial',
    unknown: 'Unknown'
  }

  return (
    <Card className={`card-glass ${isPaid ? 'border-green-300' : 'border-orange-300'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            Current Due Status
          </CardTitle>
          {isPaid ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-orange-600" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Status
            </span>
            <span className="text-lg font-bold">৳{dueStatus.totalDue.toLocaleString()}</span>
          </div>
          <Badge className={isPaid ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
            {statusLabel[dueStatus.status]}
          </Badge>
        </div>

        {!isPaid && (
          <p className="text-xs text-muted-foreground flex gap-1">
            <Clock className="w-3 h-3 flex-shrink-0 mt-0.5" />
            Remaining: ৳{dueStatus.remaining.toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}