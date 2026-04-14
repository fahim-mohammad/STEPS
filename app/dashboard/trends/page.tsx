"use client"

import { useEffect, useMemo, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useTranslations } from "@/lib/translations"
import {
  computeFundHealth,
  getApprovedMembers,
  getMissingContributorsCount,
  getPendingMembers,
  getTotalCharity,
  getTotalFundBalance,
  getTotalInvested,
} from "@/lib/data-store"

type HealthDot = {
  year: number
  month: number
  status: "good" | "watch" | "risk"
  score: number
}

function monthLabel(year: number, month: number) {
  const d = new Date(year, month - 1, 1)
  return d.toLocaleString(undefined, { month: "short", year: "numeric" })
}

export default function FundHealthTrendsPage() {
  const now = useMemo(() => new Date(), [])

  const [language, setLanguage] = useState<"en" | "bn">("en")
  const { t } = useTranslations(language)

  const [loading, setLoading] = useState(true)
  const [dots, setDots] = useState<HealthDot[]>([])
  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)

        // Current totals (we use current balance/invest/charity as stable anchors)
        const [fundBalance, totalInvested, totalCharity, approvedCount, pendingApprovals] = await Promise.all([
          getTotalFundBalance(),
          getTotalInvested(),
          getTotalCharity(),
          getApprovedMembers(),
          getPendingMembers(),
        ])

        const points: HealthDot[] = []
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now)
          d.setMonth(d.getMonth() - i)
          const m = d.getMonth() + 1
          const y = d.getFullYear()

          const missing = await getMissingContributorsCount(m, y)

          const health = computeFundHealth({
            fundBalance: Number(fundBalance || 0),
            approvedCount: Number(approvedCount || 0),
            totalCharity: Number(totalCharity || 0),
            totalInvested: Number(totalInvested || 0),
            pendingApprovals: Number(pendingApprovals || 0),
            missingContributorsCount: Number(missing || 0),
            isAdmin: false,
            language,
          })

          points.push({ year: y, month: m, status: health.status, score: health.score })
        }

        setDots(points)
      } finally {
        setLoading(false)
      }
    })()
  }, [language, now])

  const dotEmoji = (s: HealthDot["status"]) => (s === "good" ? "🟢" : s === "watch" ? "🟡" : "🔴")

  return (
    <div className="min-h-screen">
      <Navbar
        language={language} onLanguageChange={(l) => {
          setLanguage(l)
          localStorage.setItem("steps_language", l)
        }}
      />

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('auto_financial_health_trend')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('auto_last_6_months_fund_health_history_badge_')}
          </p>
        </div>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-sm">{t('auto_last_6_months')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <>
                <div className="text-2xl tracking-widest">
                  {dots.map((d, idx) => (
                    <span key={`${d.year}-${d.month}-${idx}`}>{dotEmoji(d.status)}</span>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dots.map((d) => (
                    <div key={`${d.year}-${d.month}`} className="flex items-center justify-between rounded-xl border p-3">
                      <div className="flex items-center gap-3">
                        <div className="text-xl">{dotEmoji(d.status)}</div>
                        <div>
                          <div className="text-sm font-semibold">{monthLabel(d.year, d.month)}</div>
                          <div className="text-xs text-muted-foreground">
                            {t('auto_score')}: {d.score}/100
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {d.status === "good"
                          ? t('auto_fund_healthy')
                          : d.status === "watch"
                            ? t('auto_some_delayed')
                            : t('auto_action_needed')}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}