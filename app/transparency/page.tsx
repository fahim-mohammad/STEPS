'use client'

import React, { useEffect, useState } from 'react'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslations } from '@/lib/translations'

function money(n: number) {
  const v = Number(n || 0)
  return `৳ ${v.toLocaleString()}`
}

export default function TransparencyPage() {
  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [loading, setLoading] = useState(true)
  const [fundBalance, setFundBalance] = useState(0)
  const [totalCharity, setTotalCharity] = useState(0)
  const [totalInvestments, setTotalInvestments] = useState(0)

  useEffect(() => {
    try {
      // Prefer canonical key, but keep legacy fallback.
      const savedLang = (localStorage.getItem('steps_language') as any) || (localStorage.getItem('steps_lang') as any) || 'en'
      setLanguage(savedLang === 'bn' ? 'bn' : 'en')
      const savedTheme = localStorage.getItem('steps_theme') as 'light' | 'dark' | null
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    } catch {
      // ignore
    }
  }, [])

  const handleLanguageChange = (lang: 'en' | 'bn') => {
    setLanguage(lang)
    try {
      localStorage.setItem('steps_language', lang)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const r = await fetch('/api/public/transparency')
        const j = await r.json()
        if (!mounted) return
        if (j?.ok) {
          setFundBalance(Number(j.totals?.fundBalance || 0))
          setTotalCharity(Number(j.totals?.totalCharity || 0))
          setTotalInvestments(Number(j.totals?.totalInvestments || 0))
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="min-h-screen">
      <Navbar
        language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={t('publicTransparencyTitle')}
        subtitle={t('publicTransparencySubtitle')}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="card-glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('fundBalance')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-32" /> : <div className="text-3xl font-bold">{money(fundBalance)}</div>}
              <p className="text-xs text-muted-foreground mt-2">
                {t('transparencyFundHint')}
              </p>
            </CardContent>
          </Card>

          <Card className="card-glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('charityAmount')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-32" /> : <div className="text-3xl font-bold">{money(totalCharity)}</div>}
              <p className="text-xs text-muted-foreground mt-2">
                {t('transparencyCharityHint')}
              </p>
            </CardContent>
          </Card>

          <Card className="card-glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('totalInvested')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-32" /> : <div className="text-3xl font-bold">{money(totalInvestments)}</div>}
              <p className="text-xs text-muted-foreground mt-2">
                {t('transparencyInvestHint')}
              </p>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </div>
  )
}