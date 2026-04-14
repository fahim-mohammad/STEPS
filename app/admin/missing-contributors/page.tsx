'use client'

import { useEffect, useMemo, useState } from 'react'
import { getMissingContributors } from '@/lib/data-store'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { useTranslations } from '@/lib/translations'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function MissingContributorsPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()
  const isAdmin = effectiveRole === 'chairman' || effectiveRole === 'accountant'

  const now = useMemo(() => new Date(), [])
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [bulkDueDate, setBulkDueDate] = useState<string>('')
  const [dueDates, setDueDates] = useState<Record<string, string>>({})

  useEffect(() => {
    const savedLanguage = (localStorage.getItem('steps_language') as 'en' | 'bn' | null) ?? null
    if (savedLanguage) setLanguage(savedLanguage)

    if (!isLoading && (!user || !isAdmin)) router.push('/dashboard')
  }, [user, isLoading, isAdmin, router])

  async function load() {
    setLoading(true)
    setMessage('')
    try {
      const data = await getMissingContributors(month, year)
      setRows(data)
      // initialize dueDates keys
      const init: Record<string, string> = {}
      for (const r of data) init[r.id] = dueDates[r.id] || ''
      setDueDates(init)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && isAdmin) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin])

  const onLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  function applyBulkDate() {
    if (!bulkDueDate) return
    const next: Record<string, string> = { ...dueDates }
    for (const r of rows) next[r.id] = bulkDueDate
    setDueDates(next)
  }

  async function saveDueDates() {
    setBusy(true)
    setMessage('')
    try {
      const items = rows
        .map((r) => ({ userId: r.id, dueDate: dueDates[r.id] ? dueDates[r.id] : null }))
        .filter((x) => x.dueDate !== null)

      if (items.length === 0) {
        setMessage(t('auto_no_due_dates_to_save'))
        return
      }

      // Ensure expected dues rows exist (idempotent)
      await fetch('/api/admin/auto-dues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, backfillToMonth: false }),
      })

      const r = await fetch('/api/admin/expected-dues/due-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, items }),
      })
      const j = await r.json()
      if (!j?.ok) throw new Error(j?.error || 'Failed')
      setMessage(t('auto_saved_due_dates_for_j_updated_members'))
    } catch (e: any) {
      setMessage(e?.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  async function generateReminders() {
    setBusy(true)
    setMessage('')
    try {
      const r = await fetch('/api/admin/reminders/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month }),
      })
      const j = await r.json()
      if (!j?.ok) throw new Error(j?.error || 'Failed')
      setMessage(t('auto_generated_j_created_reminders'))
    } catch (e: any) {
      setMessage(e?.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    )
  }
  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={onLanguageChange} />

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <BackToDashboardButton label={t('auto_back_68920f')} />
          <div className="text-right">
            <h1 className="text-2xl font-bold">{t('auto_missing_contributors_2e8344')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('auto_set_per_member_due_dates_then_generate_r')}
            </p>
          </div>
        </div>

        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{t('auto_month_year')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">{t('auto_month_0d85fa')}</div>
              <input type="number" min={1} max={12} className="border rounded px-3 py-2 w-24" value={month} onChange={(e) => setMonth(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">{t('auto_year_346ca2')}</div>
              <input type="number" min={2025} className="border rounded px-3 py-2 w-32" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
            <Button className="btn-glass" disabled={busy} onClick={load}>{t('auto_check')}</Button>
          </CardContent>
        </Card>

        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{t('auto_due_dates')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">{t('auto_set_same_due_date_for_all_optional')}</div>
                <input type="date" className="border rounded px-3 py-2" value={bulkDueDate} onChange={(e) => setBulkDueDate(e.target.value)} />
              </div>
              <Button variant="outline" className="btn-glass" disabled={!bulkDueDate || busy} onClick={applyBulkDate}>
                {t('auto_apply_to_all')}
              </Button>
              <Button className="btn-glass" disabled={busy} onClick={saveDueDates}>
                {t('auto_save_due_dates')}
              </Button>
              <Button variant="outline" className="btn-glass" disabled={busy} onClick={generateReminders}>
                {t('auto_generate_reminders')}
              </Button>
            </div>

            {message && <div className="text-sm text-muted-foreground">{message}</div>}

            <div className="text-sm">{loading ? '…' : <span>{t('auto_missing_count')} <b>{rows.length}</b></span>}</div>

            <div className="overflow-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">{t('auto_name_3e29c6')}</th>
                    <th className="text-left p-3">{t('auto_phone')}</th>
                    <th className="text-left p-3">{t('auto_due_date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-3">{r.name}</td>
                      <td className="p-3">{r.phone || '-'}</td>
                      <td className="p-3">
                        <input
                          type="date"
                          className="border rounded px-3 py-2"
                          value={dueDates[r.id] || ''}
                          onChange={(e) => setDueDates((d) => ({ ...d, [r.id]: e.target.value }))}
                        />
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && !loading && (
                    <tr>
                      <td className="p-3" colSpan={3}>
                        {t('auto_no_missing_members')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}