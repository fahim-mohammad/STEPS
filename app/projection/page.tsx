'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from '@/lib/translations'
import { getApprovedMembers, getContributionAmount } from '@/lib/data-store'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import Link from 'next/link'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { ArrowLeft, Info } from 'lucide-react'
export default function ProjectionPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)
  const [projectionYears, setProjectionYears] = useState(5)
  const [projections, setProjections] = useState<any[]>([])
  const [memberCount, setMemberCount] = useState(0)
  const [monthlyContribution, setMonthlyContribution] = useState(0)


  useEffect(() => {

    const savedLanguage = localStorage.getItem('steps_language') as 'en' | 'bn' | null
    if (savedLanguage) {
      setLanguage(savedLanguage)
    }

    if (!isLoading && !user) {
      router.push('/signin')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    // projection calculation currently disabled (missing helper); placeholder empty data
    setProjections([])
  }, [projectionYears])

  useEffect(() => {
    const loadMemberCount = async () => {
      const members = await getApprovedMembers()
      setMemberCount(members.length)
    }
    loadMemberCount()
  }, [])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  useEffect(() => {
  const loadContribution = async () => {
    const year = new Date().getFullYear()
    const month = new Date().getMonth() + 1

    const amount = await getContributionAmount(year, month)
    setMonthlyContribution(amount || 0)
  }

  loadContribution()
}, [])


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const currentYear = new Date().getFullYear()

  return (
    <div className="min-h-screen">
      <Navbar
        language={language}
        onLanguageChange={handleLanguageChange} />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-4">
          <BackToDashboardButton label={t('auto_back_e27ae6')} />
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            {t('auto_fund_growth_projection')}
          </h1>
          <p className="text-muted-foreground">
            {t('auto_transparent_mathematical_projection_of_f')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="card-glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('auto_member_count')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{memberCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('auto_approved_members_07f993')}
              </p>
            </CardContent>
          </Card>

          <Card className="card-glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('auto_monthly_contribution')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">৳ {monthlyContribution}</div>

              <p className="text-xs text-muted-foreground mt-1">
                {t('auto_per_member')}
              </p>
            </CardContent>
          </Card>

          <Card className="card-glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('auto_projection_period')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{projectionYears}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('auto_years')}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8 card-glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              {t('auto_disclaimer')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              {t('auto_this_projection_is_based_on_transparent_')}
            </p>
            <p>
              {t('auto_investment_rates_dps_7_fdr_8_5_are_estim')}
            </p>
            <p>
              {t('auto_actual_results_may_vary_based_on_market_')}
            </p>
            <p>
              {t('auto_base_scenario_shows_contributions_withou')}
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <Card className="card-glass">
            <CardHeader>
              <CardTitle>{t('auto_projection_table')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">{t('auto_year_346ca2')}</th>
                      <th className="text-right py-2 px-2">{t('auto_base')}</th>
                      <th className="text-right py-2 px-2">DPS</th>
                      <th className="text-right py-2 px-2">FDR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projections.map((proj) => (
                      <tr key={proj.year} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-2">{proj.year}</td>
                        <td className="text-right py-2 px-2">৳{proj.baseContribution.toLocaleString()}</td>
                        <td className="text-right py-2 px-2 text-blue-600">৳{proj.withDPS.toLocaleString()}</td>
                        <td className="text-right py-2 px-2 text-green-600">৳{proj.withFDR.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="card-glass">
            <CardHeader>
              <CardTitle>{t('auto_projection_period_965b41')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t('auto_select_years_to_project')}
                  </label>
                  <div className="flex gap-2">
                    {[1, 3, 5, 10].map((years) => (
                      <button
                        key={years}
                        onClick={() => setProjectionYears(years)}
                        className={`btn-glass px-4 py-2 transition-colors ${
                          projectionYears === years
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {years}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Line Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t('auto_growth_trend')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={projections}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip formatter={(value) => `৳${(value as number).toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="baseContribution" stroke="#8884d8" name={t('auto_base_no_investment')} />
                <Line type="monotone" dataKey="withDPS" stroke="#82ca9d" name="With DPS (7%)" />
                <Line type="monotone" dataKey="withFDR" stroke="#ffc658" name="With FDR (8.5%)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('auto_year_on_year_comparison')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projections}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip formatter={(value) => `৳${(value as number).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="baseContribution" fill="#8884d8" name={t('auto_base_82e9a1')} />
                <Bar dataKey="withDPS" fill="#82ca9d" name="DPS" />
                <Bar dataKey="withFDR" fill="#ffc658" name="FDR" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
