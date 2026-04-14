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
import { Input } from '@/components/ui/input'
import { useTranslations } from '@/lib/translations'

export default function RestorePage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  // restore is chairman-only (your code comment says this)
  const isChairman = useMemo(() => effectiveRole === 'chairman', [effectiveRole])

  const [file, setFile] = useState<File | null>(null)
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
    else if (!isChairman) router.push('/dashboard')
  }, [isLoading, user, isChairman, router])

  const restore = async () => {
    if (!file) return
    setLoading(true)
    setMsg(null)

    try {
      const text = await file.text()
      const json = JSON.parse(text)

      const { data: sess } = await supabase.auth.getSession()
      const token = sess.session?.access_token

      const res = await fetch('/api/admin/system/restore', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(json),
      })

      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.ok) throw new Error(j?.error || `HTTP ${res.status}`)

      setMsg(`${t('restoreFinished')} ${j.restoredAt ? `(${j.restoredAt})` : ''}`)
    } catch (e: any) {
      setMsg(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) return null
  if (!user || !isChairman) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={t('restoreTitle')}
        subtitle={t('restoreSubtitle')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
      >
        <Card className="card-glass max-w-3xl">
          <CardHeader>
            <CardTitle>{t('restoreFromBackup')}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">{t('restoreSafetyHint')}</div>

            <Input
              className="bg-background"
              type="file"
              accept="application/json"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            <Button className="btn-glass" onClick={restore} disabled={loading || !file}>
              {loading ? t('restoring') : t('runRestore')}
            </Button>

            {msg ? <div className="text-sm whitespace-pre-wrap">{msg}</div> : null}
          </CardContent>
        </Card>
      </PageShell>
    </div>
  )
}