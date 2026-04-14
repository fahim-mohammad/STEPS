'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, ArrowRight } from 'lucide-react'
import { useTranslations } from '@/lib/translations'
import { Button } from '@/components/ui/button'

type Props = {
  language: 'en' | 'bn'
  currentDue: number
  currentFine: number
  myPendingContributions: number
  myApprovedContributions: number
  nextDueLabel: string
  fundBalance: number
  onGoPay?: () => void
  onGoReceipts?: () => void
}

function money(n: number) {
  return `৳${Number(n || 0).toLocaleString()}`
}

export function MemberAISuggestionsCard({
  language,
  currentDue,
  currentFine,
  myPendingContributions,
  myApprovedContributions,
  nextDueLabel,
  fundBalance,
  onGoPay,
  onGoReceipts,
}: Props) {
  const { t } = useTranslations(language)

  const suggestions = useMemo(() => {
    const out: string[] = []

    if (currentDue > 0) {
      out.push(t('ai_member_due', { amount: money(currentDue) }))
    } else {
      out.push(t('ai_member_no_due'))
    }

    if (currentFine > 0) {
      out.push(t('ai_member_fine', { amount: money(currentFine) }))
    }

    if (myPendingContributions > 0) {
      out.push(t('ai_member_pending', { count: myPendingContributions }))
    }

    if (myApprovedContributions > 0) {
      out.push(t('ai_member_paid_total', { amount: money(myApprovedContributions) }))
    }

    if (nextDueLabel) {
      out.push(t('ai_member_next_due', { label: nextDueLabel }))
    }

    if (fundBalance > 0) {
      out.push(t('ai_member_fund_health_hint'))
    }

    return out
  }, [t, currentDue, currentFine, myPendingContributions, myApprovedContributions, nextDueLabel, fundBalance])

  return (
    <Card className="card-glass">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" />
Member Insights
          <Badge variant="secondary" className="ml-auto">
STEPS
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
Your current dues, pending records, and helpful shortcuts are shown below.
        </div>

        <ul className="space-y-2">
          {suggestions.map((s, idx) => (
            <li key={idx} className="text-sm flex gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-primary/70" />
              <span>{s}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2 pt-1">
          {onGoPay ? (
            <Button className="btn-glass" onClick={onGoPay}>
              {t('ai_member_pay_now')} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : null}

          {onGoReceipts ? (
            <Button variant="outline" className="rounded-xl" onClick={onGoReceipts}>
              {t('ai_member_view_receipts')}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}