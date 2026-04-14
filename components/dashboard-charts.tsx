'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from '@/lib/translations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'

interface ChartData {
  month: string
  collections: number
  target?: number | null
}

interface ContributionStats {
  pending: number
  approved: number
}

interface DashboardChartsProps {
  userId: string
  isAdmin: boolean
  language: 'en' | 'bn'
  fundBalance?: number
  totalInvested?: number
  totalCharity?: number
  totalCosts?: number
}

export function DashboardCharts({
  userId,
  isAdmin,
  language,
  fundBalance,
  totalInvested,
  totalCharity,
  totalCosts,
}: DashboardChartsProps) {
  const { t } = useTranslations(language)

  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState<ChartData[]>([])
  const [contribStats, setContribStats] = useState<ContributionStats>({
    pending: 0,
    approved: 0,
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadChartData() {
      try {
        setLoading(true)
        setError(null)

        const monthlyUrl = isAdmin
          ? '/api/reports/monthly'
          : '/api/reports/monthly-my'

        const res = await fetch(monthlyUrl, {
          method: 'GET',
          cache: 'no-store',
        })

        if (!res.ok) {
          if (!cancelled) {
            setError('Failed to load chart data')
            setMonthlyData([])
          }
          return
        }

        const json = await res.json().catch(() => null)

        if (!json?.success) {
          if (!cancelled) {
            setError('Failed to load chart data')
            setMonthlyData([])
          }
          return
        }

        const months = Array.isArray(json.months) ? json.months : []
        const collections = Array.isArray(json.collections)
          ? json.collections.map((n: unknown) => Number(n ?? 0))
          : []
        const targets = Array.isArray(json.targets)
          ? json.targets.map((v: unknown) =>
              v == null ? null : Number(v)
            )
          : []

        const formatted: ChartData[] = months.map((m: unknown, i: number) => ({
          month: String(m ?? ''),
          collections: collections[i] ?? 0,
          target: targets[i] ?? null,
        }))

        if (!cancelled) {
          setMonthlyData(formatted)
        }

        if (!isAdmin) {
          try {
            const res2 = await fetch('/api/charts/contribution-status', {
              method: 'GET',
              cache: 'no-store',
            })

            if (!res2.ok) return

            const j2 = await res2.json().catch(() => null)

            if (j2?.ok && j2?.data && !cancelled) {
              setContribStats({
                approved: Number(j2.data.approved || 0),
                pending: Number(j2.data.pending || 0),
              })
            }
          } catch (err) {
            console.error('Contribution status chart load failed:', err)
          }
        }
      } catch (err) {
        console.error('Error loading dashboard charts:', err)
        if (!cancelled) {
          setError('Failed to load chart data')
          setMonthlyData([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadChartData()

    return () => {
      cancelled = true
    }
  }, [userId, isAdmin])

  const memberPieData = useMemo(
    () => [
      {
        name: t('auto_approved_f64e24'),
        value: contribStats.approved,
      },
      {
        name: t('auto_pending_af2919'),
        value: contribStats.pending,
      },
    ],
    [contribStats.approved, contribStats.pending, t]
  )

  const adminFundPie = useMemo(() => {
    const fb = Number(fundBalance ?? 0)
    const inv = Number(totalInvested ?? 0)
    const ch = Number(totalCharity ?? 0)
    const cost = Number(totalCosts ?? 0)

    const data = [
      { name: t('auto_fund_balance_48ef52'), value: fb },
      { name: t('auto_investments_51aa86'), value: inv },
      { name: t('auto_charity_given_861348'), value: ch },
    ]

    if (cost > 0) {
      data.push({ name: t('auto_costs'), value: cost })
    }

    return data.filter((d) => Number(d.value) > 0)
  }, [fundBalance, totalInvested, totalCharity, totalCosts, t])

  const PIE_COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#a855f7']

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="card-glass">
        <CardHeader>
          <CardTitle>{t('auto_collection_trend_last_6_months')}</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {error ? (
            <div className="text-sm text-muted-foreground">{error}</div>
          ) : monthlyData.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {t('auto_no_data')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="collections"
                  name={t('auto_collected')}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  name={t('auto_target')}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="card-glass">
        <CardHeader>
          <CardTitle>
            {isAdmin
              ? t('auto_fund_distribution')
              : t('auto_my_contribution_status_b6da98')}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {isAdmin ? (
            adminFundPie.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {t('auto_no_data_e92356')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={adminFundPie}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    label
                  >
                    {adminFundPie.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={memberPieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label
                >
                  {memberPieData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}