'use client'

import { useEffect, useState } from 'react'
import { Navbar } from '@/components/navbar'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useTranslations } from '@/lib/translations'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

type Settings = {
  enabled: boolean
  pending_contribution_days: number
  max_emails_per_contribution: number
}

export default function AdminFollowupsPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()
  const isAdmin = effectiveRole === 'chairman' || effectiveRole === 'accountant'

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [settings, setSettings] = useState<Settings>({ enabled: true, pending_contribution_days: 3, max_emails_per_contribution: 3 })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [dryRunCount, setDryRunCount] = useState<number | null>(null)

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
        const r = await fetch('/api/admin/sla-settings')
        const j = await r.json()
        if (j?.ok && j?.row) setSettings(j.row)
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
      const r = await fetch('/api/admin/sla-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const j = await r.json()
      if (!j?.ok) throw new Error(j?.error || 'Failed')
      setMessage(t('auto_settings_saved'))
    } catch (e: any) {
      setMessage(e?.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  async function runDry() {
    setBusy(true)
    setMessage('')
    setDryRunCount(null)
    try {
      const r = await fetch('/api/admin/followups/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true }),
      })
      const j = await r.json()
      if (!j?.ok) throw new Error(j?.error || 'Failed')
      setDryRunCount(Number(j.pending ?? 0))
      setMessage(
        t('auto_dry_run_number_j_pending_0_pending_contr')
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar language={language} onLanguageChange={onLanguageChange} />

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <BackToDashboardButton />

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>{t('auto_approval_sla_auto_follow_up')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">{t('auto_enable_auto_follow_up')}</div>
                <div className="text-sm text-muted-foreground">
                  {t('auto_when_enabled_the_system_emails_admins_ab')}
                </div>
              </div>
              <Switch checked={settings.enabled} onCheckedChange={(v) => setSettings((s) => ({ ...s, enabled: v }))} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t('auto_x_days_pending_threshold')}</label>
                <Input
                  type="number"
                  value={settings.pending_contribution_days}
                  min={1}
                  max={60}
                  onChange={(e) => setSettings((s) => ({ ...s, pending_contribution_days: Number(e.target.value || 3) }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('auto_max_emails_per_contribution')}</label>
                <Input
                  type="number"
                  value={settings.max_emails_per_contribution}
                  min={1}
                  max={10}
                  onChange={(e) => setSettings((s) => ({ ...s, max_emails_per_contribution: Number(e.target.value || 3) }))}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={saveSettings}>
                {busy ? t('loading') : t('auto_save_settings')}
              </Button>
              <Button variant="outline" disabled={busy} onClick={runDry}>
                {t('auto_dry_run_count_pending')}
              </Button>
            </div>

            {message && <div className="text-sm text-muted-foreground">{message}</div>}

            <div className="rounded-lg border p-4 text-sm">
              <div className="font-medium mb-2">{t('auto_how_automation_works')}</div>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>
                  {t('auto_a_cron_job_calls_post_api_cron_followups')}
                </li>
                <li>
                  {t('auto_it_emails_chairman_accountant_about_cont')}
                </li>
                <li>
                  {t('auto_each_contribution_is_limited_by_max_emai')}
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
