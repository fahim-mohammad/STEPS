'use client'

import { useEffect, useMemo, useState } from 'react'
import { Navbar } from '@/components/navbar'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useTranslations } from '@/lib/translations'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Settings = { enabled: boolean; daysBefore: number; daysAfter: number }

export default function AdminRemindersPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()
  const isAdmin = effectiveRole === 'chairman' || effectiveRole === 'accountant'

  const now = useMemo(() => new Date(), [])
  const [month, setMonth] = useState<number>(now.getMonth() + 1)
  const [year, setYear] = useState<number>(now.getFullYear())

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [settings, setSettings] = useState<Settings>({ enabled: true, daysBefore: 3, daysAfter: 7 })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    const savedLanguage = (localStorage.getItem('steps_language') as 'en' | 'bn' | null) ?? null
    if (savedLanguage) setLanguage(savedLanguage)

    if (!isLoading && (!user || !isAdmin)) router.push('/dashboard')
  }, [user, isLoading, isAdmin, router])

  useEffect(() => {
    if (!user || !isAdmin) return
    const load = async () => {
      setLoading(true)
      try {
        const r = await fetch('/api/admin/reminder-settings')
        const j = await r.json()
        if (j?.ok) setSettings(j.settings)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, isAdmin])

  const onLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  async function saveSettings() {
    setBusy(true)
    setMessage('')
    try {
      const r = await fetch('/api/admin/reminder-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const j = await r.json()
      if (!j?.ok) throw new Error(j?.error || 'Failed')
      setMessage(t('auto_settings_saved_55b1ac'))
    } catch (e: any) {
      setMessage(e?.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  async function generateForMonth() {
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
      setMessage(
        t('auto_generated_j_created_reminders_skipped_j_')
      )
    } catch (e: any) {
      setMessage(e?.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  if (isLoading || loading) {
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
            <h1 className="text-2xl font-bold">{t('auto_smart_reminder_scheduler')}</h1>
            <div className="mt-2">
              <Button variant="outline" onClick={() => router.push('/admin/reminders/history')}>
                {t('auto_view_history')}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('auto_reminders_use_per_member_due_dates_set_i')}
            </p>
          </div>
        </div>

        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{t('auto_settings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
                />
                <span>{t('auto_enable_reminders')}</span>
              </label>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">{t('auto_days_before_due')}</div>
                <input
                  type="number"
                  min={0}
                  max={30}
                  className="border rounded px-3 py-2 w-28"
                  value={settings.daysBefore}
                  onChange={(e) => setSettings((s) => ({ ...s, daysBefore: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">{t('auto_days_after_missed')}</div>
                <input
                  type="number"
                  min={0}
                  max={60}
                  className="border rounded px-3 py-2 w-28"
                  value={settings.daysAfter}
                  onChange={(e) => setSettings((s) => ({ ...s, daysAfter: Number(e.target.value) }))}
                />
              </div>
              <Button className="btn-glass" disabled={busy} onClick={saveSettings}>
                {t('auto_save_2a5cea')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="card-glass">
          <CardHeader>
            <CardTitle>{t('auto_generate_reminders_for_a_month')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">{t('auto_month_0d85fa')}</div>
                <input
                  type="number"
                  min={1}
                  max={12}
                  className="border rounded px-3 py-2 w-24"
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">{t('auto_year_346ca2')}</div>
                <input
                  type="number"
                  min={2025}
                  className="border rounded px-3 py-2 w-32"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                />
              </div>
              <Button className="btn-glass" disabled={busy} onClick={generateForMonth}>
                {t('auto_generate')}
              </Button>
            </div>

            {message && <div className="text-sm text-muted-foreground">{message}</div>}

            <div className="text-sm text-muted-foreground">
              {t('auto_note_reminders_are_created_only_for_memb')}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
