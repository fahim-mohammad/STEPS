'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type AuditRow = {
  id: string
  action: string
  target_table: string | null
  target_id: string | null
  actor_id: string | null
  details: any
  created_at: string
}

export default function AdvancedAuditLogsPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isAdmin = useMemo(
    () => effectiveRole === 'chairman' || effectiveRole === 'accountant',
    [effectiveRole]
  )

  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [actorFilter, setActorFilter] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('steps_language')
    setLanguage(saved === 'bn' ? 'bn' : 'en')
  }, [])

  useEffect(() => {
    if (isLoading) return
    if (!user) router.push('/signin')
    else if (!isAdmin) router.push('/dashboard')
  }, [isLoading, user, isAdmin, router])

  const handleLanguageChange = (newLang: 'en' | 'bn') => {
    setLanguage(newLang)
    localStorage.setItem('steps_language', newLang)
  }

  const load = async () => {
    try {
      setLoading(true)
      let q = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200)
      if (actionFilter.trim()) q = q.ilike('action', `%${actionFilter.trim()}%`)
      if (actorFilter.trim()) q = q.eq('actor_id', actorFilter.trim())
      const { data, error } = await q
      if (error) throw error
      setRows((data as any) || [])
    } catch (e) {
      console.error(e)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && isAdmin) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin])

  if (isLoading) return null
  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={t('audit_adv_title')}
        subtitle={t('audit_adv_subtitle')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
        rightSlot={
          <Button variant="outline" className="btn-glass" onClick={load} disabled={loading}>
            {t('refresh')}
          </Button>
        }
      >
        <Card className="card-glass mb-4">
          <CardHeader>
            <CardTitle className="text-base">{t('common_filters')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              className="bg-background"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder={t('audit_adv_filter_action')}
            />
            <Input
              className="bg-background"
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              placeholder={t('audit_adv_filter_actor')}
            />
            <Button onClick={load} disabled={loading}>
              {loading ? t('common_loading') : t('common_apply')}
            </Button>
          </CardContent>
        </Card>

        <Card className="card-glass">
          <CardHeader>
            <CardTitle className="text-base">{t('audit_title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-muted-foreground">{t('common_loading')}</p>
            ) : rows.length === 0 ? (
              <p className="text-muted-foreground">{t('common_no_data')}</p>
            ) : (
              rows.map((r) => (
                <div key={r.id} className="border rounded-xl p-3 bg-background/40">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">{r.action}</div>
                    <Badge variant="outline">{new Date(r.created_at).toLocaleString()}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t('audit_actor')}: {r.actor_id || '—'} • {t('audit_target')}: {r.target_table || '—'}{' '}
                    {r.target_id ? `(${r.target_id})` : ''}
                  </div>
                  {r.details ? (
                    <pre className="mt-2 text-xs whitespace-pre-wrap bg-muted/20 rounded p-2 overflow-x-auto">
                      {JSON.stringify(r.details, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </PageShell>
    </div>
  )
}