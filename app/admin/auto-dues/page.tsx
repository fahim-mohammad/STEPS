'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslations } from '@/lib/translations'

function getNowMY() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export default function AutoDuesPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isAdmin = useMemo(
    () => effectiveRole === 'chairman' || effectiveRole === 'accountant',
    [effectiveRole]
  )

  const now = useMemo(() => getNowMY(), [])
  const [year, setYear] = useState<number>(Math.max(2025, now.year))
  const [month, setMonth] = useState<number>(now.month)
  const [backfill, setBackfill] = useState<boolean>(false)

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('steps_language')
      setLanguage(saved === 'bn' ? 'bn' : 'en')
    } catch {}
  }, [])

  const handleLanguageChange = (lang: 'en' | 'bn') => {
    setLanguage(lang)
    localStorage.setItem('steps_language', lang)
  }

  // protect
  useEffect(() => {
    if (isLoading) return
    if (!user) router.push('/signin')
    else if (!isAdmin) router.push('/dashboard')
  }, [isLoading, user, isAdmin, router])

  const years = useMemo(() => {
    const start = 2025
    const end = Math.max(now.year + 3, 2029)
    return Array.from({ length: end - start + 1 }, (_v, i) => start + i)
  }, [now.year])

  const months = useMemo(
    () => [
      { v: 1, label: t('monthName1') },
      { v: 2, label: t('monthName2') },
      { v: 3, label: t('monthName3') },
      { v: 4, label: t('monthName4') },
      { v: 5, label: t('monthName5') },
      { v: 6, label: t('monthName6') },
      { v: 7, label: t('monthName7') },
      { v: 8, label: t('monthName8') },
      { v: 9, label: t('monthName9') },
      { v: 10, label: t('monthName10') },
      { v: 11, label: t('monthName11') },
      { v: 12, label: t('monthName12') },
    ],
    [t]
  )

  async function generate() {
    setLoading(true)
    setResult('')
    try {
      const json = await apiFetch<{ ok: boolean; inserted?: number; error?: string }>('/api/admin/auto-dues', {
        method: 'POST',
        body: JSON.stringify({ year, month, backfillToMonth: backfill }),
      })

      if (!json?.ok) throw new Error(json?.error || t('errorGeneric'))

      const inserted = Number(json?.inserted ?? 0)
      setResult(t('autoDuesGenerated').replace('{count}', String(inserted)).replace('{year}', String(year)).replace('{month}', String(month)))
    } catch (e: any) {
      setResult(t('autoDuesFailed').replace('{error}', String(e?.message ?? t('errorGeneric'))))
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) return null
  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={t('autoDuesTitle')}
        subtitle={t('autoDuesSubtitle')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
      >
        <Card className="card-glass max-w-3xl">
          <CardHeader>
            <CardTitle>{t('autoDuesTitle')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('autoDuesHint')}</p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm mb-2">{t('year')}</div>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="rounded-xl bg-background">
                    <SelectValue placeholder={t('selectYear')} />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="text-sm mb-2">{t('month')}</div>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="rounded-xl bg-background">
                    <SelectValue placeholder={t('selectMonth')} />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.v} value={String(m.v)}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm">
              <Checkbox checked={backfill} onCheckedChange={(v) => setBackfill(Boolean(v))} />
              <span>{t('autoDuesBackfill')}</span>
            </label>

            <Button className="btn-glass" onClick={generate} disabled={loading}>
              {loading ? t('generating') : t('generateExpectedDues')}
            </Button>

            {result ? <div className="text-sm">{result}</div> : null}
          </CardContent>
        </Card>
      </PageShell>
    </div>
  )
}