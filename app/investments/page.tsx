'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'
import { supabase } from '@/lib/supabase/client'

import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type InvestmentListItem = {
  id: string
  investmentType: string
  bankName?: string | null
  principalAmount: number
  startDate?: string | null
  maturityDate?: string | null
  status?: string | null
  proofCount?: number
}

function money(n: number) {
  return `৳${Number(n || 0).toLocaleString()}`
}

export default function InvestmentsPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isAdmin = useMemo(
    () => effectiveRole === 'chairman' || effectiveRole === 'accountant',
    [effectiveRole]
  )

  const [items, setItems] = useState<InvestmentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const savedLanguage = localStorage.getItem('steps_language') as 'en' | 'bn' | null
    if (savedLanguage) setLanguage(savedLanguage)

    if (!isLoading && !user) router.push('/signin')
    if (!isLoading && user && !user.approved) router.push('/pending-approval')
  }, [user, isLoading, router])

  useEffect(() => {
    const load = async () => {
      if (!user) return
      setLoading(true)
      setError(null)

      try {
        const token = (await supabase.auth.getSession())?.data?.session?.access_token
        const res = await fetch('/api/investments', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || json?.ok === false) throw new Error(json?.error || 'Failed to load investments')
        setItems(Array.isArray(json.items) ? json.items : [])
      } catch (e: any) {
        setError(e?.message || 'Failed to load investments')
        setItems([])
      }

      setLoading(false)
    }

    if (!isLoading && user) load()
  }, [isLoading, user])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  if (isLoading) return null
  if (!user) return null
  if (!user.approved) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={t('investments')}
        subtitle={t('investmentsSubtitle')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
      >
        {error ? (
          <Card className="mb-4 border-red-300 card-glass">
            <CardContent className="py-3 text-sm text-red-700 whitespace-pre-wrap">{error}</CardContent>
          </Card>
        ) : null}

        <Card className="card-glass">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">{t('investments')}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t('investmentsSubtitle')}</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">{t('loading')}</p>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground">
                {language==='bn' ? 'এখনো কোনো ইনভেস্টমেন্ট যোগ করা হয়নি।' : 'No investments have been added yet.'}
              </p>
            ) : (
              <div className="space-y-3">
                {items.map((inv) => (
                  <button
                    key={inv.id}
                    className="w-full text-left rounded-lg border bg-background/60 hover:bg-background/80 transition p-4"
                    onClick={() => router.push(`/investments/${inv.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">
                          {inv.investmentType}
                          {inv.bankName ? <span className="text-muted-foreground"> · {inv.bankName}</span> : null}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {money(inv.principalAmount)}
                          {inv.maturityDate ? (
                            <span> · {language==='bn' ? 'ম্যাচিউর:' : 'Matures:'} {String(inv.maturityDate).slice(0, 10)}</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {inv.status ? <Badge variant="outline">{String(inv.status)}</Badge> : null}
                        {typeof inv.proofCount === 'number' ? (
                          <Badge variant="secondary">{inv.proofCount} {language==='bn' ? 'প্রুফ' : 'proofs'}</Badge>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {isAdmin ? (
          <p className="text-xs text-muted-foreground mt-4">
            {language === 'bn'
              ? 'ইনভেস্টমেন্ট যোগ/এডিট করতে অ্যাডমিন ইনভেস্টমেন্ট প্যানেল ব্যবহার করুন।'
              : 'Use the admin investments panel to add/edit investments.'}
          </p>
        ) : null}
      </PageShell>
    </div>
  )
}