'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { computeDueStatus } from '@/lib/data-store'
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'

interface DueStatusCardProps {
  userId: string
  language: 'en' | 'bn'
}

export function DueStatusCard({ userId, language }: DueStatusCardProps) {
  const [loading, setLoading] = useState(true)
  const [dueStatus, setDueStatus] = useState<{
    status: 'paid' | 'unpaid'
    expectedAmount: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1

  useEffect(() => {
    const loadDueStatus = async () => {
      try {
        setLoading(true)
        const status = await computeDueStatus(userId, currentYear, currentMonth)
        setDueStatus(status)
        setError(null)
      } catch (err) {
        console.error('Error computing due status:', err)
        setError(t('auto_failed_to_load_due_status'))
      } finally {
        setLoading(false)
      }
    }

    loadDueStatus()
  }, [userId, currentYear, currentMonth, language])

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  const monthNamesBn = [
    'জানু', 'ফেব', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগ', 'সেপ', 'অক্টো', 'নভে', 'ডিসেম'
  ]

  const localeMap: Record<typeof language, string> = { en: 'en-US', bn: 'bn-BD' }
  const monthFormatter = new Intl.DateTimeFormat(localeMap[language], { month: 'long' })
  const currentMonthName = monthFormatter.format(new Date(currentYear, currentMonth - 1, 1))

  if (loading) {
    return (
      <Card className="card-glass">
        <CardHeader>
          <CardTitle className="text-sm">{t('auto_current_month_status')}</CardTitle>
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

  return (
    <Card className={`card-glass ${isPaid ? 'border-green-300' : 'border-orange-300'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            {t('auto_currentmonthname_currentyear_status')}
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
              {t('auto_expected_amount')}
            </span>
            <span className="text-lg font-bold">৳{dueStatus.expectedAmount.toLocaleString()}</span>
          </div>
          <Badge className={isPaid ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
            {isPaid ? (t('auto_paid')) : (t('auto_pending_af2919'))}
          </Badge>
        </div>

        {!isPaid && (
          <p className="text-xs text-muted-foreground flex gap-1">
            <Clock className="w-3 h-3 flex-shrink-0 mt-0.5" />
            {t('auto_please_submit_your_contribution_to_compl')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}