'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase/client'
import { useTranslations } from '@/lib/translations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

type Item = {
  id: string
  active_months: number
  cost_share: number
  created_at: string
  fund_operation_settlements?: {
    id: string
    year: number
    total_cost: number
    total_member_months: number
    created_at: string
  }
}

async function getBearer(): Promise<string> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session?.access_token || ''
}

export default function FundOperationsPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [items, setItems] = useState<Item[]>([])
  const [opsBalance, setOpsBalance] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('steps_language')
      setLanguage(savedLang === 'bn' ? 'bn' : 'en')
    } catch {}
  }, [])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  useEffect(() => {
    if (isLoading) return
    if (!user) router.push('/signin')
  }, [isLoading, user, router])

  useEffect(() => {
    if (!user) return
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const token = await getBearer()
        const res = await fetch('/api/member/fund-operations', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const j = await res.json()
        if (!res.ok || !j?.ok) throw new Error(j?.error || t('errorGeneric'))
        setItems(j.items || [])
        setOpsBalance(Number(j.ops_balance || 0))
      } catch (e: any) {
        setError(e?.message || t('errorGeneric'))
      } finally {
        setLoading(false)
      }
    })()
  }, [user, t])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-10 w-40" />
      </div>
    )
  }
  if (!user) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={t('fundOperationsTitle')}
        subtitle={t('fundOperationsSubtitle')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
        rightSlot={
          <Badge variant="secondary" className="whitespace-nowrap">
            {t('opsBalanceLabel')}: ৳ {opsBalance.toLocaleString()}
          </Badge>
        }
      >
        {error ? <div className="text-sm text-red-600 mb-4">{error}</div> : null}

        <div className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">{t('loading')}</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t('noSettlementsYet')}</div>
          ) : (
            items.map((it) => (
              <Card key={it.id} className="card-glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {t('year')}: {it.fund_operation_settlements?.year ?? '—'}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {new Date(it.created_at).toLocaleDateString()}
                    </span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="text-sm space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {t('activeMonthsLabel')}: {Number(it.active_months || 0)}
                    </Badge>
                    <Badge>
                      {t('yourShareLabel')}: ৳ {Number(it.cost_share || 0).toLocaleString()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </PageShell>
    </div>
  )
}