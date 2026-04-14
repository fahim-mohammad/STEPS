'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'

export default function CharityMemberPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  const [donations, setDonations] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    const savedLang = (localStorage.getItem('steps_language') as 'en' | 'bn') || 'en'
    setLanguage(savedLang)
  }, [])

  useEffect(() => {
    if (!isLoading && !user) router.push('/signin')
    if (!isLoading && user && !user.approved) router.push('/pending-approval')
  }, [user, isLoading, router])

  const handleLanguageChange = (l: 'en' | 'bn') => {
    setLanguage(l)
    localStorage.setItem('steps_language', l)
  }

  useEffect(() => {
    if (!user) return
    ;(async () => {
      setLoading(true)
      const res = await fetch('/api/member/charity')
      const json = await res.json()
      if (json?.ok) {
        setSummary(json.summary)
        setDonations(json.donations || [])
        setHistory(json.history || [])
      }
      setLoading(false)
    })()
  }, [user])

  if (isLoading || !user) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title="Charity -- Nur Az Zahra Foundation"
        subtitle="All charity and haram profit goes to Nur Az Zahra Foundation. Field work is carried out by the foundation."
        leftSlot={<BackToDashboardButton label={t('auto_back_a95ba7')} />}
      >
        {loading ? (
          <Card className="card-glass"><CardContent className="p-6">{t('loading')}</CardContent></Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="card-glass">
                <CardHeader><CardTitle className="text-sm">Charity Available Balance</CardTitle></CardHeader>
                <CardContent className="text-2xl font-bold">৳{Number(summary?.charity_balance || 0).toLocaleString()}</CardContent>
              </Card>
              <Card className="card-glass">
                <CardHeader><CardTitle className="text-sm">{t('auto_total_charity_given')}</CardTitle></CardHeader>
                <CardContent className="text-2xl font-bold">৳{Number(summary?.total_charity_given || 0).toLocaleString()}</CardContent>
              </Card>
              <Card className="card-glass">
                <CardHeader><CardTitle className="text-sm">{t('auto_total_charity_income')}</CardTitle></CardHeader>
                <CardContent className="text-2xl font-bold">৳{Number(summary?.total_income || 0).toLocaleString()}</CardContent>
              </Card>
            </div>

            <Card className="card-glass mb-6">
              <CardHeader>
                <CardTitle className="text-sm">{t('auto_income_sources_internal')}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {summary?.income_by_source
                  ? Object.entries(summary.income_by_source).map(([k, v]: any) => (
                      <Badge key={k} variant="outline" className="capitalize">{k}: ৳{Number(v).toLocaleString()}</Badge>
                    ))
                  : <span className="text-sm text-muted-foreground">--</span>
                }
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="card-glass">
                <CardHeader><CardTitle className="text-sm">{t('auto_donations')}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {donations.length === 0 ? (
                    <div className="text-sm text-muted-foreground">{t('auto_no_donations_recorded')}</div>
                  ) : donations.map((d) => (
                    <div key={d.id} className="p-3 rounded-lg border border-white/10">
                      <div className="flex justify-between text-sm">
                        <div className="font-semibold">{d.donor_name || (t('auto_anonymous'))}</div>
                        <div className="font-bold">৳{Number(d.amount || 0).toLocaleString()}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{d.donation_date}</div>
                      {d.description && <div className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{d.description}</div>}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="card-glass">
                <CardHeader><CardTitle className="text-sm">{t('auto_charity_history')}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {history.length === 0 ? (
                    <div className="text-sm text-muted-foreground">{t('auto_no_charity_given_records_yet')}</div>
                  ) : history.map((r) => (
                    <div key={r.id} className="p-3 rounded-lg border border-white/10 space-y-2">
                      <div className="flex justify-between">
                        <div>
                          <div className="font-semibold">{r.title}</div>
                          <div className="text-xs text-muted-foreground">
                            Nur Az Zahra Foundation{r.charity_date ? ` -- ${r.charity_date}` : ''}
                          </div>
                        </div>
                        <div className="font-bold">৳{Number(r.amount || 0).toLocaleString()}</div>
                      </div>

                      <div className="text-sm text-muted-foreground whitespace-pre-line">{r.description}</div>

                      <div className="flex gap-2 items-center">
                        <Badge variant="outline" className="capitalize">{r.source_type}</Badge>
                        {Array.isArray(r.proof_urls) && r.proof_urls.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {t('auto_proofs')} {r.proof_urls.length}
                          </span>
                        )}
                      </div>

                      {Array.isArray(r.proof_urls) && r.proof_urls.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pt-1">
                          {r.proof_urls.slice(0, 4).map((u: string, idx: number) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={idx} src={u} alt="Proof" className="h-16 w-24 object-cover rounded-md border border-white/10" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </PageShell>
    </div>
  )
}