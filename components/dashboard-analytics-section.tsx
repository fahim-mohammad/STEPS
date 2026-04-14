'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'
import { useTranslations } from '@/lib/translations'

type Level = 'ok' | 'warn' | 'urgent'

function levelBadge(level: Level) {
  if (level === 'urgent') return { variant: 'destructive' as const, Icon: ShieldAlert }
  if (level === 'warn') return { variant: 'secondary' as const, Icon: AlertTriangle }
  return { variant: 'outline' as const, Icon: CheckCircle2 }
}

export function DashboardAnalyticsSection({
  language,
  pendingCount,
  missingContributorsCount,
  duesRiskLevel,
  pendingLoans,
}: {
  language: 'en' | 'bn'
  pendingCount: number
  missingContributorsCount: number
  duesRiskLevel: Level
  pendingLoans: number
}) {
  const { t } = useTranslations(language)

  const items: Array<{ labelKey: string; level: Level; value?: string }> = []

  // Approval backlog
  if (pendingCount > 0) {
    items.push({
      labelKey: 'insightApprovalBacklog',
      level: pendingCount >= 10 ? 'urgent' : pendingCount >= 4 ? 'warn' : 'ok',
      value: String(pendingCount),
    })
  } else {
    items.push({ labelKey: 'insightApprovalsUpToDate', level: 'ok' })
  }

  // Missing contributors
  if (missingContributorsCount > 0) {
    items.push({
      labelKey: 'insightMissingContributors',
      level: missingContributorsCount >= 10 ? 'urgent' : missingContributorsCount >= 4 ? 'warn' : 'ok',
      value: String(missingContributorsCount),
    })
  } else {
    items.push({ labelKey: 'insightNoMissingContributors', level: 'ok' })
  }

  // Dues collection risk (computed in dashboard)
  items.push({
    labelKey:
      duesRiskLevel === 'urgent'
        ? 'insightDuesRiskHigh'
        : duesRiskLevel === 'warn'
          ? 'insightDuesRiskMedium'
          : 'insightDuesRiskLow',
    level: duesRiskLevel,
  })

  // Pending loans
  if (pendingLoans > 0) {
    items.push({
      labelKey: 'insightPendingLoanApplications',
      level: pendingLoans >= 6 ? 'warn' : 'ok',
      value: String(pendingLoans),
    })
  }

  return (
    <Card className="card-glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{t('insights')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((it) => {
          const b = levelBadge(it.level)
          return (
            <div key={it.labelKey} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <b.Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="text-sm truncate">{t(it.labelKey)}</div>
              </div>
              <div className="flex items-center gap-2">
                {typeof it.value === 'string' ? <span className="text-sm font-semibold">{it.value}</span> : null}
                <Badge variant={b.variant}>{t(it.level === 'urgent' ? 'urgent' : it.level === 'warn' ? 'warning' : 'ok')}</Badge>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
