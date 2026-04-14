'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import PageShell from '@/components/page-shell'
import { BackToDashboardButton } from '@/components/back-to-dashboard-button'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslations } from '@/lib/translations'

type SuggestionRow = {
  id: string
  title: string
  message: string
  status: 'open' | 'reviewing' | 'resolved'
  created_at: string
  user_id: string
  profiles?: { full_name?: string | null; email?: string | null; phone?: string | null; role?: string | null } | null
}

export default function AdminSuggestionsPage() {
  const router = useRouter()
  const { user, isLoading, effectiveRole } = useAuth()

  const isAdmin = useMemo(() => effectiveRole === 'chairman' || effectiveRole === 'accountant', [effectiveRole])

  const [language, setLanguage] = useState<'en' | 'bn'>('en')
  const { t } = useTranslations(language)

  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'reviewing' | 'resolved'>('all')
  const [items, setItems] = useState<SuggestionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('steps_language')
    setLanguage(saved === 'bn' ? 'bn' : 'en')
  }, [])

  useEffect(() => {
    if (!isLoading && !user) router.push('/signin')
  }, [isLoading, user, router])

  useEffect(() => {
    if (!isLoading && user && !isAdmin) router.push('/dashboard')
  }, [isLoading, user, isAdmin, router])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = statusFilter === 'all' ? '' : `?status=${statusFilter}`
      const res = await fetch(`/api/admin/suggestions${qs}`)
      const json = await res.json()
      if (!json?.ok) throw new Error(json?.error || t('admin_suggestions_failed'))
      setItems(json.data || [])
    } catch (e: any) {
      setError(e?.message || t('admin_suggestions_failed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user || !isAdmin) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin, statusFilter])

  const setStatus = async (id: string, status: 'open' | 'reviewing' | 'resolved') => {
    try {
      const res = await fetch('/api/admin/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const json = await res.json()
      if (!json?.ok) throw new Error(json?.error || t('admin_suggestions_failed'))
      await load()
    } catch (e: any) {
      setError(e?.message || t('admin_suggestions_failed'))
    }
  }

  const statusText = (s: SuggestionRow['status']) => {
    if (s === 'open') return t('suggestions_status_open')
    if (s === 'reviewing') return t('suggestions_status_reviewing')
    return t('suggestions_status_resolved')
  }

  return (
    <div className="min-h-screen">
      <Navbar
        language={language}
        onLanguageChange={(l) => {
          setLanguage(l)
          localStorage.setItem('steps_language', l)
        }}
      />

      <PageShell
        title={t('admin_suggestions_title')}
        subtitle={t('admin_suggestions_subtitle')}
        leftSlot={<BackToDashboardButton label={t('back')} />}
      >
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="w-full md:w-64">
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder={t('filter')} />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="all">{t('all')}</SelectItem>
                  <SelectItem value="open">{t('suggestions_status_open')}</SelectItem>
                  <SelectItem value="reviewing">{t('suggestions_status_reviewing')}</SelectItem>
                  <SelectItem value="resolved">{t('suggestions_status_resolved')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="card-glass">
            <CardHeader>
              <CardTitle>{t('admin_suggestions_inbox')}</CardTitle>
            </CardHeader>
            <CardContent>
              {error && <div className="text-sm text-red-500 mb-3">{error}</div>}

              {loading ? (
                <div className="text-sm text-muted-foreground">{t('loading')}</div>
              ) : items.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t('admin_suggestions_none')}</div>
              ) : (
                <div className="space-y-3">
                  {items.map((it) => (
                    <div key={it.id} className="border rounded-md p-3 glass-sm">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold">{it.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {t('from')} {it.profiles?.full_name || it.profiles?.email || it.user_id}
                          </div>
                        </div>
                        <Badge variant={it.status === 'resolved' ? 'secondary' : it.status === 'reviewing' ? 'outline' : 'default'}>
                          {statusText(it.status)}
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{it.message}</div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button size="sm" variant="outline" onClick={() => setStatus(it.id, 'open')}>
                          {t('suggestions_status_open')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setStatus(it.id, 'reviewing')}>
                          {t('suggestions_status_reviewing')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setStatus(it.id, 'resolved')}>
                          {t('suggestions_status_resolved')}
                        </Button>
                      </div>

                      <div className="text-xs text-muted-foreground mt-2">{new Date(it.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </div>
  )
}