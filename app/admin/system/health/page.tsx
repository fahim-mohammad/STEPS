'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from '@/lib/translations'

type Health = {
  db: { ok: boolean }
  email: { ok: boolean; configured: boolean; fromConfigured: boolean }
  storage: { ok: boolean }
  backup: { lastBackupAt: string | null }
}

export default function SystemHealthPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isAdmin = useMemo(
    () => effectiveRole === 'chairman' || effectiveRole === 'accountant',
    [effectiveRole]
  )

  const [data, setData] = useState<Health | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

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

  const load = async () => {
    setLoading(true)
    setErr(null)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess.session?.access_token

      const res = await fetch('/api/admin/system/health', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`)
      setData(j)
    } catch (e: any) {
      setErr(e?.message || String(e))
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user || !isAdmin) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin])

  const statusBadge = (ok: boolean) => (
    <Badge className={ok ? 'bg-green-600' : 'bg-red-600'}>{ok ? t('ok') : t('notOk')}</Badge>
  )

  if (isLoading) return null
  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={t('systemHealthTitle')}
        subtitle={t('systemHealthSubtitle')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
        rightSlot={
          <Button className="btn-glass" onClick={load} disabled={loading}>
            {loading ? t('checking') : t('refresh')}
          </Button>
        }
      >
        {err ? (
          <Card className="card-glass max-w-3xl mb-4">
            <CardHeader>
              <CardTitle className="text-red-600">{t('errorTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap">{err}</div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="card-glass max-w-3xl">
          <CardHeader>
            <CardTitle>{t('coreServices')}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t('database')}</div>
                <div className="text-sm text-muted-foreground">{t('databaseHint')}</div>
              </div>
              {statusBadge(Boolean(data?.db?.ok))}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t('email')}</div>
                <div className="text-sm text-muted-foreground">{t('emailHint')}</div>
              </div>
              {statusBadge(Boolean(data?.email?.ok))}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t('storage')}</div>
                <div className="text-sm text-muted-foreground">{t('storageHint')}</div>
              </div>
              {statusBadge(Boolean(data?.storage?.ok))}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t('lastBackup')}</div>
                <div className="text-sm text-muted-foreground">{t('lastBackupHint')}</div>
              </div>
              <div className="text-sm">{data?.backup?.lastBackupAt || t('never')}</div>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    </div>
  )
}