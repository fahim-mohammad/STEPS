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
import { useTranslations } from '@/lib/translations'

export default function BackupPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isAdmin = useMemo(
    () => effectiveRole === 'chairman' || effectiveRole === 'accountant',
    [effectiveRole]
  )

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

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

  const downloadBackup = async () => {
    setLoading(true)
    setMsg(null)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess.session?.access_token

      const res = await fetch('/api/admin/system/backup', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || `HTTP ${res.status}`)
      }

      const blob = await res.blob()
      const cd = res.headers.get('content-disposition') || ''
      const m = cd.match(/filename=\"([^\"]+)\"/)
      const filename = m?.[1] || 'steps-backup.json'

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      setMsg(t('backupDownloaded'))
    } catch (e: any) {
      setMsg(e?.message || String(e))
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
        title={t('backupTitle')}
        subtitle={t('backupSubtitle')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
      >
        <Card className="card-glass max-w-3xl">
          <CardHeader>
            <CardTitle>{t('exportFullBackup')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">{t('backupDescription')}</div>

            <Button className="btn-glass" onClick={downloadBackup} disabled={loading}>
              {loading ? t('preparing') : t('downloadBackup')}
            </Button>

            {msg ? <div className="text-sm whitespace-pre-wrap">{msg}</div> : null}
          </CardContent>
        </Card>
      </PageShell>
    </div>
  )
}