"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { computeFundHealth, type FundHealthScore } from "@/lib/data-store"
import { useTranslations } from "@/lib/translations"

interface FundHealthCompactCardProps {
  fundBalance: number
  approvedCount: number
  totalCharity: number
  totalInvested: number
  pendingApprovals?: number
  missingContributorsCount?: number
  loansPending?: number
  loansApproved?: number
  loansRequestedAmount?: number
  isAdmin: boolean
  language: "en" | "bn"
  lastUpdated?: Date
}

type HealthStatus = "good" | "watch" | "risk"

function getStatusLabels(t: (k: string) => string, status: HealthStatus) {
  if (status === "good") return t("auto_good_cc2ca6")
  if (status === "watch") return t("auto_watch")
  return t("auto_risk_a7e7d2")
}

/**
 * Colors tuned for both light/dark.
 * - Dots: slightly transparent so they don't scream in dark mode
 * - Bars: also softened for dark
 * - Background track uses muted (already theme-safe)
 */
function getStatusColors(status: HealthStatus, score: number) {
  const dot =
    status === "good"
      ? "bg-emerald-500/80"
      : status === "watch"
        ? "bg-amber-500/85"
        : "bg-rose-500/85"

  const bar =
    score >= 80 ? "bg-emerald-500/75" : score >= 50 ? "bg-amber-500/80" : "bg-rose-500/80"

  // For reason bullet dots (small)
  const reasonDot = (impact?: "positive" | "negative" | "neutral") => {
    if (impact === "positive") return "bg-emerald-500/70"
    if (impact === "negative") return "bg-amber-500/75"
    return "bg-muted-foreground/35"
  }

  return { dot, bar, reasonDot }
}

export function FundHealthCompactCard({
  fundBalance,
  approvedCount,
  totalCharity,
  totalInvested,
  pendingApprovals,
  missingContributorsCount,
  loansPending,
  loansApproved,
  loansRequestedAmount,
  isAdmin,
  language,
}: FundHealthCompactCardProps) {
  const { t } = useTranslations(language)

  const health = useMemo((): FundHealthScore => {
    return computeFundHealth({
      fundBalance,
      approvedCount,
      totalCharity,
      totalInvested,
      pendingApprovals,
      missingContributorsCount,
      loansPending,
      loansApproved,
      loansRequestedAmount,
      isAdmin,
      language,
    })
  }, [
    fundBalance,
    approvedCount,
    totalCharity,
    totalInvested,
    pendingApprovals,
    missingContributorsCount,
    loansPending,
    loansApproved,
    loansRequestedAmount,
    isAdmin,
    language,
  ])

  const status = (health.status ?? "watch") as HealthStatus
  const statusLabel = getStatusLabels(t, status)
  const colors = getStatusColors(status, health.score)

  return (
    <Card className="relative z-10 pointer-events-auto h-full glass-panel">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold">{t("auto_fund_health_d6c5d0")}</CardTitle>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`h-2.5 w-2.5 rounded-full ${colors.dot}`}
              aria-hidden="true"
              title={statusLabel}
            />
            <span className="text-xs font-semibold text-muted-foreground">{statusLabel}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t("auto_score_1dafb8")}</span>
          <span className="text-sm font-bold">{health.score}/100</span>
        </div>

        <div className="w-full bg-muted/70 rounded-full h-1.5 overflow-hidden">
          <div className={`h-full ${colors.bar}`} style={{ width: `${health.score}%` }} />
        </div>

        {health.reasons?.length ? (
          <div className="space-y-1 mt-2">
            {health.reasons.slice(0, 3).map((r, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className={`h-2 w-2 rounded-full ${colors.reasonDot(r.impact)}`} />
                <p className="text-muted-foreground truncate" title={r.label}>
                  {r.label}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}