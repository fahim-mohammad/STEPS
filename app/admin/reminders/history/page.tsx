'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { generateAndDownloadReminderHistoryReport } from '@/lib/pdf/reminder-history'
import { useTranslations } from '@/lib/translations'

type ReminderItem = {
  id: string
  kind: string
  year: number | null
  month: number | null
  run_at: string
  channel: string
  status: string
  created_at: string
  payload: any
  target?: { full_name?: string; email?: string; phone?: string } | null
  creator?: { full_name?: string; email?: string } | null
}

const KIND_OPTIONS = [
  { value: 'contribution_due_soon', key: 'remKindDueSoon' },
  { value: 'contribution_overdue', key: 'remKindOverdue' },
  { value: 'custom', key: 'remKindCustom' },
]

const STATUS_OPTIONS = [
  { value: 'scheduled', key: 'remStatusScheduled' },
  { value: 'sent', key: 'remStatusSent' },
  { value: 'skipped', key: 'remStatusSkipped' },
  { value: 'failed', key: 'remStatusFailed' },
]

export default function ReminderHistoryPage() {
  const { user, isLoading, effectiveRole } = useAuth()
  const router = useRouter()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isAdmin = useMemo(
    () => effectiveRole === 'chairman' || effectiveRole === 'accountant',
    [effectiveRole]
  )

  const [items, setItems] = useState<ReminderItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const now = useMemo(() => new Date(), [])
  const defaultYear = now.getFullYear()
  const defaultMonth = now.getMonth() + 1

  const [q, setQ] = useState('')
  const [kind, setKind] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [year, setYear] = useState<string>(String(defaultYear))
  const [month, setMonth] = useState<string>(String(defaultMonth))
  const [page, setPage] = useState(1)
  const limit = 50

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
  }, [user, isLoading, isAdmin, router])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (kind) params.set('kind', kind)
      if (status) params.set('status', status)
      if (year) params.set('year', year)
      if (month) params.set('month', month)
      params.set('limit', String(limit))
      params.set('offset', String((page - 1) * limit))

      const res = await fetch(`/api/admin/reminders/history?${params.toString()}`)
      if (!res.ok) throw new Error(t('failedLoadReminderHistory'))
      const json = await res.json()
      setItems(json.items || [])
      setTotal(json.total || 0)
    } catch (e: any) {
      setError(e?.message || t('errorGeneric'))
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user || !isAdmin) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, kind, status, year, month, page])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  if (isLoading) return null
  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={t('reminderHistoryTitle')}
        subtitle={t('reminderHistorySubtitle')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
      >
        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{t('reminderHistoryTitle')}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Input
                className="bg-background"
                placeholder={t('searchMemberPlaceholder')}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />

              <Select value={kind || 'all'} onValueChange={(v) => setKind(v === 'all' ? '' : v)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={t('kind')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allKinds')}</SelectItem>
                  {KIND_OPTIONS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {t(k.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={t('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses')}</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {t(s.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                className="bg-background"
                type="number"
                min={2025}
                placeholder={t('year')}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
              <Input
                className="bg-background"
                type="number"
                min={1}
                max={12}
                placeholder={t('month')}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Button
                variant="secondary"
                onClick={() => {
                  setPage(1)
                  load()
                }}
                disabled={loading}
              >
                {t('apply')}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setQ('')
                  setKind('')
                  setStatus('')
                  setYear(String(defaultYear))
                  setMonth(String(defaultMonth))
                  setPage(1)
                }}
                disabled={loading}
              >
                {t('reset')}
              </Button>

              <Button
                variant="outline"
                onClick={async () => {
                  setExporting(true)
                  try {
                    const params = new URLSearchParams()
                    if (q.trim()) params.set('q', q.trim())
                    if (kind) params.set('kind', kind)
                    if (status) params.set('status', status)
                    if (year) params.set('year', year)
                    if (month) params.set('month', month)
                    params.set('limit', '5000')
                    params.set('offset', '0')

                    const res = await fetch(`/api/admin/reminders/history?${params.toString()}`)
                    if (!res.ok) throw new Error(t('failedLoadItemsForExport'))
                    const json = await res.json()
                    await generateAndDownloadReminderHistoryReport(json.items || [], { title: t('reminderHistoryExportTitle') })
                  } catch (e: any) {
                    setError(e?.message || t('exportFailed'))
                  } finally {
                    setExporting(false)
                  }
                }}
                disabled={loading || exporting}
              >
                {exporting ? t('exporting') : t('exportPDF')}
              </Button>

              <div className="ml-auto text-sm opacity-80">
                {t('showing')} {(page - 1) * limit + 1}-{Math.min(page * limit, total)} {t('of')} {total}
              </div>
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="overflow-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-2">{t('runAt')}</th>
                    <th className="p-2">{t('member')}</th>
                    <th className="p-2">{t('kind')}</th>
                    <th className="p-2">{t('for')}</th>
                    <th className="p-2">{t('status')}</th>
                    <th className="p-2">{t('channel')}</th>
                    <th className="p-2">{t('created')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} className="border-t">
                      <td className="p-2 whitespace-nowrap">{new Date(it.run_at).toLocaleString()}</td>
                      <td className="p-2">
                        <div className="font-medium">{it.target?.full_name || '—'}</div>
                        <div className="text-xs opacity-70">{it.target?.email || it.target?.phone || ''}</div>
                      </td>
                      <td className="p-2 whitespace-nowrap">{it.kind}</td>
                      <td className="p-2 whitespace-nowrap">
                        {it.year && it.month ? `${it.year}-${String(it.month).padStart(2, '0')}` : '—'}
                      </td>
                      <td className="p-2 whitespace-nowrap">{it.status}</td>
                      <td className="p-2 whitespace-nowrap">{it.channel}</td>
                      <td className="p-2 whitespace-nowrap">{new Date(it.created_at).toLocaleString()}</td>
                    </tr>
                  ))}

                  {items.length === 0 && (
                    <tr>
                      <td className="p-4 text-center opacity-70" colSpan={7}>
                        {loading ? t('loading') : t('noRemindersFound')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                {t('prev')}
              </Button>
              <div className="text-sm opacity-80">
                {t('page')} {page} / {totalPages}
              </div>
              <Button variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                {t('next')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    </div>
  )
}