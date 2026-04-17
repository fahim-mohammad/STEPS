'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTranslations } from '@/lib/translations'
import { getTotalFundBalance, getTotalCharity, getTotalInvested, getApprovedMembers, getMonthlyCollectionTrend } from '@/lib/data-store'
// PDF is now generated server-side (supports digital signatures)

export default function MonthlyReportPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()
  const isAdmin = effectiveRole === 'chairman' || effectiveRole === 'accountant'

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [loading, setLoading] = useState(true)
  const [fundBalance, setFundBalance] = useState(0)
  const [totalInvested, setTotalInvested] = useState(0)
  const [totalCharity, setTotalCharity] = useState(0)
  const [approvedCount, setApprovedCount] = useState(0)
  const [trend, setTrend] = useState<any[]>([])

  useEffect(() => {
    const savedLang = localStorage.getItem('steps_language') as 'en' | 'bn' | null
    if (savedLang) setLanguage(savedLang)
  }, [])

  useEffect(() => {
    if (!isLoading && !user) router.push('/signin')
    if (!isLoading && user && !user.approved) router.push('/pending-approval')
    if (!isLoading && user && !isAdmin) router.push('/dashboard')
  }, [isLoading, user, isAdmin, router])

  useEffect(() => {
    if (!user || !isAdmin) return
    ;(async () => {
      try {
        setLoading(true)
        const [bal, inv, ch, members, tr] = await Promise.all([
          getTotalFundBalance(),
          getTotalInvested(),
          getTotalCharity(),
          getApprovedMembers(),
          getMonthlyCollectionTrend(6),
        ])
        setFundBalance(bal || 0)
        setTotalInvested(inv || 0)
        setTotalCharity(ch || 0)
        setApprovedCount(Array.isArray(members) ? members.length : 0)
        setTrend(Array.isArray(tr) ? tr : [])
      } finally {
        setLoading(false)
      }
    })()
  }, [user, isAdmin])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  const download = async () => {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const res = await fetch(`/api/pdf/monthly-report?month=${month}&year=${year}&lang=${encodeURIComponent(language)}`)
    if (!res.ok) {
      const j = await res.json().catch(() => null)
      alert(j?.error || 'Failed to generate monthly report')
      return
    }
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `STEPS-Monthly-Report-${year}-${month}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  if (isLoading || !user || !isAdmin) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{t('auto_monthly_fund_report_pdf')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('auto_one_click_auto_generated_report_fund_inv')}
            </p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">{t('auto_fund_balance_48ef52')}</div>
                <div className="font-semibold">৳ {Number(fundBalance || 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">{t('auto_total_invested_01105c')}</div>
                <div className="font-semibold">৳ {Number(totalInvested || 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">{t('auto_total_charity')}</div>
                <div className="font-semibold">৳ {Number(totalCharity || 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">{t('auto_approved_members_8aac7c')}</div>
                <div className="font-semibold">{approvedCount}</div>
              </div>
            </div>

            <Button className="btn-glass" onClick={download} disabled={loading}>
              {loading ? t('loading') : t('auto_download_pdf_403c15')}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}