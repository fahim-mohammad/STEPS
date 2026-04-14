'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { useAuth } from '@/lib/auth-context'
import { useTranslations } from '@/lib/translations'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type AuditRow = {
  id: string
  actor_id: string | null
  action: string
  entity: string | null
  entity_id: string | null
  details: any
  created_at: string
}

function safeJson(v: any) {
  try {
    if (v == null) return ''
    if (typeof v === 'string') return v
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

export default function AuditLogsPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const isAdmin = useMemo(
    () => effectiveRole === 'chairman' || effectiveRole === 'accountant',
    [effectiveRole]
  )

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const pageSize = 15
  const [total, setTotal] = useState(0)

  const [rows, setRows] = useState<AuditRow[]>([])
  const [q, setQ] = useState('')
  const [action, setAction] = useState('')
  const [entity, setEntity] = useState('')
  const [actorId, setActorId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('steps_language')
    setLanguage(saved === 'bn' ? 'bn' : 'en')
  }, [])

  const handleLanguageChange = (lang: 'en' | 'bn') => {
    setLanguage(lang)
    localStorage.setItem('steps_language', lang)
  }

  useEffect(() => {
    if (isLoading) return
    if (!user) router.push('/signin')
    else if (!isAdmin) router.push('/dashboard')
  }, [isLoading, user, isAdmin, router])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total])

  async function fetchLogs() {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      if (q.trim()) params.set('q', q.trim())
      if (action.trim()) params.set('action', action.trim())
      if (entity.trim()) params.set('entity', entity.trim())
      if (actorId.trim()) params.set('actorId', actorId.trim())
      if (from.trim()) params.set('from', from.trim())
      if (to.trim()) params.set('to', to.trim())

      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      const j = await res.json().catch(() => null)
      if (!res.ok || !j?.ok) throw new Error(j?.error || `Failed (HTTP ${res.status})`)

      setRows(Array.isArray(j.items) ? j.items : [])
      setTotal(Number(j.total || 0))
    } catch (e: any) {
      setRows([])
      setTotal(0)
      setError(e?.message || t('common_failed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [q, action, entity, actorId, from, to])

  useEffect(() => {
    if (!user || !isAdmin) return
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, page])

  if (isLoading) return null
  if (!user || !isAdmin) return null

  return (
    <div className="min-h-screen">
      <Navbar language={language} onLanguageChange={handleLanguageChange} />

      <PageShell
        title={t('audit_title')}
        subtitle={t('audit_subtitle')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
        rightSlot={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {loading ? t('common_loading') : `${total} ${t('audit_records')}`}
          </div>
        }
      >
        {error ? (
          <Card className="card-glass border-red-500/30">
            <CardContent className="py-4">
              <div className="text-sm text-red-600">{error}</div>
              <div className="mt-3">
                <Button variant="secondary" onClick={fetchLogs} disabled={loading}>
                  {t('common_retry')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="card-glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('common_filters')}</CardTitle>
          </CardHeader>

          <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Input className="bg-background" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common_search')} />
            <Input className="bg-background" value={action} onChange={(e) => setAction(e.target.value)} placeholder={t('audit_filter_action')} />
            <Input className="bg-background" value={entity} onChange={(e) => setEntity(e.target.value)} placeholder={t('audit_filter_entity')} />
            <Input className="bg-background" value={actorId} onChange={(e) => setActorId(e.target.value)} placeholder={t('audit_filter_actor')} />
            <Input className="bg-background" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input className="bg-background" type="date" value={to} onChange={(e) => setTo(e.target.value)} />

            <Button className="btn-glass md:col-span-3 lg:col-span-6" onClick={fetchLogs} disabled={loading}>
              {loading ? t('common_loading') : t('common_apply_filters')}
            </Button>
          </CardContent>
        </Card>

        <Card className="card-glass">
          <CardHeader>
            <CardTitle className="text-base">{t('audit_recent_logs')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.length === 0 ? (
              <div className="text-sm text-muted-foreground">{loading ? t('common_loading') : t('audit_no_logs')}</div>
            ) : (
              rows.map((r) => (
                <div key={r.id} className="border rounded-xl p-3 bg-background/40">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{r.action}</div>
                    <Badge variant="outline">{new Date(r.created_at).toLocaleString()}</Badge>
                  </div>

                  <div className="text-xs text-muted-foreground mt-1">
                    {t('audit_actor')}: {r.actor_id || '—'} • {t('audit_target')}: {r.entity || '—'} {r.entity_id ? `(${r.entity_id})` : ''}
                  </div>

                  {r.details ? (
                    <pre className="mt-2 text-xs whitespace-pre-wrap bg-muted/20 rounded p-2 overflow-x-auto">
                      {safeJson(r.details)}
                    </pre>
                  ) : null}
                </div>
              ))
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
                {t('common_prev')}
              </Button>
              <div className="text-sm text-muted-foreground">
                {t('common_page')} {page} / {totalPages}
              </div>
              <Button variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
                {t('common_next')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    </div>
  )
}